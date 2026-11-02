// Nozzle reinforcement by the area-replacement method, ASME VIII-1 UG-37,
// with limits (UG-40), weld strength paths (UG-41) and neck thickness (UG-45).
import { allowable } from './materials.js';
import { stdWall, ellipsoidalK1 } from './tables.js';

/**
 * Required thickness of the host wall for reinforcement, with E = 1 (UG-37(a)).
 * host: placed element (corroded geometry supplied separately).
 */
export function hostRequiredT(host, P, S, Dc) {
  const R = Dc / 2;
  if (host.type === 'shell') return P * R / (S - 0.6 * P);
  if (host.type === 'cone') return P * Dc / (2 * Math.cos(host.alpha * Math.PI / 180) * (S - 0.6 * P));
  if (host.type === 'head') {
    switch (host.kind) {
      case 'ellipsoidal': { // within the 80% central portion: sphere of radius K1·D
        const K1 = ellipsoidalK1(host.ratio || 2);
        return P * K1 * Dc / (2 * S - 0.2 * P);
      }
      case 'torispherical': { const L = (host.crownR || host.D) + (Dc - host.D) / 2; return P * L / (2 * S - 0.2 * P); }
      case 'hemispherical': return P * R / (2 * S - 0.2 * P);
      case 'conical': return P * Dc / (2 * Math.cos((host.alpha || 30) * Math.PI / 180) * (S - 0.6 * P));
      default: return null;
    }
  }
  return null;
}

/**
 * n: nozzle {OD, tn, c (nozzle corrosion), material, ut (undertolerance fraction),
 *            padOD, padT, padMaterial, leg41, leg42, leg43, internal (projection inside), E1}
 * host: { tEff (corroded host thickness), D (inside, corroded), material, element }
 */
export function reinforcement({ n, host, P, T }) {
  const Sv = allowable(host.material, T);
  const Sn = allowable(n.material, T);
  const Sp = n.padT > 0 ? allowable(n.padMaterial || host.material, T) : Sv;
  const c = n.c ?? 0;
  const fr1 = Math.min(Sn / Sv, 1), fr2 = fr1, fr3 = Math.min(Math.min(Sn, Sp) / Sv, 1), fr4 = Math.min(Sp / Sv, 1);
  const F = 1, E1 = n.E1 ?? 1;

  const tnNom = n.tn * (1 - (n.ut || 0));
  const tn = tnNom - c;                          // corroded available neck thickness
  const d = n.OD - 2 * n.tn + 2 * c;             // finished opening, corroded
  const Rn = d / 2;
  const t = host.tEff;
  const tr = hostRequiredT(host.element, P, Sv, host.D);
  const trn = P * Rn / (Sn - 0.6 * P);
  const te = n.padT > 0 ? n.padT : 0;

  const out = { code: 'UG-37', d, t, tr, tn, trn, fr1, fr2, fr3, fr4, Sv, Sn, Sp };
  if (tr == null) {
    out.skip = 'Reinforcement of openings in flat heads follows UG-39 — not evaluated here.';
    return out;
  }

  // Required area
  out.A = d * tr * F + 2 * tn * tr * F * (1 - fr1);
  // Available areas
  const exc = E1 * t - F * tr;
  out.A1 = Math.max(d * exc - 2 * tn * exc * (1 - fr1), 2 * (t + tn) * exc - 2 * tn * exc * (1 - fr1));
  out.A2 = te > 0
    ? Math.min(5 * (tn - trn) * fr2 * t, 2 * (tn - trn) * (2.5 * tn + te) * fr2)
    : Math.min(5 * (tn - trn) * fr2 * t, 5 * (tn - trn) * fr2 * tn);
  const ti = Math.max((n.tn - 2 * c), 0);
  const h = Math.min(n.internal || 0, 2.5 * t, 2.5 * ti);
  out.A3 = n.internal > 0 ? Math.min(5 * t * ti * fr2, 5 * ti * ti * fr2, 2 * h * ti * fr2) : 0;
  out.A41 = (n.leg41 || 0) ** 2 * fr3;
  out.A42 = te > 0 ? (n.leg42 || 0) ** 2 * fr4 : 0;
  out.A43 = n.internal > 0 ? (n.leg43 || 0) ** 2 * fr2 : 0;
  const Dp = Math.min(n.padOD || 0, 2 * d);
  out.A5 = te > 0 ? Math.max(0, (Dp - d - 2 * tn) * te * fr4) : 0;
  for (const k of ['A1', 'A2', 'A3']) out[k] = Math.max(out[k], 0);
  out.Aavail = out.A1 + out.A2 + out.A3 + out.A41 + out.A42 + out.A43 + out.A5;
  out.ok = out.Aavail >= out.A;
  out.limitDia = 2 * d;
  out.limitNormal = Math.min(2.5 * t, 2.5 * tn + te);

  // UG-36(c)(3) small-opening exemption
  const fin = d;
  out.smallExempt = (t <= 0.375 && fin <= 3.5) || fin <= 2.375;

  // UG-41 weld strength (simplified load paths)
  const Smin = Math.min(Sv, Sn);
  const W = (out.A - out.A1 + 2 * tn * fr1 * exc) * Sv;
  const W11 = (out.A2 + out.A5 + out.A41 + out.A42) * Sv;
  const W22 = (out.A2 + out.A3 + out.A41 + out.A43 + 2 * tn * t * fr1) * Sv;
  const W33 = (out.A2 + out.A3 + out.A5 + out.A41 + out.A42 + out.A43 + 2 * tn * t * fr1) * Sv;
  const Dn = n.OD;
  const sNeck = Math.PI / 2 * (Dn - tn) * tn * 0.7 * Sn;              // neck wall shear
  const sW41 = Math.PI / 2 * Dn * (n.leg41 || 0) * 0.49 * Smin;       // nozzle-to-pad/shell fillet
  const sW42 = te > 0 ? Math.PI / 2 * (n.padOD || 0) * (n.leg42 || 0) * 0.49 * Math.min(Sp, Sv) : 0; // pad OD fillet
  const sGroove = Math.PI / 2 * Dn * t * 0.74 * Smin;                 // nozzle-to-shell groove (tension)
  const sW43 = n.internal > 0 ? Math.PI / 2 * Dn * (n.leg43 || 0) * 0.49 * Smin : 0;
  const sPadGroove = te > 0 ? Math.PI / 2 * Dn * te * 0.74 * Math.min(Sn, Sp) : 0;
  out.welds = {
    W: Math.max(W, 0), W11, W22, W33,
    path11: sW42 + sNeck,
    path22: sW41 + sGroove + sW43,
    path33: sW42 + sGroove + sW43 + sPadGroove,
  };
  const ws = out.welds;
  ws.ok11 = ws.path11 >= Math.min(ws.W, ws.W11);
  ws.ok22 = ws.path22 >= Math.min(ws.W, ws.W22);
  ws.ok33 = te > 0 ? ws.path33 >= Math.min(ws.W, ws.W33) : true;
  ws.required = ws.W <= 0 ? false : true;

  // UG-45 minimum neck thickness
  const ta = trn + c;
  const tb1 = Math.max(tr + c, 0.0625 + c);
  const tb3 = stdWall(n.OD) * 0.875 + c;
  const tb = Math.min(tb3, tb1);
  out.ug45 = { ta, tb1, tb3, tReq: Math.max(ta, tb), tAvail: tnNom, ok: tnNom >= Math.max(ta, tb) };
  return out;
}

/** MAWP of the opening: highest P for which reinforcement is adequate (bisection). */
export function nozzleMawp(args, Pmax) {
  const ok = P => { const r = reinforcement({ ...args, P }); return r.skip ? true : r.ok && r.trn < r.tn; };
  if (!ok(1e-3)) return 0;
  let lo = 0, hi = Pmax;
  if (ok(hi)) return hi;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return lo;
}
