# Fiction Tribe — CEO Mission Control

A single local HTML page (`index.html`) that acts as a CEO action board: AI morning
briefing, schedule, inbox signals, meeting intelligence (Tactiq), website visitor
intel (Snitcher), sales pipeline (HubSpot), finance (QuickBooks), outbound engine
(Apollo), and recent Workspace docs.

**Open it:** double-click `index.html` (no server needed — it reads
`data/dashboard-data.js` from disk).

## How data flows

```
MCP tools (Tactiq, Snitcher, Gmail, Calendar, Drive, HubSpot, Apollo, QuickBooks)
        │  probed by Claude (refresh-dashboard skill)
        ▼
data/sources/<source>.json     ← one envelope per source: online|offline + data
        ▼  node scripts/build-data.js
data/dashboard-data.js         ← the ONE file index.html reads
        ▼  node scripts/screenshot.js
screenshots/*.png              ← proof-of-life captures, fails on page JS errors
```

Design invariant: **the page never breaks.** Every source lives in an envelope
(`status: online|offline`); missing, corrupt, or failed sources render as OFFLINE
cards. All numbers are real fetched values — nothing is mocked.

## Refreshing

Ask Claude to run the **`refresh-dashboard`** skill (`.claude/skills/refresh-dashboard/`).
It re-probes every source, rewrites the AI briefing in `data/sources/briefing.json`
(prioritized actions that cross-reference tools), rebuilds, screenshots, and pushes.
A scheduled routine runs it every morning; failed sources are marked offline, never
fatal.

Manual rebuild without re-probing: `node scripts/build-data.js && node scripts/screenshot.js`.

**Data privacy:** `data/sources/`, `data/dashboard-data.js`, `screenshots/`, and
`dist/` are gitignored — they hold customer financials, email content, and visitor
PII and are never pushed. The repo carries only code; refreshed dashboards are
delivered as a self-contained `dist/mission-control.html` (built by
`scripts/bundle.js`).

## Brand

Fiction Tribe dark theme: FT purple `#4C00FF`, Gilroy (falls back to Poppins /
system sans offline), FT grid background. Chart colors (`#8E6BF5` mark, status
green/amber/red) are validated for lightness band, chroma, CVD separation, and
contrast against the dark surface.
