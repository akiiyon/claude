// Pressure-part design formulas, ASME Section VIII Division 1 (educational).
// All inputs in in / psi. Geometry passed in the corroded condition.
import { factorB, factorAfromB, allowable } from './materials.js';
import { ellipsoidalK1, coneDelta } from './tables.js';

const deg = a => a * Math.PI / 180;

// ---------------- Cylindrical shell, internal pressure ----------------
/** UG-27(c) with App. 1-2 thick-wall fallback. R = inside radius. */
export function cylInternal({ P, R, S, E, El = E, t }) {
  const out = { code: 'UG-27(c)' };
  const thick = P > 0.385 * S * E || (t != null && t > R / 2);
  if (thick) {
    out.code = 'App. 1-2(a)(1)';
    const Z = (S * E + P) / (S * E - P);
    out.trCirc = Z > 0 ? R * (Math.sqrt(Z) - 1) : Infinity;
    out.trLong = R * (Math.sqrt(P / (S * El) + 1) - 1);
    if (t != null) {
      const Zt = ((R + t) / R) ** 2;
      out.mawpCirc = S * E * (Zt - 1) / (Zt + 1);
      out.mawpLong = S * El * (Zt - 1);
    }
  } else {
    out.trCirc = P * R / (S * E - 0.6 * P);
    out.trLong = P * R / (2 * S * El + 0.4 * P);
    if (t != null) {
      out.mawpCirc = S * E * t / (R + 0.6 * t);
      out.mawpLong = 2 * S * El * t / (R - 0.4 * t);
    }
  }
  out.tr = Math.max(out.trCirc, out.trLong);
  if (t != null) out.mawp = Math.min(out.mawpCirc, out.mawpLong);
  return out;
}

// ---------------- Spheres / hemispherical heads ----------------
/** UG-27(d) / UG-32(f). L = inside radius. */
export function hemiInternal({ P, L, S, E, t }) {
  const out = { code: 'UG-32(f)' };
  if (P > 0.665 * S * E || (t != null && t > 0.356 * L)) {
    out.code = 'App. 1-3';
    const Y = 2 * (S * E + P) / (2 * S * E - P);
    out.tr = L * (Math.cbrt(Y) - 1);
    if (t != null) { const Yt = ((L + t) / L) ** 3; out.mawp = 2 * S * E * (Yt - 1) / (Yt + 2); }
  } else {
    out.tr = P * L / (2 * S * E - 0.2 * P);
    if (t != null) out.mawp = 2 * S * E * t / (L + 0.2 * t);
  }
  return out;
}

// ---------------- Ellipsoidal head ----------------
/** App. 1-4(c). ratio = D/(2h). Reduces to UG-32(d) for 2:1. */
export function ellipsoidalInternal({ P, D, S, E, t, ratio = 2 }) {
  const K = (2 + ratio * ratio) / 6;
  const out = { code: ratio === 2 ? 'UG-32(d)' : 'App. 1-4(c)', K };
  out.tr = P * D * K / (2 * S * E - 0.2 * P);
  if (t != null) out.mawp = 2 * S * E * t / (K * D + 0.2 * t);
  return out;
}

// ---------------- Torispherical head ----------------
/** App. 1-4(d). L = inside crown radius, r = inside knuckle radius. */
export function torisphericalInternal({ P, L, r, S, E, t }) {
  const M = 0.25 * (3 + Math.sqrt(L / r));
  const out = { code: Math.abs(L / r - 16.667) < 0.2 ? 'UG-32(e)' : 'App. 1-4(d)', M };
  out.tr = P * L * M / (2 * S * E - 0.2 * P);
  if (t != null) out.mawp = 2 * S * E * t / (L * M + 0.2 * t);
  if (L / r > 16.67) out.warn = 'UG-32(j): knuckle radius below 6% of crown radius';
  return out;
}

// ---------------- Conical section ----------------
/** UG-32(g). D = inside diameter at the point considered, alpha = half-apex angle (deg). */
export function coneInternal({ P, D, S, E, t, alpha }) {
  const c = Math.cos(deg(alpha));
  const out = { code: 'UG-32(g)' };
  out.tr = P * D / (2 * c * (S * E - 0.6 * P));
  if (t != null) out.mawp = 2 * S * E * t * c / (D + 1.2 * t * c);
  if (alpha > 30) out.warn = 'α > 30°: App. 1-5(g) junction analysis required (toriconical or discontinuity analysis)';
  return out;
}

// ---------------- Flat heads ----------------
/** UG-34. d = diameter, C = attachment factor. W, hG for bolted covers. */
export function flatInternal({ P, d, S, E, C, t, W = 0, hG = 0 }) {
  const out = { code: 'UG-34' };
  const bolt = W > 0 && hG > 0;
  out.tr = d * Math.sqrt(C * P / (S * E) + (bolt ? 1.9 * W * hG / (S * E * d ** 3) : 0));
  if (t != null) {
    out.mawp = ((t / d) ** 2 * S * E - (bolt ? 1.9 * W * hG / d ** 3 : 0)) / C;
  }
  return out;
}

// ---------------- External pressure ----------------
/** Factor A from Fig. G (geometric chart), closed form of the collapse equations. */
export function factorA(LDo, Dot) {
  const tD = 1 / Dot;
  const Ld = Math.max(LDo, 0.05);
  const longCyl = 1.1 * tD * tD;
  const denom = Ld - 0.45 * Math.sqrt(tD);
  const shortCyl = denom > 0 ? 1.30 * Math.pow(tD, 1.5) / denom : 0.1;
  return Math.min(Math.max(shortCyl, longCyl), 0.1);
}

/** UG-28 allowable external pressure for a cylinder (corroded t). */
export function cylExternal({ material, T, Do, L, t }) {
  const Dot = Do / t;
  const LDo = Math.min(L / Do, 50);
  const A = factorA(LDo, Dot);
  const { B, elastic, E, Sy } = factorB(material, T, A);
  let Pa;
  const out = { code: 'UG-28(c)', A, B, Dot, LDo, E };
  if (Dot >= 10) {
    Pa = elastic ? 2 * A * E / (3 * Dot) : 4 * B / (3 * Dot);
  } else {
    // UG-28(c)(2) for Do/t < 10
    const A2 = Dot < 4 ? 1.1 / (Dot * Dot) : A;
    const B2 = factorB(material, T, A2).B;
    const S = Math.min(2 * allowable(material, T), 0.9 * Sy); // lesser of 2S or 0.9 Sy
    const Pa1 = (2.167 / Dot - 0.0833) * B2;
    const Pa2 = 2 * S / Dot * (1 - 1 / Dot);
    Pa = Math.min(Pa1, Pa2);
    out.code = 'UG-28(c)(2)';
  }
  out.Pa = Pa;
  out.elastic = elastic;
  return out;
}

/** UG-33 allowable external pressure for formed heads (spherical portion). Ro = outside crown radius. */
export function headExternal({ material, T, Ro, t }) {
  const Rot = Ro / t;
  const A = 0.125 / Rot;
  const { B, elastic, E } = factorB(material, T, A);
  const Pa = elastic ? 0.0625 * E / (Rot * Rot) : B / Rot;
  return { code: 'UG-33(c)', A, B, Rot, Pa, E, elastic };
}

export function ellipsoidalExternalRo(Do, ratio = 2) { return ellipsoidalK1(ratio) * Do; }

/** UG-33(f) conical section. Dl, Ds = outside diameters at large / small ends, Lc = axial length. */
export function coneExternal({ material, T, DL, Ds, Lc, t, alpha }) {
  const c = Math.cos(deg(alpha));
  const te = t * c;
  const Le = (Lc / 2) * (1 + Ds / DL);
  const res = cylExternal({ material, T, Do: DL, L: Le, t: te });
  return { ...res, code: 'UG-33(f)', te, Le };
}

/** Thickness needed for a given external pressure: bisection on the Pa(t) function. */
export function requiredThickness(paOfT, P, tMax = 20) {
  if (!(P > 0)) return 0;
  let lo = 1e-4, hi = tMax;
  if (paOfT(hi) < P) return Infinity;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (paOfT(mid) >= P) hi = mid; else lo = mid;
  }
  return hi;
}

/** UG-29 stiffening ring check. Bar ring of width h (radial) × thickness w (axial). */
export function stiffenerRing({ material, T, P, Do, t, Ls, h, w }) {
  const As = h * w;
  const B = 0.75 * (P * Do / (t + As / Ls));
  // B above the material plateau means the shell+ring cannot carry the load at any strain.
  const A = factorAfromB(material, T, B);
  const ae = Number.isFinite(A) ? A : 0.1;
  const Is = Do * Do * Ls * (t + As / Ls) * ae / 14;
  const IsP = Do * Do * Ls * (t + As / Ls) * ae / 10.9;
  // Ring alone about its own centroid (axis parallel to shell axis)
  const I = w * h ** 3 / 12;
  // Ring + effective shell width 1.10·sqrt(Do·t) per UG-29(a)
  const be = Math.min(1.10 * Math.sqrt(Do * t), Ls);
  const As1 = be * t;
  const yRing = t + h / 2, yShell = t / 2;
  const yc = (As * yRing + As1 * yShell) / (As + As1);
  const Ip = I + As * (yRing - yc) ** 2 + be * t ** 3 / 12 + As1 * (yShell - yc) ** 2;
  return { code: 'UG-29', As, B, A: ae, Is, IsP, I, Ip, be, ok: Number.isFinite(A) && (Ip >= IsP || I >= Is) };
}

/** App. 1-5 cone-to-cylinder junction reinforcement (no knuckle). */
export function coneJunction({ end, P, R, S, E1 = 1, alpha, ts, tc, tr, trc }) {
  const ratio = P / (S * E1);
  const delta = coneDelta(end, ratio);
  const a = alpha;
  const out = { code: 'App. 1-5', end, ratio, delta };
  if (delta >= a) { out.required = 0; out.available = 0; out.ok = true; out.note = `Δ = ${delta.toFixed(1)}° ≥ α: no reinforcement required`; return out; }
  const Q = P * R / 2;
  const tanA = Math.tan(deg(a)), cosA = Math.cos(deg(a));
  out.required = Q * R / (S * E1) * (1 - delta / a) * tanA;
  if (end === 'large') {
    out.available = (ts - tr) * Math.sqrt(R * ts) + (tc - trc) * Math.sqrt(R * tc / cosA);
  } else {
    out.available = 0.78 * Math.sqrt(R * ts) * ((ts - tr) + (tc - trc) / cosA);
  }
  out.ok = out.available >= out.required;
  return out;
}

