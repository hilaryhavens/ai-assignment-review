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
