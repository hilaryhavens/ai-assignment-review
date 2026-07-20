# AI-Proof My Assignment — Design Spec

**Date:** 2026-07-20
**Author:** Hilary Havens (with Claude)
**Status:** Approved design → ready for implementation plan

## 1. Purpose

A shareable web tool that assesses a college assignment's vulnerability to AI
misuse and proposes "AI-proof" redesigns, so students get a more robust learning
experience. It reproduces the structured **IDEA V7 review** shown in the
reference example (`AI IDEA Review of Final Project.docx`) for *any* assignment.

The tool is for instructors — Hilary and other UT faculty she shares the link
with. No account, no cost, no technical setup for the user.

## 2. How it works (chosen architecture)

**Prompt-generator model, fully static.** The app does NOT call any AI itself.
Instead it packages the user's assignment into a complete, ready-to-run IDEA V7
**prompt** that the user copies into Claude or ChatGPT. The AI returns the review.

Rationale: a static site hosts free on GitHub Pages (like Hilary's Cecilia game),
needs no API keys, no server, and no per-use cost, and can be shared with any
colleague via a plain link. The only tradeoff is one copy-paste round trip.

The app has **three functions**, presented as tabs:

1. **Generate** — assignment in → ready-to-run IDEA V7 prompt out.
2. **Format** — the AI's returned review pasted back in → clean, printable report
   with the dashboard laid out visually.
3. **Library** — a saved, sortable/filterable list of every assignment the user has
   run on this device (see §4.5). Stays static and free via browser storage.

## 3. User flow

```
[Generate tab]
  provide assignment (paste OR upload .docx/.pdf)
    → (optional) add context: course & level, discipline, learning goals
    → click "Build my review prompt"
    → copy the generated prompt
    → paste into Claude/ChatGPT, run it
[Format tab]
    → paste the AI's review text back
    → click "Format report"
    → view / print / save-to-PDF a styled report
```

## 4. Components

### 4.1 Input panel (Generate tab)
- Large paste textarea (always-available baseline).
- Drag-and-drop / file-picker for `.docx` and `.pdf`.
  - `.docx` → text extracted in-browser via **mammoth.js** (vendored locally).
  - `.pdf` → text extracted in-browser via **pdf.js** (vendored locally).
  - Extracted text drops into the textarea so the user can review/edit it.
- **Surfaced caveat:** scanned/image-only PDFs have no extractable text; UI tells
  the user to paste the text instead when extraction yields little/nothing.
- Libraries are bundled *into the site* (not loaded from a CDN) so the tool keeps
  working offline and has no external dependency or CSP risk.

### 4.2 Optional context fields (Generate tab)
Short, skippable inputs folded into the prompt to sharpen the review:
- Course name & level (e.g., "English 412, upper-division undergrad")
- Discipline / field
- Any specific learning goals the instructor already has in mind
The example review worked with zero context, so all of these are optional.

### 4.3 Prompt builder + output (Generate tab)
Assembles one prompt string from:
- the embedded **IDEA V7 framework instruction block** (§5),
- the assignment text,
- any provided context.
Renders it in a read-only box with a **Copy** button and a short "what to do next"
note (paste into Claude or ChatGPT and run).

### 4.4 Report formatter (Format tab)
- Textarea to paste the AI's returned review.
- Parses the review using the **consistent section headings** the prompt mandates,
  plus a small **structured data block** the prompt asks the AI to append (a fenced
  ```idea-data … ``` block containing the scores and dashboard values as simple
  `key: value` lines).
- Renders a styled, print-friendly report:
  - the 11 sections with clean typographic hierarchy,
  - a visual **dashboard** (before/after robustness score, AI-vulnerability level,
    the profile ratings) rendered as labeled bars/badges from the data block.
- Graceful degradation: if the data block is missing (older/edited review), the
  formatter still renders the prose sections and simply omits the visual dashboard.
- A **Print / Save as PDF** button (uses the browser's native print-to-PDF).

### 4.5 Local library (Library tab)
- **Storage:** browser `localStorage` (or IndexedDB if size warrants). Everything
  stays on the user's own device — nothing is uploaded. Keeps the app pure-static.
- **What's saved per entry:** a timestamp, the assignment title (user-provided or
  first line), the context fields (course & level, **discipline/field**, learning
  goals), the assignment text, the generated prompt, and — if the user later pastes
  a review into the Format tab and links it — the formatted review + its dashboard
  scores.
- **Saving:** an entry is created when the user clicks "Build my review prompt";
  the user can name/title it. Saving is the default but can be turned off (a
  "don't save this one" checkbox) for privacy.
- **Browse / sort / filter:** the Library tab shows entries in a table.
  - **Sort** by date, title, discipline/field, course, or robustness-after score.
  - **Filter/group by field (discipline)** — the primary requested view — plus a
    free-text search across titles and assignment text.
- **Per-entry actions:** open (reloads it into Generate/Format), copy prompt again,
  delete.
- **Export / import:** download the whole library as a JSON file (backup or move to
  another device) and import it back. This is the only way data crosses devices,
  by the user's own action.
- **Non-goal:** no cross-user/shared pool (that would require a backend — see §7).

## 5. The IDEA V7 framework instruction block

Reverse-engineered faithfully from the reference example so the AI reliably
produces all sections. The block instructs the AI to:

- Act as an expert in pedagogy + AI-robust assignment design.
- Analyze the supplied assignment and output these sections **with exactly these
  headings** (so the formatter can parse them):
  1. Assignment Snapshot
  2. Inferred Learning Objectives
  3. IDEA V7 Pedagogical Profile
     - Layer 1: Cognitive Demands (types of thinking, modes of reasoning, task
       structure, cognitive load [intrinsic/extraneous/germane], productive struggle)
     - Layer 2: Student Cognitive Engagement (visibility of thinking; ACE analysis —
       judgment, uncertainty, original interpretation, intellectual ownership,
       social/distributed reasoning; metacognition)
     - Layer 3: AI Robustness (LLM vulnerabilities: substitution, superficiality,
       hidden reasoning, originality loss, premature closure; robustness mechanisms)
  4. How Students Could Use LLMs to Bypass Learning
  5. Ethical and Productive Uses of LLMs
  6. Redesign Options (Low / Medium / High effort — each with: purpose, specific
     changes, new student-facing requirements, ACE improvements, robustness
     mechanisms added, ethical LLM use, instructor workload, student workload,
     expected robustness gain, sample assignment language)
  7. Recommended Redesign Level (with rationale and tradeoffs)
  8. Suggested Revised Assignment Language
  9. Productive Struggle Analysis (before vs. after)
  10. Learning Robustness Score (before X/10, after X/10, improvement summary)
  11. Assignment Profile Dashboard (cognitive complexity, productive struggle,
      visibility, authentic engagement, AI vulnerability, learning robustness,
      overall rating)
- Then append a fenced ```idea-data``` block with machine-readable values:
  `robustness_before`, `robustness_after`, `ai_vulnerability_before/after`,
  `visibility_before/after`, `engagement_before/after`, `cognitive_complexity`,
  `productive_struggle`, `overall_rating_before/after`, `recommended_level`.

The framework definition also appears on the page (a collapsible "About the IDEA V7
framework" section) for instructor transparency.

## 6. Look & hosting

- **UT branding** — Tennessee Orange (#FF8200), White, Smokey Gray (#4B4B4B);
  clean, professional, reads as an official UT faculty tool. (utk-branding skill.)
- Ships as a static folder (`index.html` + vendored JS libs + assets) pushed to a
  GitHub repo with Pages enabled → shareable `hilaryhavens.github.io/<repo>/` link.
- Responsive; works on laptop and tablet.

## 7. Non-goals (YAGNI for v1)

- No live AI calls / no API keys / no backend.
- No **shared/cross-user** database — the library is per-device browser storage
  only (§4.5). Data moves between devices solely via the user's own JSON export/import.
- No accounts or authentication.
- No OCR of scanned PDFs (paste instead).
- No editing/versioning of the framework in-app (it's baked into the page).

## 8. Success criteria

- Feeding in the English 412 guidelines and running the generated prompt yields a
  review comparable in structure and depth to the reference example.
- A colleague with only the link can produce a review with no setup.
- The Format tab turns a pasted review into a clean, printable report with a
  visible before/after dashboard.
- The Library tab lists past runs and can sort/filter them by discipline/field.
- The whole thing is one static folder that runs offline and hosts on GitHub Pages.
