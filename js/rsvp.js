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
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function initRSVP() {
  const form = document.getElementById("rsvpForm");
  const card = document.getElementById("rsvpCard");
  const note = document.getElementById("formNote");

  if (!form || !card) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    note.textContent = "";

    const fd = new FormData(form);

    const firstName = String(fd.get("firstName") || "").trim();
    const lastName = String(fd.get("lastName") || "").trim();
    const attendance = String(fd.get("attendance") || "").trim();
    const guestCountRaw = String(fd.get("guestCount") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const side = String(fd.get("side") || "").trim(); // "groom" | "bride"
    const phone = String(fd.get("phone") || "").trim();

    if (
      !firstName ||
      !lastName ||
      !side ||
      !phone ||
      !attendance ||
      !guestCountRaw
    ) {
      note.textContent = "Please complete the required fields.";
      return;
    }

    const guestCount = Number(guestCountRaw);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      note.textContent = "Please select a valid guest count.";
      return;
    }

    const rsvpCode = makeCode(5);

    // Disable submit to prevent double submits
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      // ✅ Write to Firestore
      await addDoc(collection(db, "rsvps"), {
        firstName,
        lastName,
        side,
        phone,

        attendance,
        guestCount,
        message: message || "",
        rsvpCode,

        createdAt: serverTimestamp(),
        checkedIn: false,
        checkedInAt: null,
      });

      // ✅ Replace content with thank-you
      card.innerHTML = `
        <div class="rsvp-thanks" role="status" aria-live="polite">
          <h3 style="margin:0 0 12px; color:#5b2a25; font-size:18px;">Thank you, ${firstName}!</h3>
          <p style="margin:0 0 10px; color: rgba(80, 40, 35, 0.8); line-height:1.6;">
            Your RSVP has been received.
          </p>
          <p style="font-size: 15px; margin-bottom:10px; color: rgba(80, 40, 35, 0.7);">
            RSVP Code: <strong style="color:#5b2a25;">${rsvpCode}</strong>
          </p>
          <p style="font-size: 12px; margin:0; color: rgba(80, 40, 35, 0.7);">Please kindly note your code or save a screenshot of this page and come with it to the venue.</p>
        </div>
      `;
    } catch (err) {
      console.error(err);
      note.textContent = "Submission failed. Please try again.";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
