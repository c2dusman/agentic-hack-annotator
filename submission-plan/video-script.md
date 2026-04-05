# Video Demo Script

**Target length:** ~2 minutes  
**Format:** Screen recording with voiceover  
**Required by form:** "Link a 1-3min video demo of your project, how it works, and what output it produces. Make sure to show that it is self-hosted on Hostinger."

---

## Judging Criteria to Hit

The video must demonstrate ALL of these (from Section 13 of the project brief):

| Criterion | How to show it in the video |
|-----------|----------------------------|
| **Output quality** | Show the final annotated image clearly — zoom in, show the dark theme, numbered markers, step labels |
| **Repeatable on any URL** | Use TWO completely different websites to prove it works on anything |
| **Documentation & Clarity** | Briefly mention GitHub repo is public with README and .env.example |
| **Workflow efficiency** | Emphasize: just a URL + optional hint, one click, done — no manual editing |
| **Implementation cost** | Mention ~$0.03-0.05 per generation |

---

## Demo Sites

| Demo | URL | Focus Hint | Purpose |
|------|-----|------------|---------|
| Demo 1 | `canva.com` | (leave empty) | Shows the AI decides what to annotate on its own |
| Demo 2 | `chatgpt.com` | `How to start a conversation` | Shows focus hint guides the AI to specific elements |

**Backup sites (if main sites don't render well on the day):**
- Demo 1 alternatives: `notion.so`, `figma.com`, `airtable.com`
- Demo 2 alternatives: `claude.ai` with "How to start a conversation", `github.com` with "How to create a repository"

**TIP:** Test both demos on the live site BEFORE recording to make sure they produce good results. If a site looks bad, swap to a backup.

---

## Script

### INTRO — 15 seconds

> SHOW: Browser open at https://annotatorai.srv1129590.hstgr.cloud  
> ACTION: Highlight the Hostinger URL in the address bar

"Hi, I'm Usman. This is AnnotatorAI — paste any URL and get a professionally annotated visual, instantly. No design tools, no manual work. It's fully self-hosted on my Hostinger VPS — you can see the Hostinger domain right here in the URL bar."

**[HITS: Workflow efficiency, Self-hosted on Hostinger]**

---

### DEMO 1: URL Only — No Focus Hint — 40 seconds

> ACTION: Type `canva.com` in the URL field. Leave focus hint empty.

"First, I'll just give it a URL with no instructions at all. The AI figures out what's important on its own."

> ACTION: Click Generate. Show the loading stages as they cycle through.

"Behind the scenes, three AI services work in sequence — ScreenshotOne captures the page, Gemini 2.5 Flash analyzes the UI and locates key elements with exact coordinates, then Claude Sonnet writes the annotation copy. Total cost is about three to five cents per image."

> ACTION: Show the finished overview image. Pause for 2-3 seconds so viewers can see it clearly.

"With zero guidance, it identified the most important elements and created this annotated card — dark theme, numbered markers, step-by-step labels. Ready to post."

**[HITS: Output quality, Repeatable on any URL, Implementation cost]**

---

### DEMO 2: URL + Focus Hint — 45 seconds

> ACTION: Clear the form. Type `chatgpt.com` in the URL field. Type `How to start a conversation` in the focus hint.

"Now I'll give it a specific focus — 'How to start a conversation'. The AI will only annotate elements relevant to that goal."

> ACTION: Click Generate. Wait for result.

> ACTION: Show the overview image. Point out the focus badge visible on the card.

"See how the focus hint appears as a badge on the card, and every step is about starting a conversation — nothing off-topic. The same site, completely different output."

> ACTION: Click "Generate Step-by-Step Images". Show the square zoomed cards appearing.

"It also generates individual step cards — each one zooms into a specific UI element. These are 1080 by 1080, perfect for Instagram or LinkedIn carousels."

> ACTION: Click "Download All as ZIP".

"One click downloads everything — the overview plus all step images — as a single ZIP file."

**[HITS: Output quality, Repeatable on any URL, Workflow efficiency]**

---

### CLOSING — 20 seconds

"So that's AnnotatorAI. One URL in, a complete annotated carousel out. Works on any public website. Three AI models — ScreenshotOne, Gemini Flash, and Claude Sonnet — in a fully automated pipeline. Built entirely with Claude Code, self-hosted on Hostinger. The code is on GitHub with full documentation. Thanks for watching."

**[HITS: Documentation & Clarity, all criteria summarized]**

---

## Recording Checklist

- [ ] Test both demo sites on the LIVE Hostinger URL before recording
- [ ] Close all other browser tabs — keep the screen clean
- [ ] Zoom browser to ~125% so the UI is readable
- [ ] Use screen recording: QuickTime (Mac), Loom, or OBS
- [ ] Speak at a steady pace — you have plenty of time
- [ ] After recording, upload to YouTube (unlisted is fine) or Loom
- [ ] Paste the video link into the submission form
