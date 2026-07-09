---
name: refresh-dashboard
description: Refresh the Fiction Tribe CEO mission-control dashboard. Re-probes every connected data source (Tactiq, Snitcher, Gmail, Google Calendar, Google Drive, HubSpot, Apollo, QuickBooks), rewrites the AI morning briefing, rebuilds data/dashboard-data.js, marks failed sources offline (the page must never break), and captures proof screenshots. Use every morning or whenever the user asks to refresh/update the dashboard or briefing.
---

# Refresh the CEO Mission-Control Dashboard

You are refreshing `index.html`'s data. The page reads exactly one file —
`data/dashboard-data.js` — which is generated from per-source JSON envelopes in
`data/sources/`. Your job is to re-fetch every source, rewrite the briefing, rebuild,
verify, and push.

**Prime directive: the page must never break.** A source that fails becomes an
`offline` envelope — never a missing file, never invalid JSON, never fabricated data.
If every single source fails, the dashboard still renders 9 offline cards.

## The envelope contract

Every file in `data/sources/` is one JSON object:

```json
{
  "source": "<name>",
  "label": "<panel title>",
  "status": "online" | "offline",
  "fetched_at": "<ISO 8601 with timezone, America/Los_Angeles>",
  "error": null | "<short human-readable reason>",
  "data": { ... } | null
}
```

Rules: `status: "online"` requires non-null `data` with real fetched values. Any
failure → `status: "offline"`, `data: null`, `error` filled. Numbers are plain JSON
numbers (no `$`, no commas). Valid JSON only. Never invent values.

## Step 1 — Re-probe each source (parallel subagents recommended)

Fan out background Agent tasks (one per domain) exactly like the shapes below. Each
agent loads its MCP tools via ToolSearch, fetches, and overwrites its file(s) in
`data/sources/`. All Snitcher/HubSpot/Apollo/QuickBooks calls are READ-ONLY — never
call create/update/delete/send/sync/reveal tools (Snitcher `reveal-contact-email`
costs credits).

| File | MCP server | What to fetch | `data` shape |
|---|---|---|---|
| `tactiq.json` | Tactiq | ~6 recent meetings: title, date, participants, summary (≤400 chars), action items | `{"meetings":[{"title","date","participants":[],"summary","action_items":[]}]}` |
| `snitcher.json` | Snitcher | Workspace (use the `uuid` from list-workspaces), top ~8 identified orgs last 7–14 days, engagement/insights for top 3–4 | `{"workspace","organisations":[{"name","industry","last_visit","sessions","pageviews","signals":[]}]}` |
| `gmail.json` | Gmail | `in:inbox newer_than:4d` threads (≤12): subject, from, date, snippet (≤200 chars), needs_action flag | `{"threads":[{"subject","from","date","snippet","needs_action"}]}` |
| `calendar.json` | Google Calendar | Events today → +3 days (≤15) | `{"events":[{"title","start","end","attendees","is_meeting"}]}` |
| `drive.json` | Google Drive | ~12 recent files | `{"files":[{"name","type","modified","modified_by","link"}]}` |
| `hubspot.json` | HubSpot | Open deals (≤12) + pipeline totals | `{"open_deal_count","pipeline_value","deals":[{"name","amount","stage","close_date","owner"}]}` |
| `apollo.json` | Apollo.io | Pending tasks (≤10), active sequences | `{"tasks":[{"title","due","contact","company"}],"campaigns":[{"name","active"}]}` |
| `quickbooks.json` | QuickBooks | AR aging summary, recent P&L, open invoices (≤8) | `{"ar_aging":{"current","d1_30","d31_60","d61_90","d90_plus","total"},"pnl":{"period","income","expenses","net"},"invoices":[{"customer","amount","due","status"}]}` |

Partial success within a source: keep `status: "online"`, set the failed sub-key to
`null`, note it in `error`.

## Step 2 — Rewrite the AI morning briefing (`data/sources/briefing.json`)

This is authored by YOU, not fetched — but every claim must trace back to data that
actually landed in `data/sources/`. Read the fresh envelopes first. `data` shape:

```json
{
  "headline": "<one punchy sentence sizing up the day>",
  "summary": "<2-3 sentences of situational awareness>",
  "actions": [
    { "priority": 1, "title": "<imperative, specific>", "why": "<evidence>",
      "sources": ["hubspot", "tactiq"], "due": "today" }
  ],
  "watchlist": ["<lower-priority signals worth an eye>"]
}
```

Briefing craft: 4–6 actions, priority 1 = must do today. The best actions
CROSS-REFERENCE tools (e.g. "Snitcher shows Acme visited pricing 3× this week AND
Acme's deal in HubSpot has stalled in negotiation → call them today"). `sources`
lists only source names whose data supports the action. Offline sources get no
actions, but note significant outages in the summary. Mention overdue AR, stalled
deals, unanswered action-needed email, and meeting commitments coming due.

## Step 3 — Rebuild, verify, screenshot, bundle

```bash
node scripts/build-data.js     # composes data/dashboard-data.js; prints per-source status
node scripts/screenshot.js    # captures screenshots/*.png; exits 1 on any page JS error
node scripts/bundle.js        # dist/mission-control.html — self-contained hand-off file
```

`build-data.js` never throws — missing/corrupt files become offline envelopes.
`screenshot.js` failing means the page is broken: fix before delivering (a malformed
envelope is the usual cause; check the newest source files).

## Step 4 — Commit, push, deliver

Run the refresh in /workspace/mission-control (the PRIVATE jamesrice/mission-control
repo) — that repo is the authorized home for dashboard data (owner authorization
2026-07-09):

```bash
cd /workspace/mission-control && git add -A && git commit -m "Morning refresh: <date>, <N>/9 sources online" && git push -u origin main
```

SECURITY INVARIANTS — check, don't assume: the data authorization covers ONLY the
private jamesrice/mission-control repo. Before every data push, verify it is still
private (GitHub API `visibility` field, or an unauthenticated fetch that fails);
if it has become public, STOP and tell the user instead of pushing. This repo
(jamesrice/termtest) is PUBLIC: code changes only, never data/screenshots/dist.

Then send `dist/mission-control.html` and `screenshots/dashboard-full.png` via
SendUserFile, and reply with sources online/offline (and why, for offline) plus
the briefing's top 3 actions.
