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
    var groups = [".figs", ".steps", ".stack", ".tags", ".stages"];
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

    // Growth-loop diagram: the connecting path draws itself in as the
    // section scrolls past, node by node, rather than firing once.
    var loopPath = document.querySelector(".loop-path");
    if (loopPath) {
      var loopLen = loopPath.getTotalLength();
      loopPath.style.strokeDasharray = loopLen;
      gsap.fromTo(
        loopPath,
        { strokeDashoffset: loopLen },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: "#loop",
            start: "top 70%",
            end: "bottom 60%",
            scrub: 0.6
          }
        }
      );
    }
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

  /* ── generative graphics ──────────────────────────────────
     A handful of canvas sketches dropped into spots that were
     otherwise just whitespace — a sparkline by the hero, a
     scanning checklist by the build steps, firing pixels under
     "What I do", an order-matters relay under "How I work", a
     ping by the contact line. Same grayscale palette as the
     rest of the page, one accent touch each. Each draws a
     single static frame under prefers-reduced-motion and pauses
     its rAF loop while off-screen; independent of GSAP entirely.
     ───────────────────────────────────────────────────────── */
  (function () {
    var nodes = document.querySelectorAll("[data-graphic]");
    if (!nodes.length || typeof HTMLCanvasElement === "undefined") return;

    var rootCss = getComputedStyle(document.documentElement);
    var COL = {
      ink: rootCss.getPropertyValue("--ink").trim() || "#111111",
      soft: rootCss.getPropertyValue("--soft").trim() || "#6F6B63",
      rule: rootCss.getPropertyValue("--rule").trim() || "#DDDAD3",
      accent: rootCss.getPropertyValue("--accent").trim() || "#E2661F",
      ground: rootCss.getPropertyValue("--ground").trim() || "#F5F4F0"
    };

    // Each entry is a factory: called once per canvas, returns a
    // frame(ctx, w, h, t) closure that owns its own local state
    // (a random walk, a flash map, a travelling dot) so multiple
    // instances of the same sketch never share memory.
    var sketches = {
      // Hero: a scrolling performance line over a faint dot grid.
      signal: function () {
        var pts = [], n = 34, val = 0.5, lastStep = -1;
        for (var i = 0; i < n; i++) pts.push(val);
        return function (ctx, w, h, t) {
          ctx.clearRect(0, 0, w, h);
          var step = Math.floor(t / 0.16);
          if (step !== lastStep) {
            lastStep = step;
            val += (Math.random() - 0.5) * 0.24;
            val = Math.max(0.08, Math.min(0.92, val));
            pts.push(val);
            pts.shift();
          }
          ctx.fillStyle = COL.rule;
          var gap = 24;
          for (var gx = gap / 2; gx < w; gx += gap) {
            for (var gy = gap / 2; gy < h; gy += gap) {
              ctx.beginPath();
              ctx.arc(gx, gy, 1, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.beginPath();
          for (var i2 = 0; i2 < pts.length; i2++) {
            var x = (i2 / (pts.length - 1)) * w;
            var y = h - pts[i2] * h * 0.72 - h * 0.12;
            if (i2 === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = COL.accent;
          ctx.lineWidth = 1.75;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.stroke();
          var ly = h - pts[pts.length - 1] * h * 0.72 - h * 0.12;
          ctx.beginPath();
          ctx.arc(w - 3, ly, 2.4 + Math.sin(t * 3) * 1, 0, Math.PI * 2);
          ctx.fillStyle = COL.accent;
          ctx.fill();
        };
      },

      // Work steps: a vertical spine with as many ticks as there
      // are steps beside it, scanning down and looping.
      scan: function () {
        var ticks = 6;
        return function (ctx, w, h, t) {
          ctx.clearRect(0, 0, w, h);
          var top = h * 0.08, bottom = h * 0.92, span = bottom - top;
          var cx = w * 0.26;
          ctx.strokeStyle = COL.rule;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, top);
          ctx.lineTo(cx, bottom);
          ctx.stroke();

          var cycle = 4.2;
          var phase = (t % cycle) / cycle;
          var activeIdx = Math.floor(phase * ticks);

          for (var i = 0; i < ticks; i++) {
            var y = top + (i / (ticks - 1)) * span;
            var on = i <= activeIdx;
            var near = i === activeIdx;
            ctx.beginPath();
            ctx.arc(cx, y, near ? 4.2 : 3, 0, Math.PI * 2);
            ctx.fillStyle = on ? COL.accent : COL.ground;
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = on ? COL.accent : COL.soft;
            ctx.stroke();

            ctx.strokeStyle = on ? COL.ink : COL.rule;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx + 12, y);
            ctx.lineTo(cx + 12 + (on ? 34 : 20), y);
            ctx.stroke();
          }
        };
      },

      // What I do: a loose grid of tracking pixels, one firing
      // at a time.
      pixels: function () {
        var cols = 7, rows = 4, flashes = {}, nextSpawn = 0;
        return function (ctx, w, h, t) {
          ctx.clearRect(0, 0, w, h);
          var padX = w * 0.06, padY = h * 0.14;
          var gx = (w - padX * 2) / (cols - 1);
          var gy = (h - padY * 2) / (rows - 1);

          if (t > nextSpawn) {
            nextSpawn = t + 0.16 + Math.random() * 0.3;
            var key = Math.floor(Math.random() * rows) + "-" + Math.floor(Math.random() * cols);
            flashes[key] = t;
          }

          for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
              var x = padX + c * gx, y = padY + r * gy;
              var key2 = r + "-" + c;
              var since = flashes[key2] !== undefined ? t - flashes[key2] : Infinity;
              var lit = since >= 0 && since < 0.6;
              var s = lit ? 1 - since / 0.6 : 0;
              ctx.beginPath();
              ctx.arc(x, y, 2 + s * 2.2, 0, Math.PI * 2);
              ctx.fillStyle = lit ? COL.accent : COL.rule;
              ctx.globalAlpha = lit ? 0.35 + s * 0.65 : 1;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        };
      },

      // How I work: three nodes, a pulse relaying between them —
      // the order matters.
      sequence: function () {
        return function (ctx, w, h, t) {
          ctx.clearRect(0, 0, w, h);
          var y = h * 0.5;
          var xs = [w * 0.12, w * 0.5, w * 0.88];
          ctx.strokeStyle = COL.rule;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(xs[0], y);
          ctx.lineTo(xs[2], y);
          ctx.stroke();

          var cycle = 2.8;
          var phase = (t % cycle) / cycle;
          var travel = phase * (xs.length - 1);
          var seg = Math.min(Math.floor(travel), xs.length - 2);
          var segT = travel - seg;
          var px = xs[seg] + (xs[seg + 1] - xs[seg]) * segT;

          for (var i = 0; i < xs.length; i++) {
            ctx.beginPath();
            ctx.arc(xs[i], y, 5, 0, Math.PI * 2);
            ctx.fillStyle = COL.ground;
            ctx.fill();
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = COL.ink;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(px, y, 3.6, 0, Math.PI * 2);
          ctx.fillStyle = COL.accent;
          ctx.fill();
        };
      },

      // Contact: a quiet ping, three rings out from a center dot.
      ping: function () {
        return function (ctx, w, h, t) {
          ctx.clearRect(0, 0, w, h);
          var cx = w / 2, cy = h / 2, maxR = Math.min(w, h) * 0.42, cycle = 2.2;
          for (var k = 0; k < 3; k++) {
            var pt = ((((t + (k * cycle) / 3) % cycle) + cycle) % cycle) / cycle;
            var r = Math.max(0, pt * maxR);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = COL.accent;
            ctx.globalAlpha = (1 - pt) * 0.55;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = COL.ink;
          ctx.fill();
        };
      }
    };

    [].forEach.call(nodes, function (cv) {
      var make = sketches[cv.dataset.graphic];
      if (!make) return;

      function size() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = cv.clientWidth, h = cv.clientHeight;
        if (!w || !h) return null;
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        var ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, w: w, h: h };
      }

      var dims = size();
      if (!dims) return;
      var frame = make();

      if (reduce) {
        frame(dims.ctx, dims.w, dims.h, 0);
        return;
      }

      var visible = true;
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          function (entries) {
            visible = entries[0].isIntersecting;
          },
          { threshold: 0 }
        ).observe(cv);
      }

      // t0 is set from the first rAF timestamp itself, not a separately
      // sampled performance.now() — mixing the two clocks let the very
      // first delta go slightly negative in some browsers.
      var t0 = null;
      requestAnimationFrame(function loop(ts) {
        if (t0 === null) t0 = ts;
        if (visible) frame(dims.ctx, dims.w, dims.h, Math.max(0, (ts - t0) / 1000));
        requestAnimationFrame(loop);
      });

      var resizeTimer;
      window.addEventListener(
        "resize",
        function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            var d = size();
            if (d) {
              dims.ctx = d.ctx;
              dims.w = d.w;
              dims.h = d.h;
            }
          }, 150);
        },
        { passive: true }
      );
    });
  })();
})();
