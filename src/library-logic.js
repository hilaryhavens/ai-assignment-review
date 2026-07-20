// src/library-logic.js — pure, no DOM.
function robustness(e) {
  const v = e && e.data ? parseInt(e.data.robustness_after, 10) : NaN;
  return Number.isFinite(v) ? v : -1;
}

export function sortEntries(entries, key, dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  const cmp = {
    date: (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)),
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
