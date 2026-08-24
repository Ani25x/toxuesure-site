/* Toxuesure — reveal choreography (GSAP + ScrollTrigger) + dataLayer events. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dl = (window.dataLayer = window.dataLayer || []);
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ── reveal choreography ──────────────────────────────────
     Same visual language as before — masked hero lines, a
     self-drawing rule, a wipe-up number, a soft rise-and-fade
     for everything else — now driven by GSAP so the stagger,
     easing and scroll-trigger timing live in one place instead
     of being split across CSS transitions + an IO callback.
     ───────────────────────────────────────────────────────── */
  if (reduce || !hasGSAP) {
    document.body.classList.add("ready");
    [].forEach.call(document.querySelectorAll(".r,.rule,.fig"), function (el) {
      el.classList.add("in");
    });
  } else {
    // GSAP infers a tween's starting point from whatever it last wrote to
    // that property itself — a percentage transform authored in CSS isn't
    // something it can read back reliably. So every reveal below uses
    // fromTo() with an explicit start, rather than to() trusting the CSS.

    // Hero: lines rise in on load, no scroll needed. Pixel offset (not
    // yPercent) — computed from each line's own height so it still masks
    // cleanly, but sidesteps a GSAP/percentage-transform interaction that
    // left the transform stuck at its starting value in testing.
    document.querySelectorAll(".hero h1 span i").forEach(function (el, i) {
      gsap.fromTo(
        el,
        { y: el.offsetHeight * 1.05 },
        {
          y: 0,
          duration: 0.95,
          ease: "power3.out",
          delay: 0.05 + i * 0.09,
          onStart: i === 0
            ? function () {
                document.body.classList.add("ready");
              }
            : undefined
        }
      );
    });
    gsap.fromTo(
      ".hero .r",
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.62, ease: "power2.out", stagger: 0.08, delay: 0.3 }
    );

    // Everything below the fold: rise-and-fade in on scroll, grouped
    // so a run of siblings reads as one gesture rather than four events.
    var groups = [".figs", ".steps", ".stack", ".tags"];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (group) {
        gsap.fromTo(
          group.children,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.62,
            ease: "power2.out",
            stagger: 0.08,
            scrollTrigger: { trigger: group, start: "top 88%" }
          }
        );
      });
    });

    // Everything else with a plain .r that isn't inside one of the
    // grouped containers above (case head, ledes, note, contact block).
    document.querySelectorAll(".r").forEach(function (el) {
      if (el.closest(".hero") || el.closest(groups.join(","))) return;
      gsap.fromTo(
        el,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%" }
        }
      );
    });

    // Section rules draw themselves left-to-right on scroll.
    document.querySelectorAll(".rule").forEach(function (el) {
      gsap.fromTo(
        el,
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%" }
        }
      );
    });

    // Stat numbers wipe up from behind their own overflow mask.
    document.querySelectorAll(".fig .n em").forEach(function (el) {
      gsap.fromTo(
        el,
        { y: el.offsetHeight * 1.05 },
        {
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%" }
        }
      );
    });
  }

  /* ── cursor dot ───────────────────────────────────────────
     Fine pointers only. GSAP quickTo replaces the hand-rolled
     lerp/rAF loop — same feel, fewer moving parts.
     ───────────────────────────────────────────────────────── */
  var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  if (fine && !reduce) {
    var dot = document.createElement("div");
    dot.id = "dot";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.body.classList.add("dot-on");

    var setX, setY;
    if (hasGSAP) {
      setX = gsap.quickTo(dot, "x", { duration: 0.34, ease: "power3" });
      setY = gsap.quickTo(dot, "y", { duration: 0.34, ease: "power3" });
    }

    var BLOCK = ".fig,.step,.item,.note,.shot,.tag";

    document.addEventListener(
      "mousemove",
      function (e) {
        if (hasGSAP) {
          setX(e.clientX);
          setY(e.clientY);
        } else {
          dot.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
        }
        if (!dot.classList.contains("live")) dot.classList.add("live");

        var t = e.target;
        var link = t.closest("a,button");
        var block = t.closest(BLOCK);
        dot.classList.toggle("on-link", !!link);
        dot.classList.toggle("on-block", !link && !!block);
      },
      { passive: true }
    );

    document.addEventListener("mouseleave", function () {
      dot.classList.remove("live");
    });
    document.addEventListener("mouseenter", function () {
      dot.classList.add("live");
    });
  }

  /* ── measurement ──────────────────────────────────────────
     Fires into dataLayer so GTM owns the tag config, not the page.
     Create matching Custom Event triggers in GTM:
       outbound_click, contact_click, section_view
     ───────────────────────────────────────────────────────── */

  document.addEventListener(
    "click",
    function (ev) {
      var a = ev.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var tag = a.dataset.gtm;

      if (href.indexOf("mailto:") === 0) {
        dl.push({ event: "contact_click", method: "email", link_id: tag || "email" });
      } else if (/^https?:/.test(href) && a.hostname !== location.hostname) {
        dl.push({
          event: "outbound_click",
          link_domain: a.hostname,
          link_url: href,
          link_id: tag || null
        });
      }
    },
    true
  );

  /* one section_view per section, once */
  if ("IntersectionObserver" in window) {
    var seen = {};
    var sio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.id;
          if (!id || seen[id]) return;
          seen[id] = 1;
          dl.push({ event: "section_view", section_id: id });
        });
      },
      { threshold: 0.3 }
    );
    [].forEach.call(document.querySelectorAll("section[id]"), function (s) {
      sio.observe(s);
    });
  }

  /* scroll depth, quarters, once each */
  var marks = [25, 50, 75, 100],
    hit = {},
    ticking = false;
  function depth() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    var pct = ((window.scrollY / h) * 100) | 0;
    marks.forEach(function (m) {
      if (pct >= m && !hit[m]) {
        hit[m] = 1;
        dl.push({ event: "scroll_depth", percent_scrolled: m });
      }
    });
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(depth);
      }
    },
    { passive: true }
  );
})();
