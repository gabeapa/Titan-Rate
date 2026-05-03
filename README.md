# TitanRate

> See Rate My Professors ratings without leaving the CSUF enrollment portal.

![TitanRate in action](74d1cfe2ab231cb6be78e965ac5283a9.png)

---

## The problem

Every semester, CSUF students bounce between the class search and Rate My Professors — opening tabs, searching names, comparing sections. TitanRate eliminates that entirely.

## The solution

TitanRate injects RMP ratings directly into the class search table. Every professor gets a color-coded badge. Hover it for the full breakdown.

---

## Features

- **Color-coded badges** on every instructor — green (4.0+), amber (3.0–3.9), red (below 3.0)
- **Hover popover** showing rating, difficulty, % would retake, review count, and top student tags
- **Direct link** to the professor's full RMP profile
- **Works automatically** — no setup, no API key, no account
- **Fast** — results are cached per session so repeat lookups are instant

---

## How it works

CSUF's registration portal runs on PeopleSoft and loads the class list inside an iframe at `cmsweb.fullerton.edu`. TitanRate's content script locates the Instructor column, extracts professor names, then fetches RMP data by parsing the Apollo state cache embedded in RMP's public search page for CSUF (school ID 166). No authentication or API key required.

---

## Tech

- Vanilla JavaScript — no frameworks, no build step
- Chrome Extension Manifest V3
- CSS with hover popovers and animated badges

---

## Limitations

- CSUF only (hardcoded to school ID 166 on RMP)
- Professors not listed on RMP show a "Not on RMP" badge
- RMP data refreshes on page reload

---

## Disclaimer

TitanRate is an unofficial student project and is not affiliated with CSUF or Rate My Professors.
