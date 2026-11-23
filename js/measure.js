/* toxuesure — measurement. Pushes events into dataLayer; GTM (GTM-TCVJGQFV) owns the tags.
   Events: contact_click, outbound_click, section_view, scroll_depth (same names and
   variables as the previous site, so existing GTM triggers keep working), plus lens_open
   (first time a visitor opens the fog lens). */
(function () {
  "use strict";
  var dl = (window.dataLayer = window.dataLayer || []);

  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var tag = a.dataset.gtm;
    if (href.indexOf("mailto:") === 0) {
      dl.push({ event: "contact_click", method: "email", link_id: tag || "email" });
    } else if (/^https?:/.test(href) && a.hostname !== location.hostname) {
      dl.push({ event: "outbound_click", link_domain: a.hostname, link_url: href, link_id: tag || null });
    }
  }, true);

  if ("IntersectionObserver" in window) {
    var seen = {};
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        if (!id || seen[id]) return;
        seen[id] = 1;
        dl.push({ event: "section_view", section_id: id });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    [].forEach.call(document.querySelectorAll("section[id]"), function (s) { sio.observe(s); });
  }

  var marks = [25, 50, 75, 100], hit = {}, ticking = false;
  function depth() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    var pct = ((window.scrollY / h) * 100) | 0;
    marks.forEach(function (m) {
      if (pct >= m && !hit[m]) { hit[m] = 1; dl.push({ event: "scroll_depth", percent_scrolled: m }); }
    });
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(depth); }
  }, { passive: true });

  var lensSent = false;
  window.addEventListener("tx:lens", function (e) {
    if (lensSent) return;
    lensSent = true;
    dl.push({ event: "lens_open", method: e.detail || "pointer" });
  });
})();
