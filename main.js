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
    // The generative-graphic containers get their own, later trigger:
    // they now bleed past their section's usual reveal point, so firing
    // at the text's "top 90%" would reveal an empty/half-drawn canvas.
    var graphicSel = ".hero-graphic,.work-graphic,.services-graphic,.approach-graphic,.contact-graphic";
    document.querySelectorAll(".r").forEach(function (el) {
      if (el.closest(".hero") || el.closest(groups.join(","))) return;
      var isGraphic = el.matches(graphicSel);
      gsap.fromTo(
        el,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: isGraphic ? "top 97%" : "top 90%" }
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
     Five instruments, one idea: an invisible field made visible
     by something moving through it. A flow field combed by
     particles (hero), a damped four-term oscillator drawing
     itself in ink (build steps), a domain-warped noise field
     read as contour lines (what I do), a standing wave sorting
     sand into figures (how I work), a strange attractor
     developing like a print in a tray (contact). Same grayscale
     palette throughout; orange is a scarcity budget, never more
     than a sliver of any frame — a few signal particles in the
     current, a mis-registered second pass, one contour among
     six, flecks in the sand, a caustic ridge. Every piece is
     built by accumulating near-transparent marks rather than
     drawing solid shapes, so texture comes from dwell time, not
     detail. Independent of GSAP; each pauses off-screen and
     collapses to one considered static frame under
     prefers-reduced-motion instead of animating.
     ───────────────────────────────────────────────────────── */
  (function () {
    var nodes = document.querySelectorAll("[data-graphic]");
    if (!nodes.length || typeof HTMLCanvasElement === "undefined") return;

    var INK = [17, 17, 17];
    var GRAY = [111, 107, 99];
    var ORANGE = [226, 102, 31];

    function rgba(c, a) {
      return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
    }
    function clamp01(v) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    function hashStr(s) {
      var h = 5381;
      for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      return h >>> 0;
    }

    // Deterministic PRNG (mulberry32) — each instance gets its own seed so
    // the reduced-motion frame is a curated snapshot, not a lottery ticket.
    function mulberry32(a) {
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // Compact 2D gradient noise + fBm. Not a scientific Perlin
    // implementation, just enough correlated randomness for organic drift.
    function makeNoise2D(seed) {
      var rand = mulberry32(seed);
      var p = new Uint8Array(256);
      for (var i = 0; i < 256; i++) p[i] = i;
      for (var j = 255; j > 0; j--) {
        var k = (rand() * (j + 1)) | 0;
        var tmp = p[j];
        p[j] = p[k];
        p[k] = tmp;
      }
      var perm = new Uint8Array(512);
      for (var m = 0; m < 512; m++) perm[m] = p[m & 255];

      function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
      }
      function lerp(a, b, t) {
        return a + t * (b - a);
      }
      function grad(hash, x, y) {
        var h = hash & 7;
        var u = h < 4 ? x : y;
        var v = h < 4 ? y : x;
        return (h & 1 ? -u : u) + (h & 2 ? -2 * v : 2 * v);
      }
      function noise2(x, y) {
        var X = Math.floor(x) & 255,
          Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        var u = fade(x),
          v = fade(y);
        var a = perm[X] + Y,
          aa = perm[a],
          ab = perm[a + 1];
        var b = perm[X + 1] + Y,
          ba = perm[b],
          bb = perm[b + 1];
        return (
          lerp(
            lerp(grad(perm[aa], x, y), grad(perm[ba], x - 1, y), u),
            lerp(grad(perm[ab], x, y - 1), grad(perm[bb], x - 1, y - 1), u),
            v
          ) *
            0.5 +
          0.5
        );
      }
      function fbm(x, y, oct, lac, gain) {
        oct = oct || 3;
        lac = lac || 2;
        gain = gain || 0.5;
        var amp = 1,
          freq = 1,
          sum = 0,
          norm = 0;
        for (var i = 0; i < oct; i++) {
          sum += amp * (noise2(x * freq, y * freq) * 2 - 1);
          norm += amp;
          amp *= gain;
          freq *= lac;
        }
        return sum / norm;
      }
      return { noise2: noise2, fbm: fbm };
    }

    // Trail decay via destination-out so marks fade to true transparency
    // (the box's off-white CSS background shows through) rather than
    // asymptoting toward a muddy tint the way a low-alpha ground fill does.
    function fadeTrail(ctx, w, h, amount) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + amount + ")";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }
    // Framerate-independent decay amount for a given memory (seconds).
    function fadeAmt(tau, dt) {
      return 1 - Math.exp(-dt / tau);
    }

    // Standard marching squares (linear edge interpolation, saddle cases
    // resolved a fixed way — any artifact there is a sub-pixel nicety at
    // this scale) — draws every crossing of `level` into the current path.
    function marchContour(field, cols, rows, cell, level, ctx) {
      function v(i, j) {
        return field[j * cols + i];
      }
      function seg(a, b) {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.beginPath();
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var x = i * cell,
            y = j * cell;
          var v0 = v(i, j),
            v1 = v(i + 1, j),
            v2 = v(i + 1, j + 1),
            v3 = v(i, j + 1);
          var idx = (v0 > level ? 1 : 0) | (v1 > level ? 2 : 0) | (v2 > level ? 4 : 0) | (v3 > level ? 8 : 0);
          if (idx === 0 || idx === 15) continue;
          var top = [x + cell * clamp01((level - v0) / (v1 - v0 || 1e-6)), y];
          var right = [x + cell, y + cell * clamp01((level - v1) / (v2 - v1 || 1e-6))];
          var bottom = [x + cell * clamp01((level - v3) / (v2 - v3 || 1e-6)), y + cell];
          var left = [x, y + cell * clamp01((level - v0) / (v3 - v0 || 1e-6))];
          switch (idx) {
            case 1:
            case 14:
              seg(top, left);
              break;
            case 2:
            case 13:
              seg(top, right);
              break;
            case 3:
            case 12:
              seg(left, right);
              break;
            case 4:
            case 11:
              seg(right, bottom);
              break;
            case 6:
            case 9:
              seg(top, bottom);
              break;
            case 7:
            case 8:
              seg(left, bottom);
              break;
            case 5:
              seg(top, right);
              seg(left, bottom);
              break;
            case 10:
              seg(top, left);
              seg(right, bottom);
              break;
          }
        }
      }
      ctx.stroke();
    }

    // Each entry is a factory: called once per canvas with a seed, returns
    // a frame(ctx, w, h, dt, cv) closure that owns its own local state —
    // particle positions, an oscillator phase, a density grid — so
    // multiple instances never share memory. dt is real elapsed seconds
    // since the previous call (already clamped by the caller).
    var sketches = {
      // Hero — "Stack": the headline drawn rather than decorated. Three
      // strata, top to bottom: spend crossing above, the store as
      // structure in the middle, measurement running underneath. Each
      // event falls out of the spend layer, through a gap in the store,
      // and — only if the tracking below is wired up — lands on the
      // baseline as a recorded tick. The rest dissolve in the gap between
      // the two: the sale happened, nothing caught it. That caught-share
      // breathes on a slow cycle, so the piece keeps moving between a
      // leaky measurement layer and a sound one rather than asserting
      // either. Orange is only ever *recorded* revenue — which is the
      // distinction the whole page is arguing about.
      stack: function (seed) {
        var rand = mulberry32(seed ^ 0x57ac);
        var N = 70,
          CELLS = 7;
        var evts = [],
          ticks = [],
          tAcc = 0;

        function spawn(e, w, h, scatter) {
          e.x = -0.06 * w + rand() * w * 0.45;
          e.y = h * (0.03 + rand() * 0.13);
          // First fill only: scatter through the whole frame so the piece
          // opens mid-flow instead of with one tidy cohort at the top.
          if (scatter) {
            e.x += rand() * w * 0.6;
            e.y += rand() * h * 0.75;
          }
          e.px = e.x;
          e.py = e.y;
          e.vx = (0.1 + rand() * 0.14) * w;
          e.vy = (0.1 + rand() * 0.14) * h;
          e.judged = false;
          e.tracked = false;
          e.dead = 0;
        }
        for (var i = 0; i < N; i++) evts.push({ x: undefined });

        return function (ctx, w, h, dt) {
          tAcc += dt;
          ctx.clearRect(0, 0, w, h);

          var storeT = h * 0.44,
            storeB = h * 0.52,
            baseY = h * 0.8,
            pad = w * 0.06,
            span = w - pad * 2;

          // The share of what happens upstairs that the tracking actually
          // catches. Breathes rather than sitting fixed, so the piece
          // shows both the broken and the wired-up state.
          var health = 0.38 + 0.44 * (0.5 + 0.5 * Math.sin(tAcc * 0.085));

          // ── middle stratum: the store, as structure with gaps
          // Outlined, not filled: the store is structure the events pass
          // through, not the heaviest mass on the canvas.
          var cw = (span / CELLS) * 0.52;
          ctx.strokeStyle = rgba(INK, 0.2);
          ctx.lineWidth = 1;
          for (var c = 0; c < CELLS; c++) {
            ctx.strokeRect(
              Math.round(pad + (span / CELLS) * (c + 0.5) - cw / 2) + 0.5,
              Math.round(storeT) + 0.5,
              Math.round(cw),
              Math.round(storeB - storeT)
            );
          }

          // ── bottom stratum: the measurement layer
          ctx.strokeStyle = rgba(INK, 0.24);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pad * 0.4, baseY + 0.5);
          ctx.lineTo(w - pad * 0.4, baseY + 0.5);
          ctx.stroke();
          ctx.fillStyle = rgba(INK, 0.13);
          for (var g = 0; g <= 22; g++) {
            ctx.fillRect(pad * 0.4 + ((w - pad * 0.8) / 22) * g, baseY + 2.5, 1, 3);
          }

          // ── top stratum falling through the other two
          for (var k = 0; k < evts.length; k++) {
            var e = evts[k];
            if (e.x === undefined) spawn(e, w, h, true);
            e.px = e.x;
            e.py = e.y;
            e.x += e.vx * dt;
            e.y += e.vy * dt;

            // Decided once, on the way out of the store: caught or not.
            if (!e.judged && e.y >= storeB) {
              e.judged = true;
              e.tracked = rand() < health;
            }
            if (e.judged && !e.tracked) e.dead += dt * 1.6;

            if (e.judged && e.tracked && e.py < baseY && e.y >= baseY) {
              ticks.push({ x: e.x, t: 0 });
              spawn(e, w, h, false);
              continue;
            }
            if (e.y > h * 1.08 || e.x > w * 1.12 || e.dead >= 1) {
              spawn(e, w, h, false);
              continue;
            }

            var col = GRAY,
              al = 0.3;
            if (!e.judged) {
              col = ORANGE;
              al = e.y < storeT ? 0.6 : 0.44;
            } else if (e.tracked) {
              col = ORANGE;
              al = 0.72;
            } else {
              al = 0.46 * (1 - e.dead);
            }
            // A fixed-length streak, not the single frame's step: the
            // canvas is cleared every frame, so one frame of travel is a
            // 3px dash and the whole layer reads as empty.
            ctx.strokeStyle = rgba(col, al);
            ctx.lineWidth = e.judged && e.tracked ? 1.3 : 1;
            ctx.beginPath();
            ctx.moveTo(e.x - e.vx * 0.13, e.y - e.vy * 0.13);
            ctx.lineTo(e.x, e.y);
            ctx.stroke();
          }

          // ── what the tracking actually recorded, accumulating
          for (var t2 = ticks.length - 1; t2 >= 0; t2--) {
            var tk = ticks[t2];
            tk.t += dt;
            if (tk.t > 9) {
              ticks.splice(t2, 1);
              continue;
            }
            var grow = Math.min(1, tk.t * 4),
              fade = 1 - tk.t / 9;
            ctx.fillStyle = rgba(ORANGE, 0.7 * fade);
            ctx.fillRect(tk.x - 0.7, baseY - 11 * grow, 1.4, 11 * grow);
          }
        };
      },

      // Build steps — "Harmonograph": a damped four-term pendulum figure
      // drawn as one continuous ink line, detuned so it never closes —
      // tied to how far the reader has scrolled through the six build
      // steps beside it, so descending the list literally draws the
      // figure. A faint mis-registered orange second pass rides beside
      // the main line. Holds, dissolves, and redraws from a curated set
      // of parameter tuples.
      harmonograph: function (seed) {
        var rand = mulberry32(seed ^ 0x1234567);
        var sets = [
          [2.001, 3.004, 3.002, 2.007],
          [3.003, 2.002, 4.001, 3.005],
          [2.004, 5.002, 3.001, 2.003],
          [4.002, 3.003, 2.005, 5.001],
          [3.001, 4.004, 5.003, 2.002],
          [2.006, 2.003, 4.005, 3.002]
        ];
        // Damping is tuned so the figure has fully wound down by tEnd —
        // at the original harmonograph time-scale (d~0.002, tEnd~600+)
        // the near-integer frequencies complete hundreds of overlapping
        // revolutions before decaying, which plots as solid mud rather
        // than a legible rosette. This range resolves in ~15-25 turns.
        var dMain = [0.026, 0.031, 0.022, 0.036];
        var dGhost = [dMain[0] * 0.6, dMain[1] * 0.6, dMain[2] * 0.6, dMain[3] * 0.6];
        var setIdx = (rand() * sets.length) | 0;
        var t = 0,
          lastT = 0,
          tEnd = 72;
        var holding = false,
          holdT = 0,
          dissolving = false,
          dissolveT = 0;

        // One centre per parameter set, so consecutive takes don't stack
        // on the same spot — a small recompose rather than the same
        // figure redrawn dead-centre every 18 seconds forever.
        var centers = [
          [0.44, 0.5],
          [0.52, 0.44],
          [0.38, 0.55],
          [0.5, 0.53],
          [0.42, 0.46],
          [0.55, 0.51]
        ];

        function penXY(f, phase, tt, w, h, damp, c) {
          // Amplitudes now reach ~0.59w from centre at peak (early,
          // undamped sweeps) — the figure is allowed to run past its own
          // frame while loud and resolve back inside as it decays, rather
          // than being scaled to fit entirely within the box at all times.
          var A1 = 0.4 * w,
            A2 = 0.19 * w,
            A3 = 0.44 * h,
            A4 = 0.2 * h;
          var x =
            A1 * Math.sin(f[0] * tt + phase) * Math.exp(-damp[0] * tt) +
            A2 * Math.sin(f[1] * tt + phase + 1.3) * Math.exp(-damp[1] * tt);
          var y =
            A3 * Math.sin(f[2] * tt + phase + 2.1) * Math.exp(-damp[2] * tt) +
            A4 * Math.sin(f[3] * tt + phase + 0.6) * Math.exp(-damp[3] * tt);
          return [x + w * c[0], y + h * c[1]];
        }

        return function (ctx, w, h, dt, cv) {
          var f = sets[setIdx];

          if (dissolving) {
            fadeTrail(ctx, w, h, fadeAmt(0.85, dt));
            dissolveT += dt;
            if (dissolveT > 2.4) {
              dissolving = false;
              dissolveT = 0;
              t = 0;
              lastT = 0;
              holding = false;
              holdT = 0;
              setIdx = (setIdx + 1) % sets.length;
            }
            return;
          }

          var target = null;
          if (!reduce && cv) {
            var wrap = cv.closest(".steps-wrap");
            if (wrap) {
              var r = wrap.getBoundingClientRect();
              var vh = window.innerHeight || 800;
              var total = r.height + vh * 0.7;
              var passed = vh * 0.92 - r.top;
              target = clamp01(passed / total) * tEnd;
            }
          }
          if (target !== null) {
            t += (target - t) * Math.min(1, dt * 3.5);
          } else {
            t += dt * 2.6;
          }
          if (t >= tEnd) {
            t = tEnd;
            holding = true;
          }

          // Advance lastT by at most maxSpan per frame, sampled at a fixed
          // fine step regardless of how big the backlog is — a sudden
          // scroll jump (or the reduced-motion catch-up) then costs a
          // few extra frames rather than a handful of coarse, low-alpha
          // segments that read as a smear instead of a line.
          var rawSpan = t - lastT;
          if (rawSpan > 0.015) {
            var c = centers[setIdx];
            var span = Math.min(rawSpan, 3.2);
            var subSteps = Math.min(48, Math.max(1, Math.ceil(span / 0.12)));
            var stepSize = span / subSteps;
            var tt = lastT;
            var prevMain = penXY(f, 0, tt, w, h, dMain, c);
            var prevGhost = penXY(f, 0.06, tt, w, h, dGhost, c);
            for (var s = 0; s < subSteps; s++) {
              tt += stepSize;
              var curMain = penXY(f, 0, tt, w, h, dMain, c);
              var segLen = Math.hypot(curMain[0] - prevMain[0], curMain[1] - prevMain[1]) + 3;
              var a = Math.max(0.03, Math.min(0.22, 0.9 / segLen));
              ctx.strokeStyle = rgba(INK, a);
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(prevMain[0], prevMain[1]);
              ctx.lineTo(curMain[0], curMain[1]);
              ctx.stroke();
              prevMain = curMain;

              var curGhost = penXY(f, 0.06, tt, w, h, dGhost, c);
              ctx.strokeStyle = rgba(ORANGE, 0.09);
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(prevGhost[0], prevGhost[1]);
              ctx.lineTo(curGhost[0], curGhost[1]);
              ctx.stroke();
              prevGhost = curGhost;
            }
            lastT += span;
          }

          if (holding) {
            holdT += dt;
            if (holdT > 5) dissolving = true;
          }
        };
      },

      // "What I do" — "Isopleth": a domain-warped noise field read as
      // contour lines, like topography. One level runs in orange and its
      // topology drifts — splitting, merging, budding islands — as the
      // field moves. A sparse fixed stipple stands in for hatch texture.
      isopleth: function (seed) {
        var noise = makeNoise2D(seed);
        var t = mulberry32(seed ^ 7)() * 40;
        var levels = [-0.3, -0.15, 0, 0.15, 0.3, 0.45];
        // Density field lives in the closure now, not reallocated every
        // frame — only rebuilt when the canvas itself changes size.
        var field = null,
          fCols = 0,
          fRows = 0;
        // The accent contour migrates slowly through the level set instead
        // of always sitting on the same isoline, so the orange thread
        // itself keeps recomposing rather than tracing a fixed groove.
        var oIdx = 3,
          oT = 0;

        return function (ctx, w, h, dt) {
          if (!reduce) t += dt * 0.45;
          ctx.clearRect(0, 0, w, h);
          var cell = 10;
          var cols = Math.ceil(w / cell) + 1,
            rows = Math.ceil(h / cell) + 1;
          if (cols !== fCols || rows !== fRows) {
            fCols = cols;
            fRows = rows;
            field = new Float32Array(cols * rows);
          }
          for (var j = 0; j < rows; j++) {
            for (var i = 0; i < cols; i++) {
              var x = i * cell,
                y = j * cell;
              var q = noise.fbm(x * 0.0075 + 100, y * 0.0075 + t, 2, 2, 0.5);
              field[j * cols + i] = noise.fbm(x * 0.0075 + 2.4 * q, y * 0.0075 + 2.4 * q + t, 3, 2, 0.5);
            }
          }
          oT += dt;
          if (oT > 17) {
            oT = 0;
            oIdx = (oIdx + 1) % levels.length;
          }
          for (var li = 0; li < levels.length; li++) {
            var level = levels[li];
            var isMid = li === oIdx;
            ctx.strokeStyle = isMid ? rgba(ORANGE, 0.5) : rgba(li > 2 ? INK : GRAY, 0.09 + (li / levels.length) * 0.11);
            ctx.lineWidth = isMid ? 1.1 : 0.7;
            marchContour(field, cols, rows, cell, level, ctx);
          }
          ctx.fillStyle = rgba(INK, 0.055);
          for (var jj = 0; jj < rows; jj += 2) {
            for (var ii = 0; ii < cols; ii += 2) {
              if (field[jj * cols + ii] > 0.45) {
                ctx.fillRect(ii * cell + (ii % 4 === 0 ? 1 : 3), jj * cell + (jj % 3 === 0 ? 2 : 4), 1, 1);
              }
            }
          }
        };
      },

      // "How we work" — "Fork": the section's argument, not a texture.
      // Both runs start from the same point and both end up scaled — that
      // is the honest part, spend does grow either way. What differs is
      // what it grows into. The lower run scales first, so every step
      // inherits the error of the step before it: the spread compounds on
      // itself and the run ends as a grey haze with nothing recoverable
      // in it. The upper run holds still while the measurement gets
      // fixed — the flat, narrow, visibly boring stretch on the left —
      // and only then opens up, so its strands stay ordered the whole way
      // out. The gap between them is the cost of the wrong order, and it
      // is drawn widening rather than stated.
      fork: function (seed) {
        var rand = mulberry32(seed ^ 0xf02c);
        var STR = 30,
          SEG = 46,
          FIX = 0.34; // where the upper run stops holding and starts scaling
        var good = [],
          bad = [];
        var p = 0,
          holdT = 0,
          phase = "draw";

        function build() {
          good.length = 0;
          bad.length = 0;
          for (var s = 0; s < STR; s++) {
            var gy = [],
              by = [],
              acc = (rand() - 0.5) * 0.015,
              vel = 0;
            for (var i = 0; i <= SEG; i++) {
              var u = i / SEG;
              // Fix first: locked flat until the data is sound, then a
              // bounded fan — each strand's own lane, held.
              var open = u < FIX ? 0 : (u - FIX) / (1 - FIX);
              gy.push((s / (STR - 1) - 0.5) * open * open * 0.4 + (rand() - 0.5) * 0.006 * open);
              // Scale first: the error is integrated twice — it does not
              // just persist, it accelerates away from the truth.
              vel += (rand() - 0.5) * 0.0048 * (0.3 + u * 1.9);
              acc += vel * 0.5;
              if (acc > 0.24) acc = 0.24;
              if (acc < -0.24) acc = -0.24;
              by.push(acc);
            }
            good.push(gy);
            bad.push(by);
          }
        }
        build();

        return function (ctx, w, h, dt) {
          if (phase === "draw") {
            p += dt * 0.26;
            if (p >= 1) {
              p = 1;
              phase = "hold";
              holdT = 0;
            }
          } else {
            holdT += dt;
            if (holdT > 4.2) {
              build();
              p = 0;
              phase = "draw";
            }
          }

          ctx.clearRect(0, 0, w, h);
          var x0 = w * 0.05,
            x1 = w * 0.97,
            gMid = h * 0.3,
            bMid = h * 0.74;
          var upto = Math.max(1, Math.round(SEG * p));

          // ── scale first: wide, and none of it recoverable
          ctx.lineWidth = 0.75;
          ctx.strokeStyle = rgba(GRAY, 0.15);
          for (var s2 = 0; s2 < STR; s2++) {
            ctx.beginPath();
            for (var i2 = 0; i2 <= upto; i2++) {
              var xb = x0 + (x1 - x0) * (i2 / SEG),
                yb = bMid + bad[s2][i2] * h;
              if (i2) ctx.lineTo(xb, yb);
              else ctx.moveTo(xb, yb);
            }
            ctx.stroke();
          }

          // ── fix first: boring on the left, ordered all the way out
          for (var s3 = 0; s3 < STR; s3++) {
            var isAcc = s3 % 7 === 3;
            ctx.strokeStyle = isAcc ? rgba(ORANGE, 0.5) : rgba(INK, 0.17);
            ctx.lineWidth = isAcc ? 1.1 : 0.7;
            ctx.beginPath();
            for (var i3 = 0; i3 <= upto; i3++) {
              var xg = x0 + (x1 - x0) * (i3 / SEG),
                yg = gMid + good[s3][i3] * h;
              if (i3) ctx.lineTo(xg, yg);
              else ctx.moveTo(xg, yg);
            }
            ctx.stroke();
          }

          // ── the moment the measurement is sound and scaling may start
          if (p > FIX) {
            var fx = x0 + (x1 - x0) * FIX;
            ctx.strokeStyle = rgba(INK, 0.22);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fx, gMid - h * 0.055);
            ctx.lineTo(fx, gMid + h * 0.055);
            ctx.stroke();
          }
        };
      },

      // Contact — "Development": a de Jong strange attractor accumulating
      // like a print coming up in a tray — never clears, only grows.
      // Cropped and rotated so it bleeds off the frame rather than
      // sitting centered. A live density grid tracks how many times each
      // pixel has been hit; the ridges that cross a rising threshold —
      // the attractor's own caustic folds — plot in orange, everything
      // else stays graphite. Holds once fully developed, then dissolves
      // and restarts from the next curated parameter set.
      development: function (seed) {
        var rand = mulberry32(seed ^ 0x55aa);
        var sets = [
          [1.641, 1.902, 0.316, 1.525],
          [-2.0, -2.0, -1.2, 2.0],
          [1.4, 1.56, 1.4, -6.56]
        ];
        var idx = (rand() * sets.length) | 0;
        var x = 0.1,
          y = 0.1;
        var pointsPlotted = 0;
        var phase = "develop";
        var holdT = 0,
          dissolveT = 0;
        var density = null,
          densCols = 0,
          densRows = 0;
        var TARGET_POINTS = 1900000;
        // Curated crop/rotation per parameter set, so each take recomposes
        // instead of always centering the same attractor the same way.
        var frames = [
          [0.42, 0.48, -7],
          [0.56, 0.44, 11],
          [0.38, 0.55, -19]
        ];

        function ensureDensity(w, h) {
          var c = Math.max(1, Math.ceil(w / 2)),
            r = Math.max(1, Math.ceil(h / 2));
          if (c !== densCols || r !== densRows) {
            densCols = c;
            densRows = r;
            density = new Uint16Array(c * r);
          }
        }

        return function (ctx, w, h, dt) {
          ensureDensity(w, h);
          var a = sets[idx][0],
            b = sets[idx][1],
            c = sets[idx][2],
            d = sets[idx][3];

          if (phase === "dissolve") {
            fadeTrail(ctx, w, h, fadeAmt(0.9, dt));
            dissolveT += dt;
            if (dissolveT > 2.6) {
              phase = "develop";
              dissolveT = 0;
              pointsPlotted = 0;
              x = 0.1;
              y = 0.1;
              density.fill(0);
              idx = (idx + 1) % sets.length;
            }
            return;
          }
          if (phase === "hold") {
            holdT += dt;
            if (holdT > 9) {
              phase = "dissolve";
              dissolveT = 0;
            }
            return;
          }

          var iters = reduce ? 2200 : 4000;
          var A_INK = reduce ? 0.030 : 0.020,
            A_ORG = reduce ? 0.045 : 0.030;
          var scale = Math.min(w, h) / 2.3;
          var frm = frames[idx];
          var cx = w * frm[0],
            cy = h * frm[1];
          var rot = (frm[2] * Math.PI) / 180,
            cosr = Math.cos(rot),
            sinr = Math.sin(rot);
          // Threshold as a multiple of the mean hit-count so far, not a
          // fixed count against a raw point tally — the old formula only
          // held together at the point budget it was tuned for, and would
          // have starved the orange caustic entirely at the larger budget.
          var mean = pointsPlotted / (densCols * densRows);
          var T = 12 + mean * 3.2;
          for (var i = 0; i < iters; i++) {
            var nx = Math.sin(a * y) - Math.cos(b * x);
            var ny = Math.sin(c * x) - Math.cos(d * y);
            x = nx;
            y = ny;
            var sx = x * scale,
              sy = y * scale;
            var rx = sx * cosr - sy * sinr,
              ry = sx * sinr + sy * cosr;
            var px = cx + rx,
              py = cy + ry;
            if (px < 0 || px >= w || py < 0 || py >= h) continue;
            var gi = ((py / 2) | 0) * densCols + ((px / 2) | 0);
            var cnt = ++density[gi];
            pointsPlotted++;
            ctx.fillStyle = cnt > T ? rgba(ORANGE, A_ORG) : rgba(INK, A_INK);
            ctx.fillRect(px, py, 0.9, 0.9);
          }
          if (pointsPlotted > TARGET_POINTS) {
            phase = "hold";
            holdT = 0;
          }
        };
      }
    };

    // Per-sketch frame budgets for the two synchronous passes: `warmup`
    // runs once, silently, the moment a canvas first scrolls into view
    // (so the reader never watches an empty box fill from nothing);
    // `reduced` runs once at load in place of any animation at all,
    // standing in for prefers-reduced-motion. Harmonograph gets no
    // warmup — its build-up IS the scroll-linked reveal, and pre-filling
    // it would spoil the one piece that responds to the reader directly.
    var CFG = {
      stack: { warmup: 60, reduced: 320 },
      harmonograph: { warmup: 0, reduced: 1500 },
      isopleth: { warmup: 6, reduced: 6 },
      fork: { warmup: 110, reduced: 260 },
      development: { warmup: 60, reduced: 130 }
    };

    [].forEach.call(nodes, function (cv, idx) {
      var kind = cv.dataset.graphic;
      var make = sketches[kind];
      if (!make) return;

      function size(force) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = cv.clientWidth,
          h = cv.clientHeight;
        if (!w || !h) return null;
        var pw = Math.round(w * dpr),
          ph = Math.round(h * dpr);
        // Reassigning cv.width/height always wipes the canvas, even to the
        // same value — so a same-size resize event (e.g. a mobile browser
        // chrome show/hide) would otherwise silently erase an
        // accumulating sketch's progress. Only resize the backing store
        // when the pixel dimensions actually changed.
        if (!force && pw === cv.width && ph === cv.height) return null;
        cv.width = pw;
        cv.height = ph;
        var ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, w: w, h: h };
      }

      var dims = size(true);
      if (!dims) return;

      var seed = (hashStr(kind) ^ Math.imul(idx + 1, 2654435761)) >>> 0;
      var frame = make(seed);
      var cfg = CFG[kind] || { warmup: 0, reduced: 1 };

      if (reduce) {
        for (var s = 0; s < cfg.reduced; s++) frame(dims.ctx, dims.w, dims.h, 1 / 60, cv);
        cv.classList.add("ready");
        return;
      }

      var hasIO = "IntersectionObserver" in window;
      var visible = !hasIO;
      var warmed = !hasIO;

      function warmUp() {
        for (var s2 = 0; s2 < cfg.warmup; s2++) frame(dims.ctx, dims.w, dims.h, 1 / 60, cv);
        cv.classList.add("ready");
      }

      if (!hasIO) {
        warmUp();
      } else {
        new IntersectionObserver(
          function (entries) {
            visible = entries[0].isIntersecting;
            if (visible && !warmed) {
              warmed = true;
              warmUp();
            }
          },
          { threshold: 0, rootMargin: "120px" }
        ).observe(cv);
      }

      var last = null;
      requestAnimationFrame(function loop(ts) {
        if (last === null) last = ts;
        var dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
        last = ts;
        if (visible && warmed) frame(dims.ctx, dims.w, dims.h, dt, cv);
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
