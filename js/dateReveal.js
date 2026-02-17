// js/dateReveal.js

import { lockScroll, unlockScroll } from "./scrollLock.js";


// function lockScroll() {
//   document.body.classList.add("scroll-locked");

//   // Prevent wheel/touch scroll while locked (but scratching still works)
//   const prevent = (e) => e.preventDefault();

//   window.__lockHandlers = { prevent };

//   window.addEventListener("wheel", prevent, { passive: false });
//   window.addEventListener("touchmove", prevent, { passive: false });
// }

// function unlockScroll() {
//   document.body.classList.remove("scroll-locked");

//   if (window.__lockHandlers?.prevent) {
//     window.removeEventListener("wheel", window.__lockHandlers.prevent);
//     window.removeEventListener("touchmove", window.__lockHandlers.prevent);
//   }
//   window.__lockHandlers = null;
// }

function getScratchPercent(ctx, w, h) {
  // sample every N pixels for speed
  const step = 8;
  const img = ctx.getImageData(0, 0, w, h).data;

  let total = 0;
  let cleared = 0;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const alpha = img[i + 3];
      total++;
      if (alpha === 0) cleared++;
    }
  }

  return cleared / total; // 0..1
}

function paintCover(ctx, w, h) {
  // simple “gold-ish” cover (no extra assets required)
  const grad = ctx.createRadialGradient(w * 0.35, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.65);
  grad.addColorStop(0, "#f3d48a");
  grad.addColorStop(0.45, "#d1a850");
  grad.addColorStop(1, "#f7e2b0");

  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function setupScratch(canvas, onCleared) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rect = canvas.getBoundingClientRect();

  // Match canvas resolution to its displayed size
  const cssSize = Math.round(rect.width);
  canvas.width = cssSize;
  canvas.height = cssSize;

  paintCover(ctx, canvas.width, canvas.height);

  let isDown = false;
  let cleared = false;

  const brushRadius = Math.max(16, Math.floor(canvas.width * 0.10));

  function scratchAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * canvas.width;
    const y = ((clientY - r.top) / r.height) * canvas.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkDone() {
    if (cleared) return;
    const pct = getScratchPercent(ctx, canvas.width, canvas.height);

    // threshold: “mostly revealed”
    if (pct >= 0.55) {
      cleared = true;
      // clear fully for satisfaction
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onCleared();
    }
  }

  const onDown = (e) => {
    isDown = true;
    const p = e.touches ? e.touches[0] : e;
    scratchAt(p.clientX, p.clientY);
    checkDone();
  };

  const onMove = (e) => {
    if (!isDown) return;
    const p = e.touches ? e.touches[0] : e;
    scratchAt(p.clientX, p.clientY);
    checkDone();
  };

  const onUp = () => {
    isDown = false;
    checkDone();
  };

  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);

  canvas.addEventListener("touchstart", onDown, { passive: true });
  canvas.addEventListener("touchmove", onMove, { passive: true });
  canvas.addEventListener("touchend", onUp);
}

function fireConfetti(confettiEl) {
  // spawn a burst of pieces over ~1.2s
  const start = performance.now();
  const duration = 700;

  function spawn() {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    const left = Math.random() * 100;
    const size = 6 + Math.random() * 10;

    piece.style.left = `${left}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${Math.max(8, size * 1.3)}px`;
    piece.style.opacity = `${0.7 + Math.random() * 0.3}`;

    // randomize fall speed slightly
    piece.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;

    confettiEl.appendChild(piece);

    // cleanup
    setTimeout(() => piece.remove(), 3000);
  }

  function loop(now) {
    // spawn multiple per frame, but not too many
    for (let i = 0; i < 2; i++) spawn();

    if (now - start < duration) {
      requestAnimationFrame(loop);
    }
  }

  requestAnimationFrame(loop);
}

export function initDateReveal() {
  const section = document.getElementById("dateReveal");
  const confettiEl = document.getElementById("confetti");
  const cards = [...section.querySelectorAll(".scratch-card")];

  let locked = false;
  let completed = false;
  let clearedCount = 0;

  function lockIfNeeded() {
    if (completed || locked) return;
    locked = true;
    lockScroll();
  }

  function complete() {
    if (completed) return;
    completed = true;

    fireConfetti(confettiEl);

    // unlock after a tiny beat so the confetti feels like a reward
    setTimeout(() => {
      unlockScroll();
    }, 700);
  }

  // Setup scratch canvases
  cards.forEach((card) => {
    const canvas = card.querySelector(".scratch-canvas");
    setupScratch(canvas, () => {
      clearedCount++;
      if (clearedCount >= 3) {
        complete();
      }
    });
  });

  // Lock when section is fully in view (near 100%)
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.98) {
          lockIfNeeded();
        }
      });
    },
    { threshold: [0, 0.5, 0.98, 1] }
  );

  io.observe(section);
}
