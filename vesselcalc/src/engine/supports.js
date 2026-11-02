// Supports: horizontal vessel saddles (L.P. Zick method) and vertical vessel
// skirt / base ring / anchor bolts.

const rad = d => d * Math.PI / 180;

/**
 * Zick analysis. Q = load per saddle (lbf), L = tangent-to-tangent length,
 * A = tangent to saddle centerline, H = head depth, R = mean radius, t = shell
 * thickness (corroded), theta = saddle contact angle (deg), b = saddle width,
 * P = internal pressure, S = shell allowable, E = joint efficiency,
 * Sy = yield, Bc = compressive allowable (Factor B), ring = has stiffener ring in plane of saddle.
 */
export function zick({ Q, L, A, H, R, t, theta = 120, b = 8, P = 0, S, E = 1, Sy, Bc, Ewear = 0, twear = 0 }) {
  const beta = rad(theta) / 2;              // half contact angle measured from bottom
  const Rt = Math.sqrt(R * t);
  const out = { code: 'Zick (1951/1971)', Q };

  // Longitudinal bending
  const denom = 1 + 4 * H / (3 * L);
  out.M1 = -Q * A * (1 - (1 - A / L + (R * R - H * H) / (2 * A * L)) / denom);
  out.M2 = Q * L / 4 * ((1 + 2 * (R * R - H * H) / (L * L)) / denom - 4 * A / L);

  // K factors (unstiffened shell, A > R/2 assumed → head not stiffening)
  const delta = rad(5 * theta / 12 + 30);
  const sD = Math.sin(delta), cD = Math.cos(delta);
  out.K1 = (delta + sD * cD - 2 * sD * sD / delta) / (Math.PI * (sD / delta - cD));
  const alpha = 0.95 * (Math.PI - beta);
  const sa = Math.sin(alpha), ca = Math.cos(alpha);
  // Unstiffened shell; when A ≤ R/2 the head stiffens the shell and this value is conservative.
  out.K2 = sa / (Math.PI - alpha + sa * ca);
  out.headStiffened = A <= R / 2;
  // Horn (K3 per Zick, a.k.a. K6 in some texts)
  const bb = Math.PI - beta;
  const sb = Math.sin(bb), cb = Math.cos(bb);
  const num = 3 * cb / 4 * (sb / bb) ** 2 - 5 * sb * cb * cb / (4 * bb) + cb ** 3 / 2 - sb / (4 * bb) + cb / 4
    - bb * sb * ((sb / bb) ** 2 - 0.5 - Math.sin(2 * bb) / (4 * bb));
  const den = 2 * Math.PI * ((sb / bb) ** 2 - 0.5 - Math.sin(2 * bb) / (4 * bb));
  out.K3 = Math.abs(num / den);
  out.K5 = (1 + ca) / (Math.PI - alpha + sa * ca);

  const Ppress = P * R / (2 * t);
  // Longitudinal stresses
  out.S1mid_t = Ppress + out.M2 / (Math.PI * R * R * t);
  out.S1mid_c = -out.M2 / (Math.PI * R * R * t);
  out.S1sad_t = Ppress - out.M1 / (out.K1 * Math.PI * R * R * t);
  out.S1sad_c = out.M1 / (out.K1 * Math.PI * R * R * t);
  // Tangential shear
  out.S2 = out.K2 * Q / (R * t) * ((L - 2 * A) / (L + 4 * H / 3));
  // Circumferential at horn (wear plate adds thickness if it extends ≥ R/10 above horn)
  const th = t + twear;
  out.S4 = L >= 8 * R
    ? -Q / (4 * th * (b + 1.56 * Rt)) - 3 * out.K3 * Q / (2 * th * th)
    : -Q / (4 * th * (b + 1.56 * Rt)) - 12 * out.K3 * Q * R / (L * th * th);
  // Ring compression at the bottom of the shell
  out.S5 = out.K5 * Q / ((t + Ewear * twear) * (b + 1.56 * Rt));

  out.checks = [
    { name: 'Long. stress midspan (tension)', value: out.S1mid_t, allow: S * E },
    { name: 'Long. stress midspan (compr.)', value: Math.abs(out.S1mid_c), allow: Bc },
    { name: 'Long. stress at saddle (tension)', value: out.S1sad_t, allow: S * E },
    { name: 'Long. stress at saddle (compr.)', value: Math.abs(out.S1sad_c), allow: Bc },
    { name: 'Tangential shear', value: Math.abs(out.S2), allow: 0.8 * S },
    { name: 'Circumferential at horn', value: Math.abs(out.S4), allow: 1.5 * S },
    { name: 'Ring compression in web', value: Math.abs(out.S5), allow: 0.5 * Sy },
  ];
  out.ok = out.checks.every(c => c.value <= c.allow);
  return out;
}

/**
 * Skirt + base ring + anchor bolts.
 * sk: { D (skirt OD), t, material allowable S, E (weld efficiency), Bc,
 *       nBolts, boltDia (in), boltCircle, boltS (allowable bolt stress),
 *       baseOD, baseID, baseS (allowable bending), fc (concrete allowable bearing) }
 * M overturning moment at base (in-lbf), W weight (lbf).
 */
export function skirtBase({ sk, M, W, Wmin }) {
  const R = sk.D / 2 - sk.t / 2;
  const area = 2 * Math.PI * R * sk.t;
  const Z = Math.PI * R * R * sk.t;
  const out = { code: 'Skirt / base ring' };
  out.skirtComp = M / Z + W / area;
  out.skirtTens = M / Z - Wmin / area;
  out.skirtAllowT = sk.S * (sk.E || 0.7) * 1.2;
  out.skirtAllowC = Math.min(sk.Bc, sk.S) * 1.2;
  // Anchor bolts (rigid base plate, neutral axis at center — common simplified approach)
  const n = sk.nBolts, BC = sk.boltCircle;
  out.boltLoad = 4 * M / (n * BC) - Wmin / n;
  const rootA = Math.PI / 4 * (sk.boltDia - 1.3 / (sk.boltDia >= 1 ? 8 : 10)) ** 2;
  out.boltRootArea = rootA;
  out.boltStress = Math.max(out.boltLoad, 0) / rootA;
  out.boltReqArea = Math.max(out.boltLoad, 0) / sk.boltS;
  // Base ring bearing on concrete
  const Ab = Math.PI / 4 * (sk.baseOD ** 2 - sk.baseID ** 2);
  const Zb = Math.PI / 32 * (sk.baseOD ** 4 - sk.baseID ** 4) / sk.baseOD;
  out.bearing = W / Ab + M / Zb;
  const l = Math.max((sk.baseOD - sk.D) / 2, (sk.D - sk.baseID) / 2);
  out.baseOverhang = l;
  out.baseReqT = l * Math.sqrt(3 * out.bearing / sk.baseS);
  out.checks = [
    { name: 'Skirt compressive stress', value: out.skirtComp, allow: out.skirtAllowC },
    { name: 'Skirt tensile stress', value: Math.max(out.skirtTens, 0), allow: out.skirtAllowT },
    { name: 'Anchor bolt stress', value: out.boltStress, allow: sk.boltS },
    { name: 'Concrete bearing', value: out.bearing, allow: sk.fc },
    { name: 'Base ring thickness (req ≤ actual)', value: out.baseReqT, allow: sk.baseT, kind: 'length' },
  ];
  out.ok = out.checks.every(c => c.value <= c.allow);
  return out;
}
