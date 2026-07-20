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
