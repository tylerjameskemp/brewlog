---
title: Monolith-to-modules refactor checklist
category: logic-errors
module: worker
tags: [refactor, modules, architecture, constants, naming]
severity: P2
symptoms:
  - Single large file being split into multiple modules
  - Magic numbers duplicated across new modules
  - Thin wrapper files that don't justify their existence
  - Inconsistent naming across parallel modules
date: 2026-03-12
---

# Monolith-to-modules refactor checklist

## Problem

When splitting a monolithic file into modules, several patterns reliably cause issues: magic numbers get duplicated, files that are too thin add navigational overhead, naming conventions drift between parallel modules, and shared constants get scattered.

## Observed in Practice

Splitting a 630-line Cloudflare Worker into source adapters and extraction modules. Initial split created 7 files. Review found:

- `12000` (max text length) duplicated in 3 files
- `'BrewLog Recipe Importer/1.0'` (User-Agent) duplicated in 3 files
- `10000` (fetch timeout) duplicated in 3 files
- `text.js` was 7 lines with a single call site — pure overhead
- `validateCandidate.js` had 1 function with 1 consumer — better merged
- `extractTextSource` vs `fetchArticleSource` — inconsistent verb prefix

## Checklist

### Before splitting

1. **Identify shared constants.** Grep for literal values that appear in multiple logical sections. Extract these to a constants/utils module BEFORE splitting, so each new module imports them from day one.

2. **Set a minimum module threshold.** A file with <20 lines or a single function with a single consumer should be inlined at its call site or merged into its consumer. The overhead of a file (import, navigation, mental model) must be justified by the content.

3. **Choose a naming convention for parallel modules.** If you have N adapters/handlers that serve the same role, pick one verb and use it consistently. Document whether the verb implies I/O (`fetch*`) or pure transform (`extract*`), but don't mix them for parallel functions.

### During splitting

4. **Extract bottom-up** (leaves first, then consumers). Each intermediate step should produce a working system. Verify with syntax check + tests after each extraction.

5. **Move functions, don't copy.** Delete from the original immediately. If you copy-then-delete, you risk keeping both alive.

6. **Audit every variable reference** in extracted code. After moving a function to a new file, every variable must be: an import, a parameter, or a local definition. Closure references to the parent scope become silent bugs (see `standalone-component-references-parent-scope.md`).

### After splitting

7. **Grep for magic numbers** across all new files. Any literal value appearing in 2+ files should be a named constant in the shared module.

8. **Review from the consumer's perspective.** Read the router/entry point and check: are the imported names consistent? Do parallel imports look parallel?

9. **Check error semantics are preserved.** `console.error` calls, specific error messages, and status codes must survive the move. Compare original error paths line by line.

## Prevention

When planning a refactor, write the target file list AND the shared constants list before touching code. The constants list forces you to identify duplication before it happens.
