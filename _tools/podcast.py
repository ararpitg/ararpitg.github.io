"""Build the podcast RSS feed (podcast/feed.xml) from podcast/episodes.json.

Adding an episode:
  1. Upload the MP3 to Bunny Storage and copy its public URL.
  2. Add an entry to "episodes" in podcast/episodes.json, newest last:
       {"title": "...", "description": "...", "date": "2026-11-01",
        "audio": "https://<your-zone>.b-cdn.net/podcast/ep01.mp3", "number": 1}
  3. Run:  python3 _tools/podcast.py
     It measures the file size and duration from the URL, fills them in, and writes the feed.
  4. Commit and push. Apple Podcasts and Spotify pick up new episodes from the feed on their own.

The feed is only written once the show has a title, description, and square cover image
(1400-3000 px), and at least one episode — the minimum Apple and Spotify accept.
This folder starts with an underscore, so GitHub Pages does not publish it.
"""
import json, os, subprocess, sys, urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "podcast", "episodes.json")
FEED = os.path.join(ROOT, "podcast", "feed.xml")


def probe(url):
    """Size in bytes (from the server) and duration in seconds (via ffprobe)."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        size = int(r.headers["Content-Length"])
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", url], capture_output=True, text=True, check=True)
    return size, int(float(out.stdout.strip()))


def hms(sec):
    return f"{sec // 3600:02d}:{sec % 3600 // 60:02d}:{sec % 60:02d}"


def main():
    data = json.load(open(DATA))
    show, eps = data["show"], data["episodes"]
    missing = [k for k in ("title", "description", "cover") if not show.get(k)]
    if missing or not eps:
        sys.exit(f"Not ready: missing show {', '.join(missing) or '-'}; episodes: {len(eps)}. Feed not written.")

    changed = False
    for ep in eps:
        for k in ("title", "description", "date", "audio"):
            if not ep.get(k):
                sys.exit(f"Episode is missing '{k}': {ep}")
        if not ep.get("bytes") or not ep.get("seconds"):
            ep["bytes"], ep["seconds"] = probe(ep["audio"])
            changed = True
    if changed:
        json.dump(data, open(DATA, "w"), indent=2, ensure_ascii=False)
        open(DATA, "a").write("\n")

    def pub(d):
        return format_datetime(datetime.strptime(d, "%Y-%m-%d").replace(hour=12, tzinfo=timezone.utc))

    items = []
    for ep in sorted(eps, key=lambda e: e["date"], reverse=True):
        guid = ep.get("guid") or ep["audio"]
        items.append(f"""    <item>
      <title>{escape(ep['title'])}</title>
      <description>{escape(ep['description'])}</description>
      <itunes:summary>{escape(ep['description'])}</itunes:summary>
      <pubDate>{pub(ep['date'])}</pubDate>
      <enclosure url="{escape(ep['audio'])}" length="{ep['bytes']}" type="audio/mpeg"/>
      <guid isPermaLink="false">{escape(guid)}</guid>
      <itunes:duration>{hms(ep['seconds'])}</itunes:duration>{f'''
      <itunes:episode>{ep['number']}</itunes:episode>''' if ep.get('number') else ''}
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>{'true' if ep.get('explicit', show['explicit']) else 'false'}</itunes:explicit>
    </item>""")

    sub = f'\n      <itunes:category text="{escape(show["subcategory"])}"/>\n    ' if show.get("subcategory") else ""
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{escape(show['title'])}</title>
    <link>{escape(show['site'])}</link>
    <atom:link href="{escape(show['feed'])}" rel="self" type="application/rss+xml"/>
    <language>{escape(show['language'])}</language>
    <description>{escape(show['description'])}</description>
    <itunes:summary>{escape(show['description'])}</itunes:summary>
    <itunes:author>{escape(show['author'])}</itunes:author>
    <itunes:owner>
      <itunes:name>{escape(show['owner_name'])}</itunes:name>
      <itunes:email>{escape(show['owner_email'])}</itunes:email>
    </itunes:owner>
    <itunes:image href="{escape(show['cover'])}"/>
    <itunes:category text="{escape(show['category'])}">{sub}</itunes:category>
    <itunes:explicit>{'true' if show['explicit'] else 'false'}</itunes:explicit>
    <itunes:type>episodic</itunes:type>
{chr(10).join(items)}
  </channel>
</rss>
"""
    open(FEED, "w").write(feed)
    print(f"Wrote {FEED} with {len(eps)} episode(s).")


if __name__ == "__main__":
    main()
