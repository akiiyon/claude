// Vessel geometry: stacks elements along the axis, builds inside-radius
// profiles r(z), and integrates volumes, surface areas and weights.
import { density } from './materials.js';

const WATER = 0.036127; // lb/in³ (62.4 lb/ft³)

/** Inside depth of a head (from tangent line to apex), without straight flange. */
export function headDepth(el) {
  const R = el.D / 2;
  switch (el.kind) {
    case 'ellipsoidal': return el.D / (2 * (el.ratio || 2));
    case 'hemispherical': return R;
    case 'torispherical': {
      const L = el.crownR || el.D, r = el.knuckleR || 0.06 * L;
      return L - Math.sqrt((L - r) ** 2 - (R - r) ** 2);
    }
    case 'conical': return R / Math.tan((el.alpha || 30) * Math.PI / 180);
    case 'flat': return 0;
    default: throw new Error(`Unknown head kind ${el.kind}`);
  }
}

/** Inside radius of a head at distance z from its apex (0 … depth). */
function headRadius(el, z) {
  const R = el.D / 2, h = headDepth(el);
  if (z >= h) return R;
  switch (el.kind) {
    case 'ellipsoidal':
    case 'hemispherical': { const u = (h - z) / h; return R * Math.sqrt(Math.max(0, 1 - u * u)); }
    case 'torispherical': {
      const L = el.crownR || el.D, rk = el.knuckleR || 0.06 * L;
      const zk = L + L * (h - L) / (L - rk);
      if (z <= zk) return Math.sqrt(Math.max(0, L * L - (L - z) ** 2));
      return (R - rk) + Math.sqrt(Math.max(0, rk * rk - (h - z) ** 2));
    }
    case 'conical': return z * Math.tan((el.alpha || 30) * Math.PI / 180);
    default: return R;
  }
}

/** Axial span (inside) occupied by an element. */
export function elementLength(el) {
  if (el.type === 'head') return el.kind === 'flat' ? el.t : headDepth(el) + (el.sf || 0);
  return el.length;
}

/**
 * Lay out the elements along the axis. Heads at the first position face the
 * start, any other head faces the end. Returns placed elements with z0/z1 and
 * an r(zLocal) profile function (inside radius).
 */
export function layout(elements) {
  let z = 0;
  return elements.map((el, i) => {
    const len = elementLength(el);
    const placed = { ...el, index: i, z0: z, z1: z + len, len };
    if (el.type === 'head') {
      const facing = i === 0 ? 'start' : 'end';
      placed.facing = facing;
      const h = el.kind === 'flat' ? 0 : headDepth(el);
      placed.depth = h;
      placed.r = zl => {
        if (el.kind === 'flat') return el.D / 2;
        const fromApex = facing === 'start' ? zl : len - zl;
        return headRadius(el, fromApex);
      };
    } else if (el.type === 'cone') {
      placed.r = zl => el.D1 / 2 + (el.D2 / 2 - el.D1 / 2) * (zl / len);
    } else {
      placed.r = () => el.D / 2;
    }
    z += len;
    return placed;
  });
}

/** Circular-segment area of a circle radius r filled to depth h from its bottom. */
function segmentArea(r, h) {
  if (h <= 0) return 0;
  if (h >= 2 * r) return Math.PI * r * r;
  return r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(2 * r * h - h * h);
}

const SLICES = 200;

/**
 * Volume of an element, optionally only up to a liquid level.
 * vertical: level is axial height from the vessel bottom (z=0).
 * horizontal: level is height above the lowest inside point of the largest diameter.
 */
export function elementVolume(p, { orientation = 'vertical', level = Infinity, Rmax } = {}) {
  if (p.type === 'head' && p.kind === 'flat') return 0;
  let V = 0;
  const dz = p.len / SLICES;
  for (let i = 0; i < SLICES; i++) {
    const zl = (i + 0.5) * dz;
    const r = p.r(zl);
    if (orientation === 'vertical') {
      if (p.z0 + zl <= level) V += Math.PI * r * r * dz;
    } else {
      V += segmentArea(r, level - (Rmax - r)) * dz;
    }
  }
  return V;
}

/** Metal volume ≈ mid-surface area × thickness (nominal thickness). */
export function elementMetalVolume(p) {
  const t = p.t;
  if (p.type === 'head' && p.kind === 'flat') {
    const R = (p.D / 2) + (p.extension || 0);
    return Math.PI * R * R * t;
  }
  let A = 0;
  const dz = p.len / SLICES;
  let rPrev = p.r(0);
  for (let i = 1; i <= SLICES; i++) {
    const r = p.r(i * dz);
    const ds = Math.hypot(dz, r - rPrev);
    A += 2 * Math.PI * ((r + rPrev) / 2 + t / 2) * ds;
    rPrev = r;
  }
  // Apex disc for heads whose profile starts at r=0 is already integrated.
  return A * t;
}

/** Outside surface area of an element (for insulation / painting). */
export function elementOuterArea(p) {
  if (p.type === 'head' && p.kind === 'flat') return Math.PI * (p.D / 2 + p.t) ** 2;
  let A = 0;
  const dz = p.len / SLICES;
  let rPrev = p.r(0);
  for (let i = 1; i <= SLICES; i++) {
    const r = p.r(i * dz);
    A += 2 * Math.PI * ((r + rPrev) / 2 + p.t) * Math.hypot(dz, r - rPrev);
    rPrev = r;
  }
  return A;
}

/** Nozzle neck + pad + flange weight estimate (lb). */
export function nozzleWeight(n) {
  const rho = 0.2836;
  const neck = Math.PI / 4 * (n.OD ** 2 - (n.OD - 2 * n.tn) ** 2) * ((n.projection || 6) + (n.internal || 0));
  const pad = n.padOD > 0 && n.padT > 0 ? Math.PI / 4 * (n.padOD ** 2 - n.OD ** 2) * n.padT : 0;
  // Flange: rough B16.5 weld-neck weight correlation (lb) by NPS and class.
  const cls = n.flangeClass || 0;
  const flange = cls ? 1.6 * n.OD ** 1.85 * (1 + cls / 600) : 0;
  return (neck + pad) * rho + flange;
}

export { WATER };

/** Overall dimensions summary. */
export function overall(placed) {
  const len = placed.length ? placed[placed.length - 1].z1 : 0;
  const Dmax = Math.max(...placed.map(p => (p.type === 'cone' ? Math.max(p.D1, p.D2) : p.D)));
  return { length: len, Dmax };
}

export function weightOf(p) { return elementMetalVolume(p) * density(p.material); }
