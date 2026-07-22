// SKR Burner site — reveal, embers, nav, referral
(function () {
  "use strict";

  /* ---------- scroll reveal ---------- */
  (function () {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    els.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });

    window.addEventListener("load", function () {
      setTimeout(function () {
        document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
        });
      }, 1200);
    });
  })();

  /* ---------- mobile nav ---------- */
  (function () {
    var btn = document.getElementById("nav-burger");
    var drawer = document.getElementById("nav-drawer");
    if (!btn || !drawer) return;

    function close() {
      btn.setAttribute("aria-expanded", "false");
      drawer.hidden = true;
    }
    function toggle() {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      drawer.hidden = open;
    }

    btn.addEventListener("click", toggle);
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  })();

  /* ---------- rising ember particles ---------- */
  (function () {
    var canvas = document.getElementById("embers");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var particles = [];
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var N = reduced ? 0 : 48;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(fromBottom) {
      var y = fromBottom ? h + Math.random() * 40 : Math.random() * h;
      return {
        x: Math.random() * w,
        y: y,
        r: 1.2 + Math.random() * 2.8,
        vy: -(0.35 + Math.random() * 1.1),
        vx: (Math.random() - 0.5) * 0.45,
        life: 0.35 + Math.random() * 0.65,
        hue: 18 + Math.random() * 28,
        wobble: Math.random() * Math.PI * 2,
      };
    }

    function init() {
      particles = [];
      for (var i = 0; i < N; i++) particles.push(spawn(false));
    }

    function tick() {
      if (!N) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.wobble += 0.02;
        p.x += p.vx + Math.sin(p.wobble) * 0.25;
        p.y += p.vy;
        p.life -= 0.0012;
        if (p.y < -20 || p.life <= 0 || p.x < -20 || p.x > w + 20) {
          particles[i] = spawn(true);
          continue;
        }
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, "hsla(" + p.hue + ",100%,65%," + (0.85 * p.life) + ")");
        g.addColorStop(0.45, "hsla(" + (p.hue - 10) + ",100%,50%," + (0.35 * p.life) + ")");
        g.addColorStop(1, "hsla(" + p.hue + ",100%,40%,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    init();
    if (N) requestAnimationFrame(tick);
    window.addEventListener("resize", function () {
      resize();
    });
  })();

  /* ---------- referral ?ref=CODE ---------- */
  (function () {
    var params = new URLSearchParams(window.location.search);
    var code = (params.get("ref") || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return;

    var bar = document.getElementById("refbar");
    var txt = document.getElementById("refbar-code-txt");
    var btn = document.getElementById("refbar-code");
    var copied = document.getElementById("refbar-copied");
    if (!bar || !txt || !btn) return;

    txt.textContent = code;
    bar.hidden = false;

    try {
      sessionStorage.setItem("skr_ref_code", code);
    } catch (e) {}

    btn.addEventListener("click", function () {
      function ok() {
        if (copied) {
          copied.hidden = false;
          setTimeout(function () { copied.hidden = true; }, 1600);
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(ok).catch(function () {
          fallbackCopy(code); ok();
        });
      } else {
        fallbackCopy(code); ok();
      }
    });

    function fallbackCopy(s) {
      var ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
  })();
})();
