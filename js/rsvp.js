// js/rsvp.js
import { db } from "../admin/firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

function makeCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function setPlusOneVisibility({ wrap, firstEl, lastEl, guestCount }) {
  const show = guestCount === 2;

  // show/hide block
  wrap.classList.toggle("is-hidden", !show);

  // clear values when hidden (prevents accidental stale data)
  if (!show) {
    firstEl.value = "";
    lastEl.value = "";
  }

  // toggle required for native UX
  firstEl.required = show;
  lastEl.required = show;
}

export function initRSVP() {
  const form = document.getElementById("rsvpForm");
  const card = document.getElementById("rsvpCard");
  const note = document.getElementById("formNote");

  if (!form || !card || !note) return;

  const guestCountSelect = document.getElementById("guestCount");
  const plusOneWrap = document.getElementById("plusOneWrap");
  const plusOneFirstEl = document.getElementById("plusOneFirstName");
  const plusOneLastEl = document.getElementById("plusOneLastName");

  if (!guestCountSelect || !plusOneWrap || !plusOneFirstEl || !plusOneLastEl) return;

  // ✅ initial state on load (blank select => hidden)
  const initialGuestCount = Number(guestCountSelect.value || 0);
  setPlusOneVisibility({
    wrap: plusOneWrap,
    firstEl: plusOneFirstEl,
    lastEl: plusOneLastEl,
    guestCount: initialGuestCount,
  });

  // ✅ dynamic state on change
  guestCountSelect.addEventListener("change", () => {
    const guestCount = Number(guestCountSelect.value || 0);
    setPlusOneVisibility({
      wrap: plusOneWrap,
      firstEl: plusOneFirstEl,
      lastEl: plusOneLastEl,
      guestCount,
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    note.textContent = "";

    const fd = new FormData(form);

    const firstName = String(fd.get("firstName") || "").trim();
    const lastName = String(fd.get("lastName") || "").trim();
    const guestCountRaw = String(fd.get("guestCount") || "").trim();
    const side = String(fd.get("side") || "").trim();
    const phone = String(fd.get("phone") || "").trim();

    const guestCount = Number(guestCountRaw);

    const plusOneFirstName = String(fd.get("plusOneFirstName") || "").trim();
    const plusOneLastName = String(fd.get("plusOneLastName") || "").trim();

    // REQUIRED
    if (!firstName || !lastName || !side || !phone || !guestCountRaw) {
      note.textContent = "Please complete the required fields.";
      return;
    }

    // Only allow 1 or 2 now
    if (!Number.isInteger(guestCount) || (guestCount !== 1 && guestCount !== 2)) {
      note.textContent = "Please select either Coming alone or Plus one.";
      return;
    }

    // If plus one selected, require plus-one names
    if (guestCount === 2) {
      if (!plusOneFirstName || !plusOneLastName) {
        note.textContent = "Please enter your plus-one’s first and last name.";
        return;
      }
      if (plusOneFirstName.length > 50 || plusOneLastName.length > 50) {
        note.textContent = "Plus-one name is too long (max 50 characters).";
        return;
      }
    }

    const rsvpCode = makeCode(5);

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      // ✅ Build payload WITHOUT plusOne fields unless guestCount === 2
      const payload = {
        firstName,
        lastName,
        side,
        phone,
        guestCount,
        rsvpCode,
        createdAt: serverTimestamp(),
        checkedIn: false,
        checkedInAt: null,
      };

      if (guestCount === 2) {
        payload.plusOneFirstName = plusOneFirstName;
        payload.plusOneLastName = plusOneLastName;
      }

      await addDoc(collection(db, "rsvps"), payload);

      card.innerHTML = `
        <div class="rsvp-thanks" role="status" aria-live="polite">
          <h3 style="margin:0 0 12px; color:#5b2a25; font-size:18px;">Thank you, ${firstName}!</h3>
          <p style="margin:0 0 10px; color: rgba(80, 40, 35, 0.8); line-height:1.6;">
            Your RSVP has been received.
          </p>
          <p style="font-size: 15px; margin-bottom:10px; color: rgba(80, 40, 35, 0.7);">
            RSVP Code: <strong style="color:#5b2a25;">${rsvpCode}</strong>
          </p>
          <p style="font-size: 12px; margin:0; color: rgba(80, 40, 35, 0.7);">
            Please kindly note your code or save a screenshot of this page and come with it to the venue.
          </p>
        </div>
      `;
    } catch (err) {
      console.error(err);
      note.textContent = "Submission failed. Please try again.";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}