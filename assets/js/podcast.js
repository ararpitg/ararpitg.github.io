/* Podcast episodes on the Film & Media page, read from podcast/episodes.json.
   Until the first episode is published, the "Coming soon" note stays in place.
   An episode without an audio URL and a date is a draft and is not shown. */
(function () {
  "use strict";
  var box = document.getElementById("podcast-episodes");
  if (!box) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function clock(s) {
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    var mm = (h && m < 10 ? "0" : "") + m, ss = (sec < 10 ? "0" : "") + sec;
    return (h ? h + ":" : "") + mm + ":" + ss;
  }
  function link(href, text) {
    var a = el("a", null, text);
    a.href = href;
    if (/^https?:/.test(href) && href.indexOf(location.host) < 0) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  fetch(box.getAttribute("data-src"), { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.episodes) return;
      var eps = data.episodes.filter(function (ep) { return ep.audio && ep.date; });
      if (!eps.length) return;
      var soon = document.getElementById("podcast-soon");
      if (soon) soon.hidden = true;
      eps.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      eps.forEach(function (ep) {
        var item = el("article", "podcast-episode");
        item.id = "episode-" + (ep.number || ep.date);
        if (ep.image) {
          var img = el("img", "podcast-art");
          img.src = ep.image; img.alt = ""; img.loading = "lazy";
          item.appendChild(img);
        }
        var meta = el("div", "meta", (ep.number ? "Episode " + ep.number + " · " : "") +
          new Date(ep.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) +
          (ep.seconds ? " · " + Math.round(ep.seconds / 60) + " min" : ""));
        item.appendChild(meta);
        item.appendChild(el("h3", null, ep.title));
        item.appendChild(el("p", null, ep.notes ? ep.notes.split("\n\n")[0] : ep.description));
        if (ep.notes && ep.notes.indexOf("\n\n") > 0) {
          item.appendChild(el("p", "podcast-note", ep.notes.split("\n\n").slice(1).join(" ")));
        }
        var audio = el("audio");
        audio.controls = true; audio.preload = "none"; audio.src = ep.audio;
        item.appendChild(audio);
        if (ep.chapters && ep.chapters.length) {
          var det = el("details", "podcast-chapters");
          det.appendChild(el("summary", null, "Chapters"));
          var ol = el("ol");
          ep.chapters.forEach(function (c) {
            var li = el("li");
            var b = el("button", null, clock(c[0]));
            b.type = "button";
            b.addEventListener("click", function () { audio.currentTime = c[0]; audio.play(); });
            li.appendChild(b); li.appendChild(el("span", null, c[1]));
            ol.appendChild(li);
          });
          det.appendChild(ol); item.appendChild(det);
        }
        var more = el("p", "podcast-links");
        [["transcript", "Transcript"], ["youtube", "Watch on YouTube"]].forEach(function (k) {
          if (!ep[k[0]]) return;
          if (more.childNodes.length) more.appendChild(document.createTextNode(" · "));
          more.appendChild(link(ep[k[0]], k[1]));
        });
        (ep.links || []).forEach(function (l) {
          if (more.childNodes.length) more.appendChild(document.createTextNode(" · "));
          more.appendChild(link(l[1], l[0]));
        });
        if (more.childNodes.length) item.appendChild(more);
        if (ep.credits) item.appendChild(el("p", "podcast-credits", ep.credits));
        box.appendChild(item);
      });
      var links = document.getElementById("podcast-links");
      if (links && data.show && data.show.feed) links.hidden = false;
    })
    .catch(function () {});
})();
