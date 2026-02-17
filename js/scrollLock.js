// js/scrollLock.js
let locked = false;
let scrollY = 0;

function preventScroll(e) {
  e.preventDefault();
}

export function lockScroll() {
  if (locked) return;
  locked = true;

  scrollY = window.scrollY || 0;

  document.body.classList.add("scroll-locked");

  // iOS-friendly: freeze body at current scroll position
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";

  // prevent wheel/touch scroll (taps still work)
  window.addEventListener("wheel", preventScroll, { passive: false });
  window.addEventListener("touchmove", preventScroll, { passive: false });
}

export function unlockScroll() {
  if (!locked) return;
  locked = false;

  document.body.classList.remove("scroll-locked");

  window.removeEventListener("wheel", preventScroll);
  window.removeEventListener("touchmove", preventScroll);

  // restore body + scroll position
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  window.scrollTo(0, scrollY);
}
