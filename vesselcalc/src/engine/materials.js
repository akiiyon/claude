// Educational material database.
// Allowable stresses (psi) are representative of ASME Section II Part D
// Table 1A/3 values for Section VIII Division 1. They are included so the
// tool works out of the box for learning. ALWAYS verify against the current
// edition of ASME II-D before using a number for real design.

const T = [100, 200, 300, 400, 500, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

// Allowable stress tables (ksi) aligned to T. null = not permitted above.
const mk = (id, o) => ({ id, temps: T, ...o, S: o.S.map(v => (v == null ? null : v * 1000)) });

export const MATERIALS = [
  mk('SA-516-70', { spec: 'SA-516', grade: '70', form: 'Plate', group: 'CS', Sy: 38000, Su: 70000, curve: 'B', pNo: 1,
    S: [20.0, 20.0, 20.0, 20.0, 20.0, 19.4, 18.8, 18.1, 14.8, 12.0, 9.3, 6.7, 4.0, 2.5] }),
  mk('SA-516-70N', { spec: 'SA-516', grade: '70 (Normalized)', form: 'Plate', group: 'CS', Sy: 38000, Su: 70000, curve: 'D', pNo: 1,
    S: [20.0, 20.0, 20.0, 20.0, 20.0, 19.4, 18.8, 18.1, 14.8, 12.0, 9.3, 6.7, 4.0, 2.5] }),
  mk('SA-516-60', { spec: 'SA-516', grade: '60', form: 'Plate', group: 'CS', Sy: 32000, Su: 60000, curve: 'B', pNo: 1,
    S: [17.1, 17.1, 17.1, 17.1, 17.1, 16.4, 16.0, 15.5, 13.0, 10.8, 8.7, 5.9, 4.0, 2.5] }),
  mk('SA-285-C', { spec: 'SA-285', grade: 'C', form: 'Plate', group: 'CS', Sy: 30000, Su: 55000, curve: 'A', pNo: 1,
    S: [15.7, 15.7, 15.7, 15.7, 15.7, 15.3, 14.8, 14.3, 13.0, 10.8, 8.7, 5.9, 4.0, 2.5] }),
  mk('SA-36', { spec: 'SA-36', grade: '—', form: 'Plate/Shape', group: 'CS', Sy: 36000, Su: 58000, curve: 'A', pNo: 1,
    S: [16.6, 16.6, 16.6, 16.6, 16.6, 16.6, 16.6, 15.6, 13.0, 10.8, null, null, null, null] }),
  mk('SA-106-B', { spec: 'SA-106', grade: 'B', form: 'Seamless pipe', group: 'CS', Sy: 35000, Su: 60000, curve: 'B', pNo: 1,
    S: [17.1, 17.1, 17.1, 17.1, 17.1, 17.1, 17.1, 15.6, 13.0, 10.8, 8.7, 5.9, 4.0, 2.5] }),
  mk('SA-53-B', { spec: 'SA-53', grade: 'B (seamless)', form: 'Pipe', group: 'CS', Sy: 35000, Su: 60000, curve: 'B', pNo: 1,
    S: [17.1, 17.1, 17.1, 17.1, 17.1, 17.1, 17.1, 15.6, 13.0, 10.8, 8.7, 5.9, 4.0, 2.5] }),
  mk('SA-105', { spec: 'SA-105', grade: '—', form: 'Forging', group: 'CS', Sy: 36000, Su: 70000, curve: 'B', pNo: 1,
    S: [20.0, 20.0, 20.0, 20.0, 20.0, 19.6, 19.4, 18.1, 14.8, 12.0, 9.3, 6.7, 4.0, 2.5] }),
  mk('SA-350-LF2', { spec: 'SA-350', grade: 'LF2 Cl.1', form: 'Forging', group: 'CS', Sy: 36000, Su: 70000, curve: 'D', pNo: 1,
    S: [20.0, 20.0, 20.0, 20.0, 20.0, 19.6, 19.4, 18.1, 14.8, 12.0, null, null, null, null] }),
  mk('SA-240-304', { spec: 'SA-240', grade: '304', form: 'Plate', group: 'SS', Sy: 30000, Su: 75000, curve: null, pNo: 8,
    S: [20.0, 16.7, 15.0, 13.8, 12.9, 12.3, 12.0, 11.7, 11.5, 11.2, 11.0, 10.8, 10.6, 10.4] }),
  mk('SA-240-304L', { spec: 'SA-240', grade: '304L', form: 'Plate', group: 'SS', Sy: 25000, Su: 70000, curve: null, pNo: 8,
    S: [16.7, 14.3, 12.8, 11.7, 10.9, 10.4, 10.2, 10.0, 9.8, 9.6, null, null, null, null] }),
  mk('SA-240-316', { spec: 'SA-240', grade: '316', form: 'Plate', group: 'SS', Sy: 30000, Su: 75000, curve: null, pNo: 8,
    S: [20.0, 17.3, 15.6, 14.3, 13.3, 12.6, 12.3, 12.1, 11.9, 11.8, 11.6, 11.6, 11.5, 11.3] }),
  mk('SA-240-316L', { spec: 'SA-240', grade: '316L', form: 'Plate', group: 'SS', Sy: 25000, Su: 70000, curve: null, pNo: 8,
    S: [16.7, 14.1, 12.7, 11.7, 10.9, 10.4, 10.2, 10.0, 9.8, 9.6, 9.4, null, null, null] }),
  mk('SA-312-TP304', { spec: 'SA-312', grade: 'TP304 (smls)', form: 'Pipe', group: 'SS', Sy: 30000, Su: 75000, curve: null, pNo: 8,
    S: [20.0, 16.7, 15.0, 13.8, 12.9, 12.3, 12.0, 11.7, 11.5, 11.2, 11.0, 10.8, 10.6, 10.4] }),
  mk('SA-312-TP316', { spec: 'SA-312', grade: 'TP316 (smls)', form: 'Pipe', group: 'SS', Sy: 30000, Su: 75000, curve: null, pNo: 8,
    S: [20.0, 17.3, 15.6, 14.3, 13.3, 12.6, 12.3, 12.1, 11.9, 11.8, 11.6, 11.6, 11.5, 11.3] }),
  mk('SA-182-F304', { spec: 'SA-182', grade: 'F304', form: 'Forging', group: 'SS', Sy: 30000, Su: 75000, curve: null, pNo: 8,
    S: [20.0, 16.7, 15.0, 13.8, 12.9, 12.3, 12.0, 11.7, 11.5, 11.2, 11.0, 10.8, 10.6, 10.4] }),
  mk('SA-182-F316', { spec: 'SA-182', grade: 'F316', form: 'Forging', group: 'SS', Sy: 30000, Su: 75000, curve: null, pNo: 8,
    S: [20.0, 17.3, 15.6, 14.3, 13.3, 12.6, 12.3, 12.1, 11.9, 11.8, 11.6, 11.6, 11.5, 11.3] }),
  // Bolting
  mk('SA-193-B7', { spec: 'SA-193', grade: 'B7 (≤2.5 in)', form: 'Bolting', group: 'BOLT', Sy: 105000, Su: 125000, curve: null, pNo: null,
    S: [25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 23.6, 21.0, 17.0, 12.5, 8.5, 4.5, null] }),
  mk('SA-193-B8-Cl1', { spec: 'SA-193', grade: 'B8 Cl.1', form: 'Bolting', group: 'BOLT', Sy: 30000, Su: 75000, curve: null, pNo: null,
    S: [18.8, 16.7, 15.0, 13.8, 12.9, 12.3, 12.0, 11.7, 11.5, 11.2, 11.0, 10.8, 10.6, 10.4] }),
  mk('SA-320-L7', { spec: 'SA-320', grade: 'L7 (≤2.5 in)', form: 'Bolting', group: 'BOLT', Sy: 105000, Su: 125000, curve: null, pNo: null,
    S: [25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 23.6, 21.0, 17.0, 12.5, 8.5, 4.5, null] }),
];

// Elastic modulus (psi) vs temperature, representative of II-D Table TM-1.
const EMOD = {
  CS: { t: [70, 200, 300, 400, 500, 600, 700, 800, 900, 1000], E: [29.4, 28.8, 28.3, 27.9, 27.3, 26.5, 25.5, 24.2, 22.4, 20.4] },
  SS: { t: [70, 200, 300, 400, 500, 600, 700, 800, 900, 1000], E: [28.3, 27.6, 27.0, 26.5, 25.8, 25.3, 24.8, 24.1, 23.5, 22.8] },
};
EMOD.BOLT = EMOD.CS;

// Yield-strength reduction with temperature (ratio to room temperature yield).
const YRED = {
  CS: { t: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], r: [1.0, 0.91, 0.88, 0.85, 0.80, 0.75, 0.72, 0.68, 0.62, 0.55] },
  SS: { t: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], r: [1.0, 0.83, 0.75, 0.69, 0.64, 0.60, 0.58, 0.56, 0.54, 0.52] },
};
YRED.BOLT = YRED.CS;

export const DENSITY = { CS: 0.2836, SS: 0.289, BOLT: 0.2836 }; // lb/in³

export function interp(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const a = ys[i - 1], b = ys[i];
      if (a == null || b == null) return null;
      return a + (b - a) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    }
  }
  return null; // above table range
}

const custom = new Map();
export function registerMaterial(m) { custom.set(m.id, { temps: T, ...m }); }

export function getMaterial(id) {
  const m = custom.get(id) || MATERIALS.find(x => x.id === id);
  if (!m) throw new Error(`Unknown material "${id}"`);
  return m;
}

/** Allowable stress S (psi) at temperature T (°F). Throws above the table limit. */
export function allowable(id, tempF) {
  const m = getMaterial(id);
  const s = interp(m.temps, m.S, Math.max(tempF, m.temps[0]));
  if (s == null) throw new Error(`${id}: no allowable stress listed at ${tempF.toFixed(0)} °F (above material limit)`);
  return s;
}

export function modulus(id, tempF) {
  const m = getMaterial(id);
  const t = EMOD[m.group] || EMOD.CS;
  return interp(t.t, t.E, Math.min(tempF, 1000)) * 1e6;
}

export function yieldAt(id, tempF) {
  const m = getMaterial(id);
  const t = YRED[m.group] || YRED.CS;
  return m.Sy * interp(t.t, t.r, Math.min(tempF, 1000));
}

export function density(id) {
  return DENSITY[getMaterial(id).group] || DENSITY.CS;
}

/**
 * External pressure Factor B (psi) for strain Factor A at temperature.
 * Approximates the ASME II-D Subpart 3 charts (CS-1/CS-2/HA-1...) with an
 * elastic line B = A·E/2 that rolls smoothly into a plateau at Sy(T)/2.
 * Returns { B, elastic }.
 */
export function factorB(id, tempF, A) {
  const E = modulus(id, tempF);
  const Sy = yieldAt(id, tempF);
  const m = 4;
  const eps = E * A;
  const sigma = eps / Math.pow(1 + Math.pow(eps / Sy, m), 1 / m);
  const B = sigma / 2;
  const elastic = eps / Sy < 0.5; // within ~1% of the elastic line
  return { B, elastic, E, Sy };
}

/** Inverse of factorB: strain A that produces a given B. */
export function factorAfromB(id, tempF, B) {
  const { E, Sy } = factorB(id, tempF, 1e-5);
  if (B >= Sy / 2 * 0.999) return Infinity;
  let lo = 1e-7, hi = 0.1;
  for (let i = 0; i < 100; i++) {
    const mid = Math.sqrt(lo * hi);
    if (factorB(id, tempF, mid).B < B) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
