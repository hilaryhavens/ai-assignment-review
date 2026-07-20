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
