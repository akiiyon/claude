// Knowledge base: documents, chunks, learned memories and hybrid retrieval.
import { store } from './store.js';
import { config } from './config.js';
import { BM25 } from './bm25.js';
import { toSections, chunkSections, detectCode, clauseLabel } from './chunker.js';
import { extractPages } from './ingest.js';
import { embed, embeddingsEnabled, cosine } from './embeddings.js';

const index = new BM25();
// Authority weighting: codes outrank project documents, which outrank learned notes.
const TYPE_WEIGHT = { code: 1.15, design: 1.0, note: 0.95, memory: 0.85 };

function indexText(chunk, doc) {
  // Prepend metadata so "IS 4622 skin plate" style queries hit the right chunk.
  return [doc.code, doc.title, doc.component, (chunk.path || []).join(' '), chunk.text].filter(Boolean).join('\n');
}

export function buildIndex() {
  const docs = new Map(store.all('documents').map((d) => [d.id, d]));
  for (const c of store.all('chunks')) {
    const d = docs.get(c.docId);
    if (d) index.add(c.id, indexText(c, d));
  }
  for (const m of store.all('memories')) if (m.status === 'active') index.add(`m:${m.id}`, m.text);
}

export async function addDocument({ buffer, filename, title, type = 'design', project, component, tags = [], source = 'upload' }) {
  const pages = await extractPages(buffer, filename);
  // Design documents cite codes but are not codes themselves; only label codes/notes with an IS number.
  const code = type === 'design' ? null
    : type === 'note' ? detectCode(title, filename)
    : detectCode(title, filename, pages.slice(0, 3).map((p) => p.text).join('\n'));
  const sections = toSections(pages);
  const raw = chunkSections(sections);
  if (!raw.length) throw new Error('No text could be extracted from this file.');

  const doc = store.insert('documents', {
    title: title || filename.replace(/\.[^.]+$/, ''),
    filename, type, code, project: project || null, component: component || null, tags, source,
    pages: pages.filter((p) => p.page).length || null,
    chunkCount: raw.length,
  });

  let vectors = null;
  try { vectors = await embed(raw.map((c) => indexText(c, doc))); } catch (e) { console.warn(e.message); }

  const rows = store.insertMany('chunks', raw.map((c, i) => ({ docId: doc.id, ...c, embedding: vectors?.[i] })));
  for (const r of rows) index.add(r.id, indexText(r, doc));
  return doc;
}

export function deleteDocument(id) {
  for (const c of store.where('chunks', (c) => c.docId === id)) index.remove(c.id);
  store.remove('chunks', (c) => c.docId === id);
  return store.remove('documents', (d) => d.id === id);
}

export async function addMemory(m) {
  const dup = store.all('memories').find((x) => x.status === 'active' && x.text.toLowerCase() === m.text.toLowerCase());
  if (dup) return dup;
  let embedding;
  try { embedding = (await embed([m.text]))?.[0]; } catch { /* keyword-only */ }
  const row = store.insert('memories', { status: 'active', ...m, embedding });
  index.add(`m:${row.id}`, row.text);
  return row;
}

export function deleteMemory(id) {
  index.remove(`m:${id}`);
  return store.remove('memories', (m) => m.id === id);
}

// Reciprocal Rank Fusion of keyword and semantic rankings, then authority weighting
// and a diversity cap so one document can't crowd out the rest.
export async function search(query, { k = config.topK, docIds } = {}) {
  const docs = new Map(store.all('documents').map((d) => [d.id, d]));
  const chunks = new Map(store.all('chunks').map((c) => [c.id, c]));
  const mems = new Map(store.all('memories').filter((m) => m.status === 'active').map((m) => [`m:${m.id}`, m]));
  const filter = docIds?.length ? (id) => id.startsWith('m:') || docIds.includes(chunks.get(id)?.docId) : undefined;

  const fused = new Map();
  const addRank = (list, w) => list.forEach((r, i) => fused.set(r.id, (fused.get(r.id) || 0) + w / (60 + i)));
  addRank(index.search(query, { limit: 40, filter }), 1);

  if (embeddingsEnabled()) {
    try {
      const [qv] = await embed([query], 'query');
      const sem = [];
      for (const [id, c] of chunks) if (c.embedding && (!filter || filter(id))) sem.push({ id, score: cosine(qv, c.embedding) });
      for (const [id, m] of mems) if (m.embedding) sem.push({ id, score: cosine(qv, m.embedding) });
      addRank(sem.sort((a, b) => b.score - a.score).slice(0, 40), 1);
    } catch (e) { console.warn('semantic search skipped:', e.message); }
  }

  // Exact clause / code mentions get a boost ("clause 5.2.3 of IS 4622").
  const qCode = detectCode(query);
  const qClauses = [...query.matchAll(/\b(\d{1,2}(?:\.\d{1,3}){1,4})\b/g)].map((m) => m[1]);

  const results = [];
  for (const [id, base] of fused) {
    let item;
    if (id.startsWith('m:')) {
      const m = mems.get(id);
      if (!m) continue;
      item = { id, kind: 'memory', text: m.text, title: `Learned: ${m.kind.replace('_', ' ')}`, docType: 'memory', score: base * TYPE_WEIGHT.memory };
    } else {
      const c = chunks.get(id); const d = c && docs.get(c.docId);
      if (!d) continue;
      let s = base * (TYPE_WEIGHT[d.type] || 1);
      if (qCode && d.code && d.code.startsWith(qCode.split(':')[0])) s *= 1.5;
      if (qClauses.some((q) => (c.clauses || []).some((cl) => cl === q || cl.startsWith(`${q}.`)))) s *= 1.4;
      item = {
        id, kind: 'chunk', docId: d.id, text: c.text, title: d.title, code: d.code, docType: d.type,
        project: d.project, component: d.component, clause: clauseLabel(c.clauses), section: (c.path || []).slice(-1)[0] || c.title,
        page: c.page, score: s,
      };
    }
    results.push(item);
  }
  results.sort((a, b) => b.score - a.score);

  const perDoc = {}; const picked = []; let chars = 0;
  for (const r of results) {
    const key = r.docId || 'memory';
    if ((perDoc[key] || 0) >= 4) continue;
    if (chars + r.text.length > config.maxContextChars && picked.length) continue;
    perDoc[key] = (perDoc[key] || 0) + 1;
    chars += r.text.length;
    picked.push(r);
    if (picked.length >= k) break;
  }
  return picked;
}

export function stats() {
  return {
    documents: store.all('documents').length,
    chunks: store.all('chunks').length,
    memories: store.all('memories').filter((m) => m.status === 'active').length,
    conversations: store.all('conversations').length,
    semantic: embeddingsEnabled(),
  };
}
