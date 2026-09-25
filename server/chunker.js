// Structure-aware chunking for codes & design documents.
// Keeps clause numbers, section titles and page numbers attached to every chunk
// so the consultant can cite "IS 11639 (Part 1), Cl. 6.2.1, p. 9".
import { config } from './config.js';

const CLAUSE_RE = /^\s*(\d{1,2}(?:\.\d{1,3}){0,4})\.?\s+([A-Z(][^\n]{1,140})$/;
const ANNEX_RE = /^\s*((?:ANNEX|APPENDIX|Annex|Appendix)\s+[A-Z0-9]+)\b\s*[-–:]?\s*(.{0,120})$/;
const MD_RE = /^(#{1,6})\s+(.+)$/;
const CODE_RE = /\bIS\s*[:\-]?\s*(\d{3,5})(?:\s*[:\-]\s*(\d{4}))?(?:\s*\(?\s*(?:Part|Pt\.?)\s*([0-9IVX]+)\s*\)?)?(?:\s*[:\-]\s*((?:19|20)\d{2}))?/i;

export function detectCode(...texts) {
  for (const t of texts) {
    const m = (t || '').match(CODE_RE);
    if (m) { const yr = m[2] || m[4]; return `IS ${m[1]}${m[3] ? ` (Part ${m[3]})` : ''}${yr ? `:${yr}` : ''}`; }
  }
  return null;
}

function clauseParent(num) {
  const i = num.lastIndexOf('.');
  return i === -1 ? null : num.slice(0, i);
}

/** pages: [{ page: number|null, text: string }] -> sections */
export function toSections(pages) {
  const sections = [];
  const titles = {};
  let cur = { clause: null, title: null, path: [], page: pages[0]?.page ?? null, lines: [] };
  let mdStack = [];

  const push = () => {
    const body = cur.lines.join('\n').trim();
    if (body || cur.title) sections.push({ ...cur, text: body });
  };

  for (const { page, text } of pages) {
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/\s+$/, '');
      let m;
      if ((m = line.match(MD_RE))) {
        push();
        const level = m[1].length;
        mdStack = mdStack.slice(0, level - 1);
        mdStack[level - 1] = m[2].trim();
        const cm = m[2].match(/^(\d{1,2}(?:\.\d{1,3}){0,4})\s+(.*)$/);
        cur = { clause: cm ? cm[1] : null, title: m[2].trim(), path: mdStack.filter(Boolean), page, lines: [] };
      } else if ((m = line.match(CLAUSE_RE)) && !/^\d+(\.\d+)?\s+(mm|m|kN|MPa|N|kg|t|%)\b/.test(line.trim())) {
        push();
        const num = m[1];
        const title = m[2].split(/\s{2,}|—|\.\s/)[0].trim().slice(0, 90);
        titles[num] = title;
        const path = [];
        for (let p = num; p; p = clauseParent(p)) if (titles[p]) path.unshift(`${p} ${titles[p]}`);
        cur = { clause: num, title, path, page, lines: [line] };
      } else if ((m = line.match(ANNEX_RE))) {
        push();
        cur = { clause: m[1].trim(), title: (m[2] || m[1]).trim(), path: [m[1].trim()], page, lines: [line] };
      } else {
        cur.lines.push(line);
      }
    }
  }
  push();
  return sections;
}

function splitLong(text, size, overlap) {
  if (text.length <= size) return [text];
  const out = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const para = text.lastIndexOf('\n\n', end);
      const sent = text.lastIndexOf('. ', end);
      const cut = para > start + size * 0.5 ? para : sent > start + size * 0.5 ? sent + 1 : end;
      end = cut;
    }
    out.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out.filter(Boolean);
}

/** Merge small neighbouring sections, split big ones. */
export function chunkSections(sections, { size = config.chunkSize, overlap = config.chunkOverlap } = {}) {
  const chunks = [];
  let buf = null;

  const flush = () => { if (buf && buf.text.trim()) chunks.push(buf); buf = null; };

  for (const s of sections) {
    const text = s.text || s.title || '';
    const top = s.clause ? s.clause.split('.')[0] : null;
    if (text.length > size) {
      flush();
      for (const part of splitLong(text, size, overlap)) {
        chunks.push({ text: part, clauses: s.clause ? [s.clause] : [], path: s.path, page: s.page, title: s.title });
      }
      continue;
    }
    const sameTop = buf && top && buf.top === top;
    if (buf && sameTop && buf.text.length + text.length + 2 <= size) {
      buf.text += `\n\n${text}`;
      if (s.clause) buf.clauses.push(s.clause);
    } else {
      flush();
      buf = { text, clauses: s.clause ? [s.clause] : [], path: s.path, page: s.page, title: s.title, top };
    }
  }
  flush();
  return chunks.map(({ top, ...c }) => c);
}

export function clauseLabel(clauses = []) {
  if (!clauses.length) return null;
  if (clauses.length === 1) return clauses[0];
  return `${clauses[0]}–${clauses[clauses.length - 1]}`;
}
