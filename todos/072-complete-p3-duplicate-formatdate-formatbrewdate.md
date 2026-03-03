---
status: complete
priority: p3
issue_id: "072"
tags: [code-review, duplication, utility]
dependencies: ["018"]
---

# Duplicate formatDate / formatBrewDate Across Components

## Problem Statement

Date formatting logic (converting ISO timestamps to display strings) is implemented separately in BrewHistory, BeanLibrary, and BrewTrends. Each has a slightly different format. Should be extracted to a shared utility alongside the formatTime extraction (todo 018).

## Proposed Solutions

### Option A: Extract to shared utility in storage.js or a new utils.js
- **Effort:** Small
- **Risk:** Low
