import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { store } from './store.js';
import { buildIndex, addDocument, deleteDocument, addMemory, deleteMemory, stats, search } from './knowledge.js';
import { answer, recordFeedback } from './chat.js';
import { seedIfEmpty } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadMB * 1024 * 1024 } });

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

// Optional shared-token auth for all API routes.
app.use('/api', (req, res, next) => {
  if (!config.appToken || req.path === '/health') return next();
  const t = req.get('x-app-token') || '';
  const ok = t.length === config.appToken.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(config.appToken));
  return ok ? next() : res.status(401).json({ error: 'Unauthorized' });
});
app.use('/api/chat', rateLimit({ windowMs: 60_000, limit: 20 }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', (req, res) => res.json({ ok: true, auth: Boolean(config.appToken) }));
app.get('/api/stats', (req, res) => res.json({ ...stats(), model: config.chatModel }));

// ---- Chat (Server-Sent Events over a POST response) ----
app.post('/api/chat', wrap(async (req, res) => {
  const { question, conversationId, docIds } = req.body || {};
  if (!question || typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'question is required' });
  if (question.length > 8000) return res.status(400).json({ error: 'question too long (max 8000 chars)' });

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const ac = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ac.abort(); });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    await answer({ conversationId, question: question.trim(), docIds, send, signal: ac.signal });
  } catch (e) {
    if (!ac.signal.aborted) {
      console.error(e);
      const message = e.status === 401 || /authentication/i.test(e.message || '')
        ? 'The server has no valid ANTHROPIC_API_KEY. Add it to .env and restart.'
        : e.status === 429 ? 'Rate limited by the model API — please retry in a moment.' : e.message || 'Unexpected error';
      send('error', { message });
    }
  }
  res.end();
}));

// ---- Conversations ----
app.get('/api/conversations', (req, res) => {
  res.json(store.all('conversations')
    .map(({ id, title, createdAt, updatedAt, messages }) => ({ id, title, createdAt, updatedAt, count: messages.length }))
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)));
});
app.get('/api/conversations/:id', (req, res) => {
  const c = store.get('conversations', req.params.id);
  return c ? res.json(c) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/conversations/:id', (req, res) => res.json({ deleted: store.remove('conversations', (c) => c.id === req.params.id) }));

// ---- Documents ----
app.get('/api/documents', (req, res) => {
  res.json(store.all('documents').sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});
app.post('/api/documents', upload.array('files', 20), wrap(async (req, res) => {
  const { type = 'design', project, component, title } = req.body;
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  const results = [];
  for (const f of req.files) {
    try {
      const doc = await addDocument({
        buffer: f.buffer, filename: f.originalname, type: ['code', 'design', 'note'].includes(type) ? type : 'design',
        project, component, title: req.files.length === 1 ? title : undefined,
      });
      results.push({ ok: true, doc });
    } catch (e) {
      results.push({ ok: false, filename: f.originalname, error: e.message });
    }
  }
  res.json(results);
}));
app.delete('/api/documents/:id', (req, res) => res.json({ deleted: deleteDocument(req.params.id) }));

// ---- Learned memories ----
app.get('/api/memories', (req, res) => res.json(store.all('memories')
  .filter((m) => m.status === 'active').map(({ embedding, ...m }) => m)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
app.post('/api/memories', wrap(async (req, res) => {
  const { text, kind = 'fact' } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
  const { embedding, ...m } = await addMemory({ text: text.trim().slice(0, 2000), kind, origin: 'manual' });
  res.json(m);
}));
app.delete('/api/memories/:id', (req, res) => res.json({ deleted: deleteMemory(req.params.id) }));

app.post('/api/feedback', wrap(async (req, res) => {
  const { conversationId, messageId, rating, comment } = req.body || {};
  if (!['up', 'down'].includes(rating)) return res.status(400).json({ error: 'rating must be up|down' });
  await recordFeedback({ conversationId, messageId, rating, comment });
  res.json({ ok: true });
}));

app.get('/api/search', wrap(async (req, res) => res.json(await search(String(req.query.q || '')))));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

buildIndex();
await seedIfEmpty();
app.listen(config.port, () => {
  const s = stats();
  console.log(`HM Consultant running on http://localhost:${config.port}`);
  console.log(`Knowledge: ${s.documents} documents, ${s.chunks} chunks, ${s.memories} learned notes. Semantic search: ${s.semantic ? 'on' : 'off (BM25 only)'}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('WARNING: ANTHROPIC_API_KEY is not set; chat will fail until it is.');
});
