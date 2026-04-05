# Site Testing Results — 20 Sites

Tested against: https://annotatorai.srv1129590.hstgr.cloud/api/generate  
Date: 2026-04-05

## Summary

- **Passed:** 19/20
- **Failed:** 1/20 (reddit.com — ScreenshotOne 500 error, Reddit blocks automated screenshots)
- **All passed images look professional and well-formatted**

## Results Table

| # | URL | Focus Hint | Status | Steps | Quality Notes |
|---|-----|------------|--------|-------|---------------|
| 1 | google.com | (none) | PASS | 5 | Clean, markers well-placed on search bar area |
| 2 | canva.com | (none) | PASS | 5 | Good — rich screenshot, markers on key features |
| 3 | chatgpt.com | How to start a conversation | PASS | 3 | Focus badge visible, steps relevant to starting a chat |
| 4 | github.com | How to create a repository | PASS | 3 | Focus badge visible, steps about sign up / email entry |
| 5 | notion.so | (none) | PASS | 5 | Good layout, markers on nav/CTA/features |
| 6 | figma.com | (none) | PASS | 5 | Good — AI prompt field and key features identified |
| 7 | stripe.com | (none) | PASS | 4 | Good — nav and CTA elements identified |
| 8 | vercel.com | How to deploy a project | PASS | 5 | Focus badge visible, deployment-specific steps |
| 9 | linkedin.com | (none) | PASS | 5 | Good — sign-up flow and key features |
| 10 | twitter.com | (none) | PASS | 4 | Shows login/signup page, steps well-labeled |
| 11 | youtube.com | (none) | PASS | 5 | Search bar, sign in, navigation well-annotated |
| 12 | reddit.com | (none) | FAIL | - | ScreenshotOne 500: Reddit blocks automated screenshots |
| 13 | airtable.com | (none) | PASS | 5 | Good — CTA buttons and platform features |
| 14 | shopify.com | How to set up a store | PASS | 5 | Focus badge visible, store setup steps |
| 15 | wordpress.com | (none) | PASS | 4 | Good — start site, hosting, domain, theme |
| 16 | slack.com | (none) | PASS | 5 | Good — nav, CTA, integrations identified |
| 17 | trello.com | How to create a board | PASS | 5 | Focus badge visible, board creation steps |
| 18 | claude.ai | (none) | PASS | 4 | Good — sign up, plans, Cowork feature |
| 19 | docs.google.com | (none) | PASS | 4 | Shows Google sign-in page (expected — requires auth) |
| 20 | netflix.com | (none) | PASS | 5 | Good — sign up flow, email, get started |

## Quality Analysis

### What's Working Well
- Dark theme looks professional and consistent across all outputs
- Pink numbered markers are clearly visible on all screenshots
- Step labels and descriptions are well-written and actionable
- Focus badge (pink pill) appears correctly when focus hint is provided
- Focus hint genuinely changes the output — steps are aligned to the goal
- Card title always starts with a verb (as designed)
- Footer with "AnnotatorAI" branding + source URL present on all cards
- 3-5 steps per card — good range, never too many or too few

### Minor Observations
- docs.google.com shows a Google sign-in page (not Google Docs itself) — this is expected since the page requires authentication. Not a bug, just a limitation of screenshotting auth-gated pages.
- reddit.com fails entirely — ScreenshotOne can't capture it (500 error). This is a ScreenshotOne/Reddit limitation, not our bug. The error message shown to the user is clear.
- Some markers cluster together on pages with dense UI (e.g., trello.com nav bar) — readable but slightly crowded.

### Verdict
**The tool is working correctly.** 19 out of 20 sites produced clean, professional output. The one failure (Reddit) is a third-party API limitation with a clear error message. No code changes needed.
