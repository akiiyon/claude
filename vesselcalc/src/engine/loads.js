// Wind and seismic loads on vertical vessels (ASCE 7 style, simplified),
// shear/moment distribution along the height, and natural period.

const EXPOSURE = { B: { alpha: 7.0, zg: 1200 }, C: { alpha: 9.5, zg: 900 }, D: { alpha: 11.5, zg: 700 } };

/** Velocity pressure exposure coefficient Kz (ASCE 7-16 Table 26.10-1 formula). z in ft. */
export function Kz(zft, exposure = 'C') {
  const { alpha, zg } = EXPOSURE[exposure] || EXPOSURE.C;
  const z = Math.max(zft, 15);
  return 2.01 * Math.pow(Math.min(z, zg) / zg, 2 / alpha);
}

/**
 * Discretize the vessel into stations along height and compute wind forces.
 * stations: [{ z0, z1, Dw (wind diameter, in) }] measured from grade (in).
 * wind: { V (mph), exposure, Kzt, Kd, Ke, G, Cf }
 * Returns per-station force (lbf) and resultant shear/moment at any elevation.
 */
export function windForces(stations, wind) {
  const { V = 115, exposure = 'C', Kzt = 1, Kd = 0.95, Ke = 1, G = 0.85, Cf = 0.7 } = wind;
  return stations.map(s => {
    const zMid = (s.z0 + s.z1) / 2 / 12;
    const qz = 0.00256 * Kz(zMid, exposure) * Kzt * Kd * Ke * V * V; // psf
    const area = (s.z1 - s.z0) * s.Dw / 144;                          // ft²
    const F = qz * G * Cf * area;
    return { ...s, qz, F, zc: (s.z0 + s.z1) / 2 };
  });
}

/** Rayleigh natural period of a cantilevered vessel (s). */
export function naturalPeriod(stations, E) {
  // Rayleigh method on a discretized cantilever: deflection from unit-gravity lateral load.
  const n = stations.length;
  if (!n) return 0;
  const g = 386.09;
  const w = stations.map(s => s.W);           // lb per station
  const z = stations.map(s => (s.z0 + s.z1) / 2);
  // Deflections by unit-load method: y_i = Σ_j F_j ∫ M_i M_j /(EI)
  const F = w.slice();
  // Integrate curvature along height using station EI
  const H = stations[n - 1].z1;
  const steps = 400;
  let th = 0, y = 0;
  const yAt = [];
  let k = 0;
  for (let i = 0; i < steps; i++) {
    const zz = (i + 0.5) * H / steps;
    while (k < n - 1 && zz > stations[k].z1) k++;
    let M = 0;
    for (let j = 0; j < n; j++) if (z[j] > zz) M += F[j] * (z[j] - zz);
    const EI = E * stations[k].I;
    th += M / EI * (H / steps);
    y += th * (H / steps);
    yAt.push([zz, y]);
  }
  const yi = z.map(zz => { const idx = Math.min(steps - 1, Math.floor(zz / H * steps)); return yAt[idx][1]; });
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += w[i] * yi[i] * yi[i]; den += F[i] * yi[i]; }
  return 2 * Math.PI * Math.sqrt(num / (g * den));
}

/**
 * ASCE 7 equivalent lateral force for a vessel (nonbuilding structure).
 * seismic: { SDS, SD1, R, Ie, TL }
 */
export function seismicForces(stations, Wtotal, T, seismic) {
  const { SDS = 0.5, SD1 = 0.2, R = 2, Ie = 1, TL = 8 } = seismic;
  let Cs = SDS / (R / Ie);
  const CsMax = T <= TL ? SD1 / (T * (R / Ie)) : SD1 * TL / (T * T * (R / Ie));
  Cs = Math.min(Cs, CsMax);
  const CsMin = Math.max(0.044 * SDS * Ie, 0.01);
  Cs = Math.max(Cs, CsMin);
  const V = Cs * Wtotal;
  const k = T <= 0.5 ? 1 : T >= 2.5 ? 2 : 1 + (T - 0.5) / 2;
  const sum = stations.reduce((a, s) => a + s.W * Math.pow((s.z0 + s.z1) / 2, k), 0);
  const forces = stations.map(s => ({ ...s, zc: (s.z0 + s.z1) / 2, F: V * s.W * Math.pow((s.z0 + s.z1) / 2, k) / sum }));
  return { Cs, CsMax, CsMin, V, k, forces, vertical: 0.2 * SDS };
}

/** Shear (lbf) and overturning moment (in-lbf) at elevation z from a list of {zc, F}. */
export function shearMoment(forces, z) {
  let V = 0, M = 0;
  for (const f of forces) if (f.zc > z) { V += f.F; M += f.F * (f.zc - z); }
  return { V, M };
}
