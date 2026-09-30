/* Podcast episodes on the Film & Media page, read from podcast/episodes.json.
   Until the first episode is published, the "Coming soon" note stays in place. */
(function () {
  "use strict";
  var box = document.getElementById("podcast-episodes");
  if (!box) return;
  fetch(box.getAttribute("data-src"), { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.episodes || !data.episodes.length) return;
      var soon = document.getElementById("podcast-soon");
      if (soon) soon.hidden = true;
      var eps = data.episodes.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      eps.forEach(function (ep) {
        var item = document.createElement("article");
        item.className = "podcast-episode";
        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = (ep.number ? "Episode " + ep.number + " · " : "") +
          new Date(ep.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) +
          (ep.seconds ? " · " + Math.round(ep.seconds / 60) + " min" : "");
        var h = document.createElement("h3");
        h.textContent = ep.title;
        var p = document.createElement("p");
        p.textContent = ep.description;
        var audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.src = ep.audio;
        item.appendChild(meta); item.appendChild(h); item.appendChild(p); item.appendChild(audio);
        box.appendChild(item);
      });
      var links = document.getElementById("podcast-links");
      if (links && data.show && data.show.feed) links.hidden = false;
    })
    .catch(function () {});
})();
