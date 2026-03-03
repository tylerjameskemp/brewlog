---
status: pending
priority: p3
issue_id: "071"
tags: [code-review, security, input-validation]
dependencies: []
---

# No min/max on Numeric Inputs

## Problem Statement

Numeric inputs for coffeeGrams, waterGrams, waterTemp, grindSetting have no `min`/`max` attributes. Users can enter negative numbers or unreasonably large values. While this doesn't cause crashes, it produces nonsensical data and meaningless trends.

## Proposed Solutions

### Option A: Add min/max to numeric inputs
Reasonable limits: coffeeGrams (1-100), waterGrams (1-2000), waterTemp (32-212), grindSetting (varies by grinder but 0-100 is safe).
- **Effort:** Small
- **Risk:** Low
