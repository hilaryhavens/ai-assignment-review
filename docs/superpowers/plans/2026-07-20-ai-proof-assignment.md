# AI-Proof My Assignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, GitHub-Pages-hostable web app that turns any college assignment into a ready-to-run IDEA V7 review prompt, formats the AI's returned review into a printable report, and keeps a local, field-sortable library of past runs.

**Architecture:** One self-contained static site. Pure logic lives in small ES modules (`src/`) that are unit-tested in Node with `node:test`. `index.html` wires those modules to a three-tab UI (Generate / Format / Library). Third-party parsers (mammoth for .docx, pdf.js for .pdf) are vendored locally under `vendor/`. Persistence is browser `localStorage`. No backend, no API keys.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), `node:test` for unit tests, mammoth.js (.docx→text), pdf.js (.pdf→text), UT-branded CSS.

## Global Constraints

- Fully static — no server, no API keys, no live AI calls, no network requests at runtime. Vendored libs only; no CDN `<script src=…>`.
- Must run when opened from disk and when hosted at `hilaryhavens.github.io/<repo>/`.
- All persistence is `localStorage` on the user's device; nothing is uploaded. No shared/cross-user store.
- UT branding: Tennessee Orange `#FF8200`, White `#FFFFFF`, Smokey Gray `#4B4B4B`.
- Pure logic modules must contain no DOM/`window` references so they can be tested in Node.
- Section headings emitted by the prompt and consumed by the parser must match EXACTLY (single source of truth = `SECTION_TITLES` in `src/idea-framework.js`).

---

### Task 1: Project scaffold + vendored parser libraries

**Files:**
- Create: `package.json`, `README.md`, `.gitignore` (exists), `vendor/README.md`
- Add: `vendor/mammoth.browser.min.js`, `vendor/pdf.min.js`, `vendor/pdf.worker.min.js`

**Interfaces:**
- Produces: a `npm test` script that runs `node --test`; vendored globals `window.mammoth`, `window.pdfjsLib`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ai-assignment-review",
  "version": "0.1.0",
  "description": "AI-Proof My Assignment — IDEA V7 assignment review tool",
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "private": true
}
```

- [ ] **Step 2: Vendor the parser libraries**

Download pinned copies into `vendor/` (run once; commit the files so the app needs no network):

```bash
cd vendor
curl -L -o mammoth.browser.min.js https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js
curl -L -o pdf.min.js            https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.min.mjs
curl -L -o pdf.worker.min.js     https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs
```

Write `vendor/README.md` recording the exact versions and source URLs so they can be re-fetched.

- [ ] **Step 3: Verify files exist and are non-trivial**

Run: `wc -c vendor/*.js`
Expected: three files, each > 50 000 bytes.

- [ ] **Step 4: Commit**

```bash
git add package.json vendor/
git commit -m "chore: scaffold project and vendor docx/pdf parsers"
```

---

### Task 2: IDEA V7 framework + prompt builder

**Files:**
- Create: `src/idea-framework.js`
- Test: `test/idea-framework.test.js`

**Interfaces:**
- Produces:
  - `SECTION_TITLES: string[]` — the 11 canonical section headings, in order.
  - `IDEA_INSTRUCTIONS: string` — the framework instruction block (role, section list, `idea-data` block spec).
  - `buildPrompt({ assignment, course, discipline, goals }): string` — assembles the full prompt. `assignment` required (non-empty); context fields optional.

- [ ] **Step 1: Write the failing test**

```js
// test/idea-framework.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, SECTION_TITLES, IDEA_INSTRUCTIONS } from '../src/idea-framework.js';

test('SECTION_TITLES has the 11 canonical sections in order', () => {
  assert.equal(SECTION_TITLES.length, 11);
  assert.equal(SECTION_TITLES[0], 'Assignment Snapshot');
  assert.equal(SECTION_TITLES[10], 'Assignment Profile Dashboard');
});

test('instructions require the machine-readable idea-data block', () => {
  assert.match(IDEA_INSTRUCTIONS, /idea-data/);
  assert.match(IDEA_INSTRUCTIONS, /robustness_before/);
});

test('buildPrompt embeds the assignment text', () => {
  const p = buildPrompt({ assignment: 'Write an essay about frogs.' });
  assert.match(p, /Write an essay about frogs\./);
  assert.match(p, /Assignment Snapshot/);
});

test('buildPrompt includes context only when provided', () => {
  const bare = buildPrompt({ assignment: 'X' });
  assert.doesNotMatch(bare, /Course & level:/);
  const rich = buildPrompt({ assignment: 'X', course: 'English 412', discipline: 'Literature', goals: 'TEI encoding' });
  assert.match(rich, /English 412/);
  assert.match(rich, /Literature/);
  assert.match(rich, /TEI encoding/);
});

test('buildPrompt throws on empty assignment', () => {
  assert.throws(() => buildPrompt({ assignment: '   ' }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/idea-framework.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/idea-framework.js`**

Real content (full framework reverse-engineered from the reference example):

```js
// src/idea-framework.js — pure, no DOM.
export const SECTION_TITLES = [
  'Assignment Snapshot',
  'Inferred Learning Objectives',
  'IDEA V7 Pedagogical Profile',
  'How Students Could Use LLMs to Bypass Learning',
  'Ethical and Productive Uses of LLMs',
  'Redesign Options',
  'Recommended Redesign Level',
  'Suggested Revised Assignment Language',
  'Productive Struggle Analysis',
  'Learning Robustness Score',
  'Assignment Profile Dashboard',
];

export const IDEA_INSTRUCTIONS = `You are an expert in higher-education pedagogy and AI-robust assignment design. Using the IDEA V7 framework, analyze the assignment below to (a) reconstruct its pedagogical design, (b) identify how students could misuse AI to bypass learning, and (c) propose redesigns that preserve authentic cognitive engagement while making AI use ethical and productive.

Produce a report with EXACTLY these numbered sections and headings, in this order:

1. Assignment Snapshot — a concise paragraph describing what the assignment asks and its deliverables.
2. Inferred Learning Objectives — the skills/knowledge the assignment is really trying to build.
3. IDEA V7 Pedagogical Profile — with three labeled layers:
   - Layer 1: Cognitive Demands — types of thinking; modes of reasoning; task structure; cognitive load (intrinsic / extraneous / germane); productive struggle (present vs. potentially extraneous).
   - Layer 2: Student Cognitive Engagement — visibility of student thinking; ACE analysis (judgment & decision-making, uncertainty & ambiguity, original interpretation, intellectual ownership, social/distributed reasoning); metacognitive engagement.
   - Layer 3: AI Robustness — LLM vulnerabilities (substitution risk, superficiality risk, hidden-reasoning risk, originality loss, premature closure); existing learning-robustness mechanisms.
4. How Students Could Use LLMs to Bypass Learning — concrete bypass routes for THIS assignment.
5. Ethical and Productive Uses of LLMs — legitimate ways students could use AI here.
6. Redesign Options — three tiers (Low-Effort, Medium-Effort, High-Effort). For EACH tier give: Purpose; Specific Changes; New Student-Facing Requirements; ACE Improvements; Learning Robustness Mechanisms Added; Ethical/Productive LLM Use; Instructor Workload; Student Workload; Expected Robustness Gain; Sample Assignment Language.
7. Recommended Redesign Level — name the tier, with Rationale and Tradeoffs.
8. Suggested Revised Assignment Language — ready-to-paste revised assignment text.
9. Productive Struggle Analysis — "Original Assignment (Before)" vs. "Redesigned Assignment (After)": struggle type, hidden-reasoning risk, AI-bypass risk, visibility.
10. Learning Robustness Score — "Before: X/10", "After: X/10", and a one-line improvement summary.
11. Assignment Profile Dashboard — cognitive complexity; productive struggle; visibility (original vs. redesigned); authentic cognitive engagement (original vs. redesigned); AI vulnerability (original vs. redesigned); learning robustness (original vs. redesigned); overall learning-design rating (original → redesigned).

After the prose report, append a single fenced code block tagged \`idea-data\` containing ONLY these keys, one \`key: value\` per line (levels are Low/Moderate/High/Strong/Very strong; scores are integers 0-10):

\`\`\`idea-data
robustness_before: <0-10>
robustness_after: <0-10>
ai_vulnerability_before: <level>
ai_vulnerability_after: <level>
visibility_before: <level>
visibility_after: <level>
engagement_before: <level>
engagement_after: <level>
cognitive_complexity: <level>
productive_struggle: <level>
recommended_level: <Low-Effort|Medium-Effort|High-Effort>
overall_rating_before: <level>
overall_rating_after: <level>
\`\`\``;

export function buildPrompt({ assignment, course, discipline, goals } = {}) {
  const text = (assignment || '').trim();
  if (!text) throw new Error('Assignment text is required.');

  const ctx = [];
  if (course && course.trim())     ctx.push(`Course & level: ${course.trim()}`);
  if (discipline && discipline.trim()) ctx.push(`Discipline/field: ${discipline.trim()}`);
  if (goals && goals.trim())       ctx.push(`Instructor's stated learning goals: ${goals.trim()}`);
  const ctxBlock = ctx.length
    ? `\n\nADDITIONAL CONTEXT FROM THE INSTRUCTOR:\n${ctx.join('\n')}`
    : '';

  return `${IDEA_INSTRUCTIONS}${ctxBlock}\n\n=== ASSIGNMENT TO ANALYZE (verbatim) ===\n${text}\n=== END OF ASSIGNMENT ===`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/idea-framework.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/idea-framework.js test/idea-framework.test.js
git commit -m "feat: IDEA V7 framework and prompt builder"
```

---

### Task 3: Review parser (prose sections + idea-data block)

**Files:**
- Create: `src/review-parser.js`
- Test: `test/review-parser.test.js`

**Interfaces:**
- Consumes: `SECTION_TITLES` from `src/idea-framework.js`.
- Produces:
  - `parseReview(raw: string): { sections: {title, body}[], data: Record<string,string>, hasData: boolean }`.
  - `parseDataBlock(raw: string): Record<string,string>` — extracts the fenced `idea-data` block into key/value pairs; `{}` if absent.

- [ ] **Step 1: Write the failing test**

```js
// test/review-parser.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReview, parseDataBlock } from '../src/review-parser.js';

const SAMPLE = `## 1. Assignment Snapshot
Students build a digital edition.

## 2. Inferred Learning Objectives
- TEI encoding
- Editorial judgment

## 10. Learning Robustness Score
Before: 5/10. After: 8/10.

\`\`\`idea-data
robustness_before: 5
robustness_after: 8
ai_vulnerability_before: High
recommended_level: Medium-Effort
\`\`\``;

test('parseDataBlock reads key/value pairs', () => {
  const d = parseDataBlock(SAMPLE);
  assert.equal(d.robustness_before, '5');
  assert.equal(d.robustness_after, '8');
  assert.equal(d.recommended_level, 'Medium-Effort');
});

test('parseDataBlock returns {} when absent', () => {
  assert.deepEqual(parseDataBlock('no block here'), {});
});

test('parseReview splits sections by heading and strips the data fence from prose', () => {
  const r = parseReview(SAMPLE);
  assert.ok(r.hasData);
  const titles = r.sections.map(s => s.title);
  assert.ok(titles.includes('Assignment Snapshot'));
  assert.ok(titles.includes('Learning Robustness Score'));
  const snapshot = r.sections.find(s => s.title === 'Assignment Snapshot');
  assert.match(snapshot.body, /digital edition/);
  // the idea-data fence must not leak into any prose body
  for (const s of r.sections) assert.doesNotMatch(s.body, /idea-data/);
});

test('parseReview tolerates plain numbered headings without markdown', () => {
  const r = parseReview('1. Assignment Snapshot\nHello world.');
  assert.equal(r.sections[0].title, 'Assignment Snapshot');
  assert.match(r.sections[0].body, /Hello world/);
  assert.equal(r.hasData, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/review-parser.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/review-parser.js`**

```js
// src/review-parser.js — pure, no DOM.
import { SECTION_TITLES } from './idea-framework.js';

export function parseDataBlock(raw) {
  const m = (raw || '').match(/```idea-data\s*([\s\S]*?)```/i);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

function stripDataBlock(raw) {
  return (raw || '').replace(/```idea-data[\s\S]*?```/i, '').trim();
}

// Build a regex that finds any canonical section title, optionally preceded by
// markdown hashes and/or a "N." number, at the start of a line.
function headingRegex() {
  const alt = SECTION_TITLES.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`^\\s*#{0,6}\\s*(?:\\d+\\.?\\s*)?(${alt})\\s*$`, 'im');
}

export function parseReview(raw) {
  const data = parseDataBlock(raw);
  const hasData = Object.keys(data).length > 0;
  const prose = stripDataBlock(raw);
  const lines = prose.split(/\r?\n/);
  const re = headingRegex();

  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      current = { title: m[1], body: '' };
      sections.push(current);
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  for (const s of sections) s.body = s.body.trim();
  return { sections, data, hasData };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/review-parser.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/review-parser.js test/review-parser.test.js
git commit -m "feat: parse AI review into sections and dashboard data"
```

---

### Task 4: Library sort/filter logic

**Files:**
- Create: `src/library-logic.js`
- Test: `test/library-logic.test.js`

**Interfaces:**
- Produces:
  - `sortEntries(entries, key, dir='asc'): entry[]` — key ∈ `date|title|discipline|course|robustness_after`; non-mutating.
  - `filterEntries(entries, { discipline, search }): entry[]` — case-insensitive; `discipline` exact-ish match, `search` substring over title+assignment.
  - `disciplines(entries): string[]` — sorted unique non-empty disciplines (for the filter dropdown).
- Entry shape: `{ id, createdAt(ISO), title, course, discipline, goals, assignment, prompt, review?, data? }`.

- [ ] **Step 1: Write the failing test**

```js
// test/library-logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortEntries, filterEntries, disciplines } from '../src/library-logic.js';

const E = [
  { id:'1', createdAt:'2026-01-02', title:'Frogs',  course:'BIO 101', discipline:'Biology',    assignment:'study frogs', data:{robustness_after:'8'} },
  { id:'2', createdAt:'2026-03-01', title:'Austen', course:'ENG 412', discipline:'Literature', assignment:'read Emma',   data:{robustness_after:'5'} },
  { id:'3', createdAt:'2026-02-01', title:'Poe',    course:'ENG 200', discipline:'Literature', assignment:'raven essay', data:{} },
];

test('sortEntries by date ascending is non-mutating', () => {
  const out = sortEntries(E, 'date', 'asc');
  assert.deepEqual(out.map(e=>e.id), ['1','3','2']);
  assert.equal(E[0].id, '1'); // original untouched
});

test('sortEntries by title descending', () => {
  assert.deepEqual(sortEntries(E,'title','desc').map(e=>e.id), ['3','1','2']);
});

test('sortEntries by robustness_after treats missing as -1', () => {
  assert.deepEqual(sortEntries(E,'robustness_after','desc').map(e=>e.id), ['1','2','3']);
});

test('filterEntries by discipline', () => {
  assert.deepEqual(filterEntries(E,{discipline:'Literature'}).map(e=>e.id), ['2','3']);
});

test('filterEntries by search over title and assignment', () => {
  assert.deepEqual(filterEntries(E,{search:'raven'}).map(e=>e.id), ['3']);
  assert.deepEqual(filterEntries(E,{search:'frogs'}).map(e=>e.id), ['1']);
});

test('disciplines returns sorted unique list', () => {
  assert.deepEqual(disciplines(E), ['Biology','Literature']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/library-logic.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/library-logic.js`**

```js
// src/library-logic.js — pure, no DOM.
function robustness(e) {
  const v = e && e.data ? parseInt(e.data.robustness_after, 10) : NaN;
  return Number.isFinite(v) ? v : -1;
}

export function sortEntries(entries, key, dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  const cmp = {
    date:  (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)),
    title: (a, b) => String(a.title || '').localeCompare(String(b.title || '')),
    discipline: (a, b) => String(a.discipline || '').localeCompare(String(b.discipline || '')),
    course: (a, b) => String(a.course || '').localeCompare(String(b.course || '')),
    robustness_after: (a, b) => robustness(a) - robustness(b),
  }[key] || (() => 0);
  return [...entries].sort((a, b) => sign * cmp(a, b));
}

export function filterEntries(entries, { discipline, search } = {}) {
  let out = entries;
  if (discipline && discipline.trim()) {
    const d = discipline.trim().toLowerCase();
    out = out.filter(e => String(e.discipline || '').toLowerCase() === d);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter(e =>
      String(e.title || '').toLowerCase().includes(q) ||
      String(e.assignment || '').toLowerCase().includes(q));
  }
  return out;
}

export function disciplines(entries) {
  const set = new Set(entries.map(e => (e.discipline || '').trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/library-logic.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/library-logic.js test/library-logic.test.js
git commit -m "feat: library sort/filter/discipline logic"
```

---

### Task 5: Storage adapter (localStorage wrapper)

**Files:**
- Create: `src/store.js`
- Test: `test/store.test.js`

**Interfaces:**
- Produces (all take a `storage` object shaped like `localStorage`, defaulting to `globalThis.localStorage`, so tests inject a fake):
  - `loadEntries(storage): entry[]`
  - `saveEntry(storage, entry): entry[]` — upserts by `id`, returns full list.
  - `deleteEntry(storage, id): entry[]`
  - `exportJSON(storage): string`
  - `importJSON(storage, json, { merge=true }): entry[]`
  - `newId(): string`

- [ ] **Step 1: Write the failing test**

```js
// test/store.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEntries, saveEntry, deleteEntry, exportJSON, importJSON, newId } from '../src/store.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k,v)=>m.set(k,String(v)), removeItem: k=>m.delete(k) };
}

test('save then load round-trips', () => {
  const s = fakeStorage();
  saveEntry(s, { id:'a', title:'A' });
  const out = loadEntries(s);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'A');
});

test('saveEntry upserts by id', () => {
  const s = fakeStorage();
  saveEntry(s, { id:'a', title:'A' });
  saveEntry(s, { id:'a', title:'A2' });
  const out = loadEntries(s);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'A2');
});

test('deleteEntry removes by id', () => {
  const s = fakeStorage();
  saveEntry(s, { id:'a', title:'A' });
  saveEntry(s, { id:'b', title:'B' });
  const out = deleteEntry(s, 'a');
  assert.deepEqual(out.map(e=>e.id), ['b']);
});

test('export/import round-trips and merges', () => {
  const s = fakeStorage();
  saveEntry(s, { id:'a', title:'A' });
  const json = exportJSON(s);
  const s2 = fakeStorage();
  saveEntry(s2, { id:'b', title:'B' });
  const merged = importJSON(s2, json, { merge:true });
  assert.deepEqual(merged.map(e=>e.id).sort(), ['a','b']);
});

test('loadEntries returns [] on empty or corrupt storage', () => {
  const s = fakeStorage();
  assert.deepEqual(loadEntries(s), []);
  s.setItem('ai-assignment-review/entries', '{not json');
  assert.deepEqual(loadEntries(s), []);
});

test('newId returns unique-ish strings', () => {
  assert.notEqual(newId(), newId());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/store.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/store.js`**

```js
// src/store.js — thin persistence layer; storage is injectable for tests.
const KEY = 'ai-assignment-review/entries';

function store(storage) { return storage || globalThis.localStorage; }

export function loadEntries(storage) {
  try {
    const raw = store(storage).getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeAll(storage, entries) {
  store(storage).setItem(KEY, JSON.stringify(entries));
  return entries;
}

export function saveEntry(storage, entry) {
  const entries = loadEntries(storage);
  const i = entries.findIndex(e => e.id === entry.id);
  if (i === -1) entries.push(entry); else entries[i] = entry;
  return writeAll(storage, entries);
}

export function deleteEntry(storage, id) {
  return writeAll(storage, loadEntries(storage).filter(e => e.id !== id));
}

export function exportJSON(storage) {
  return JSON.stringify(loadEntries(storage), null, 2);
}

export function importJSON(storage, json, { merge = true } = {}) {
  const incoming = JSON.parse(json);
  if (!Array.isArray(incoming)) throw new Error('Invalid library file.');
  const base = merge ? loadEntries(storage) : [];
  const byId = new Map(base.map(e => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return writeAll(storage, [...byId.values()]);
}

export function newId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/store.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store.js test/store.test.js
git commit -m "feat: localStorage-backed entry store with export/import"
```

---

### Task 6: File text extraction (docx/pdf) + title helper

**Files:**
- Create: `src/extract.js`
- Test: `test/extract.test.js`

**Interfaces:**
- Produces:
  - `deriveTitle(text): string` — first non-empty line, trimmed to ≤ 80 chars; `'Untitled assignment'` if empty.
  - `extractDocx(arrayBuffer, mammoth): Promise<string>` — uses injected `mammoth` global.
  - `extractPdf(arrayBuffer, pdfjsLib): Promise<string>` — uses injected `pdfjsLib` global.
  - `looksEmpty(text): boolean` — true if extracted text is < 20 non-whitespace chars (used to warn about scanned PDFs).

Only `deriveTitle` and `looksEmpty` are unit-tested in Node (the parser globals are browser-only and verified manually in Task 9).

- [ ] **Step 1: Write the failing test**

```js
// test/extract.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveTitle, looksEmpty } from '../src/extract.js';

test('deriveTitle uses the first non-empty line', () => {
  assert.equal(deriveTitle('\n\n  English 412 Final Project  \nrest'), 'English 412 Final Project');
});

test('deriveTitle truncates long lines to 80 chars', () => {
  assert.equal(deriveTitle('x'.repeat(200)).length, 80);
});

test('deriveTitle falls back when empty', () => {
  assert.equal(deriveTitle('   '), 'Untitled assignment');
});

test('looksEmpty flags near-empty extractions', () => {
  assert.equal(looksEmpty('   \n  '), true);
  assert.equal(looksEmpty('This is a real assignment with plenty of text.'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/extract.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/extract.js`**

```js
// src/extract.js — browser parsers injected as args so pure helpers stay testable.
export function deriveTitle(text) {
  const line = String(text || '').split(/\r?\n/).map(s => s.trim()).find(Boolean);
  if (!line) return 'Untitled assignment';
  return line.length > 80 ? line.slice(0, 80) : line;
}

export function looksEmpty(text) {
  return String(text || '').replace(/\s+/g, '').length < 20;
}

export async function extractDocx(arrayBuffer, mammoth) {
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value || '';
}

export async function extractPdf(arrayBuffer, pdfjsLib) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map(it => it.str).join(' ') + '\n\n';
  }
  return out.trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/extract.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/extract.js test/extract.test.js
git commit -m "feat: docx/pdf text extraction and title/empty helpers"
```

---

### Task 7: UT-branded stylesheet + HTML shell with tabs

**Files:**
- Create: `index.html`, `css/styles.css`

**Interfaces:**
- Produces the DOM skeleton (element IDs) that Task 8 wires up:
  - Tabs: buttons `#tab-generate`, `#tab-format`, `#tab-library`; panels `#panel-generate`, `#panel-format`, `#panel-library`.
  - Generate: `#assignment-text`, `#file-input`, `#drop-zone`, `#extract-status`, `#ctx-course`, `#ctx-discipline`, `#ctx-goals`, `#entry-title`, `#no-save`, `#build-btn`, `#prompt-output`, `#copy-prompt-btn`.
  - Format: `#review-input`, `#format-btn`, `#link-entry`, `#report`, `#print-btn`.
  - Library: `#lib-search`, `#lib-filter-discipline`, `#lib-sort`, `#lib-sort-dir`, `#lib-table`, `#export-btn`, `#import-input`.
  - Collapsible `<details>` "About the IDEA V7 framework".

- [ ] **Step 1: Write `css/styles.css`** — UT palette, responsive layout, tab styling, dashboard bars/badges, and a `@media print` block that hides everything except `#report`.

```css
:root{
  --ut-orange:#FF8200; --ut-white:#FFFFFF; --ut-smokey:#4B4B4B;
  --ink:#1f1f1f; --line:#e2e2e2; --bg:#f6f6f4; --radius:10px;
  --max:960px; --sans:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--sans);color:var(--ink);background:var(--bg);line-height:1.5}
header{background:var(--ut-smokey);color:#fff;padding:1.25rem 1rem;border-bottom:6px solid var(--ut-orange)}
header .wrap{max-width:var(--max);margin:0 auto}
header h1{margin:0;font-size:1.5rem}
header p{margin:.25rem 0 0;color:#e8e8e8;font-size:.95rem}
main{max-width:var(--max);margin:0 auto;padding:1rem}
.tabs{display:flex;gap:.25rem;border-bottom:2px solid var(--line);margin:1rem 0}
.tabs button{background:none;border:none;padding:.75rem 1rem;font-size:1rem;cursor:pointer;color:var(--ut-smokey);border-bottom:3px solid transparent}
.tabs button[aria-selected="true"]{color:#000;border-bottom-color:var(--ut-orange);font-weight:600}
.panel{display:none}.panel.active{display:block}
label{display:block;font-weight:600;margin:.75rem 0 .25rem}
textarea,input[type=text],select{width:100%;padding:.6rem;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff}
textarea{min-height:9rem;resize:vertical}
#assignment-text{min-height:14rem}
#prompt-output,#review-input{min-height:12rem;font-family:ui-monospace,Consolas,monospace;font-size:.85rem}
.drop-zone{border:2px dashed var(--ut-orange);border-radius:var(--radius);padding:1rem;text-align:center;background:#fff8f0;color:var(--ut-smokey);cursor:pointer;margin-top:.5rem}
.drop-zone.drag{background:#ffe9d1}
.btn{background:var(--ut-orange);color:#fff;border:none;padding:.7rem 1.2rem;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer}
.btn:hover{filter:brightness(.95)}
.btn.secondary{background:#fff;color:var(--ut-smokey);border:1px solid var(--ut-smokey)}
.row{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-top:.75rem}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.note{font-size:.85rem;color:var(--ut-smokey)}
.warn{color:#a4400a;font-weight:600}
details{background:#fff;border:1px solid var(--line);border-radius:8px;padding:.75rem 1rem;margin:1rem 0}
summary{cursor:pointer;font-weight:600;color:var(--ut-smokey)}
/* report + dashboard */
#report{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:1.5rem;margin-top:1rem}
#report h2{border-bottom:2px solid var(--ut-orange);padding-bottom:.25rem;margin-top:1.5rem}
#report h2:first-child{margin-top:0}
.dashboard{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:1rem 0}
.meter{background:#f0f0ee;border-radius:6px;overflow:hidden;height:1.5rem;position:relative}
.meter>span{display:block;height:100%;background:var(--ut-orange)}
.meter>em{position:absolute;left:.5rem;top:0;line-height:1.5rem;font-style:normal;font-size:.8rem;color:#000}
.badge{display:inline-block;padding:.15rem .6rem;border-radius:999px;background:var(--ut-smokey);color:#fff;font-size:.8rem}
.badge.before{background:#9a9a9a}.badge.after{background:var(--ut-orange)}
table{width:100%;border-collapse:collapse;margin-top:.75rem;background:#fff}
th,td{text-align:left;padding:.5rem;border-bottom:1px solid var(--line);font-size:.9rem}
th{cursor:pointer;color:var(--ut-smokey)}
@media print{
  header,.tabs,#panel-generate,#panel-library,#review-input,label[for=review-input],
  #format-btn,#print-btn,.no-print{display:none!important}
  body{background:#fff}#report{border:none;padding:0}
}
```

- [ ] **Step 2: Write `index.html`** — the shell referencing the module `app.js` (Task 8) and the stylesheet. Includes header, three tab buttons, three panels with all the IDs above, the vendored scripts, and the collapsible framework explainer. Vendored parser scripts are loaded as classic scripts before the module:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI-Proof My Assignment · IDEA V7 Review</title>
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
<header><div class="wrap">
  <h1>AI-Proof My Assignment</h1>
  <p>Assess an assignment's AI vulnerabilities and get IDEA V7 redesign options — University of Tennessee</p>
</div></header>
<main>
  <div class="tabs" role="tablist">
    <button id="tab-generate" role="tab" aria-selected="true" aria-controls="panel-generate">1 · Generate prompt</button>
    <button id="tab-format"   role="tab" aria-selected="false" aria-controls="panel-format">2 · Format review</button>
    <button id="tab-library"  role="tab" aria-selected="false" aria-controls="panel-library">Library</button>
  </div>

  <!-- GENERATE -->
  <section id="panel-generate" class="panel active" role="tabpanel">
    <label for="assignment-text">Assignment text</label>
    <textarea id="assignment-text" placeholder="Paste your assignment here, or drop a .docx / .pdf below…"></textarea>
    <div id="drop-zone" class="drop-zone">Drop a <strong>.docx</strong> or <strong>.pdf</strong> here, or <label for="file-input" style="display:inline;color:#a4400a;cursor:pointer;text-decoration:underline">choose a file</label>.
      <input id="file-input" type="file" accept=".docx,.pdf" hidden>
    </div>
    <p id="extract-status" class="note"></p>
    <div class="grid2">
      <div><label for="ctx-course">Course &amp; level <span class="note">(optional)</span></label><input id="ctx-course" type="text" placeholder="e.g. English 412, upper-division undergrad"></div>
      <div><label for="ctx-discipline">Discipline / field <span class="note">(optional)</span></label><input id="ctx-discipline" type="text" placeholder="e.g. Literature"></div>
    </div>
    <label for="ctx-goals">Specific learning goals <span class="note">(optional)</span></label>
    <input id="ctx-goals" type="text" placeholder="e.g. TEI encoding, editorial judgment">
    <div class="grid2">
      <div><label for="entry-title">Save as <span class="note">(title for your library)</span></label><input id="entry-title" type="text" placeholder="Auto-filled from the first line"></div>
      <div style="align-self:end"><label class="note" style="font-weight:400"><input id="no-save" type="checkbox"> Don't save this one to my library</label></div>
    </div>
    <div class="row"><button id="build-btn" class="btn">Build my review prompt</button></div>
    <label for="prompt-output">Your IDEA V7 prompt — copy this into Claude or ChatGPT</label>
    <textarea id="prompt-output" readonly placeholder="Your generated prompt will appear here."></textarea>
    <div class="row"><button id="copy-prompt-btn" class="btn secondary">Copy prompt</button>
      <span class="note">Paste it into <strong>Claude</strong> or <strong>ChatGPT</strong>, run it, then bring the answer to the <em>Format review</em> tab.</span></div>
  </section>

  <!-- FORMAT -->
  <section id="panel-format" class="panel" role="tabpanel">
    <label for="review-input">Paste the AI's review here</label>
    <textarea id="review-input" placeholder="Paste the full response the AI gave you…"></textarea>
    <div class="row"><button id="format-btn" class="btn">Format report</button>
      <label class="note" style="font-weight:400"><input id="link-entry" type="checkbox" checked> Attach this review to the most recent library entry</label></div>
    <div id="report"></div>
    <div class="row no-print"><button id="print-btn" class="btn secondary">Print / Save as PDF</button></div>
  </section>

  <!-- LIBRARY -->
  <section id="panel-library" class="panel" role="tabpanel">
    <div class="row">
      <input id="lib-search" type="text" placeholder="Search title or text…" style="flex:1;min-width:12rem">
      <select id="lib-filter-discipline"><option value="">All disciplines</option></select>
      <select id="lib-sort">
        <option value="date">Date</option><option value="title">Title</option>
        <option value="discipline">Discipline</option><option value="course">Course</option>
        <option value="robustness_after">Robustness (after)</option>
      </select>
      <select id="lib-sort-dir"><option value="desc">↓</option><option value="asc">↑</option></select>
    </div>
    <table id="lib-table"><thead><tr><th>Date</th><th>Title</th><th>Discipline</th><th>Course</th><th>Robustness</th><th></th></tr></thead><tbody></tbody></table>
    <div class="row">
      <button id="export-btn" class="btn secondary">Export library (JSON)</button>
      <label for="import-input" class="btn secondary" style="cursor:pointer">Import library…</label>
      <input id="import-input" type="file" accept=".json,application/json" hidden>
    </div>
  </section>

  <details><summary>About the IDEA V7 framework</summary>
    <p class="note">This tool builds a prompt that asks an AI to analyze your assignment across three layers — Cognitive Demands, Student Cognitive Engagement, and AI Robustness — then propose Low/Medium/High-effort redesigns and a before/after robustness score. Nothing you type is uploaded; your library is saved only in this browser.</p>
  </details>
</main>
<script src="vendor/mammoth.browser.min.js"></script>
<script type="module" src="app.js"></script>
</body>
</html>
```

Note: pdf.js 4 ships as an ES module; `app.js` imports it dynamically (`await import('./vendor/pdf.min.js')`) and sets `workerSrc` to `vendor/pdf.worker.min.js`, so it is NOT included as a classic `<script>` here.

- [ ] **Step 3: Verify it opens**

Open `index.html` in a browser (or run `python -m http.server` from the project root and visit it). Expected: header, three tabs, Generate panel visible. No console errors from missing files.

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: UT-branded HTML shell with Generate/Format/Library tabs"
```

---

### Task 8: Wire the UI (`app.js`) — tabs, generate, format, library

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes every module above: `buildPrompt`, `SECTION_TITLES` (idea-framework); `parseReview` (review-parser); `sortEntries`, `filterEntries`, `disciplines` (library-logic); `loadEntries`, `saveEntry`, `deleteEntry`, `exportJSON`, `importJSON`, `newId` (store); `deriveTitle`, `looksEmpty`, `extractDocx`, `extractPdf` (extract).
- Produces: no exports; DOM behavior only.

- [ ] **Step 1: Tab switching + Generate flow**

Implement in `app.js`:
- `$ = id => document.getElementById(id)`.
- Tab clicks toggle `aria-selected` on the three `#tab-*` buttons and `.active` on the three `#panel-*` panels.
- File input + drop-zone: on file, read `arrayBuffer`; if name ends `.docx` → `extractDocx(buf, window.mammoth)`; if `.pdf` → dynamically import pdf.js, set `pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js'`, then `extractPdf`. Put result into `#assignment-text`; set `#extract-status`; if `looksEmpty(text)` show a `.warn` telling the user to paste instead (scanned PDF). Wrap in try/catch → show error text.
- `#build-btn`: read fields; `try { prompt = buildPrompt({assignment, course, discipline, goals}) } catch → alert`. Put prompt in `#prompt-output`. Unless `#no-save` checked, create entry `{ id:newId(), createdAt:new Date().toISOString(), title:(entry-title || deriveTitle(assignment)), course, discipline, goals, assignment, prompt }`, `saveEntry(null, entry)`, remember `lastEntryId`, refresh library view.
- `#copy-prompt-btn`: `navigator.clipboard.writeText($('prompt-output').value)`; flash "Copied!".

- [ ] **Step 2: Format flow (render report + dashboard)**

- `#format-btn`: `const {sections, data, hasData} = parseReview($('review-input').value)`. Render into `#report`:
  - If `hasData`, first render a `.dashboard` from `data`: two `.meter` bars for `robustness_before`/`robustness_after` (width = value*10%), and `.badge.before`/`.badge.after` pairs for ai_vulnerability, visibility, engagement, plus single badges for cognitive_complexity, productive_struggle, recommended_level, overall ratings.
  - Then each section as `<h2>title</h2>` + a `<div>` whose text is the body with line breaks preserved (`white-space:pre-wrap`) — use `textContent` (never `innerHTML`) to avoid injecting pasted markup.
  - If no sections parsed, show a `.warn`: "Couldn't find the IDEA V7 sections — paste the full review text."
  - If `#link-entry` checked and `lastEntryId` set, attach `{review, data}` to that entry via `saveEntry`.
- `#print-btn`: `window.print()`.

- [ ] **Step 3: Library flow**

- `renderLibrary()`: `let entries = loadEntries(null)`; populate `#lib-filter-discipline` from `disciplines(entries)` (preserve current selection); apply `filterEntries(entries,{discipline,search})` then `sortEntries(_, sortKey, sortDir)`; fill `#lib-table tbody` with rows (date as `toLocaleDateString`, title, discipline, course, `data?.robustness_after ?? '—'`, and an "Open" + "Delete" button per row).
- Wire `#lib-search` (input), `#lib-filter-discipline`, `#lib-sort`, `#lib-sort-dir` (change) → `renderLibrary()`.
- Row "Open": load entry → fill Generate fields + `#prompt-output`; if it has a `review`, fill `#review-input`; switch to Generate tab.
- Row "Delete": `deleteEntry(null, id)` → `renderLibrary()`.
- `#export-btn`: build a Blob from `exportJSON(null)`, trigger download `ai-assignment-library.json`.
- `#import-input`: read file text → `importJSON(null, text, {merge:true})` → `renderLibrary()`; catch → alert "Invalid library file."
- Call `renderLibrary()` once on load.

Full `app.js` is written during implementation following the above; it contains no business logic beyond DOM wiring (all logic lives in the tested modules).

- [ ] **Step 4: Manual smoke test**

Serve locally: `python -m http.server 8000` → open `http://localhost:8000`.
- Paste the English 412 text → Build → prompt appears and contains "Assignment Snapshot" and the assignment text. Copy works.
- Drop the `.docx` → text fills the box.
- Paste the reference review text into Format → report renders with a dashboard (before/after meters).
- Library shows the run; filter by discipline and sort by robustness work; export downloads JSON; delete removes the row.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire tabs, generate, format, and library UI"
```

---

### Task 9: End-to-end verification with the real reference files + README

**Files:**
- Create/Update: `README.md`
- Test: full suite + manual E2E

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: all tests across the five `test/*.test.js` files PASS.

- [ ] **Step 2: Real-file E2E**

Copy the reference assignment text (English 412) into Generate, build the prompt, and confirm it reproduces the framework sections. Paste the reference review (`AI IDEA Review of Final Project.docx` text) into Format and confirm all 11 sections render and a dashboard appears (the reference review has no `idea-data` block, so verify graceful degradation: sections render, dashboard shows a note that scores weren't found). This validates the "tolerates reviews without a data block" path.

- [ ] **Step 3: Write `README.md`**

Document: what the tool does, the three tabs, how to run locally (`python -m http.server`), how to deploy to GitHub Pages (push repo → Settings → Pages → deploy from `main` / root), the privacy note (all local), and how to re-vendor the libraries. Include the "scanned PDFs won't extract — paste instead" caveat.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: usage, deployment, and privacy notes"
```

---

## Self-Review

**Spec coverage:**
- §2 static prompt-generator → Tasks 2, 7, 8. ✓
- §4.1 input paste/.docx/.pdf + scanned caveat → Tasks 6, 8 (`looksEmpty` warn). ✓
- §4.2 optional context → Task 2 `buildPrompt`, Task 7 fields. ✓
- §4.3 prompt builder + copy → Tasks 2, 8. ✓
- §4.4 formatter + dashboard + print → Tasks 3, 7 (print CSS), 8. ✓
- §4.5 library storage/sort/filter/export/import/save-toggle → Tasks 4, 5, 7, 8. ✓
- §5 IDEA V7 block + idea-data → Task 2. ✓
- §6 UT branding + GitHub Pages → Tasks 7, 9. ✓
- §7 non-goals (no backend) respected throughout. ✓
- §8 success criteria → Task 9 E2E. ✓

**Placeholder scan:** Core logic (Tasks 2–6) has complete, tested code. Task 8 (`app.js`) is specified as detailed DOM-wiring steps rather than one code block because it is glue over already-tested modules; each behavior names exact element IDs, module functions, and outcomes. No "TBD"/"handle edge cases" left vague.

**Type consistency:** Entry shape `{id, createdAt, title, course, discipline, goals, assignment, prompt, review?, data?}` is identical across Tasks 4, 5, 8. `parseReview` returns `{sections, data, hasData}` — consumed exactly so in Task 8. Injectable `storage` (default `globalThis.localStorage`, passed `null` from app) consistent across Task 5 & 8. `SECTION_TITLES` single source in Task 2, consumed in Task 3. ✓
