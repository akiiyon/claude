// Tiny persistent store: one JSON file per collection, written atomically.
// Swap for Postgres/pgvector when the corpus grows beyond a few thousand documents.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

const COLLECTIONS = ['documents', 'chunks', 'conversations', 'memories', 'feedback'];

class Store {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.data = {};
    this.timers = {};
    for (const c of COLLECTIONS) {
      const file = path.join(dir, `${c}.json`);
      this.data[c] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    }
  }

  all(c) { return this.data[c]; }
  get(c, id) { return this.data[c].find((x) => x.id === id); }
  where(c, fn) { return this.data[c].filter(fn); }

  insert(c, obj) {
    const row = { id: obj.id || crypto.randomUUID(), createdAt: new Date().toISOString(), ...obj };
    this.data[c].push(row);
    this.save(c);
    return row;
  }

  insertMany(c, rows) {
    const now = new Date().toISOString();
    const out = rows.map((r) => ({ id: r.id || crypto.randomUUID(), createdAt: now, ...r }));
    this.data[c].push(...out);
    this.save(c);
    return out;
  }

  update(c, id, patch) {
    const row = this.get(c, id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    this.save(c);
    return row;
  }

  remove(c, fn) {
    const before = this.data[c].length;
    this.data[c] = this.data[c].filter((x) => !fn(x));
    if (this.data[c].length !== before) this.save(c);
    return before - this.data[c].length;
  }

  // Debounced atomic write (write temp file, then rename).
  save(c) {
    clearTimeout(this.timers[c]);
    this.timers[c] = setTimeout(() => this.flush(c), 150);
  }

  flush(c) {
    const file = path.join(this.dir, `${c}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data[c]));
    fs.renameSync(tmp, file);
  }

  flushAll() {
    for (const c of COLLECTIONS) { clearTimeout(this.timers[c]); this.flush(c); }
  }
}

export const store = new Store(config.dataDir);
process.on('SIGINT', () => { store.flushAll(); process.exit(0); });
process.on('SIGTERM', () => { store.flushAll(); process.exit(0); });
