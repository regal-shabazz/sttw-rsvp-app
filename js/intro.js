// js/intro.js
import { lockScroll, unlockScroll } from "./scrollLock.js";
import { showLayer, hideLayer, preloadImage, waitForVideoCanPlay } from "./dom.js";

const scrollIndicator = document.getElementById("scrollIndicator");

export function initIntro() {
  const stage = document.querySelector(".curtain-stage");

  const openBtn = document.getElementById("openBtn");
  const closedImg = document.getElementById("curtainClosedImg");

  // ✅ open curtain image is OPTIONAL now
  const openImg = document.getElementById("curtainOpenImg"); // may be null

  const video = document.getElementById("curtainVideo");

  const audio = document.getElementById("ambienceAudio");
  const audioToggle = document.getElementById("audioToggle");
  const audioIcon = audioToggle?.querySelector(".audio-icon");

  if (!stage || !openBtn || !closedImg || !video || !audio || !audioToggle) return;

  lockScroll(); // lock scroll from first load until video ends

  function setAudioUI(isMuted) {
    audioToggle.setAttribute("aria-pressed", String(isMuted));
    audioToggle.setAttribute("aria-label", isMuted ? "Unmute audio" : "Mute audio");
    if (audioIcon) audioIcon.textContent = isMuted ? "🔇" : "🔊";
  }

  function toggleAudio() {
    const isMuted = !audio.muted;
    audio.muted = isMuted;

    if (!isMuted) audio.play().catch(() => {});
    setAudioUI(isMuted);
  }

  async function startIntro() {
    openBtn.disabled = true;
    openBtn.style.opacity = "0";
    openBtn.style.pointerEvents = "none";

    // show audio icon after tap
    audioToggle.classList.remove("is-hidden");

    // ---------- SAFARI: start VIDEO immediately (no awaits before this) ----------
    video.muted = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    try {
      video.currentTime = 0;
    } catch {}
    try {
      video.load();
    } catch {}

    // show video layer right away (we'll fade closed out only when playing)
    showLayer(video);

    const revealVideo = () => {
      hideLayer(closedImg);

      setTimeout(() => {
        const hero = document.getElementById("heroText");
        if (hero) {
          hero.style.opacity = "";
          hero.style.visibility = "";
        }
        stage.classList.add("show-hero");
      }, 1500);
    };

    let revealed = false;

    video.addEventListener(
      "playing",
      () => {
        revealed = true;
        revealVideo();
      },
      { once: true }
    );

    // play video NOW (still inside the tap gesture chain)
    try {
      const p = video.play();
      if (p && typeof p.then === "function") await p;
    } catch (err) {
      console.error("Safari blocked video play:", err);

      // fallback: skip animation; just reveal hero + unlock
      hideLayer(closedImg);

      // if openImg exists, show it; otherwise keep video hidden too
      if (openImg) showLayer(openImg);
      else hideLayer(video);

      stage.classList.add("show-hero");
      scrollIndicator?.classList.add("is-visible");
      unlockScroll();
      return;
    }

    // fallback if "playing" doesn't fire
    setTimeout(() => {
      if (!revealed) revealVideo();
    }, 900);

    // ---------- NOW do your preloads (optional) ----------
    // openImg is optional, so preload only if it exists
    const preloadJobs = [preloadImage(closedImg), waitForVideoCanPlay(video)];
    if (openImg) preloadJobs.push(preloadImage(openImg));
    Promise.allSettled(preloadJobs);

    // ---------- NOW start ambience audio ----------
    try {
      audio.muted = false;
      await audio.play();
      setAudioUI(false);
    } catch {
      audio.muted = true;
      setAudioUI(true);
    }

    // ✅ IMPORTANT: Always unlock scroll when video ends (no dependency on openImg)
    video.addEventListener(
      "ended",
      () => {
        // If you still have an open-curtain image, you can swap to it.
        // If not, keep the final frame of the video visible (curtain open + baked background).
        if (openImg) {
          showLayer(openImg);

          setTimeout(() => {
            hideLayer(video);
            scrollIndicator?.classList.add("is-visible");
            unlockScroll();
          }, 320);
        } else {
          // Keep video visible on last frame
          // (most browsers keep the last frame by default; no need to hide video)
          scrollIndicator?.classList.add("is-visible");
          unlockScroll();
        }
      },
      { once: true }
    );
  }

  // Wire events
  openBtn.addEventListener("click", startIntro);
  audioToggle.addEventListener("click", toggleAudio);

  // init state
  setAudioUI(true);
}