import 'dotenv/config';
import path from 'node:path';

const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

export const config = {
  port: int(process.env.PORT, 3000),
  appToken: process.env.APP_TOKEN || '',
  dataDir: path.resolve(process.env.DATA_DIR || './data'),

  chatModel: process.env.CHAT_MODEL || 'claude-opus-5',
  chatEffort: process.env.CHAT_EFFORT || 'medium',
  utilityModel: process.env.UTILITY_MODEL || 'claude-haiku-4-5',
  enableFallbacks: (process.env.ENABLE_FALLBACKS ?? 'true') !== 'false',

  voyageKey: process.env.VOYAGE_API_KEY || '',
  voyageModel: process.env.VOYAGE_MODEL || 'voyage-3.5',

  topK: int(process.env.TOP_K, 8),
  maxContextChars: int(process.env.MAX_CONTEXT_CHARS, 14000),
  historyTurns: int(process.env.HISTORY_TURNS, 6),

  chunkSize: 1400, // characters (~350 tokens)
  chunkOverlap: 200,
  maxUploadMB: 50,
};
