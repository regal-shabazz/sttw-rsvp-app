export function initAsoEbiToggle() {
  const yesBtn = document.querySelector('[data-asoebi-choice="yes"]');
  const noBtn = document.querySelector('[data-asoebi-choice="no"]');
  const panelYes = document.getElementById("asoebiPanelYes");
  const panelNo = document.getElementById("asoebiPanelNo");
  const hint = document.getElementById("asoebiHint");

  if (!yesBtn || !noBtn || !panelYes || !panelNo) return;

  function resetButtons() {
    yesBtn.classList.remove("is-active");
    noBtn.classList.remove("is-active");
  }

  function showYes() {
    resetButtons();
    yesBtn.classList.add("is-active");

    panelYes.classList.remove("is-hidden");
    panelNo.classList.add("is-hidden");

    if (hint) hint.textContent = "Here are the Aso Ebi details below.";
  }

  function showNo() {
    resetButtons();
    noBtn.classList.add("is-active");

    panelNo.classList.remove("is-hidden");
    panelYes.classList.add("is-hidden");

    if (hint) hint.textContent = "No problem — we look forward to celebrating with you.";
  }

  yesBtn.addEventListener("click", showYes);
  noBtn.addEventListener("click", showNo);
}