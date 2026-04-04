---
phase: 02-screenshot-ai-services
plan: 04
subsystem: annotate
tags: [gap-closure, prompt-engineering, claude, copywriting]
dependency_graph:
  requires: [02-03]
  provides: [step-count-constraint]
  affects: [03-card-template]
tech_stack:
  added: []
  patterns: [explicit-step-count-constraint-in-prompt]
key_files:
  created: []
  modified:
    - src/annotate.js
decisions:
  - "One-step-per-element constraint added as an explicit Rule in both FOCUS_PROMPT and NO_FOCUS_PROMPT — identical wording in both templates for consistency"
metrics:
  duration: 27s
  completed: 2026-04-04
  tasks: 1
  files: 1
requirements:
  - PIPE-04
  - FOCUS-03
---

# Phase 02 Plan 04: Step-Count Constraint in Claude Prompts Summary

**One-liner:** Added explicit one-step-per-element instruction to both FOCUS_PROMPT and NO_FOCUS_PROMPT in annotate.js, guaranteeing steps array length matches Gemini elements array length.

## What Was Built

Gap-closure plan addressing the single verification gap found in 02-VERIFICATION.md: neither Claude prompt template instructed Claude to produce exactly one step per element from the Gemini analysis input.

Two lines were added (one per prompt template) in the Rules block of each:

```
- Create exactly one step for each element in the elements array — use the element label and description as the basis for that step. The number of steps MUST equal the number of elements.
```

This instruction appears in both `FOCUS_PROMPT` (focus-guided path) and `NO_FOCUS_PROMPT` (inferred-focus path), inserted after the "Keep it punchy and clear" rule and before the "Return ONLY valid JSON" rule.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add one-step-per-element instruction to both prompt templates | 4e6319f | src/annotate.js |

## Verification Results

| Check | Result |
|-------|--------|
| "exactly one step for each element" appears exactly 2 times | PASS |
| "number of steps MUST equal the number of elements" appears exactly 2 times | PASS |
| `require('@anthropic-ai/sdk')` still present | PASS |
| `generateAnnotations` still exported | PASS (typeof: function) |
| `model: 'claude-sonnet-4-5'` unchanged | PASS |
| git diff shows only 2 added lines | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no stubs introduced.

## Self-Check: PASSED

- src/annotate.js modified: confirmed (git diff shows 2 insertions)
- Commit 4e6319f: confirmed present
- Both constraint phrases appear exactly 2 times: PASS
