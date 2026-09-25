// Okapi BM25 keyword index with a small hydro-mechanical synonym map.
const STOP = new Set(('a an the and or of to in on for with by at from as is are was were be been this that these those it its ' +
  'shall should may can will which what how when where who why into than then there their such any all each per not no ' +
  'do does did i we you me my our your about please give tell explain').split(' '));

// Domain query expansion: word -> extra terms.
const SYNONYMS = {
  penstock: ['pressure', 'shaft', 'conduit'],
  shaft: ['penstock'],
  gate: ['gates'],
  hoist: ['hoisting', 'rope', 'drum', 'hydraulic', 'cylinder'],
  trashrack: ['trash', 'rack'],
  trash: ['rack', 'trashrack'],
  bifurcation: ['wye', 'branch', 'manifold', 'special'],
  wye: ['bifurcation'],
  waterhammer: ['water', 'hammer', 'surge', 'transient'],
  hammer: ['surge', 'transient'],
  surge: ['hammer', 'transient'],
  thickness: ['plate', 'shell'],
  seal: ['seals', 'rubber'],
  wheel: ['roller', 'wheels'],
  stoplog: ['stop', 'log', 'bulkhead'],
  bulkhead: ['stoplog'],
  radial: ['tainter', 'segment'],
  buckling: ['external', 'collapse', 'stiffener'],
  stress: ['permissible', 'allowable'],
  permissible: ['allowable', 'stress'],
  allowable: ['permissible'],
  deflection: ['deformation'],
  psp: ['pumped', 'storage'],
  hep: ['hydroelectric', 'hydro'],
  hm: ['hydromechanical', 'hydro', 'mechanical'],
  dt: ['draft', 'tube'],
  corrosion: ['allowance'],
};

export function stem(w) {
  if (/^\d/.test(w)) return w;
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t && !STOP.has(t) && (t.length > 1 || /\d/.test(t)))
    .map(stem);
}

export function expandQuery(tokens) {
  const out = [...tokens];
  for (const t of tokens) for (const s of SYNONYMS[t] || []) out.push(stem(s));
  return out;
}

export class BM25 {
  constructor({ k1 = 1.4, b = 0.75 } = {}) {
    this.k1 = k1; this.b = b;
    this.docs = new Map(); // id -> { tf: Map, len }
    this.df = new Map();
    this.totalLen = 0;
  }

  add(id, text) {
    if (this.docs.has(id)) this.remove(id);
    const toks = tokenize(text);
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
    this.docs.set(id, { tf, len: toks.length });
    this.totalLen += toks.length;
  }

  remove(id) {
    const d = this.docs.get(id);
    if (!d) return;
    for (const t of d.tf.keys()) {
      const n = this.df.get(t) - 1;
      if (n <= 0) this.df.delete(t); else this.df.set(t, n);
    }
    this.totalLen -= d.len;
    this.docs.delete(id);
  }

  search(query, { limit = 20, filter } = {}) {
    const N = this.docs.size;
    if (!N) return [];
    const avg = this.totalLen / N;
    const q = expandQuery(tokenize(query));
    const weights = new Map();
    q.forEach((t, i) => weights.set(t, Math.max(weights.get(t) || 0, i < tokenize(query).length ? 1 : 0.5)));
    const scores = [];
    for (const [id, d] of this.docs) {
      if (filter && !filter(id)) continue;
      let s = 0;
      for (const [t, w] of weights) {
        const f = d.tf.get(t);
        if (!f) continue;
        const df = this.df.get(t);
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        s += w * idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.len) / avg)));
      }
      if (s > 0) scores.push({ id, score: s });
    }
    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
