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
  for (const s of r.sections) assert.doesNotMatch(s.body, /idea-data/);
});

test('parseReview tolerates plain numbered headings without markdown', () => {
  const r = parseReview('1. Assignment Snapshot\nHello world.');
  assert.equal(r.sections[0].title, 'Assignment Snapshot');
  assert.match(r.sections[0].body, /Hello world/);
  assert.equal(r.hasData, false);
});
