// Optional semantic embeddings via Voyage AI. When no key is configured the
// system runs on BM25 alone, which works well for code/clause-heavy text.
import { config } from './config.js';

export const embeddingsEnabled = () => Boolean(config.voyageKey);

export async function embed(texts, inputType = 'document') {
  if (!embeddingsEnabled() || !texts.length) return null;
  const out = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64).map((t) => t.slice(0, 8000));
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.voyageKey}` },
      body: JSON.stringify({ input: batch, model: config.voyageModel, input_type: inputType }),
    });
    if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    out.push(...json.data.map((d) => d.embedding));
  }
  return out;
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na * nb) || 1);
}
