# Phase 3: Card Template + Render - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 03-card-template-render
**Areas discussed:** Screenshot crop strategy, Font loading approach, Step layout handling, Sharp post-processing

---

## Screenshot Crop Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Top-aligned crop | Show top of page (hero/nav), crop width to fit, take available height | ✓ |
| Center crop | Crop from vertical center — catches mid-page content | |
| Scale to fit | Shrink entire screenshot to fit slot — shows more but text tiny | |

**User's choice:** Top-aligned crop
**Notes:** Most recognizable part of any website

### Follow-up: Crop Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Rounded + pink border | 12px border-radius with 2px solid rgba(255,45,107,0.4) per brief §7 | ✓ |
| Rounded, no border | Rounded corners only, minimal look | |
| You decide | Claude picks | |

**User's choice:** Rounded + pink border

---

## Font Loading Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Google Fonts @import | @import in template <style> tag, Puppeteer loads like browser | ✓ |
| Local font files | Download .woff2, reference via @font-face with local paths | |
| Base64-embedded | Embed as data URIs in template HTML | |

**User's choice:** Google Fonts @import

### Follow-up: Font Wait

| Option | Description | Selected |
|--------|-------------|----------|
| Wait for fonts | Use document.fonts.ready or ~500ms delay before screenshot | ✓ |
| No wait, trust Puppeteer | Rely on waitUntil: 'networkidle0' | |

**User's choice:** Wait for fonts

---

## Step Layout Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Flexbox with equal spacing | CSS flex column with gap, adapts to 3-5 steps naturally | ✓ |
| Fixed height per step | Fixed pixel height per step | |
| Font-size scaling | Reduce font size with more steps | |

**User's choice:** Flexbox with equal spacing

### Follow-up: Step Text Truncation

| Option | Description | Selected |
|--------|-------------|----------|
| 2-line clamp | CSS line-clamp at 2 lines with ellipsis | ✓ |
| No truncation | Show full text always | |
| You decide | Claude picks | |

**User's choice:** 2-line clamp

---

## Sharp Post-Processing

| Option | Description | Selected |
|--------|-------------|----------|
| Optimize PNG | Re-compress with compressionLevel 9, palette: false, ~30-50% smaller | ✓ |
| Convert to WebP | ~60% smaller but some platforms may not accept WebP | |
| Passthrough only | Skip Sharp, use raw Puppeteer output | |

**User's choice:** Optimize PNG

---

## Claude's Discretion

- Exact CSS values for padding, margins, font sizes
- Screenshot crop height dimension
- Focus badge positioning and sizing
- Sharp quality parameters beyond compressionLevel

## Deferred Ideas

None — discussion stayed within phase scope
