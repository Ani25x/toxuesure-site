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
      // Hero — "Filament": particles combed along a noise-driven flow
      // field, gathering into one off-center vortex knot. A handful of
      // faster orange "signal" particles cut through the gray current
      // and drop a trail of small dots as they pass.
      filament: function (seed) {
        var noise = makeNoise2D(seed);
        var rand = mulberry32(seed ^ 0x9e3779b9);
        var N = 90;
        var particles = [];
        function respawn(p, w, h) {
          p.x = rand() * w * 0.4;
          p.y = h * (0.4 + rand() * 0.6);
          p.age = 0;
          p.life = 3.6 + rand() * 3.2;
        }
        for (var i = 0; i < N; i++) {
          var p = { d: rand(), orange: i < 8, drop: 0, x: undefined };
          particles.push(p);
        }
        particles.sort(function (a, b) {
          return b.d - a.d;
        });
        var tAcc = 0;

        return function (ctx, w, h, dt) {
          tAcc += dt;
          fadeTrail(ctx, w, h, fadeAmt(2.8, dt));
          var vx0 = 0.38 * w,
            vy0 = 0.42 * h;
          var k = Math.pow(0.3 * h, 2) || 1;
          for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (p.x === undefined || p.age > p.life || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
              respawn(p, w, h);
            }
            var nx = p.x / w,
              ny = p.y / h;
            var ang = noise.fbm(nx * 2.6, ny * 2.6 + tAcc * 0.1, 3) * Math.PI * 3.2;
            var dx = p.x - vx0,
              dy = p.y - vy0,
              r2 = dx * dx + dy * dy;
            var wgt = k / (k + r2);
            var vortA = Math.atan2(dy, dx) + Math.PI / 2;
            ang = ang * (1 - wgt * 0.85) + vortA * (wgt * 0.85);
            var spd = Math.min(w, h) * (p.orange ? 0.62 : 0.46);
            var vx = (Math.cos(ang) * 0.95 + 0.05) * spd;
            var vy = (Math.sin(ang) * 0.95 - 0.14) * spd;
            var px = p.x,
              py = p.y;
            p.x += vx * dt;
            p.y += vy * dt;
            p.age += dt;

            var depthT = 1 - p.d;
            var alpha = p.orange ? 0.24 : 0.045 + depthT * 0.13;
            var lw = p.orange ? 1.3 : 0.5 + depthT * 0.65;
            ctx.strokeStyle = p.orange ? rgba(ORANGE, alpha) : rgba(p.d > 0.66 ? GRAY : INK, alpha);
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            if (p.orange) {
              p.drop += dt;
              if (p.drop > 0.34) {
                p.drop = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = rgba(ORANGE, 0.5);
                ctx.fill();
              }
            }
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

        function penXY(f, phase, tt, w, h, damp) {
          var A1 = 0.34 * w,
            A2 = 0.16 * w,
            A3 = 0.4 * h,
            A4 = 0.18 * h;
          var x =
            A1 * Math.sin(f[0] * tt + phase) * Math.exp(-damp[0] * tt) +
            A2 * Math.sin(f[1] * tt + phase + 1.3) * Math.exp(-damp[1] * tt);
          var y =
            A3 * Math.sin(f[2] * tt + phase + 2.1) * Math.exp(-damp[2] * tt) +
            A4 * Math.sin(f[3] * tt + phase + 0.6) * Math.exp(-damp[3] * tt);
          return [x + w * 0.42, y + h * 0.5];
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
            var span = Math.min(rawSpan, 3.2);
            var subSteps = Math.min(48, Math.max(1, Math.ceil(span / 0.12)));
            var stepSize = span / subSteps;
            var tt = lastT;
            var prevMain = penXY(f, 0, tt, w, h, dMain);
            var prevGhost = penXY(f, 0.06, tt, w, h, dGhost);
            for (var s = 0; s < subSteps; s++) {
              tt += stepSize;
              var curMain = penXY(f, 0, tt, w, h, dMain);
              var segLen = Math.hypot(curMain[0] - prevMain[0], curMain[1] - prevMain[1]) + 3;
              var a = Math.max(0.03, Math.min(0.22, 0.9 / segLen));
              ctx.strokeStyle = rgba(INK, a);
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.moveTo(prevMain[0], prevMain[1]);
              ctx.lineTo(curMain[0], curMain[1]);
              ctx.stroke();
              prevMain = curMain;

              var curGhost = penXY(f, 0.06, tt, w, h, dGhost);
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

        return function (ctx, w, h, dt) {
          if (!reduce) t += dt * 0.6;
          ctx.clearRect(0, 0, w, h);
          var cell = 9;
          var cols = Math.ceil(w / cell) + 1,
            rows = Math.ceil(h / cell) + 1;
          var field = new Float32Array(cols * rows);
          for (var j = 0; j < rows; j++) {
            for (var i = 0; i < cols; i++) {
              var x = i * cell,
                y = j * cell;
              var q = noise.fbm(x * 0.01 + 100, y * 0.01 + t, 2, 2, 0.5);
              field[j * cols + i] = noise.fbm(x * 0.01 + 2.4 * q, y * 0.01 + 2.4 * q + t, 3, 2, 0.5);
            }
          }
          for (var li = 0; li < levels.length; li++) {
            var level = levels[li];
            var isMid = level === 0.15;
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

      // "How I work" — "Chladni": a thousand grains of sand agitated by a
      // standing wave, wandering until they settle on its nodal lines.
      // Doesn't clear between frames — agitated grains smear into mist,
      // settled ones hammer the same pixels into near-solid — so mist and
      // crystal share one image. Morphs to the next mode pair on a slow
      // curated cycle, dissolving into disorder mid-transition.
      chladni: function (seed) {
        var rand = mulberry32(seed ^ 0xabcdef);
        var modePairs = [
          [2, 7],
          [3, 5],
          [4, 9],
          [1, 4],
          [3, 8]
        ];
        var curIdx = 0,
          nextIdx = 1,
          morphing = false,
          morphT = 0,
          cycleT = 0;
        var NP = 1000;
        var pts = [];
        for (var i = 0; i < NP; i++) pts.push({ x: rand(), y: rand(), settle: 0, orange: i < 46 });

        function amp(u, v, n, m) {
          return Math.sin(n * Math.PI * u) * Math.sin(m * Math.PI * v) - Math.sin(m * Math.PI * u) * Math.sin(n * Math.PI * v);
        }

        return function (ctx, w, h, dt) {
          cycleT += dt;
          if (!morphing && cycleT > 13) {
            morphing = true;
            morphT = 0;
          }
          var curM = modePairs[curIdx][0],
            curN = modePairs[curIdx][1];
          var mm = curM,
            nn = curN;
          if (morphing) {
            morphT += dt;
            var tt = Math.min(1, morphT / 2.4);
            var tgt = modePairs[nextIdx];
            mm = curM + (tgt[0] - curM) * tt;
            nn = curN + (tgt[1] - curN) * tt;
            if (tt >= 1) {
              morphing = false;
              cycleT = 0;
              curIdx = nextIdx;
              nextIdx = (nextIdx + 1) % modePairs.length;
            }
          }
          fadeTrail(ctx, w, h, fadeAmt(0.55, dt));
          for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            var a = Math.abs(amp(p.x, p.y, nn, mm));
            var stepMag = Math.max(0.0016, Math.min(0.02, a * 0.022));
            var ang = rand() * Math.PI * 2;
            p.x = clamp01(p.x + Math.cos(ang) * stepMag);
            p.y = clamp01(p.y + Math.sin(ang) * stepMag);
            p.settle = p.settle * 0.98 + (1 - Math.min(1, a * 3)) * 0.02;
            var px = p.x * w,
              py = p.y * h;
            ctx.fillStyle = p.orange ? rgba(ORANGE, 0.3) : rgba(INK, 0.12 + p.settle * 0.42);
            ctx.fillRect(px, py, 1.2, 1.2);
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
        var TARGET_POINTS = 1200000;

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

          var iters = 2500;
          var scale = Math.min(w, h) / 2.7;
          var cx = w * 0.42,
            cy = h * 0.48;
          var rot = (-7 * Math.PI) / 180,
            cosr = Math.cos(rot),
            sinr = Math.sin(rot);
          var T = 30 + pointsPlotted / 8000;
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
            ctx.fillStyle = cnt > T ? "rgba(226,102,31,0.020)" : "rgba(17,17,17,0.012)";
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
      filament: { warmup: 70, reduced: 400 },
      harmonograph: { warmup: 0, reduced: 1500 },
      isopleth: { warmup: 6, reduced: 6 },
      chladni: { warmup: 70, reduced: 150 },
      development: { warmup: 60, reduced: 130 }
    };

    [].forEach.call(nodes, function (cv, idx) {
      var kind = cv.dataset.graphic;
      var make = sketches[kind];
      if (!make) return;

      function size() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = cv.clientWidth,
          h = cv.clientHeight;
        if (!w || !h) return null;
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        var ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, w: w, h: h };
      }

      var dims = size();
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
