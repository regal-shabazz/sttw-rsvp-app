import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { db } from "../admin/firebase.js";

const EMAILJS_PUBLIC_KEY = "acNFPamuQdlrAuHDA";
const EMAILJS_SERVICE_ID = "service_cjxrqqy";
const EMAILJS_TEMPLATE_ID = "template_qxj7evf";

function prettyAsoEbi(v) {
  const map = {
    "women-gele-asoebi": "Gele and Aso Ebi (Women)",
    "men-cap-asoebi": "Cap and Aso Ebi (Men)",
    "women-gele-ipele": "Gele and Ipele (Women)",
    "men-cap-only": "Cap only (Men)",
  };
  return map[v] || v || "";
}

function sendAsoEbiEmail({ fullName, phone, asoEbiPretty, qty }) {
  const emailjs = window.emailjs;
  if (!emailjs) return Promise.resolve();

  if (!window.__emailjs_init) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    window.__emailjs_init = true;
  }

  // If you want qty in the email, add {{qty}} in template too.
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    guest_name: fullName,
    guest_phone: phone,
    asoebi_choice: `${asoEbiPretty}${qty ? ` (Qty: ${qty})` : ""}`,
  });
}

export function initAsoEbiRequest() {
  const form = document.getElementById("asoebiForm");
  const note = document.getElementById("asoebiNote");
  const card = document.getElementById("asoebiCard");
  if (!form || !note || !card) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    note.textContent = "";

    const fd = new FormData(form);
    const firstName = String(fd.get("firstName") || "").trim();
    const lastName = String(fd.get("lastName") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const asoEbi = String(fd.get("asoEbi") || "").trim();
    const qtyRaw = String(fd.get("qty") || "").trim();
    const qty = Number(qtyRaw);

    if (!firstName || !lastName || !phone || !asoEbi || !qtyRaw) {
      note.textContent = "Please complete the required fields.";
      return;
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      note.textContent = "Please select a valid quantity.";
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const asoEbiPretty = prettyAsoEbi(asoEbi);

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      // Save request to Firestore (separate from RSVP)
      await addDoc(collection(db, "asoebi_requests"), {
        firstName,
        lastName,
        phone,
        asoEbi,
        qty,
        createdAt: serverTimestamp(),
      });

      // Email alert (best-effort)
      sendAsoEbiEmail({ fullName, phone, asoEbiPretty, qty }).catch(() => {});

      card.innerHTML = `
        <div class="rsvp-thanks" role="status" aria-live="polite">
          <h3 style="margin:0 0 12px; color:#5b2a25; font-size:18px;">Request sent!</h3>
          <p style="margin:0; color: rgba(80, 40, 35, 0.8); line-height:1.6;">
            We’ve received your Aso Ebi request and will contact you shortly.
          </p>
        </div>
      `;
    } catch (err) {
      console.error(err);
      note.textContent = "Request failed. Please try again.";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}