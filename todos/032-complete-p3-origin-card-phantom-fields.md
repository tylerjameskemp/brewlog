---
status: complete
priority: p3
issue_id: "032"
tags: [code-review, brewscreen, yagni]
---

# Origin Details Card References Bean Fields That Don't Exist

## Problem Statement

RecipeAssembly's Origin Details card (lines 317-333) renders `bean.grower`, `bean.variety`, `bean.elevation`, and `bean.tastingNotes` — none of which exist on the Bean data model or are populated by any write path. The card renders five rows all showing "—".

## Proposed Solutions

Remove the Origin Details card until the Bean model supports these fields, or add the fields to the Bean form in BeanLibrary.

## Work Log

- 2026-02-27: Identified during code review
