// Loads the curated starter knowledge in seed/knowledge/*.md on first run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './store.js';
import { addDocument } from './knowledge.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed', 'knowledge');

export async function seedIfEmpty({ force = false } = {}) {
  if (!fs.existsSync(dir)) return 0;
  const existing = new Set(store.all('documents').filter((d) => d.source === 'seed').map((d) => d.filename));
  if (existing.size && !force) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    if (existing.has(f)) continue;
    const buffer = fs.readFileSync(path.join(dir, f));
    const title = buffer.toString('utf8').match(/^#\s+(.+)$/m)?.[1] || f;
    const type = 'note'; // curated summaries, not verbatim code text
    await addDocument({ buffer, filename: f, title, type, source: 'seed', tags: ['starter'] });
    n++;
  }
  if (n) console.log(`Seeded ${n} starter knowledge documents.`);
  return n;
}
