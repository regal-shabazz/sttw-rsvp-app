// js/countdown.js

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseTarget(timerEl) {
  const raw = timerEl.getAttribute("data-target");
  // raw example: 2027-09-10T00:00:00+01:00
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

export function initCountdown() {
  const timerEl = document.getElementById("timer");
  if (!timerEl) return;

  const target = parseTarget(timerEl);
  if (!target) return;

  const daysEl = document.getElementById("cdDays");
  const hoursEl = document.getElementById("cdHours");
  const minsEl = document.getElementById("cdMins");
  const secsEl = document.getElementById("cdSecs");

  function tick() {
    const now = new Date();
    let diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "00";
      minsEl.textContent = "00";
      secsEl.textContent = "00";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const rem1 = totalSeconds % (3600 * 24);
    const hours = Math.floor(rem1 / 3600);
    const rem2 = rem1 % 3600;
    const mins = Math.floor(rem2 / 60);
    const secs = rem2 % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = pad2(hours);
    minsEl.textContent = pad2(mins);
    secsEl.textContent = pad2(secs);
  }

  // align updates to the second (reduces jitter)
  tick();
  setInterval(tick, 1000);
}
