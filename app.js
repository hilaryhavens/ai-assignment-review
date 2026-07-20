// app.js — DOM wiring only. All business logic lives in the tested src/ modules.
import { buildPrompt } from './src/idea-framework.js';
import { parseReview } from './src/review-parser.js';
import { sortEntries, filterEntries, disciplines } from './src/library-logic.js';
import { loadEntries, saveEntry, deleteEntry, exportJSON, importJSON, newId } from './src/store.js';
import { deriveTitle, looksEmpty, extractDocx, extractPdf } from './src/extract.js';

const $ = id => document.getElementById(id);
let lastEntryId = null;

/* ---------- Tabs ---------- */
const TABS = ['generate', 'format', 'library'];
function selectTab(name) {
  for (const t of TABS) {
    $(`tab-${t}`).setAttribute('aria-selected', String(t === name));
    $(`panel-${t}`).classList.toggle('active', t === name);
  }
  if (name === 'library') renderLibrary();
}
TABS.forEach(t => $(`tab-${t}`).addEventListener('click', () => selectTab(t)));

/* ---------- File extraction ---------- */
async function handleFile(file) {
  if (!file) return;
  const status = $('extract-status');
  status.className = 'note';
  status.textContent = `Reading “${file.name}”…`;
  try {
    const buf = await file.arrayBuffer();
    const lower = file.name.toLowerCase();
    let text = '';
    if (lower.endsWith('.docx')) {
      text = await extractDocx(buf, window.mammoth);
    } else if (lower.endsWith('.pdf')) {
      const pdfjsLib = await import('./vendor/pdf.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      text = await extractPdf(buf, pdfjsLib);
    } else {
      status.className = 'warn';
      status.textContent = 'Unsupported file type. Please use a .docx or .pdf, or paste the text.';
      return;
    }
    $('assignment-text').value = text;
    if (looksEmpty(text)) {
      status.className = 'warn';
      status.textContent = 'Almost no text was found — this may be a scanned/image PDF. Please paste the assignment text instead.';
    } else {
      status.className = 'ok';
      status.textContent = `Loaded ${text.length.toLocaleString()} characters from “${file.name}”. Review or edit it above, then build your prompt.`;
    }
  } catch (err) {
    status.className = 'warn';
    status.textContent = `Couldn't read that file (${err.message}). Please paste the assignment text instead.`;
  }
}
$('file-input').addEventListener('change', e => handleFile(e.target.files[0]));
const dz = $('drop-zone');
['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));

/* ---------- Generate ---------- */
$('build-btn').addEventListener('click', () => {
  const assignment = $('assignment-text').value;
  const course = $('ctx-course').value;
  const discipline = $('ctx-discipline').value;
  const goals = $('ctx-goals').value;
  let prompt;
  try {
    prompt = buildPrompt({ assignment, course, discipline, goals });
  } catch (err) {
    alert(err.message);
    return;
  }
  $('prompt-output').value = prompt;

  if (!$('no-save').checked) {
    const title = ($('entry-title').value.trim()) || deriveTitle(assignment);
    const entry = {
      id: newId(), createdAt: new Date().toISOString(),
      title, course: course.trim(), discipline: discipline.trim(), goals: goals.trim(),
      assignment: assignment.trim(), prompt,
    };
    saveEntry(null, entry);
    lastEntryId = entry.id;
  }
  $('copy-status').textContent = 'Prompt ready. Copy it, run it in Claude or ChatGPT, then use the Format review tab.';
});

$('copy-prompt-btn').addEventListener('click', async () => {
  const text = $('prompt-output').value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    flash('copy-status', 'Copied to clipboard!');
  } catch {
    $('prompt-output').select();
    flash('copy-status', 'Press Ctrl+C to copy the selected text.');
  }
});

function flash(id, msg) {
  const el = $(id); const prev = el.textContent; el.textContent = msg; el.classList.add('ok');
  setTimeout(() => { el.textContent = prev; el.classList.remove('ok'); }, 2500);
}

/* ---------- Format ---------- */
const LEVEL_METRICS = [
  ['AI vulnerability', 'ai_vulnerability_before', 'ai_vulnerability_after'],
  ['Visibility of thinking', 'visibility_before', 'visibility_after'],
  ['Authentic engagement', 'engagement_before', 'engagement_after'],
  ['Overall rating', 'overall_rating_before', 'overall_rating_after'],
];
const SINGLE_METRICS = [
  ['Cognitive complexity', 'cognitive_complexity'],
  ['Productive struggle', 'productive_struggle'],
  ['Recommended redesign', 'recommended_level'],
];

function scoreMeter(label, value) {
  const n = Math.max(0, Math.min(10, parseInt(value, 10) || 0));
  const m = document.createElement('div'); m.className = 'metric';
  const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = label;
  const meter = document.createElement('div'); meter.className = 'meter';
  const bar = document.createElement('span'); bar.style.width = (n * 10) + '%';
  const em = document.createElement('em'); em.textContent = `${n}/10`;
  meter.append(bar, em); m.append(lbl, meter);
  return m;
}
function beforeAfterBadges(label, before, after) {
  const m = document.createElement('div'); m.className = 'metric';
  const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = label;
  const wrap = document.createElement('div'); wrap.className = 'badges';
  const b = document.createElement('span'); b.className = 'badge before'; b.textContent = before || '—';
  const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '→';
  const a = document.createElement('span'); a.className = 'badge after'; a.textContent = after || '—';
  wrap.append(b, arrow, a); m.append(lbl, wrap);
  return m;
}
function singleBadge(label, value) {
  const m = document.createElement('div'); m.className = 'metric';
  const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = label;
  const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = value || '—';
  m.append(lbl, badge);
  return m;
}

function renderReport(raw) {
  const report = $('report');
  report.textContent = '';
  const { sections, data, hasData } = parseReview(raw);

  if (!sections.length) {
    const p = document.createElement('p'); p.className = 'warn';
    p.textContent = "Couldn't find the IDEA V7 sections. Paste the full review text (including the section headings) and try again.";
    report.append(p);
    return { sections, data, hasData };
  }

  if (hasData) {
    const dash = document.createElement('div'); dash.className = 'dashboard';
    dash.append(scoreMeter('Robustness — before', data.robustness_before));
    dash.append(scoreMeter('Robustness — after', data.robustness_after));
    for (const [lbl, b, a] of LEVEL_METRICS) dash.append(beforeAfterBadges(lbl, data[b], data[a]));
    for (const [lbl, k] of SINGLE_METRICS) dash.append(singleBadge(lbl, data[k]));
    report.append(dash);
  } else {
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = 'No machine-readable score block was found in this review, so the visual dashboard is omitted. The full report is shown below.';
    report.append(note);
  }

  for (const s of sections) {
    const h = document.createElement('h2'); h.textContent = s.title;
    const body = document.createElement('div'); body.className = 'body'; body.textContent = s.body;
    report.append(h, body);
  }
  return { sections, data, hasData };
}

$('format-btn').addEventListener('click', () => {
  const raw = $('review-input').value;
  const { sections, data, hasData } = renderReport(raw);
  if (sections.length && $('link-entry').checked && lastEntryId) {
    const entry = loadEntries(null).find(e => e.id === lastEntryId);
    if (entry) { entry.review = raw; entry.data = hasData ? data : entry.data; saveEntry(null, entry); }
  }
});
$('print-btn').addEventListener('click', () => window.print());

/* ---------- Library ---------- */
function renderLibrary() {
  const entries = loadEntries(null);

  // discipline filter options (preserve selection)
  const sel = $('lib-filter-discipline'); const cur = sel.value;
  sel.innerHTML = '<option value="">All disciplines</option>';
  for (const d of disciplines(entries)) {
    const o = document.createElement('option'); o.value = d; o.textContent = d; sel.append(o);
  }
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : '';

  const filtered = filterEntries(entries, { discipline: sel.value, search: $('lib-search').value });
  const sorted = sortEntries(filtered, $('lib-sort').value, $('lib-sort-dir').value);

  const tbody = $('lib-table').querySelector('tbody');
  tbody.textContent = '';
  if (!sorted.length) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 6; td.className = 'empty';
    td.textContent = entries.length ? 'No entries match your search/filter.' : 'No saved assignments yet. Build a prompt on the Generate tab to start your library.';
    tr.append(td); tbody.append(tr); return;
  }

  for (const e of sorted) {
    const tr = document.createElement('tr');
    const date = new Date(e.createdAt); const dateStr = isNaN(date) ? '' : date.toLocaleDateString();
    const robust = e.data && e.data.robustness_after ? `${e.data.robustness_after}/10` : '—';

    const cells = [dateStr, e.title || '(untitled)', e.discipline || '—', e.course || '—', robust];
    for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.append(td); }

    const actions = document.createElement('td'); actions.className = 'lib-actions';
    const open = document.createElement('button'); open.className = 'link-btn'; open.textContent = 'Open';
    open.addEventListener('click', () => openEntry(e));
    const del = document.createElement('button'); del.className = 'link-btn'; del.textContent = 'Delete';
    del.addEventListener('click', () => { if (confirm(`Delete “${e.title}”?`)) { deleteEntry(null, e.id); renderLibrary(); } });
    actions.append(open, del); tr.append(actions);
    tbody.append(tr);
  }
}

function openEntry(e) {
  $('assignment-text').value = e.assignment || '';
  $('ctx-course').value = e.course || '';
  $('ctx-discipline').value = e.discipline || '';
  $('ctx-goals').value = e.goals || '';
  $('entry-title').value = e.title || '';
  $('prompt-output').value = e.prompt || '';
  lastEntryId = e.id;
  if (e.review) { $('review-input').value = e.review; renderReport(e.review); }
  selectTab('generate');
}

['lib-search', 'lib-filter-discipline', 'lib-sort', 'lib-sort-dir'].forEach(id => {
  $(id).addEventListener('input', renderLibrary);
  $(id).addEventListener('change', renderLibrary);
});

$('export-btn').addEventListener('click', () => {
  const blob = new Blob([exportJSON(null)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'ai-assignment-library.json';
  a.click(); URL.revokeObjectURL(a.href);
});
$('import-input').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const text = await file.text();
    importJSON(null, text, { merge: true });
    renderLibrary();
    $('lib-status').textContent = 'Library imported.';
  } catch {
    $('lib-status').textContent = '';
    alert('Invalid library file. Please choose a JSON file exported from this tool.');
  }
  e.target.value = '';
});

renderLibrary();
