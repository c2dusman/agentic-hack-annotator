# Hackathon Submission Form Answers

Copy-paste these into the Google Form:
https://docs.google.com/forms/d/e/1FAIpQLSegcEVfn9vzJZHxeI7NDLF6V5m_HJPRXwdsytu_NyLl_Fl9eQ/viewform

---

## First Name *

Mohammed

## Last Name *

Usman

## Email *

mohammed.usman.wahid@gmail.com

## Skool Profile *

https://www.skool.com/@mohammed-usman-7995

## Video demo *

(Paste your YouTube/Loom link here after recording)

## Project Summary *

AnnotatorAI is a web application that turns any URL into a professionally annotated visual — ready for social media carousels and blog articles — in a single click.

The pipeline is fully automated: paste a URL, optionally add a focus hint, and AnnotatorAI handles everything. It captures a screenshot via the ScreenshotOne API, uses Gemini 2.5 Flash vision analysis to identify key UI elements with precise bounding boxes, sends that analysis to Claude Sonnet to generate clear step-by-step annotation copy, and renders the final dark-themed card image using Puppeteer and Sharp.

The output is a 9:16 overview image with numbered markers placed directly on the screenshot, plus an optional set of square (1080x1080) zoomed step-by-step images — one per annotated element — perfect for Instagram/LinkedIn carousels. Users can download everything as a single ZIP file.

Key technical highlights:
- Three AI models working in sequence: ScreenshotOne for capture, Gemini 2.5 Flash for vision analysis (returns exact x/y coordinates and bounding boxes), Claude Sonnet for copywriting
- Server-side rendering with Puppeteer for pixel-perfect card output
- Vanilla HTML/CSS/JS frontend — no framework overhead
- Self-hosted on Hostinger VPS (Ubuntu 22.04) with HTTPS via Traefik + Let's Encrypt
- Cost: approximately $0.03-0.05 per generation

Built entirely with Claude Code as the AI coding assistant, from architecture through deployment.

## Upload your project files

Skip this — use the GitHub link below instead.

## GitHub repository (optional)

https://github.com/c2dusman/agentic-hack-annotator

## Link to your project's interface (optional)

https://annotatorai.srv1129590.hstgr.cloud
