// Lightweight scroll-reveal — adds .in to .reveal elements as they enter the viewport.
(function () {
  "use strict";
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
    // small stagger for siblings in the same grid row
    el.style.transitionDelay = (i % 4) * 60 + "ms";
    io.observe(el);
  });

  // Failsafe: never leave content permanently hidden if the observer misfires.
  window.addEventListener("load", function () {
    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
      });
    }, 1200);
  });
})();
