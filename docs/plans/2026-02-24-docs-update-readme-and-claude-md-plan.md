---
title: "docs: Update README & CLAUDE.md with Sprint 1-2 learnings"
type: docs
date: 2026-02-24
---

# docs: Update README & CLAUDE.md with Sprint 1-2 learnings

## Overview

Both README.md and CLAUDE.md are stale — they reflect the initial scaffold, not the 8-PR, 7,600-line project that was actually built. A developer returning to this project (or an AI agent reading CLAUDE.md) would be misled about what exists, what patterns to follow, and what has already been implemented.

**Highest-risk gap:** CLAUDE.md's "Future Plans" section says "Do NOT implement unless asked" for Brew Trends and Export/Import — both of which are fully built and merged. An AI agent reading this will refuse to extend features that already exist.

## Acceptance Criteria

### README.md
- [x] Features section listing all 8 built features (bean library, comparison mode, trends, export/import, mobile nav, onboarding wizard, auto-diff, flavor picker)
- [x] Tech stack updated: add Recharts, uuid to the list
- [x] "Getting Started" section with `npm install`, `npm run dev`, `npm run build`, `npm run preview`
- [x] Screenshots placeholder section (`_Screenshots coming soon._` with list of what to capture)
- [x] Keep it concise — README is the storefront, not the technical manual

### CLAUDE.md
- [x] **Key Files**: Add 5 missing components (`BeanLibrary.jsx`, `BrewTrends.jsx`, `Header.jsx`, `MobileNav.jsx`, `SettingsMenu.jsx`) with accurate one-line descriptions
- [x] **Key Files**: Update `BrewHistory.jsx` description to mention compare mode. Update `EquipmentSetup.jsx` description to mention wizard vs edit mode. Update `storage.js` description to reflect actual scope (CRUD for 3 entity types + merge/export/import/dedup/rename cascade).
- [x] **Data Model**: Add Bean record shape and Equipment record shape alongside existing Brew record
- [x] **Future Plans**: Remove "Brew trend charts (Recharts)" and "Export/import data" — they are built. Keep remaining unbuilt items (AI coach, bean freshness, PWA, complexity toggle).
- [x] **New section — Patterns & Conventions**: Document key architecture decisions:
  - Lazy state initialization (`useState(() => getBrews())`) — never useEffect for localStorage sync
  - Storage-layer sorting — `getBrews()` sorts by `brewedAt`, consumers never sort
  - Bean dedup on write + clean on load — `saveBean()` normalizes, `deduplicateBeans()` runs at startup
  - Rename cascade — `renameBrewBean()` updates all brews when a bean name changes
  - Double-save guards — `savingRef` in BrewForm, `isImporting` in SettingsMenu, `dismissed` in EquipmentSetup
  - Import merge vs replace — merge uses "local wins" (keep local on ID conflict, add new only)
  - UI preferences — separate `brewlog_ui_prefs` localStorage key for one-time hints
  - Animation — Tailwind keyframes (`fade-in`, `fade-in-up`, `scale-in`) with `motion-reduce:animate-none`
  - Mobile — bottom nav < 768px, top tabs >= 768px, 44px touch targets, `text-base` on inputs (prevent iOS auto-zoom), `.pb-safe` for safe-area insets
- [x] **New section — Bugs & Lessons Learned**: Brief summary of P1 bugs found during code review, with cross-references to `docs/solutions/` and `todos/`
- [x] **Design Principles**: Add: empty states guide the user, accessibility (motion-reduce), auto-diff between brews
- [x] **Project Structure**: Add `docs/plans/`, `docs/solutions/`, `todos/` to the Key Files section or a new Directory Structure section
- [x] **Storage Keys**: Document the 4 localStorage keys (`brewlog_brews`, `brewlog_equipment`, `brewlog_beans`, `brewlog_ui_prefs`)

### Git History
- [x] Review commit history — verify it is clean (conventional commits, no messy squashable commits)
- [x] **Verdict from research:** History is already clean. 29 conventional-commit-style messages across 8 merged PRs. No squashing needed. Just document this conclusion.

## Implementation Notes

### README.md target structure
```
# BrewLog
One-line description

## Features
Bullet list of what exists

## Screenshots
Placeholder with capture list

## Tech Stack
Updated dependency list

## Getting Started
Prerequisites + commands

## Project Structure
Brief overview pointing to CLAUDE.md for details
```

### CLAUDE.md target structure
Keep existing structure but expand:
```
# BrewLog — Adaptive Brewing Journal
## What This Project Is          (update description)
## Architecture                  (keep, minor updates)
## Key Files                     (add 5 components, update 3 descriptions)
## Data Model                    (add Bean + Equipment shapes)
## Design Principles             (add 3 new principles)
## Patterns & Conventions        (NEW — architecture decisions)
## Bugs & Lessons Learned        (NEW — brief, with cross-refs)
## Commands                      (add preview)
## Future Plans                  (remove 2 built items)
```

### What NOT to do
- Don't turn this into a blog post or portfolio piece
- Don't add features or code changes
- Don't over-document — keep CLAUDE.md under 200 lines if possible (it's loaded into AI context)
- Don't delete existing correct content — expand it
- Don't duplicate content from `docs/solutions/` — cross-reference instead

## References
- Git log: 29 commits across 8 PRs (Feb 23-24, 2026)
- Solution doc: `docs/solutions/logic-errors/string-reference-rename-orphans-records.md`
- Bug fix plan: `docs/plans/2026-02-24-fix-four-bug-fixes-plan.md`
- Todos: `todos/` (9 items, 8 complete, 1 pending)
