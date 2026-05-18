let injected = new Set();
let enabled  = true;

chrome.storage.local.get("enabled", d => {
  enabled = d.enabled !== false;
  if (enabled) waitForContent();
});

chrome.storage.onChanged.addListener(changes => {
  if (changes.enabled) {
    enabled = changes.enabled.newValue;
    if (enabled) { injected.clear(); waitForContent(); }
    else document.querySelectorAll(".ps-badge").forEach(b => b.remove());
  }
});

function waitForContent() {
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    const n = scanPage();
    if (n > 0 || tries > 40) clearInterval(iv);
  }, 500);
  const mo = new MutationObserver(debounce(scanPage, 800));
  mo.observe(document.body, { childList: true, subtree: true });
}

function scanPage() {
  if (!enabled) return 0;
  const hits = [];

  document.querySelectorAll("table").forEach(table => {
    const hrow = table.querySelector("thead tr, tr:first-child");
    if (!hrow) return;
    const headers = [...hrow.querySelectorAll("th, td")];
    const instrIdx = headers.findIndex(h => /^instructor$/i.test(h.textContent.trim()));
    if (instrIdx === -1) return;

    table.querySelectorAll("tbody tr, tr:not(:first-child)").forEach((row, rowIdx) => {
      const cells = row.querySelectorAll("td");
      const cell  = cells[instrIdx];
      if (!cell || cell.querySelector(".ps-badge")) return;

      const firstLine = cell.textContent.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean)[0] || "";
      const name = extractName(firstLine);
      if (!name) return;

      const key = `r${rowIdx}|${instrIdx}|${name}`;
      if (!injected.has(key)) {
        injected.add(key);
        hits.push({ el: cell, name });
      }
    });
  });

  hits.forEach(({ el, name }) => injectBadge(el, name));
  return hits.length;
}

function extractName(text) {
  if (!text) return null;
  text = text.trim().replace(/\s+/g, " ");
  if (text.length < 4 || text.length > 50) return null;
  if (/[\d@]|http/i.test(text)) return null;
  if (!/^[A-Z][a-zA-Z'\-]+(\s[A-Z][a-zA-Z'\-]+){1,2}$/.test(text)) return null;
  if (/^(TBA|TBD|Staff|Open|Closed|Multiple|Various|Online|Hybrid|Zoom|Remote|Pending|Section|Regular|Academic|Session|Lecture|Lab|Discussion|Seminar|Announced|Person|Waitlist|Available)$/i.test(text)) return null;
  if (/to be|staff member/i.test(text)) return null;
  return text;
}

function injectBadge(el, name) {
  if (el.querySelector(".ps-badge")) return;
  const badge = document.createElement("span");
  badge.className = "ps-badge ps-loading";
  badge.innerHTML = `<span class="ps-spinner"></span>`;
  el.appendChild(badge);

  chrome.runtime.sendMessage({ type: "FETCH_PROFESSOR", name }, prof => {
    if (chrome.runtime.lastError || !prof || prof.avgRating == null) {
      badge.className = "ps-badge ps-notfound";
      badge.textContent = "Not on RMP";
      return;
    }

    const rating  = parseFloat(prof.avgRating).toFixed(1);
    const diff    = parseFloat(prof.avgDifficulty).toFixed(1);
    const diffPct = Math.round((prof.avgDifficulty / 5) * 100);
    const wta     = prof.wouldTakeAgainPercent >= 0
                    ? Math.round(prof.wouldTakeAgainPercent) + "%" : "N/A";
    const n       = prof.numRatings || 0;
    const cls     = +rating >= 4 ? "ps-good" : +rating >= 3 ? "ps-mid" : "ps-bad";
    const tags    = (prof.teacherRatingTags || [])
                     .sort((a, b) => (b.tagCount||0) - (a.tagCount||0))
                     .slice(0, 4)
                     .map(t => `<span class="ps-tag">${esc(t.tagName || t)}</span>`)
                     .join("");
    const url = `https://www.ratemyprofessors.com/professor/${prof.legacyId}`;

    badge.className = `ps-badge ps-ready ${cls}`;
    badge.innerHTML = `
      <a class="ps-score-link" href="${url}" target="_blank">
        <span class="ps-score">${rating}</span><span class="ps-of">/5</span>
      </a>
      <span class="ps-popover">
        <span class="ps-pop-name">${esc(prof.firstName)} ${esc(prof.lastName)}</span>
        <span class="ps-pop-dept">${esc(prof.department || "")}</span>
        <span class="ps-pop-rating-row">
          <span class="ps-pop-big-score">${rating}</span>
          <span class="ps-pop-big-of">/5</span>
          <span class="ps-pop-wta">
            <span class="ps-pop-wta-pct">${wta}</span>
            <span class="ps-pop-wta-lbl">would<br>retake</span>
          </span>
        </span>
        <span class="ps-pop-stats">
          <span class="ps-pop-row">
            <span class="ps-pop-lbl">Difficulty</span>
            <span class="ps-pop-val">${diff}/5
              <span class="ps-diff-bar"><span class="ps-diff-fill" style="width:${diffPct}%"></span></span>
            </span>
          </span>
          <span class="ps-pop-row">
            <span class="ps-pop-lbl">Ratings</span>
            <span class="ps-pop-val">${n} reviews</span>
          </span>
        </span>
        ${tags ? `<span class="ps-tags">${tags}</span>` : ""}
        <a class="ps-rmp-link" href="${url}" target="_blank">View full profile on RMP →</a>
      </span>`;
  });
}

function esc(s) {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
