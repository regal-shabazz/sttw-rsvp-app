import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

/* ---------- Helpers ---------- */
function $(id) {
  return document.getElementById(id);
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtName(r) {
  return `${r.firstName || ""} ${r.lastName || ""}`.trim();
}

function fmtAttendance(v) {
  return v === "yes" ? "Yes" : v === "no" ? "No" : "-";
}

/* ---------- Login Page ---------- */
const loginForm = $("loginForm");
if (loginForm) {
  const errorText = $("loginError");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorText.textContent = "";

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    if (!email || !password) {
      errorText.textContent = "Please enter email and password.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // after login, go dashboard
      window.location.href = "./dashboard.html";
    } catch (err) {
      console.error(err);
      errorText.textContent = "Login failed. Check email/password.";
    }
  });

  // If already logged in, go dashboard
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "./dashboard.html";
  });
}

/* ---------- Dashboard Page ---------- */
const tableBody = $("rsvpTableBody");
if (tableBody) {
  const logoutBtn = $("logoutBtn");
  const searchInput = $("searchInput");
  const downloadBtn = document.getElementById("downloadBtn");
  // Stats DOM
  const statTotalHeads = document.getElementById("statTotalHeads");
  const statYesCount = document.getElementById("statYesCount");
  const statSoloUnits = document.getElementById("statSoloUnits");
  const statPlusOneUnits = document.getElementById("statPlusOneUnits");
  const statPlusTwoUnits = document.getElementById("statPlusTwoUnits");
  const statAsoEbi = document.getElementById("statAsoEbi");

  function downloadCSV(rows) {
    if (!rows?.length) {
      alert("No RSVPs to download yet.");
      return;
    }

    const header = [
      "First Name",
      "Last Name",
      "Side",
      "Phone",
      "Attendance",
      "Guest Count",
      "RSVP Code",
      "Checked In",
    ];

    const escapeCSV = (v) => {
      const s = String(v ?? "");
      // wrap in quotes if it contains comma/quote/newline
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          escapeCSV(r.firstName),
          escapeCSV(r.lastName),
          escapeCSV(r.side),
          escapeCSV(r.phone),
          escapeCSV(r.attendance),
          escapeCSV(r.guestCount),
          escapeCSV(r.rsvpCode),
          escapeCSV(r.checkedIn ? "yes" : "no"),
        ].join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `guest-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  let allRows = []; // cache for search
  searchInput?.addEventListener("input", applySearch);
  downloadBtn?.addEventListener("click", () => downloadCSV(allRows));

  // Hard-protect dashboard: if not logged in, redirect to /admin
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./index.html";
      return;
    }

    // Logged in: load RSVPs
    await loadRSVPs();
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "./index.html";
  });

  async function loadRSVPs() {
    tableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;

    try {
      const q = query(collection(db, "rsvps"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const items = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });

      allRows = items;
      applySearch(); // renders filtered or full list depending on search box
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="7">Failed to load RSVPs.</td></tr>`;
    }
  }

  function renderTable(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="7">No RSVPs yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map((r) => {
        const name = escapeHTML(fmtName(r) || "-");
        const side = escapeHTML(r.side ?? "-");
        const phone = escapeHTML(r.phone ?? "-");
        const attendance = escapeHTML(fmtAttendance(r.attendance));
        const guests = escapeHTML(r.guestCount ?? "-");
        const code = escapeHTML(r.rsvpCode ?? "-");
        const checked = !!r.checkedIn;

        return `
        <tr data-id="${r.id}">
          <td>${name}</td>
          <td>${side}</td>
          <td>${phone}</td>
          <td>${attendance}</td>
          <td>${guests}</td>
          <td>${code}</td>
          <td>
            <button class="checkin-btn ${checked ? "is-checked" : ""}" type="button">
              ${checked ? "Checked in" : "Check in"}
            </button>
          </td>
        </tr>
      `;
      })
      .join("");

    // bind check-in buttons
    tableBody.querySelectorAll(".checkin-btn").forEach((btn) => {
      btn.addEventListener("click", onToggleCheckin);
    });
  }

  function computeStats(rows) {
    const attending = rows.filter((r) => String(r.attendance || "") === "yes");

    const totalHeads = attending.reduce((sum, r) => {
      const n = Number(r.guestCount || 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const yesCount = attending.length;

    const soloUnits = attending.filter(
      (r) => Number(r.guestCount) === 1,
    ).length;
    const plusOneUnits = attending.filter(
      (r) => Number(r.guestCount) === 2,
    ).length;
    const plusTwoUnits = attending.filter(
      (r) => Number(r.guestCount) === 3,
    ).length;

    // asoEbi: count requests among attending guests
    const asoEbiCount = attending.filter((r) => {
      const v = r.asoEbi;
      return v !== null && v !== undefined && String(v).trim() !== "";
    }).length;

    return {
      totalHeads,
      yesCount,
      soloUnits,
      plusOneUnits,
      plusTwoUnits,
      asoEbiCount,
    };
  }

  function renderStats(stats) {
    if (statTotalHeads) statTotalHeads.textContent = String(stats.totalHeads);
    if (statYesCount) statYesCount.textContent = String(stats.yesCount);
    if (statSoloUnits) statSoloUnits.textContent = String(stats.soloUnits);
    if (statPlusOneUnits)
      statPlusOneUnits.textContent = String(stats.plusOneUnits);
    if (statPlusTwoUnits)
      statPlusTwoUnits.textContent = String(stats.plusTwoUnits);
    if (statAsoEbi) statAsoEbi.textContent = String(stats.asoEbiCount);
  }

  function applySearch() {
    const q = (searchInput?.value || "").trim().toLowerCase();

    if (!q) {
      renderTable(allRows);
      renderStats(computeStats(allRows));
      return;
    }

    const filtered = allRows.filter((r) => {
      const name = fmtName(r).toLowerCase();
      const code = String(r.rsvpCode || "").toLowerCase();
      const phone = String(r.phone || "").toLowerCase();
      const side = String(r.side || "").toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        side.includes(q)
      );
    });

    renderTable(filtered);
    renderStats(computeStats(filtered));
  }

  async function onToggleCheckin(e) {
    const btn = e.currentTarget;
    const tr = btn.closest("tr");
    const id = tr?.getAttribute("data-id");
    if (!id) return;

    const record = allRows.find((x) => x.id === id);
    if (!record) return;

    const next = !record.checkedIn;

    btn.disabled = true;
    btn.textContent = next ? "Checking in..." : "Undoing...";

    try {
      if (next) {
        await updateDoc(doc(db, "rsvps", id), {
          checkedIn: true,
          checkedInAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "rsvps", id), {
          checkedIn: false,
          checkedInAt: null,
        });
      }

      // Update local cache
      record.checkedIn = next;

      // Re-render table
      applySearch();
    } catch (err) {
      console.error(err);
      alert("Check-in update failed. Check rules or connection.");
    } finally {
      btn.disabled = false;
    }
  }
}
