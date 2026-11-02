// Code tables used by the engine. Values are representative for learning;
// verify against the governing code edition before real use.
import { interp } from './materials.js';

// ASME VIII-1 Table 2-5.1 (subset): gasket factor m and seating stress y (psi).
export const GASKETS = [
  { id: 'self', name: 'Self-energizing (O-ring, metallic, elastomer)', m: 0, y: 0 },
  { id: 'elast-lt75', name: 'Elastomer without fabric, <75 Shore A', m: 0.5, y: 0 },
  { id: 'elast-ge75', name: 'Elastomer without fabric, ≥75 Shore A', m: 1.0, y: 200 },
  { id: 'cnaf-1-8', name: 'Compressed fiber sheet, 1/8 in thick', m: 2.0, y: 1600 },
  { id: 'cnaf-1-16', name: 'Compressed fiber sheet, 1/16 in thick', m: 2.75, y: 3700 },
  { id: 'cnaf-1-32', name: 'Compressed fiber sheet, 1/32 in thick', m: 3.5, y: 6500 },
  { id: 'spiral-cs', name: 'Spiral-wound metal, CS winding, filled', m: 2.5, y: 10000 },
  { id: 'spiral-ss', name: 'Spiral-wound metal, SS / Monel winding, filled', m: 3.0, y: 10000 },
  { id: 'corr-soft-iron', name: 'Corrugated metal, soft iron / soft steel', m: 3.0, y: 4500 },
  { id: 'jacket-soft-iron', name: 'Flat metal jacketed, soft iron / soft steel', m: 3.75, y: 7600 },
  { id: 'jacket-ss', name: 'Flat metal jacketed, SS 4–6% Cr', m: 3.75, y: 9000 },
  { id: 'solid-soft-iron', name: 'Solid flat metal, soft iron / soft steel', m: 5.5, y: 18000 },
  { id: 'solid-ss', name: 'Solid flat metal, stainless steel', m: 6.5, y: 26000 },
  { id: 'rtj-soft-iron', name: 'Ring joint, iron / soft steel', m: 5.5, y: 18000 },
  { id: 'rtj-ss', name: 'Ring joint, stainless steel', m: 6.5, y: 26000 },
];

// Bolt root areas (in²): coarse thread to 1 in, 8-UN series above.
export const BOLT_ROOT_AREA = {
  0.5: 0.126, 0.625: 0.202, 0.75: 0.302, 0.875: 0.419, 1.0: 0.551, 1.125: 0.728,
  1.25: 0.929, 1.375: 1.155, 1.5: 1.405, 1.625: 1.680, 1.75: 1.980, 1.875: 2.304,
  2.0: 2.652, 2.25: 3.423, 2.5: 4.292, 2.75: 5.259, 3.0: 6.324,
};

export function boltRootArea(d) {
  const keys = Object.keys(BOLT_ROOT_AREA).map(Number);
  const k = keys.find(x => Math.abs(x - d) < 1e-6);
  if (k != null) return BOLT_ROOT_AREA[k];
  // Fallback: root diameter ≈ d - 1.3/n with 8 TPI.
  const dr = d - 1.3 / 8;
  return Math.PI / 4 * dr * dr;
}

// Nominal pipe: OD and wall thickness by schedule (in).
export const PIPE = {
  '0.5':  { OD: 0.840,  STD: 0.109, XS: 0.147, '40': 0.109, '80': 0.147, '160': 0.188 },
  '0.75': { OD: 1.050,  STD: 0.113, XS: 0.154, '40': 0.113, '80': 0.154, '160': 0.219 },
  '1':    { OD: 1.315,  STD: 0.133, XS: 0.179, '40': 0.133, '80': 0.179, '160': 0.250 },
  '1.5':  { OD: 1.900,  STD: 0.145, XS: 0.200, '40': 0.145, '80': 0.200, '160': 0.281 },
  '2':    { OD: 2.375,  STD: 0.154, XS: 0.218, '40': 0.154, '80': 0.218, '160': 0.344 },
  '3':    { OD: 3.500,  STD: 0.216, XS: 0.300, '40': 0.216, '80': 0.300, '160': 0.438 },
  '4':    { OD: 4.500,  STD: 0.237, XS: 0.337, '40': 0.237, '80': 0.337, '160': 0.531 },
  '6':    { OD: 6.625,  STD: 0.280, XS: 0.432, '40': 0.280, '80': 0.432, '160': 0.719 },
  '8':    { OD: 8.625,  STD: 0.322, XS: 0.500, '40': 0.322, '80': 0.500, '160': 0.906 },
  '10':   { OD: 10.750, STD: 0.365, XS: 0.500, '40': 0.365, '80': 0.594, '160': 1.125 },
  '12':   { OD: 12.750, STD: 0.375, XS: 0.500, '40': 0.406, '80': 0.688, '160': 1.312 },
  '14':   { OD: 14.000, STD: 0.375, XS: 0.500, '40': 0.438, '80': 0.750, '160': 1.406 },
  '16':   { OD: 16.000, STD: 0.375, XS: 0.500, '40': 0.500, '80': 0.844, '160': 1.594 },
  '18':   { OD: 18.000, STD: 0.375, XS: 0.500, '40': 0.562, '80': 0.938, '160': 1.781 },
  '20':   { OD: 20.000, STD: 0.375, XS: 0.500, '40': 0.594, '80': 1.031, '160': 1.969 },
  '24':   { OD: 24.000, STD: 0.375, XS: 0.500, '40': 0.688, '80': 1.219, '160': 2.344 },
};

/** Standard-wall thickness for UG-45 (b)(4); pipes above 24 NPS use 0.375. */
export function stdWall(OD) {
  const e = Object.values(PIPE).find(p => Math.abs(p.OD - OD) < 0.01);
  if (e) return e.STD;
  if (OD > 24) return 0.375;
  // Interpolate between listed sizes for non-standard ODs.
  const list = Object.values(PIPE).sort((a, b) => a.OD - b.OD);
  return interp(list.map(p => p.OD), list.map(p => p.STD), OD);
}

// ASME B16.5 Material Group 1.1 (e.g. A105, A516-70) pressure–temperature ratings (psig).
export const B165_GROUP_1_1 = {
  temps: [100, 200, 300, 400, 500, 600, 650, 700, 750, 800],
  150:  [285, 260, 230, 200, 170, 140, 125, 110, 95, 80],
  300:  [740, 680, 655, 635, 605, 570, 550, 530, 505, 410],
  600:  [1480, 1360, 1310, 1265, 1205, 1135, 1100, 1060, 1015, 825],
  900:  [2220, 2035, 1965, 1900, 1810, 1705, 1650, 1590, 1520, 1235],
  1500: [3705, 3395, 3270, 3170, 3015, 2840, 2745, 2665, 2535, 2055],
  2500: [6170, 5655, 5450, 5280, 5025, 4730, 4575, 4425, 4230, 3430],
};
// Group 2.2 (316 / F316).
export const B165_GROUP_2_2 = {
  temps: [100, 200, 300, 400, 500, 600, 650, 700, 750, 800],
  150:  [275, 235, 215, 195, 170, 140, 125, 110, 95, 80],
  300:  [720, 620, 560, 515, 480, 450, 440, 435, 425, 420],
  600:  [1440, 1240, 1120, 1025, 955, 900, 885, 870, 855, 845],
  900:  [2160, 1860, 1680, 1540, 1435, 1355, 1325, 1305, 1280, 1265],
  1500: [3600, 3095, 2795, 2570, 2390, 2255, 2210, 2170, 2135, 2110],
  2500: [6000, 5160, 4660, 4280, 3980, 3760, 3680, 3620, 3560, 3520],
};

export function flangeRating(cls, tempF, group = '1.1') {
  const t = group === '2.2' ? B165_GROUP_2_2 : B165_GROUP_1_1;
  const row = t[cls];
  if (!row) throw new Error(`Unknown flange class ${cls}`);
  return interp(t.temps, row, Math.max(tempF, 100));
}

// Fig. UCS-66 impact-test exemption curves (MDMT °F vs governing thickness in).
const UCS66 = {
  t: [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1.0,
      1.125, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0],
  A: [18, 18, 18, 25, 32, 37, 43, 48, 53, 57, 61, 65, 68, 75, 80, 90, 98, 106, 114, 120, 120],
  B: [-20, -20, -20, -13, -7, -1, 5, 10, 15, 19, 23, 27, 31, 37, 43, 51, 59, 66, 76, 85, 93],
  C: [-55, -55, -55, -40, -32, -26, -22, -18, -15, -12, -9, -6, -3, 2, 7, 15, 24, 30, 40, 48, 55],
  D: [-55, -55, -55, -55, -55, -51, -48, -45, -42, -39, -36, -33, -30, -26, -22, -14, -7, -1, 10, 18, 26],
};

export function ucs66Mdmt(curve, tg) {
  if (!UCS66[curve]) return null;
  return interp(UCS66.t, UCS66[curve], Math.max(tg, 0.25));
}

// Fig. UCS-66.1 reduction in MDMT (°F) vs stress ratio Rts.
const UCS661 = { r: [0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], dT: [140, 105, 70, 45, 30, 20, 10, 0] };
export function ucs661Reduction(ratio) {
  if (ratio <= 0.35) return Infinity; // exempt down to -155 °F (UCS-66(b)(3))
  if (ratio >= 1) return 0;
  return interp(UCS661.r, UCS661.dT, ratio);
}

// Appendix 1-5 cone-to-cylinder junction Δ tables (degrees) vs P/(Ss·E1).
const CONE_LARGE = { r: [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009], d: [11, 15, 18, 21, 23, 25, 27, 28.5, 30] };
const CONE_SMALL = { r: [0.002, 0.005, 0.010, 0.02, 0.04, 0.08, 0.10, 0.125], d: [4, 6, 9, 12.5, 17.5, 24, 27, 30] };
export function coneDelta(end, ratio) {
  const tb = end === 'large' ? CONE_LARGE : CONE_SMALL;
  if (ratio >= tb.r[tb.r.length - 1]) return tb.d[tb.d.length - 1];
  return interp(tb.r, tb.d, ratio);
}

// Table UG-33.1: equivalent spherical radius factor K1 for ellipsoidal heads vs D/2h.
const K1 = { r: [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0], k: [0.50, 0.57, 0.65, 0.73, 0.81, 0.90, 0.99, 1.08, 1.18, 1.27, 1.36] };
export function ellipsoidalK1(ratio) { return interp(K1.r, K1.k, ratio); }
