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

function prettyAsoEbi(v) {
  const map = {
    "women-gele-asoebi": "Gele and Aso Ebi (Women)",
    "men-cap-asoebi": "Cap and Aso Ebi (Men)",
    "women-gele-ipele": "Gele and Ipele (Women)",
    "men-cap-only": "Cap only (Men)",
  };
  return map[v] || "";
}

/** EmailJS config (paste your real IDs) */
const EMAILJS_PUBLIC_KEY = "acNFPamuQdlrAuHDA";
const EMAILJS_SERVICE_ID = "service_cjxrqqy";
const EMAILJS_TEMPLATE_ID = "template_qxj7evf";

function sendAsoEbiEmail({ fullName, phone, asoEbiPretty }) {
  const emailjs = window.emailjs;
  if (!emailjs) return Promise.resolve();

  // initialize once globally
  if (!window.__emailjs_init) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    window.__emailjs_init = true;
  }

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    guest_name: fullName,
    guest_phone: phone,
    asoebi_choice: asoEbiPretty,
  });
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
    const side = String(fd.get("side") || "").trim();
    const phone = String(fd.get("phone") || "").trim();

    // ✅ NEW
    const asoEbi = String(fd.get("asoEbi") || "").trim(); // "" or allowed value
    const asoEbiPretty = prettyAsoEbi(asoEbi);

    if (!firstName || !lastName || !side || !phone || !attendance || !guestCountRaw) {
      note.textContent = "Please complete the required fields.";
      return;
    }

    const guestCount = Number(guestCountRaw);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      note.textContent = "Please select a valid guest count.";
      return;
    }

    const rsvpCode = makeCode(5);
    const fullName = `${firstName} ${lastName}`.trim();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      // ✅ Write to Firestore (store asoEbi too)
      await addDoc(collection(db, "rsvps"), {
        firstName,
        lastName,
        side,
        phone,

        attendance,
        guestCount,
        message: message || "",
        rsvpCode,

        asoEbi: asoEbi || null,

        createdAt: serverTimestamp(),
        checkedIn: false,
        checkedInAt: null,
      });

      // ✅ Email only if guest picked aso ebi
      if (asoEbi) {
        // Don’t block RSVP success if email fails
        sendAsoEbiEmail({ fullName, phone, asoEbiPretty }).catch(() => {});
      }

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