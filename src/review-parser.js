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

// Match any canonical section title, optionally preceded by markdown hashes
// and/or a "N." number, at the start of a line. Trailing markup (e.g. "—") allowed.
function headingRegex() {
  const alt = SECTION_TITLES
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(`^\\s*#{0,6}\\s*(?:\\d+\\.?\\s*)?(${alt})\\b.*$`, 'im');
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
