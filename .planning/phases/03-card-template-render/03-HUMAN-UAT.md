---
status: partial
phase: 03-card-template-render
source: [03-VERIFICATION.md]
started: 2026-04-04T00:00:00Z
updated: 2026-04-04T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dark theme + pink accents visible in rendered PNG
expected: Dark card with pink #FF2D6B accents clearly visible on badge, divider, step circles, and screenshot border — no fallback color, no white background
result: [pending]

### 2. Google Fonts render correctly (DM Sans + Space Grotesk)
expected: Step numbers use Space Grotesk bold condensed numerals; body uses DM Sans proportional text — not falling back to system sans-serif
result: [pending]

### 3. Focus badge hidden cleanly when no focus hint
expected: With focus: pink badge visible at top. Without focus: no badge row occupying vertical space (display:none removes layout impact)
result: [pending]

### 4. Screenshot top-crop in slot
expected: Screenshot visible in 936x520 slot, cropped from top (object-position: top), no letterboxing, fills slot cleanly
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
