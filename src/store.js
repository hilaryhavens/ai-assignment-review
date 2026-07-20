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
