# AI-Proof My Assignment

A free, private web tool that assesses a college assignment's vulnerability to AI
misuse and proposes **AI-proof redesigns**, using the IDEA V7 framework — so
students get a more robust learning experience.

It does **not** call any AI itself. Instead it builds a ready-to-run prompt you
paste into Claude or ChatGPT, then formats the answer into a clean, printable
report. Nothing you type ever leaves your browser.

## What it does

The tool has three tabs:

1. **Generate prompt** — paste your assignment (or drop in a `.docx` / `.pdf`),
   optionally add course, discipline, and learning goals, and click **Build my
   review prompt**. Copy the generated IDEA V7 prompt into Claude or ChatGPT and
   run it.
2. **Format review** — paste the AI's response back in and get a styled,
   print-ready report with a visual before/after dashboard (robustness score, AI
   vulnerability, visibility, engagement, recommended redesign level).
3. **Library** — every assignment you run is saved in *this browser* and listed in
   a table you can **search, filter by discipline/field, and sort** (by date,
   title, discipline, course, or robustness score). Export/import the whole
   library as JSON to back it up or move it to another computer.

## What the review contains

The AI returns an 11-section review: Assignment Snapshot · Inferred Learning
Objectives · IDEA V7 Pedagogical Profile (Cognitive Demands / Student Engagement /
AI Robustness) · How Students Could Use LLMs to Bypass Learning · Ethical &
Productive Uses of LLMs · Low/Medium/High Redesign Options · Recommended Redesign
Level · Suggested Revised Assignment Language · Productive Struggle Analysis ·
Learning Robustness Score · Assignment Profile Dashboard.

## Privacy

Everything runs locally in your browser. Your assignments and reviews are stored
only in this browser's `localStorage`; nothing is uploaded to any server. The
`.docx`/`.pdf` text extraction also happens entirely in your browser.

## Run it locally

Any static file server works. For example:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly from disk also works in most browsers, but a local
server avoids browser restrictions on ES modules.)

## Deploy to GitHub Pages

1. Create a GitHub repository and push this folder to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main`
   and the `/ (root)` folder, and save.
4. Your tool will be live at `https://<username>.github.io/<repo>/` in a minute or
   two — share that link with colleagues.

## Notes & limits

- **Scanned / image-only PDFs** have no extractable text. If almost nothing is
  loaded, the tool will tell you — paste the text instead.
- The **visual dashboard** in the Format tab needs the small `idea-data` block the
  prompt asks the AI to include. If a pasted review lacks it (e.g. an older or
  hand-edited review), the report still renders — it just omits the dashboard.

## Development

Core logic lives in small, dependency-free ES modules under `src/`, each unit
tested with Node's built-in test runner:

```bash
npm test
```

`app.js` is DOM wiring only. The `.docx`/`.pdf` parsers in `vendor/` are committed
copies (mammoth, pdf.js) so the app needs no network — see `vendor/README.md` for
versions and how to re-fetch them.
