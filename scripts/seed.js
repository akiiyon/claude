// Re-seed starter knowledge: `npm run seed` (adds any starter files not yet loaded).
import { buildIndex } from '../server/knowledge.js';
import { seedIfEmpty } from '../server/seed.js';
import { store } from '../server/store.js';

buildIndex();
const n = await seedIfEmpty({ force: true });
store.flushAll();
console.log(`Added ${n} starter documents.`);
