// Analysis orchestrator: takes a vessel model (internal US units) and runs
// every check — internal/external pressure, MAWP/MAP, nozzles, flanges,
// MDMT, hydrotest, weights, wind, seismic, longitudinal stresses, supports.
import { allowable, getMaterial, factorB, modulus, yieldAt, density } from './materials.js';
import {
  cylInternal, hemiInternal, ellipsoidalInternal, torisphericalInternal, coneInternal, flatInternal,
  cylExternal, headExternal, ellipsoidalExternalRo, coneExternal, requiredThickness, stiffenerRing, coneJunction,
} from './components.js';
import { layout, elementVolume, elementMetalVolume, elementOuterArea, nozzleWeight, overall, WATER } from './geometry.js';
import { reinforcement, nozzleMawp } from './nozzle.js';
import { appendix2, flangeMawp } from './flange.js';
import { flangeRating, ucs66Mdmt, ucs661Reduction } from './tables.js';
import { windForces, seismicForces, shearMoment, naturalPeriod } from './loads.js';
import { zick, skirtBase } from './supports.js';

/** Thicknesses and diameters for an element in a given condition. */
function cond(el, corroded) {
  const tNom = el.t;
  const tMin = tNom * (1 - (el.ut || 0));
  const c = corroded ? (el.c || 0) : 0;
  const ce = corroded ? (el.cExt || 0) : 0;
  const t = tMin - c - ce;
  const grow = d => d + 2 * c;
  if (el.type === 'cone') return { t, c, D1: grow(el.D1), D2: grow(el.D2) };
  return { t, c, D: grow(el.D) };
}

/** Internal pressure result for any element, given pressure P and allowable S. */
export function internalFor(el, P, S, corroded = true) {
  const g = cond(el, corroded);
  const E = el.E ?? 1;
  if (el.type === 'shell') return { ...cylInternal({ P, R: g.D / 2, S, E, El: el.El ?? E, t: g.t }), t: g.t };
  if (el.type === 'cone') {
    const L = el.length;
    const alpha = Math.atan(Math.abs(g.D1 - g.D2) / 2 / L) * 180 / Math.PI;
    const D = Math.max(g.D1, g.D2);
    return { ...coneInternal({ P, D, S, E, t: g.t, alpha }), t: g.t, alpha };
  }
  // heads
  switch (el.kind) {
    case 'ellipsoidal': return { ...ellipsoidalInternal({ P, D: g.D, S, E, t: g.t, ratio: el.ratio || 2 }), t: g.t };
    case 'torispherical': {
      const L = (el.crownR || el.D) + g.c, r = (el.knuckleR || 0.06 * (el.crownR || el.D)) + g.c;
      return { ...torisphericalInternal({ P, L, r, S, E, t: g.t }), t: g.t };
    }
    case 'hemispherical': return { ...hemiInternal({ P, L: g.D / 2, S, E, t: g.t }), t: g.t };
    case 'conical': return { ...coneInternal({ P, D: g.D, S, E, t: g.t, alpha: el.alpha || 30 }), t: g.t };
    case 'flat': return { ...flatInternal({ P, d: g.D, S, E, C: el.C ?? 0.33, t: g.t }), t: g.t };
    default: throw new Error(`Unknown head ${el.kind}`);
  }
}

/** External pressure allowable for an element (corroded), and required thickness. */
function externalFor(el, Pext, T, Ldesign) {
  const g = cond(el, true);
  const tOut = g.t; // outside diameter uses nominal thickness
  if (el.type === 'shell') {
    const Do = el.D + 2 * el.t;
    const f = t => cylExternal({ material: el.material, T, Do, L: Ldesign, t }).Pa;
    const r = cylExternal({ material: el.material, T, Do, L: Ldesign, t: tOut });
    return { ...r, L: Ldesign, Do, tr: requiredThickness(f, Pext) };
  }
  if (el.type === 'cone') {
    const DL = Math.max(el.D1, el.D2) + 2 * el.t, Ds = Math.min(el.D1, el.D2) + 2 * el.t;
    const alpha = Math.atan(Math.abs(el.D1 - el.D2) / 2 / el.length) * 180 / Math.PI;
    const f = t => coneExternal({ material: el.material, T, DL, Ds, Lc: el.length, t, alpha }).Pa;
    const r = coneExternal({ material: el.material, T, DL, Ds, Lc: el.length, t: tOut, alpha });
    return { ...r, tr: requiredThickness(f, Pext) };
  }
  const Do = el.D + 2 * el.t;
  let Ro;
  switch (el.kind) {
    case 'ellipsoidal': Ro = ellipsoidalExternalRo(Do, el.ratio || 2); break;
    case 'torispherical': Ro = (el.crownR || el.D) + el.t; break;
    case 'hemispherical': Ro = Do / 2; break;
    case 'conical': {
      const alpha = el.alpha || 30;
      const Lc = (el.D / 2) / Math.tan(alpha * Math.PI / 180);
      const f = t => coneExternal({ material: el.material, T, DL: Do, Ds: 0.0001, Lc, t, alpha }).Pa;
      const r = coneExternal({ material: el.material, T, DL: Do, Ds: 0.0001, Lc, t: tOut, alpha });
      return { ...r, tr: requiredThickness(f, Pext) };
    }
    case 'flat': {
      // UG-34 with external pressure treated as a uniform load on the flat plate
      const S = allowable(el.material, T);
      const res = flatInternal({ P: Pext, d: g.D, S, E: el.E ?? 1, C: el.C ?? 0.33, t: g.t });
      return { code: 'UG-34 (ext.)', Pa: res.mawp, tr: res.tr };
    }
    default: return null;
  }
  const f = t => headExternal({ material: el.material, T, Ro, t }).Pa;
  const r = headExternal({ material: el.material, T, Ro, t: tOut });
  // UG-33(a)(1): also internal-pressure formulas with 1.67 × external pressure (E = 1)
  const S = allowable(el.material, T);
  const internal167 = internalFor({ ...el, E: 1 }, 1.67 * Pext, S, true);
  return { ...r, Ro, tr: Math.max(requiredThickness(f, Pext), internal167.tr), tr167: internal167.tr, Pa167: internal167.mawp / 1.67 };
}

/** Design length for external pressure (UG-28(b)) for each shell, split by heads, cones and rings. */
function externalLengths(placed, rings = []) {
  const L = new Map();
  let i = 0;
  while (i < placed.length) {
    if (placed[i].type !== 'shell') { i++; continue; }
    let j = i;
    while (j + 1 < placed.length && placed[j + 1].type === 'shell') j++;
    const zStart = placed[i].z0, zEnd = placed[j].z1;
    const prev = placed[i - 1], next = placed[j + 1];
    const addStart = prev && prev.type === 'head' && prev.kind !== 'flat' ? prev.depth / 3 : 0;
    const addEnd = next && next.type === 'head' && next.kind !== 'flat' ? next.depth / 3 : 0;
    const cuts = [zStart, ...rings.map(r => r.z).filter(z => z > zStart && z < zEnd).sort((a, b) => a - b), zEnd];
    for (let k = i; k <= j; k++) {
      const el = placed[k];
      let Lmax = 0;
      for (let s = 0; s < cuts.length - 1; s++) {
        const a = cuts[s], b = cuts[s + 1];
        if (b <= el.z0 || a >= el.z1) continue;
        let span = b - a;
        if (s === 0) span += addStart;
        if (s === cuts.length - 2) span += addEnd;
        Lmax = Math.max(Lmax, span);
      }
      L.set(el.index, el.extLength > 0 ? el.extLength : Lmax);
    }
    i = j + 1;
  }
  return L;
}

/** Static liquid head (psi) acting at the lowest point of an element. */
function staticHead(p, d, ovr, sg, level) {
  if (!(sg > 0) || !(level > 0)) return 0;
  if (d.orientation === 'horizontal') return WATER * sg * Math.min(level, ovr.Dmax);
  const zLow = p.z0; // lowest point of the element measured from the bottom
  return WATER * sg * Math.max(0, level - zLow);
}

function warn(list, msg) { if (!list.includes(msg)) list.push(msg); }

export function analyze(model) {
  const d = { orientation: 'vertical', T: 100, Tamb: 70, P: 0, Pext: 0, sg: 1, level: 0, MDMT: -20, ...model.design };
  const warnings = [];
  if (!model.elements?.length) throw new Error('The model has no elements');
  const placed = layout(model.elements);
  const ovr = overall(placed);
  const extL = externalLengths(placed, model.rings || []);
  const level = d.level === 'full' ? Infinity : d.level;

  // ---------------- Pressure parts ----------------
  const elements = placed.map(p => {
    const r = { name: p.name || `${p.type} ${p.index + 1}`, type: p.type, kind: p.kind, index: p.index, material: p.material };
    try {
      const S = allowable(p.material, d.T);
      const Sa = allowable(p.material, d.Tamb);
      const head = staticHead(p, d, ovr, d.sg, level);
      const Pdes = d.P + head;
      r.S = S; r.Sa = Sa; r.staticHead = head; r.Pdesign = Pdes;
      const int = internalFor(p, Pdes, S, true);
      r.internal = int;
      r.tReqTotal = int.tr + (p.c || 0) + (p.cExt || 0);
      r.tNominal = p.t;
      r.tAvail = cond(p, true).t;
      r.mawp = int.mawp - head;                               // at top of vessel, hot & corroded
      r.map = internalFor(p, 1, Sa, false).mawp;              // new & cold
      r.ok = int.tr <= r.tAvail + 1e-9;
      if (int.warn) warn(warnings, `${r.name}: ${int.warn}`);
      if (d.Pext > 0) {
        r.external = externalFor(p, d.Pext, d.T, extL.get(p.index));
        if (r.external) r.okExt = r.external.Pa >= d.Pext;
      }
      // UG-16(b) minimum thickness 1/16 in (excl. corrosion)
      if (p.t * (1 - (p.ut || 0)) - (p.c || 0) < 0.0625 && p.type !== 'head') warn(warnings, `${r.name}: below UG-16(b) minimum 1/16 in`);
    } catch (e) {
      r.error = e.message; r.ok = false;
    }
    return r;
  });

  // Cone junctions (App 1-5)
  const junctions = [];
  placed.forEach((p, i) => {
    if (p.type !== 'cone') return;
    const alpha = Math.atan(Math.abs(p.D1 - p.D2) / 2 / p.length) * 180 / Math.PI;
    for (const [nb, Dcone] of [[placed[i - 1], p.D1], [placed[i + 1], p.D2]]) {
      if (!nb || nb.type !== 'shell') continue;
      const end = Dcone >= Math.max(p.D1, p.D2) - 1e-9 ? 'large' : 'small';
      try {
        const S = Math.min(allowable(nb.material, d.T), allowable(p.material, d.T));
        const gs = cond(nb, true), gc = cond(p, true);
        const R = (nb.D + 2 * gs.c) / 2;
        const tr = cylInternal({ P: d.P, R, S, E: 1 }).trCirc;
        const trc = coneInternal({ P: d.P, D: 2 * R, S, E: 1, alpha }).tr;
        junctions.push({ name: `${p.name || 'Cone'} / ${nb.name || 'shell'} (${end} end)`, ...coneJunction({ end, P: d.P, R, S, alpha, ts: gs.t, tc: gc.t, tr, trc }) });
      } catch (e) { junctions.push({ name: `${p.name} junction`, error: e.message }); }
    }
  });

  // Stiffening rings (UG-29)
  const rings = (model.rings || []).map(rg => {
    const host = placed.find(p => p.type === 'shell' && rg.z >= p.z0 && rg.z <= p.z1);
    if (!host || !(d.Pext > 0)) return { ...rg, skip: 'No host shell or no external pressure' };
    const zs = (model.rings || []).map(x => x.z).sort((a, b) => a - b);
    const idx = zs.indexOf(rg.z);
    const prevZ = idx > 0 ? zs[idx - 1] : host.z0;
    const nextZ = idx < zs.length - 1 ? zs[idx + 1] : host.z1;
    const Ls = rg.Ls || (nextZ - prevZ) / 2;
    return { ...rg, ...stiffenerRing({ material: rg.material || host.material, T: d.T, P: d.Pext, Do: host.D + 2 * host.t, t: cond(host, true).t, Ls, h: rg.h, w: rg.w }), Ls };
  });

  // ---------------- Nozzles ----------------
  const nozzles = (model.nozzles || []).map(n => {
    const host = placed.find(p => p.id === n.on) || placed[n.onIndex ?? -1];
    const r = { name: n.name || n.mark || 'Nozzle', mark: n.mark, n };
    if (!host) { r.error = `Host element "${n.on}" not found`; return r; }
    r.host = host.name;
    try {
      const g = cond(host, true);
      const head = staticHead(host, d, ovr, d.sg, level);
      const Dc = host.type === 'cone' ? Math.max(g.D1, g.D2) : g.D;
      const args = { n, host: { tEff: g.t, D: Dc, material: host.material, element: host }, T: d.T };
      r.calc = reinforcement({ ...args, P: d.P + head });
      r.mawp = nozzleMawp(args, 20000) - head;
      r.ok = r.calc.skip ? true : (r.calc.ok || r.calc.smallExempt) && r.calc.ug45.ok;
      if (n.flangeClass) {
        r.rating = flangeRating(n.flangeClass, d.T, getMaterial(n.flangeMaterial || 'SA-105').group === 'SS' ? '2.2' : '1.1');
        r.flangeMawp = r.rating - head;
        if (r.rating < d.P + head) { r.ok = false; warn(warnings, `${r.name}: Class ${n.flangeClass} flange rating ${r.rating.toFixed(0)} psi < design pressure`); }
      }
      if (host.type === 'head' && host.kind === 'ellipsoidal' && n.offset != null && Math.abs(n.offset) > 0.4 * host.D) {
        warn(warnings, `${r.name}: located outside the 80% central portion of the head — UG-37(a) spherical tr not applicable`);
      }
    } catch (e) { r.error = e.message; r.ok = false; }
    return r;
  });

  // ---------------- Body flanges (Appendix 2) ----------------
  const flanges = (model.flanges || []).map(f => {
    const r = { name: f.name || 'Flange' };
    try {
      r.calc = appendix2({ ...f, P: d.P, T: d.T, Tamb: d.Tamb });
      r.mawp = flangeMawp({ ...f, T: d.T, Tamb: d.Tamb });
      r.ok = r.calc.ok;
    } catch (e) { r.error = e.message; r.ok = false; }
    return r;
  });

  // ---------------- MAWP / MAP ----------------
  const cands = [];
  for (const e of elements) if (Number.isFinite(e.mawp)) cands.push({ what: e.name, P: e.mawp, map: e.map });
  for (const n of nozzles) {
    if (Number.isFinite(n.mawp) && !n.calc?.skip) cands.push({ what: `${n.name} (reinforcement)`, P: n.mawp });
    if (Number.isFinite(n.flangeMawp)) cands.push({ what: `${n.name} (Class ${n.n.flangeClass} flange)`, P: n.flangeMawp });
  }
  for (const f of flanges) if (Number.isFinite(f.mawp)) cands.push({ what: `${f.name} (App. 2)`, P: f.mawp });
  cands.sort((a, b) => a.P - b.P);
  const mawp = cands[0] || { what: '—', P: NaN };
  const maps = elements.filter(e => Number.isFinite(e.map)).map(e => ({ what: e.name, P: e.map })).sort((a, b) => a.P - b.P);
  const map = maps[0] || { what: '—', P: NaN };

  // ---------------- Hydrostatic test (UG-99) ----------------
  const mats = [...new Set([...placed.map(p => p.material), ...(model.nozzles || []).map(n => n.material)])];
  let LSR = Infinity, lsrMat = '';
  for (const m of mats) {
    try { const r = allowable(m, d.Tamb) / allowable(m, d.T); if (r < LSR) { LSR = r; lsrMat = m; } } catch { /* ignore */ }
  }
  const basis = d.hydroBasis === 'design' ? d.P : mawp.P;
  const hydro = { code: d.testType === 'pneumatic' ? 'UG-100' : 'UG-99(b)', LSR, lsrMat, basis };
  hydro.factor = d.testType === 'pneumatic' ? 1.1 : 1.3;
  hydro.Ptest = hydro.factor * basis * LSR;
  hydro.position = d.hydroPosition || 'horizontal'; // shop test is usually done horizontal
  hydro.elements = placed.map(p => {
    const head = d.testType === 'pneumatic' ? 0
      : WATER * (hydro.position === 'vertical' ? ovr.length - p.z0 : ovr.Dmax);
    const Pt = hydro.Ptest + head;
    // All code formulas give MAWP linear in S, so the membrane stress at Pt is Pt / MAWP(S = 1).
    const unit = internalFor({ ...p, E: 1, El: 1 }, 1, 1, false).mawp;
    const stress = Pt / unit;
    const Sy = getMaterial(p.material).Sy;
    return { name: p.name, Pt, stress, allow: 0.9 * Sy, ok: stress <= 0.9 * Sy };
  });

  // ---------------- MDMT (UCS-66) ----------------
  const mdmt = { required: d.MDMT, parts: [] };
  const mdmtPart = (name, material, tg, tr, tAvail, E = 1, c = 0) => {
    const m = getMaterial(material);
    if (m.group === 'SS') { mdmt.parts.push({ name, material, tg, mdmt: -320, note: 'UHA-51(d) austenitic — exempt to -320 °F' }); return; }
    if (!m.curve) return;
    const base = ucs66Mdmt(m.curve, tg);
    const ratio = Math.max(tr * E / Math.max(tAvail, 1e-6), 0);
    const red = ucs661Reduction(ratio);
    let val = Number.isFinite(red) ? base - red : -155;
    if (red > 0 && Number.isFinite(red)) val = Math.max(val, -55);
    if (val < -155) val = -155;
    // UG-20(f) blanket exemption
    const ug20f = ((m.curve === 'A' && tg <= 0.5) || (m.curve === 'B' && tg <= 1)) && d.MDMT >= -20;
    mdmt.parts.push({ name, material, curve: m.curve, tg, base, ratio, reduction: red, mdmt: ug20f ? Math.min(val, -20) : val, ug20f });
  };
  elements.forEach((e, i) => {
    const p = placed[i];
    if (e.error) return;
    mdmtPart(e.name, p.material, p.t, e.internal.tr, e.tAvail, p.E ?? 1, p.c);
  });
  nozzles.forEach(n => { if (n.calc && !n.calc.skip) mdmtPart(`${n.name} neck`, n.n.material, n.n.tn, n.calc.trn, n.calc.tn); });
  nozzles.forEach(n => { if (n.n.flangeClass && getMaterial(n.n.flangeMaterial || 'SA-105').group === 'CS') mdmt.parts.push({ name: `${n.name} flange`, material: n.n.flangeMaterial || 'SA-105', mdmt: -20, note: 'UCS-66(c) B16.5 flange exemption' }); });
  mdmt.computed = Math.max(...mdmt.parts.map(p => p.mdmt), -320);
  mdmt.governing = mdmt.parts.find(p => p.mdmt === mdmt.computed)?.name;
  mdmt.ok = mdmt.computed <= d.MDMT;

  // ---------------- Weights & volumes ----------------
  const ins = model.insulation || { t: 0, density: 0 };
  const per = placed.map(p => {
    const metal = elementMetalVolume(p) * density(p.material);
    const vol = elementVolume(p, { orientation: 'vertical', level: Infinity });
    const liquid = elementVolume(p, { orientation: d.orientation, level, Rmax: ovr.Dmax / 2 }) * WATER * (d.sg || 0);
    const water = vol * WATER;
    const insul = ins.t > 0 ? elementOuterArea(p) * ins.t * (ins.density || 0) / 1728 : 0;
    return { name: p.name, z0: p.z0, z1: p.z1, metal, vol, liquid, water, insul };
  });
  const nozW = (model.nozzles || []).map(n => {
    const host = placed.find(p => p.id === n.on);
    return { name: n.name, W: nozzleWeight(n), z: host ? (host.z0 + (n.z ?? host.len / 2)) : 0 };
  });
  const det = (model.details || []).map(x => ({ name: x.name, W: x.mass, z: x.z ?? 0, operatingOnly: x.operatingOnly }));
  const sum = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0);
  const weights = {
    shellsHeads: sum(per, 'metal'), nozzles: sum(nozW, 'W'), details: det.filter(x => !x.operatingOnly).reduce((s, x) => s + x.W, 0),
    detailsOp: det.filter(x => x.operatingOnly).reduce((s, x) => s + x.W, 0),
    insulation: sum(per, 'insul'), liquid: sum(per, 'liquid'), water: sum(per, 'water'), volume: sum(per, 'vol'),
  };
  weights.fabricated = weights.shellsHeads + weights.nozzles;
  weights.empty = weights.fabricated + weights.details + weights.insulation;
  weights.operating = weights.empty + weights.detailsOp + weights.liquid;
  weights.test = weights.fabricated + weights.details + weights.water;
  weights.per = per; weights.nozzleList = nozW; weights.detailList = det;

  // ---------------- Vertical: wind, seismic, longitudinal stress, skirt ----------------
  let wind = null, seismic = null, longitudinal = [], supports = null;
  const sup = model.supports || { type: 'none' };
  if (d.orientation === 'vertical') {
    const sk = sup.type === 'skirt' ? sup.skirt : null;
    const bottom = placed[0];
    const zOff = sk ? sk.height - (bottom.type === 'head' ? bottom.len : 0) : 0; // elevation of axis z=0
    const insT = ins.t || 0;
    // Stations: split each element (and skirt) into slices
    const stations = [];
    const NS = 4;
    const addW = (z0, z1, key) => {
      let W = 0;
      for (const x of nozW) if (x.z + zOff >= z0 && x.z + zOff < z1) W += x.W;
      for (const x of det) if ((key === 'op' || !x.operatingOnly) && x.z + zOff >= z0 && x.z + zOff < z1) W += x.W;
      return W;
    };
    if (sk) {
      const Rm = sk.D / 2 - sk.t / 2;
      for (let s = 0; s < NS; s++) {
        const z0 = s * sk.height / NS, z1 = (s + 1) * sk.height / NS;
        const Wm = Math.PI * 2 * Rm * sk.t * (z1 - z0) * 0.2836;
        stations.push({ name: 'Skirt', z0, z1, Dw: (sk.D + 2 * insT) * (model.wind?.Dmult || 1), Wempty: Wm, Wop: Wm, I: Math.PI * Rm ** 3 * sk.t });
      }
    }
    placed.forEach((p, i) => {
      const w = per[i];
      for (let s = 0; s < NS; s++) {
        const a = p.z0 + s * p.len / NS, b = p.z0 + (s + 1) * p.len / NS;
        const r = p.r((s + 0.5) * p.len / NS);
        const OD = 2 * (p.type === 'head' ? Math.max(r, 1e-3) : r) + 2 * p.t;
        const Rm = Math.max((OD - p.t) / 2, 0.5);
        const tc = Math.max(cond(p, true).t, 0.01);
        const base = (w.metal + w.insul) / NS;
        stations.push({
          name: p.name, z0: a + zOff, z1: b + zOff, Dw: (OD + 2 * insT) * (model.wind?.Dmult || 1),
          Wempty: base, Wop: base + w.liquid / NS, Wtest: w.metal / NS + w.water / NS,
          I: Math.PI * Rm ** 3 * tc, element: i,
        });
      }
    });
    stations.forEach(s => { s.Wempty += addW(s.z0, s.z1, 'empty'); s.Wop += addW(s.z0, s.z1, 'op'); });
    const Ebase = modulus(placed.find(p => p.type === 'shell')?.material || placed[0].material, d.T);
    const T = naturalPeriod(stations.map(s => ({ ...s, W: s.Wop })), Ebase);
    const Te = naturalPeriod(stations.map(s => ({ ...s, W: s.Wempty })), Ebase);
    const H = stations[stations.length - 1].z1;
    if (model.wind?.enabled) {
      wind = { input: model.wind, forces: windForces(stations, model.wind) };
      wind.base = shearMoment(wind.forces, 0);
    }
    if (model.seismic?.enabled) {
      const Wop = stations.reduce((a, s) => a + s.Wop, 0), We = stations.reduce((a, s) => a + s.Wempty, 0);
      const op = seismicForces(stations.map(s => ({ ...s, W: s.Wop })), Wop, T, model.seismic);
      const em = seismicForces(stations.map(s => ({ ...s, W: s.Wempty })), We, Te, model.seismic);
      seismic = { input: model.seismic, T, Te, op, empty: em, base: shearMoment(op.forces, 0), baseEmpty: shearMoment(em.forces, 0) };
    }
    const period = { T, Te, H };

    // Longitudinal stresses at the bottom of each cylindrical/conical element (UG-22/UG-23)
    const wAbove = (z, key) => stations.reduce((a, s) => a + (s.z0 >= z - 1e-9 ? s[key] : 0), 0);
    placed.forEach((p, i) => {
      if (p.type === 'head') return;
      const z = p.z0 + zOff;
      const gC = cond(p, true), gN = cond(p, false);
      const OD = (p.type === 'cone' ? p.D1 : p.D) + 2 * p.t;
      const S = allowable(p.material, d.T), Sa = allowable(p.material, d.Tamb);
      const Ec = p.El ?? p.E ?? 1;
      const mk = (label, P, t, Wkey, M, Sallow, Tm) => {
        const Ri = OD / 2 - t;            // inside radius in this condition
        const Rmean = Ri + t / 2;
        const W = wAbove(z, Wkey);
        const sp = P * Ri / (2 * t);
        const sw = -W / (2 * Math.PI * Rmean * t);
        const sb = M / (Math.PI * Rmean * Rmean * t);
        const Ro = OD / 2;
        const B = factorB(p.material, Tm, 0.125 / (Ro / t)).B;
        const tens = sp + sw + sb;
        const comp = Math.max(-(sp + sw - sb), 0); // magnitude of compression on the leeward side
        const occ = M > 0 ? 1.2 : 1.0;
        const allowT = occ * Sallow * Ec, allowC = occ * Math.min(B, Sallow);
        return { case: label, P, t, W, M, sp, sw, sb, tens, comp, allowT, allowC, B, ok: tens <= allowT && comp <= allowC };
      };
      const Mw = wind ? shearMoment(wind.forces, z).M : 0;
      const Ms = seismic ? shearMoment(seismic.op.forces, z).M : 0;
      const Mse = seismic ? shearMoment(seismic.empty.forces, z).M : 0;
      const cases = [mk('Operating (no lateral)', d.P, gC.t, 'Wop', 0, S, d.T)];
      if (wind) cases.push(mk('Operating + Wind', d.P, gC.t, 'Wop', Mw, S, d.T), mk('Empty + Wind (corroded, unpressurized)', 0, gC.t, 'Wempty', Mw, S, d.T));
      if (seismic) cases.push(mk('Operating + Seismic', d.P, gC.t, 'Wop', Ms, S, d.T), mk('Empty + Seismic', 0, gC.t, 'Wempty', Mse, S, d.T));
      if (d.Pext > 0) cases.push(mk('Vacuum + Operating', -d.Pext, gC.t, 'Wop', Math.max(Mw, Ms), S, d.T));
      cases.push(mk('Hydrotest (new, cold)', hydro.Ptest, gN.t, 'Wtest', wind ? 0.25 * shearMoment(wind.forces, z).M : 0, Math.min(0.9 * getMaterial(p.material).Sy, 1.3 * Sa), d.Tamb));
      longitudinal.push({ name: p.name, z, cases, ok: cases.every(c => c.ok) });
    });

    if (sk) {
      const Mbw = wind ? wind.base.M : 0, Mbs = seismic ? seismic.base.M : 0;
      const M = Math.max(Mbw, Mbs);
      const S = allowable(sk.material, d.T);
      const tsk = sk.t - (sk.c || 0);
      const Bc = factorB(sk.material, d.T, 0.125 / ((sk.D / 2) / tsk)).B;
      const Wop = stations.reduce((a, s) => a + s.Wop, 0), Wem = stations.reduce((a, s) => a + s.Wempty, 0);
      supports = {
        type: 'skirt', M, Mgov: Mbw >= Mbs ? 'wind' : 'seismic',
        calc: skirtBase({
          sk: { ...sk, t: tsk, S, Bc, boltS: allowable(sk.boltMaterial || 'SA-193-B7', 70) * (sk.boltFactor ?? 0.8) },
          M, W: Wop, Wmin: Wem,
        }),
      };
      supports.ok = supports.calc.ok;
    }
    wind && (wind.period = period);
    if (!wind && seismic) seismic.period = period;
    supports ||= { type: sup.type, period };
    supports.period = period;
  }

  // ---------------- Horizontal: saddles ----------------
  if (d.orientation === 'horizontal' && sup.type === 'saddles') {
    const sd = sup.saddles;
    const heads = placed.filter(p => p.type === 'head');
    const shells = placed.filter(p => p.type === 'shell');
    const main = shells.reduce((a, b) => (b.D > (a?.D || 0) ? b : a), null);
    if (main) {
      const tl0 = placed[0].type === 'head' ? placed[0].z1 - (placed[0].sf || 0) : 0;
      const last = placed[placed.length - 1];
      const tl1 = last.type === 'head' ? last.z0 + (last.sf || 0) : last.z1;
      const L = tl1 - tl0;
      const H = heads.length ? Math.max(...heads.map(h => h.depth || 0)) : 0;
      const gC = cond(main, true);
      const R = (gC.D + gC.t) / 2;
      const S = allowable(main.material, d.T);
      const Sy = yieldAt(main.material, d.T);
      const Bc = factorB(main.material, d.T, 0.125 / ((main.D / 2 + main.t) / gC.t)).B;
      const mk = (label, Wtot, P, t, Sx, Bx) => ({ case: label, ...zick({ Q: Wtot / 2, L, A: sd.A, H, R, t, theta: sd.theta || 120, b: sd.b || 8, P, S: Sx, E: main.El ?? main.E ?? 1, Sy, Bc: Bx, twear: sd.wearT || 0, Ewear: 1 }) });
      const Sa = allowable(main.material, d.Tamb);
      const cases = [
        mk('Operating', weights.operating, d.P, gC.t, S, Bc),
        mk('Hydrotest', weights.test, hydro.Ptest, cond(main, false).t, Math.min(0.9 * getMaterial(main.material).Sy, 1.3 * Sa), Bc * 1.2),
      ];
      supports = { type: 'saddles', L, H, R, cases, ok: cases.every(c => c.ok) };
    }
  }

  // ---------------- Summary ----------------
  const fails = [];
  elements.forEach(e => { if (e.error) fails.push(`${e.name}: ${e.error}`); else { if (!e.ok) fails.push(`${e.name}: thickness below required for internal pressure`); if (e.okExt === false) fails.push(`${e.name}: external pressure Pa < design`); } });
  junctions.forEach(j => { if (j.ok === false) fails.push(`${j.name}: App. 1-5 reinforcement inadequate`); });
  rings.forEach(r => { if (r.ok === false) fails.push(`Ring at z=${r.z}: insufficient moment of inertia`); });
  nozzles.forEach(n => { if (n.error) fails.push(`${n.name}: ${n.error}`); else if (!n.ok) fails.push(`${n.name}: reinforcement / UG-45 / rating check failed`); });
  flanges.forEach(f => { if (f.error) fails.push(`${f.name}: ${f.error}`); else if (!f.ok) fails.push(`${f.name}: Appendix 2 check failed`); });
  if (!mdmt.ok) fails.push(`MDMT: computed ${mdmt.computed.toFixed(0)} °F warmer than required ${d.MDMT} °F — impact testing required`);
  hydro.elements.forEach(h => { if (!h.ok) fails.push(`${h.name}: hydrotest stress exceeds 90% yield`); });
  longitudinal.forEach(l => { if (!l.ok) fails.push(`${l.name}: longitudinal stress check failed`); });
  if (supports && supports.ok === false) fails.push(`Supports (${supports.type}) check failed`);
  if (mawp.P < d.P) fails.push(`Vessel MAWP ${mawp.P.toFixed(1)} psi is below design pressure ${d.P} psi`);

  return {
    design: d, placed, overall: ovr, elements, junctions, rings, nozzles, flanges,
    mawp, map, mawpCandidates: cands, hydro, mdmt, weights, wind, seismic, longitudinal, supports,
    warnings, fails, ok: fails.length === 0,
  };
}

