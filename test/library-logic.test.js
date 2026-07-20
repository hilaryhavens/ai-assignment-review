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
  assert.equal(E[0].id, '1');
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
