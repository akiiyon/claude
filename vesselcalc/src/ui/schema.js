// Field definitions that drive every input form. `kind` selects unit conversion.
import { MATERIALS } from '../engine/materials.js';
import { GASKETS } from '../engine/tables.js';

const plate = MATERIALS.filter(m => m.group !== 'BOLT').map(m => [m.id, `${m.id} — ${m.form}`]);
const bolts = MATERIALS.filter(m => m.group === 'BOLT').map(m => [m.id, m.id]);
const forg = MATERIALS.filter(m => m.form === 'Forging').map(m => [m.id, m.id]);

const common = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'material', label: 'Material', type: 'select', options: plate, help: 'Allowable stress S is interpolated at the design temperature (ASME II-D Table 1A style data).' },
  { key: 't', label: 'Nominal thickness', kind: 'length', help: 'Ordered (nominal) thickness. For formed heads, use the minimum thickness after forming.' },
  { key: 'c', label: 'Corrosion allowance (int.)', kind: 'length' },
  { key: 'cExt', label: 'Corrosion allowance (ext.)', kind: 'length' },
  { key: 'ut', label: 'Mill undertolerance (fraction)', kind: 'ratio', help: 'UG-16(c): pipe is typically 0.125 (12.5%). Plate is 0 (up to 0.01 in or 6% is permitted without adjustment).' },
  { key: 'E', label: 'Joint efficiency E', kind: 'ratio', help: 'UW-12: 1.0 full RT, 0.85 spot RT, 0.70 no RT (Type 1 butt welds). Seamless heads use 1.0.' },
];

export const FIELDS = {
  design: [
    { key: 'orientation', label: 'Orientation', type: 'select', options: [['vertical', 'Vertical'], ['horizontal', 'Horizontal']] },
    { key: 'P', label: 'Internal design pressure', kind: 'pressure', help: 'Gauge pressure at the top of the vessel. Liquid static head is added per element.' },
    { key: 'T', label: 'Design temperature', kind: 'temperature' },
    { key: 'Pext', label: 'External design pressure', kind: 'pressure', help: 'Full vacuum = 15 psi (0.103 MPa). Set 0 if not required.' },
    { key: 'MDMT', label: 'Required MDMT', kind: 'temperature', help: 'Minimum design metal temperature (UG-20(b)). Checked against UCS-66 exemption curves.' },
    { key: 'Tamb', label: 'Ambient / test temperature', kind: 'temperature' },
    { key: 'sg', label: 'Liquid specific gravity', kind: 'ratio' },
    { key: 'level', label: 'Liquid level', kind: 'length', help: 'Vertical: height above the bottom of the bottom head. Horizontal: height above the inside bottom.' },
    { key: 'testType', label: 'Pressure test', type: 'select', options: [['hydro', 'Hydrostatic (UG-99)'], ['pneumatic', 'Pneumatic (UG-100)']] },
    { key: 'hydroPosition', label: 'Test position', type: 'select', options: [['horizontal', 'Horizontal (shop)'], ['vertical', 'Vertical (field)']] },
    { key: 'hydroBasis', label: 'Test pressure basis', type: 'select', options: [['mawp', 'Calculated MAWP'], ['design', 'Design pressure']] },
  ],
  shell: [
    ...common,
    { key: 'D', label: 'Inside diameter', kind: 'length' },
    { key: 'length', label: 'Length', kind: 'length' },
    { key: 'El', label: 'Circ. seam efficiency', kind: 'ratio', help: 'Used for longitudinal stress (UG-27(c)(2)).' },
    { key: 'extLength', label: 'Ext. design length override', kind: 'length', help: 'Leave 0 to compute from heads, cones and stiffening rings (UG-28(b)).' },
  ],
  head: [
    ...common,
    { key: 'kind', label: 'Head type', type: 'select', options: [['ellipsoidal', 'Ellipsoidal'], ['torispherical', 'Torispherical (F&D)'], ['hemispherical', 'Hemispherical'], ['conical', 'Conical'], ['flat', 'Flat (UG-34)']] },
    { key: 'D', label: 'Inside diameter', kind: 'length' },
    { key: 'sf', label: 'Straight flange', kind: 'length', show: e => e.kind !== 'flat' },
    { key: 'ratio', label: 'Aspect ratio D/2h', kind: 'ratio', show: e => e.kind === 'ellipsoidal' },
    { key: 'crownR', label: 'Crown radius L (inside)', kind: 'length', show: e => e.kind === 'torispherical' },
    { key: 'knuckleR', label: 'Knuckle radius r (inside)', kind: 'length', show: e => e.kind === 'torispherical' },
    { key: 'alpha', label: 'Half-apex angle α', kind: 'angle', show: e => e.kind === 'conical' },
    { key: 'C', label: 'Attachment factor C', kind: 'ratio', show: e => e.kind === 'flat', help: 'Fig. UG-34: 0.33 for (d) integral, 0.30 for bolted covers, 0.17 for forged/welded (a) etc.' },
  ],
  cone: [
    ...common,
    { key: 'D1', label: 'Inside dia. at start', kind: 'length' },
    { key: 'D2', label: 'Inside dia. at end', kind: 'length' },
    { key: 'length', label: 'Axial length', kind: 'length' },
  ],
  nozzle: [
    { key: 'mark', label: 'Mark', type: 'text' },
    { key: 'name', label: 'Description', type: 'text' },
    { key: 'on', label: 'Attached to', type: 'select', options: [] },
    { key: 'z', label: 'Position from element start', kind: 'length', help: 'Axial distance from the start of the host element (shells/cones).' },
    { key: 'offset', label: 'Radial offset (heads)', kind: 'length', help: 'Distance from head centerline. Keep within 0.4·D for ellipsoidal heads (80% central portion).' },
    { key: 'angle', label: 'Orientation angle', kind: 'angle' },
    { key: 'material', label: 'Neck material', type: 'select', options: plate },
    { key: 'OD', label: 'Neck outside diameter', kind: 'length' },
    { key: 'tn', label: 'Neck nominal thickness', kind: 'length' },
    { key: 'ut', label: 'Neck undertolerance', kind: 'ratio' },
    { key: 'c', label: 'Neck corrosion', kind: 'length' },
    { key: 'projection', label: 'External projection', kind: 'length' },
    { key: 'internal', label: 'Internal projection', kind: 'length' },
    { key: 'padOD', label: 'Pad outside diameter', kind: 'length', help: '0 = no reinforcing pad.' },
    { key: 'padT', label: 'Pad thickness', kind: 'length' },
    { key: 'padMaterial', label: 'Pad material', type: 'select', options: plate },
    { key: 'leg41', label: 'Weld leg 41 (nozzle–shell/pad)', kind: 'length' },
    { key: 'leg42', label: 'Weld leg 42 (pad OD)', kind: 'length' },
    { key: 'leg43', label: 'Weld leg 43 (inside)', kind: 'length' },
    { key: 'flangeClass', label: 'B16.5 flange class', type: 'select', options: [[0, 'None'], [150, '150'], [300, '300'], [600, '600'], [900, '900'], [1500, '1500'], [2500, '2500']] },
    { key: 'flangeMaterial', label: 'Flange material', type: 'select', options: forg },
  ],
  flange: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'type', label: 'Flange type', type: 'select', options: [['integral', 'Integral (weld neck)'], ['loose', 'Loose ring (no hub)']] },
    { key: 'material', label: 'Flange material', type: 'select', options: plate },
    { key: 'A', label: 'Flange OD (A)', kind: 'length' },
    { key: 'B', label: 'Flange ID (B)', kind: 'length' },
    { key: 'C', label: 'Bolt circle (C)', kind: 'length' },
    { key: 't', label: 'Flange thickness (t)', kind: 'length' },
    { key: 'g0', label: 'Hub thickness at small end (g0)', kind: 'length' },
    { key: 'g1', label: 'Hub thickness at back of flange (g1)', kind: 'length' },
    { key: 'h', label: 'Hub length (h)', kind: 'length' },
    { key: 'nBolts', label: 'Number of bolts', kind: 'ratio' },
    { key: 'boltDia', label: 'Bolt nominal diameter', kind: 'length' },
    { key: 'boltMaterial', label: 'Bolt material', type: 'select', options: bolts },
    { key: 'gasket', label: 'Gasket', type: 'select', options: GASKETS.map(g => [g.id, `${g.name} (m=${g.m}, y=${g.y})`]) },
    { key: 'gOD', label: 'Gasket contact OD', kind: 'length' },
    { key: 'gID', label: 'Gasket contact ID', kind: 'length' },
    { key: 'c', label: 'Corrosion allowance', kind: 'length' },
  ],
  ring: [
    { key: 'z', label: 'Axial position (from vessel start)', kind: 'length' },
    { key: 'h', label: 'Bar height (radial)', kind: 'length' },
    { key: 'w', label: 'Bar thickness (axial)', kind: 'length' },
    { key: 'material', label: 'Material', type: 'select', options: plate },
  ],
  detail: [
    { key: 'name', label: 'Description', type: 'text' },
    { key: 'mass', label: 'Weight', kind: 'mass' },
    { key: 'z', label: 'Axial position (from vessel start)', kind: 'length' },
    { key: 'operatingOnly', label: 'Operating only (e.g. tray liquid)', type: 'checkbox' },
  ],
  insulation: [
    { key: 't', label: 'Insulation thickness', kind: 'length' },
    { key: 'density', label: 'Insulation density (lb/ft³)', kind: 'ratio' },
  ],
  supports: [
    { key: 'type', label: 'Support type', type: 'select', options: [['none', 'None'], ['skirt', 'Skirt (vertical)'], ['saddles', 'Saddles (horizontal)']] },
  ],
  skirt: [
    { key: 'D', label: 'Skirt outside diameter', kind: 'length' },
    { key: 't', label: 'Skirt thickness', kind: 'length' },
    { key: 'height', label: 'Height (base to bottom tangent)', kind: 'length' },
    { key: 'material', label: 'Material', type: 'select', options: plate },
    { key: 'E', label: 'Skirt-to-head weld efficiency', kind: 'ratio' },
    { key: 'c', label: 'Corrosion allowance', kind: 'length' },
    { key: 'nBolts', label: 'Anchor bolts', kind: 'ratio' },
    { key: 'boltDia', label: 'Anchor bolt diameter', kind: 'length' },
    { key: 'boltCircle', label: 'Bolt circle', kind: 'length' },
    { key: 'boltMaterial', label: 'Anchor bolt material', type: 'select', options: bolts },
    { key: 'baseOD', label: 'Base ring OD', kind: 'length' },
    { key: 'baseID', label: 'Base ring ID', kind: 'length' },
    { key: 'baseT', label: 'Base ring thickness', kind: 'length' },
    { key: 'baseS', label: 'Base ring allowable bending', kind: 'stress' },
    { key: 'fc', label: 'Concrete allowable bearing', kind: 'stress' },
  ],
  saddles: [
    { key: 'A', label: 'Tangent line to saddle (A)', kind: 'length', help: 'Zick: keep A ≤ 0.2·L, ideally ≤ R/2 so the heads stiffen the shell.' },
    { key: 'theta', label: 'Contact angle θ', kind: 'angle' },
    { key: 'b', label: 'Saddle width b', kind: 'length' },
    { key: 'wearT', label: 'Wear plate thickness', kind: 'length' },
  ],
  wind: [
    { key: 'enabled', label: 'Include wind', type: 'checkbox' },
    { key: 'V', label: 'Basic wind speed V', kind: 'velocity' },
    { key: 'exposure', label: 'Exposure category', type: 'select', options: [['B', 'B (urban)'], ['C', 'C (open)'], ['D', 'D (coastal)']] },
    { key: 'Kzt', label: 'Topographic factor Kzt', kind: 'ratio' },
    { key: 'Kd', label: 'Directionality Kd', kind: 'ratio' },
    { key: 'Ke', label: 'Ground elevation Ke', kind: 'ratio' },
    { key: 'G', label: 'Gust factor G', kind: 'ratio' },
    { key: 'Cf', label: 'Force coefficient Cf', kind: 'ratio' },
    { key: 'Dmult', label: 'Wind diameter multiplier', kind: 'ratio', help: 'Accounts for ladders, platforms and piping (1.1–1.4 typical).' },
  ],
  seismic: [
    { key: 'enabled', label: 'Include seismic', type: 'checkbox' },
    { key: 'SDS', label: 'SDS (short-period)', kind: 'ratio' },
    { key: 'SD1', label: 'SD1 (1-second)', kind: 'ratio' },
    { key: 'R', label: 'Response modification R', kind: 'ratio', help: 'ASCE 7 Table 15.4-2: skirt-supported vertical vessels R = 2 or 3.' },
    { key: 'Ie', label: 'Importance factor Ie', kind: 'ratio' },
    { key: 'TL', label: 'Long-period transition TL', kind: 'time' },
  ],
};

export const DEFAULTS = {
  shell: { type: 'shell', name: 'Shell', D: 60, length: 120, t: 0.5, material: 'SA-516-70', E: 0.85, El: 0.85, c: 0.125, ut: 0, cExt: 0, extLength: 0 },
  head: { type: 'head', kind: 'ellipsoidal', name: 'Head', D: 60, t: 0.5, ratio: 2, sf: 2, crownR: 60, knuckleR: 3.6, alpha: 30, C: 0.33, material: 'SA-516-70', E: 1, c: 0.125, ut: 0, cExt: 0 },
  cone: { type: 'cone', name: 'Cone', D1: 60, D2: 36, length: 30, t: 0.5, material: 'SA-516-70', E: 1, c: 0.125, ut: 0, cExt: 0 },
  nozzle: { mark: 'N', name: 'Nozzle', z: 24, offset: 0, angle: 0, OD: 4.5, tn: 0.337, ut: 0.125, c: 0.125, material: 'SA-106-B', projection: 8, internal: 0, padOD: 0, padT: 0, padMaterial: 'SA-516-70', leg41: 0.25, leg42: 0, leg43: 0, flangeClass: 150, flangeMaterial: 'SA-105' },
  flange: { name: 'Body flange', type: 'integral', material: 'SA-105', A: 30.5, B: 19, C: 27, t: 3, g0: 0.5, g1: 1, h: 4, nBolts: 24, boltDia: 1.125, boltMaterial: 'SA-193-B7', gasket: 'spiral-cs', gOD: 22, gID: 20.25, c: 0.125 },
  ring: { z: 100, h: 4, w: 0.5, material: 'SA-516-70' },
  detail: { name: 'Internals', mass: 500, z: 100, operatingOnly: false },
};

export function blankModel() {
  return {
    name: 'New vessel', units: 'US',
    design: { orientation: 'vertical', P: 100, T: 200, Pext: 0, MDMT: -20, Tamb: 70, sg: 1, level: 0, testType: 'hydro', hydroPosition: 'horizontal', hydroBasis: 'mawp' },
    elements: [
      { ...DEFAULTS.head, id: 'E1', name: 'Bottom head' },
      { ...DEFAULTS.shell, id: 'E2', name: 'Shell', length: 240 },
      { ...DEFAULTS.head, id: 'E3', name: 'Top head' },
    ],
    nozzles: [], flanges: [], rings: [], details: [],
    insulation: { t: 0, density: 8 },
    supports: { type: 'none', skirt: { D: 61, t: 0.375, height: 96, material: 'SA-516-70', E: 0.7, c: 0.0625, nBolts: 8, boltDia: 1, boltCircle: 68, boltMaterial: 'SA-193-B7', baseOD: 74, baseID: 54, baseT: 1, baseS: 24000, fc: 750 }, saddles: { A: 24, theta: 120, b: 8, wearT: 0 } },
    wind: { enabled: false, V: 115, exposure: 'C', Kzt: 1, Kd: 0.95, Ke: 1, G: 0.85, Cf: 0.7, Dmult: 1.2 },
    seismic: { enabled: false, SDS: 0.5, SD1: 0.2, R: 3, Ie: 1, TL: 8 },
  };
}

/** Fill any missing sections so older/partial files open cleanly. */
export function normalize(model) {
  const b = blankModel();
  const m = { ...b, ...model };
  m.design = { ...b.design, ...model.design };
  m.supports = { ...b.supports, ...model.supports, skirt: { ...b.supports.skirt, ...model.supports?.skirt }, saddles: { ...b.supports.saddles, ...model.supports?.saddles } };
  m.wind = { ...b.wind, ...model.wind };
  m.seismic = { ...b.seismic, ...model.seismic };
  m.insulation = { ...b.insulation, ...model.insulation };
  for (const k of ['nozzles', 'flanges', 'rings', 'details']) m[k] = model[k] || [];
  m.elements = (model.elements || []).map((e, i) => ({ ...DEFAULTS[e.type], ...e, id: e.id || `E${i + 1}` }));
  m.nozzles = m.nozzles.map(n => ({ ...DEFAULTS.nozzle, ...n }));
  m.flanges = m.flanges.map(f => ({ ...DEFAULTS.flange, ...f }));
  return m;
}
