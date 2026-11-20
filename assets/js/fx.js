/* =====================================================================
   PM MULTIVERSE — visual effects
   ===================================================================== */
(function () {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const root = document.documentElement;

  const FX = { reduced };
  let accentA = "#a78bfa", accentB = "#22d3ee";

  /* ---------------- Preloader ---------------- */
  FX.preload = function (onDone) {
    const el = document.getElementById("preloader");
    const num = document.getElementById("pre-num");
    const bar = document.getElementById("pre-bar");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (num) num.textContent = "100";
      if (bar) bar.style.width = "100%";
      if (el) { el.classList.add("done"); setTimeout(() => el.remove(), 1400); }
      onDone && onDone();
    };
    if (!el || reduced) { finish(); return; }
    const start = performance.now();
    const dur = 1100;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      if (num) num.textContent = String(Math.round(e * 100));
      if (bar) bar.style.width = e * 100 + "%";
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 120);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, 3000); // safety net
  };

  /* ---------------- Accent theming ---------------- */
  FX.setAccent = function (a, b) {
    accentA = a; accentB = b;
    root.style.setProperty("--accent", a);
    root.style.setProperty("--accent-2", b);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#06070b");
  };

  /* ---------------- Background particle field ---------------- */
  (function particles() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, pts = [], running = true;
    const mouse = { x: -9999, y: -9999 };

    function hexToRgb(hex) {
      const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [167, 139, 250];
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(110, Math.max(36, (w * h) / 16000)));
      while (pts.length < target) pts.push(spawn());
      pts.length = target;
    }
    function spawn() {
      return { x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.6 + .4, t: Math.random() };
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const a = hexToRgb(accentA), b = hexToRgb(accentB);
      for (const p of pts) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 32000) { p.vx += dx * 0.00003; p.vy += dy * 0.00003; }
        p.vx *= 0.995; p.vy *= 0.995;
        p.vx += (Math.random() - .5) * 0.006; p.vy += (Math.random() - .5) * 0.006;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
      }
      const maxD = 140, maxD2 = maxD * maxD;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            const o = (1 - d2 / maxD2) * 0.22;
            const c = p.t < .5 ? a : b;
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${o})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        const c = p.t < .5 ? a : b;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.85)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      const vis = document.visibilityState === "visible";
      if (vis && !running && !reduced) { running = true; requestAnimationFrame(frame); }
      else if (!vis) running = false;
    });
    if (reduced) { running = true; frame(); running = false; }
    else requestAnimationFrame(frame);
  })();

  /* ---------------- Custom cursor ---------------- */
  (function cursor() {
    if (!finePointer || reduced) return;
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;
    document.body.classList.add("has-cursor");
    let x = -100, y = -100, rx = -100, ry = -100;
    window.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const hov = e.target.closest && e.target.closest("a, button, [role=button], input, select, textarea, label, .g-item, [data-zoom]");
      document.body.classList.toggle("cursor-hover", !!hov);
    }, { passive: true });
    window.addEventListener("pointerdown", () => document.body.classList.add("cursor-down"));
    window.addEventListener("pointerup", () => document.body.classList.remove("cursor-down"));
    document.addEventListener("mouseleave", () => { x = y = -100; });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------------- Scroll: nav state + progress ---------------- */
  (function scroll() {
    const nav = document.getElementById("nav");
    const bar = document.getElementById("progress");
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      nav && nav.classList.toggle("scrolled", y > 10);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (max > 0 ? Math.min(y / max, 1) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    FX.updateScroll = update;
  })();

  /* ---------------- Spotlight + tilt (delegated) ---------------- */
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(".spot, .world");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
    if (!reduced && finePointer && el.hasAttribute("data-tilt")) {
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      const amt = parseFloat(el.getAttribute("data-tilt")) || 4;
      el.style.transform = `perspective(1400px) rotateX(${(-py * amt).toFixed(2)}deg) rotateY(${(px * amt).toFixed(2)}deg)`;
    }
  }, { passive: true });
  document.addEventListener("pointerout", (e) => {
    const el = e.target.closest && e.target.closest("[data-tilt]");
    if (el && !el.contains(e.relatedTarget)) el.style.transform = "";
  });

  /* ---------------- Text scramble ---------------- */
  const GLYPHS = "!<>-_\\/[]{}—=+*^?#ABCDEFXYZ0123456789";
  FX.scramble = function (el) {
    if (reduced || el.dataset.scrambled) return;
    el.dataset.scrambled = "1";
    const final = el.textContent;
    const len = final.length;
    const queue = [];
    for (let i = 0; i < len; i++) {
      const start = Math.floor(Math.random() * 18);
      queue.push({ to: final[i], start, end: start + Math.floor(Math.random() * 22) + 8 });
    }
    let frame = 0;
    const tick = () => {
      let out = "", done = 0;
      for (let i = 0; i < len; i++) {
        const q = queue[i];
        if (frame >= q.end || q.to === " ") { done++; out += q.to; }
        else if (frame >= q.start) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        else out += q.to === " " ? " " : " ";
      }
      el.textContent = out;
      if (done < len) { frame++; requestAnimationFrame(tick); } else el.textContent = final;
    };
    tick();
  };

  /* ---------------- Counters ---------------- */
  FX.count = function (el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = target.toLocaleString() + suffix; return; }
    const start = performance.now(), dur = 1600;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * e).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------------- Reveal / refresh ---------------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      el.classList.add("in");
      el.querySelectorAll && el.querySelectorAll("[data-count]").forEach(FX.count);
      if (el.hasAttribute("data-count")) FX.count(el);
      if (el.hasAttribute("data-scramble")) FX.scramble(el);
      io.unobserve(el);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }) : null;

  FX.refresh = function (scope) {
    const s = scope || document;
    const els = s.querySelectorAll("[data-reveal], [data-count], [data-scramble]");
    els.forEach((el) => {
      if (!io) { el.classList.add("in"); if (el.dataset.count) FX.count(el); return; }
      io.observe(el);
    });
    // magnetic buttons
    if (!reduced && finePointer) {
      s.querySelectorAll("[data-magnetic]").forEach((el) => {
        if (el.dataset.magBound) return;
        el.dataset.magBound = "1";
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
          el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
        });
        el.addEventListener("pointerleave", () => { el.style.transform = ""; });
      });
    }
  };

  window.FX = FX;
})();
