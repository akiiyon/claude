// Bolted flange design per ASME VIII-1 Mandatory Appendix 2 (educational).
import { allowable, modulus } from './materials.js';
import { boltRootArea, GASKETS } from './tables.js';

const log10 = Math.log10;

/** Shape factors T, U, Y, Z (Fig. 2-7.1) from K = A/B. */
export function kFactors(K) {
  const K2 = K * K, lk = log10(K);
  return {
    T: (K2 * (1 + 8.55246 * lk) - 1) / ((1.04720 + 1.9448 * K2) * (K - 1)),
    U: (K2 * (1 + 8.55246 * lk) - 1) / (1.36136 * (K2 - 1) * (K - 1)),
    Y: (1 / (K - 1)) * (0.66845 + 5.71690 * K2 * lk / (K2 - 1)),
    Z: (K2 + 1) / (K2 - 1),
  };
}

/** Integral-flange hub factors F, V, f (Table 2-7.1 closed form). */
export function hubFactors(g1g0, hh0) {
  const A = g1g0 - 1;
  const C = 43.68 * hh0 ** 4;
  const A2 = A * A, A3 = A2 * A;
  const C1 = 1 / 3 + A / 12;
  const C2 = 5 / 42 + 17 * A / 336;
  const C3 = 1 / 210 + A / 360;
  const C4 = 11 / 360 + 59 * A / 5040 + (1 + 3 * A) / C;
  const C5 = 1 / 90 + 5 * A / 1008 - (1 + A) ** 3 / C;
  const C6 = 1 / 120 + 17 * A / 5040 + 1 / C;
  const C7 = 215 / 2772 + 51 * A / 1232 + (60 / 7 + 225 * A / 14 + 75 * A2 / 7 + 5 * A3 / 2) / C;
  const C8 = 31 / 6930 + 128 * A / 45045 + (6 / 7 + 15 * A / 7 + 12 * A2 / 7 + 5 * A3 / 11) / C;
  const C9 = 533 / 30240 + 653 * A / 73920 + (1 / 2 + 33 * A / 14 + 39 * A2 / 28 + 25 * A3 / 84) / C;
  const C10 = 29 / 3780 + 3 * A / 704 - (1 / 2 + 33 * A / 14 + 81 * A2 / 28 + 13 * A3 / 12) / C;
  const C11 = 31 / 6048 + 1763 * A / 665280 + (1 / 2 + 6 * A / 7 + 15 * A2 / 28 + 5 * A3 / 42) / C;
  const C12 = 1 / 2925 + 71 * A / 300300 + (8 / 35 + 18 * A / 35 + 156 * A2 / 385 + 6 * A3 / 55) / C;
  const C13 = 761 / 831600 + 937 * A / 1663200 + (1 / 35 + 6 * A / 35 + 11 * A2 / 70 + 3 * A3 / 70) / C;
  const C14 = 197 / 415800 + 103 * A / 332640 - (1 / 35 + 6 * A / 35 + 17 * A2 / 70 + A3 / 10) / C;
  const C15 = 233 / 831600 + 97 * A / 554400 + (1 / 35 + 3 * A / 35 + A2 / 14 + 2 * A3 / 105) / C;
  const C16 = C1 * C7 * C12 + C2 * C8 * C3 + C3 * C8 * C2 - (C3 * C3 * C7 + C8 * C8 * C1 + C2 * C2 * C12);
  const C17 = (C4 * C7 * C12 + C2 * C8 * C13 + C3 * C8 * C9 - (C13 * C7 * C3 + C8 * C8 * C4 + C12 * C2 * C9)) / C16;
  const C18 = (C5 * C7 * C12 + C2 * C8 * C14 + C3 * C8 * C10 - (C14 * C7 * C3 + C8 * C8 * C5 + C12 * C2 * C10)) / C16;
  const C19 = (C6 * C7 * C12 + C2 * C8 * C15 + C3 * C8 * C11 - (C15 * C7 * C3 + C8 * C8 * C6 + C12 * C2 * C11)) / C16;
  const C20 = (C1 * C9 * C12 + C4 * C8 * C3 + C3 * C13 * C2 - (C3 * C3 * C9 + C13 * C8 * C1 + C12 * C4 * C2)) / C16;
  const C21 = (C1 * C10 * C12 + C5 * C8 * C3 + C3 * C14 * C2 - (C3 * C3 * C10 + C14 * C8 * C1 + C12 * C5 * C2)) / C16;
  const C22 = (C1 * C11 * C12 + C6 * C8 * C3 + C3 * C15 * C2 - (C3 * C3 * C11 + C15 * C8 * C1 + C12 * C6 * C2)) / C16;
  const C23 = (C1 * C7 * C13 + C2 * C9 * C3 + C4 * C8 * C2 - (C3 * C7 * C4 + C8 * C9 * C1 + C2 * C2 * C13)) / C16;
  const C24 = (C1 * C7 * C14 + C2 * C10 * C3 + C5 * C8 * C2 - (C3 * C7 * C5 + C8 * C10 * C1 + C2 * C2 * C14)) / C16;
  const C25 = (C1 * C7 * C15 + C2 * C11 * C3 + C6 * C8 * C2 - (C3 * C7 * C6 + C8 * C11 * C1 + C2 * C2 * C15)) / C16;
  const C26 = -((C / 4) ** 0.25);
  const C27 = C20 - C17 - 5 / 12 + C17 * C26;
  const C28 = C22 - C19 - 1 / 12 + C19 * C26;
  const C29 = -((C / 4) ** 0.5);
  const C30 = -((C / 4) ** 0.75);
  const C31 = 3 * A / 2 - C17 * C30;
  const C32 = 1 / 2 - C19 * C30;
  const C33 = 0.5 * C26 * C32 + C28 * C31 * C29 - (0.5 * C30 * C28 + C32 * C27 * C29);
  const C34 = 1 / 12 + C18 - C21 - C18 * C26;
  const C35 = -C18 * (C / 4) ** 0.75;
  const C36 = (C28 * C35 * C29 - C32 * C34 * C29) / C33;
  const C37 = (0.5 * C26 * C35 + C34 * C31 * C29 - (0.5 * C30 * C34 + C35 * C27 * C29)) / C33;
  const E1 = C17 * C36 + C18 + C19 * C37;
  const E2 = C20 * C36 + C21 + C22 * C37;
  const E3 = C23 * C36 + C24 + C25 * C37;
  const E4 = 1 / 4 + C37 / 12 + C36 / 4 - E3 / 5 - 3 * E2 / 2 - E1;
  const E5 = E1 * (1 / 2 + A / 6) + E2 * (1 / 4 + 11 * A / 84) + E3 * (1 / 70 + A / 105);
  const E6 = E5 - C36 * (7 / 120 + A / 36 + 3 * A / C) - 1 / 40 - A / 72 - C37 * (1 / 60 + A / 120 + 1 / C);
  const F = -E6 / ((C / 2.73) ** 0.25 * (1 + A) ** 3 / C);
  const V = E4 / ((2.73 / C) ** 0.25 * (1 + A) ** 3);
  const f = Math.max(1, C36 / (1 + A));
  return { F, V, f };
}

/**
 * fl: { type: 'integral'|'loose', A (OD), B (ID), C (bolt circle), t, g0, g1, h,
 *       nBolts, boltDia, material, boltMaterial, gasket (id) or {m,y}, gOD, gID,
 *       c (corrosion), P (design pressure), T (design temp), Tamb }
 */
export function appendix2(fl) {
  const P = fl.P, T = fl.T, Ta = fl.Tamb ?? 70;
  const c = fl.c || 0;
  const B = fl.B + 2 * c;
  const g0 = Math.max((fl.g0 || 0) - c, 1e-6);
  const g1 = Math.max((fl.g1 || fl.g0 || 0) - c, g0);
  const gk = typeof fl.gasket === 'string' ? GASKETS.find(g => g.id === fl.gasket) : fl.gasket;
  if (!gk) throw new Error(`Unknown gasket ${fl.gasket}`);
  const { m, y } = gk;

  const Sfo = allowable(fl.material, T), Sfa = allowable(fl.material, Ta);
  const Sb = allowable(fl.boltMaterial, T), Sa = allowable(fl.boltMaterial, Ta);

  // Gasket (Table 2-5.2, facing sketch 1a: flat face, N = width)
  const N = (fl.gOD - fl.gID) / 2;
  const b0 = N / 2;
  const b = b0 <= 0.25 ? b0 : 0.5 * Math.sqrt(b0);
  const G = b0 <= 0.25 ? (fl.gOD + fl.gID) / 2 : fl.gOD - 2 * b;

  // Bolt loads (2-5)
  const H = 0.785 * G * G * P;
  const Hp = 2 * b * Math.PI * G * m * P;
  const Wm1 = H + Hp;
  const Wm2 = Math.PI * b * G * y;
  const Am = Math.max(Wm1 / Sb, Wm2 / Sa);
  const Ab = fl.nBolts * boltRootArea(fl.boltDia);
  const W = (Am + Ab) * Sa / 2;

  // Forces and moment arms (2-3, Table 2-6)
  const HD = 0.785 * B * B * P;
  const HT = H - HD;
  const HG = Wm1 - H;
  const hG = (fl.C - G) / 2;
  let hD, hT;
  if (fl.type === 'loose') {
    hD = (fl.C - B) / 2;
    hT = (hD + hG) / 2;
  } else {
    const R = (fl.C - B) / 2 - g1;
    hD = R + 0.5 * g1;
    hT = (R + g1 + hG) / 2;
  }
  const Mo = HD * hD + HT * hT + HG * hG;           // operating
  const Mg = W * (fl.C - G) / 2;                     // gasket seating
  // Bolt spacing correction (2-3 Bsc) — applied if bolts are widely spaced
  const Bs = Math.PI * fl.C / fl.nBolts;
  const Bsmax = 2 * fl.boltDia + 6 * fl.t / (m + 0.5);
  const Bsc = Math.max(1, Math.sqrt(Bs / (2 * fl.boltDia + fl.t)));

  const K = fl.A / B;
  const { T: Tf, U, Y, Z } = kFactors(K);
  const h0 = Math.sqrt(B * g0);
  let F = 0.908920, V = 0.550103, f = 1;
  if (fl.type !== 'loose') ({ F, V, f } = hubFactors(g1 / g0, (fl.h || 0) / h0));
  const e = F / h0;
  const d = U / V * h0 * g0 * g0;
  const t = fl.t;
  const L = (t * e + 1) / Tf + t ** 3 / d;

  const stresses = (M, Sf) => {
    if (fl.type === 'loose') {
      const ST = Y * M / (t * t * B);
      return { SH: 0, SR: 0, ST, checks: [['ST', ST, Sf]] };
    }
    const SH = f * M / (L * g1 * g1 * B);
    const SR = (1.33 * t * e + 1) * M / (L * t * t * B);
    const ST = Y * M / (t * t * B) - Z * SR;
    return {
      SH, SR, ST,
      checks: [['SH', SH, 1.5 * Sf], ['SR', SR, Sf], ['ST', ST, Sf], ['(SH+SR)/2', (SH + SR) / 2, Sf], ['(SH+ST)/2', (SH + ST) / 2, Sf]],
    };
  };
  const op = stresses(Mo * Bsc, Sfo);
  const seat = stresses(Mg * Bsc, Sfa);

  // Rigidity (2-14)
  const Eo = modulus(fl.material, T), Ea = modulus(fl.material, Ta);
  const rig = (M, Ef) => fl.type === 'loose'
    ? 109.4 * M / (Ef * t ** 3 * Math.log(K) * 0.2)
    : 52.14 * V * M / (L * Ef * g0 * g0 * 0.3 * h0);
  const Jop = rig(Mo, Eo), Jseat = rig(Mg, Ea);

  const ok = Ab >= Am
    && [...op.checks, ...seat.checks].every(([, s, a]) => s <= a)
    && Jop <= 1 && Jseat <= 1;

  return {
    code: 'App. 2', gasket: gk, N, b0, b, G, H, Hp, Wm1, Wm2, Am, Ab, W, HD, HT, HG, hD, hT, hG,
    Mo, Mg, Bs, Bsmax, Bsc, K, Tf, U, Y, Z, h0, F, V, f, e, d, L,
    Sfo, Sfa, Sb, Sa, op, seat, Jop, Jseat, ok,
  };
}

/** MAWP of a flange: bisection on pressure until any App-2 check fails. */
export function flangeMawp(fl, Pmax = 10000) {
  const ok = P => appendix2({ ...fl, P }).ok;
  if (!ok(0.01)) return 0;
  let lo = 0, hi = Pmax;
  if (ok(hi)) return hi;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return lo;
}
