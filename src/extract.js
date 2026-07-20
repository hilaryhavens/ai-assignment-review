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
