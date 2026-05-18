const CSUF_SCHOOL_ID = "166";
const cache = {};

chrome.runtime.onMessage.addListener((req, _sender, respond) => {
  if (req.type === "FETCH_PROFESSOR") {
    fetchProfessor(req.name).then(respond).catch(e => {
      respond(null);
    });
    return true;
  }
});

async function fetchProfessor(name) {
  const ck = "prof:" + name.toLowerCase();
  if (cache[ck] !== undefined) return cache[ck];

  const parts     = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName  = parts[parts.length - 1];

  for (const q of [name, lastName]) {
    const url = `https://www.ratemyprofessors.com/search/professors/${CSUF_SCHOOL_ID}?q=${encodeURIComponent(q)}`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });
      const html = await res.text();

      const teachers = extractTeachers(html);
      if (!teachers.length) continue;

      const best = pickBest(teachers, firstName, lastName);
      if (best) {
        const result = {
          firstName:             best.firstName,
          lastName:              (best.lastName || "").trim(),
          legacyId:              best.legacyId,
          avgRating:             best.avgRating,
          avgDifficulty:         best.avgDifficulty,
          numRatings:            best.numRatings,
          wouldTakeAgainPercent: best.wouldTakeAgainPercent,
          department:            best.department,
          teacherRatingTags:     best.teacherRatingTags || [],
        };
        cache[ck] = result;
        return result;
      }
    } catch(e) {
    }
  }

  cache[ck] = null;
  return null;
}

function extractTeachers(html) {
  const teachers = [];
  let searchFrom = 0;
  while (true) {
    const idx = html.indexOf('"legacyId":', searchFrom);
    if (idx === -1) break;

    const objStart = findObjectStart(html, idx);
    if (objStart === -1) { searchFrom = idx + 1; continue; }

    const objEnd = findObjectEnd(html, objStart);
    if (objEnd === -1) { searchFrom = idx + 1; continue; }

    try {
      const obj = JSON.parse(html.slice(objStart, objEnd + 1));
      if (obj.legacyId && obj.avgRating != null && obj.firstName && obj.lastName) {
        teachers.push(obj);
      }
    } catch(e) { /* not valid JSON, skip */ }

    searchFrom = objEnd + 1;
  }
  return teachers;
}

function findObjectStart(html, pos) {
  let i = pos - 1;
  while (i >= 0 && html[i] !== "{") i--;
  return i >= 0 ? i : -1;
}

function findObjectEnd(html, openBrace) {
  let depth  = 0;
  let inStr  = false;
  let escape = false;
  for (let i = openBrace; i < html.length; i++) {
    const ch = html[i];
    if (escape)      { escape = false; continue; }
    if (ch === "\\") { escape = true;  continue; }
    if (ch === '"')  { inStr = !inStr; continue; }
    if (inStr)       continue;
    if (ch === "{")  depth++;
    if (ch === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function pickBest(teachers, firstName, lastName) {
  const fl = firstName.toLowerCase();
  const ll = lastName.toLowerCase();

  const scored = teachers.map(t => {
    let s = 0;
    const tf = (t.firstName || "").toLowerCase();
    const tl = (t.lastName  || "").trim().toLowerCase();

    if (tl === ll)            s += 10;
    else if (tl.includes(ll)) s += 4;
    else if (ll.includes(tl)) s += 2;

    if (tf === fl)            s += 5;
    else if (tf[0] === fl[0]) s += 1;

    s += Math.min(t.numRatings || 0, 10) * 0.05;
    return { t, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.s >= 5 ? scored[0].t : null;
}
