// js/dom.js

export function showLayer(el) {
  el.classList.add("is-visible");
}

export function hideLayer(el) {
  el.classList.remove("is-visible");
}

export function preloadImage(imgEl) {
  if (imgEl.complete) return imgEl.decode?.() || Promise.resolve();

  return new Promise((resolve, reject) => {
    imgEl.addEventListener(
      "load",
      () => resolve(imgEl.decode?.() || Promise.resolve()),
      { once: true },
    );
    imgEl.addEventListener("error", reject, { once: true });
  });
}

export function waitForVideoCanPlay(videoEl) {
  if (videoEl.readyState >= 3) return Promise.resolve();
  return new Promise((resolve) => {
    videoEl.addEventListener("canplay", resolve, { once: true });
  });
}
