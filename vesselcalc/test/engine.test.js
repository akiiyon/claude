import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  cylInternal, ellipsoidalInternal, torisphericalInternal, hemiInternal, coneInternal, flatInternal,
  factorA, cylExternal, headExternal,
} from '../src/engine/components.js';
import { hubFactors, kFactors, appendix2 } from '../src/engine/flange.js';
import { zick } from '../src/engine/supports.js';
import { Kz } from '../src/engine/loads.js';
import { reinforcement } from '../src/engine/nozzle.js';
import { allowable, factorB, factorAfromB } from '../src/engine/materials.js';
import { layout, elementVolume } from '../src/engine/geometry.js';
import { analyze } from '../src/engine/analyze.js';
import { toDisplay, fromDisplay } from '../src/engine/units.js';

const near = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`);

test('UG-27 cylinder: thickness and MAWP', () => {
  const r = cylInternal({ P: 100, R: 30, S: 20000, E: 1, t: 0.5 });
  near(r.trCirc, 3000 / (20000 - 60));
  near(r.trLong, 3000 / (40000 + 40));
  near(r.mawpCirc, 20000 * 0.5 / (30 + 0.3));
  near(r.mawp, r.mawpCirc);
});

test('App. 1-2 thick cylinder switches in above 0.385SE', () => {
  const r = cylInternal({ P: 9000, R: 10, S: 20000, E: 1 });
  assert.equal(r.code, 'App. 1-2(a)(1)');
  const Z = (20000 + 9000) / (20000 - 9000);
  near(r.trCirc, 10 * (Math.sqrt(Z) - 1));
});

test('UG-32 heads', () => {
  near(ellipsoidalInternal({ P: 100, D: 60, S: 20000, E: 1 }).tr, 6000 / (40000 - 20));
  const tori = torisphericalInternal({ P: 100, L: 60, r: 3.6, S: 20000, E: 1 });
  near(tori.M, 0.25 * (3 + Math.sqrt(60 / 3.6)));
  near(tori.tr, 100 * 60 * tori.M / (40000 - 20));
  near(hemiInternal({ P: 100, L: 30, S: 20000, E: 1 }).tr, 3000 / 39980);
  near(coneInternal({ P: 100, D: 60, S: 20000, E: 1, alpha: 30 }).tr, 6000 / (2 * Math.cos(Math.PI / 6) * 19940));
  near(flatInternal({ P: 100, d: 20, S: 20000, E: 1, C: 0.33 }).tr, 20 * Math.sqrt(0.33 * 100 / 20000));
});

test('MAWP and tr are consistent (round trip)', () => {
  const tr = ellipsoidalInternal({ P: 250, D: 72, S: 17500, E: 0.85 }).tr;
  near(ellipsoidalInternal({ P: 1, D: 72, S: 17500, E: 0.85, t: tr }).mawp, 250);
  const tc = cylInternal({ P: 250, R: 36, S: 17500, E: 0.85 }).tr;
  near(cylInternal({ P: 1, R: 36, S: 17500, E: 0.85, t: tc }).mawp, 250);
});

test('UG-28 Factor A: long-cylinder asymptote and elastic Pa', () => {
  near(factorA(50, 100), 1.1 / 1e4, 0.02);
  const r = cylExternal({ material: 'SA-516-70', T: 100, Do: 100, L: 5000, t: 1 });
  assert.ok(r.elastic);
  near(r.Pa, 2 * r.A * r.E / (3 * 100), 1e-6);
});

test('Factor B chart approximation: elastic line and yield plateau', () => {
  const { B, E } = factorB('SA-516-70', 100, 1e-4);
  near(B, 1e-4 * E / 2, 0.01);
  const plateau = factorB('SA-516-70', 100, 0.05).B;
  near(plateau, 38000 / 2, 0.01);
  near(factorB('SA-516-70', 100, factorAfromB('SA-516-70', 100, 12000)).B, 12000, 1e-4);
});

test('UG-33 head external: Pa = B/(Ro/t)', () => {
  const r = headExternal({ material: 'SA-516-70', T: 300, Ro: 54, t: 0.5 });
  near(r.A, 0.125 / 108);
  near(r.Pa, r.elastic ? 0.0625 * r.E / 108 ** 2 : r.B / 108, 1e-6);
});

test('Appendix 2 hub factors reach the limiting values at g1/g0 = 1', () => {
  const { F, V, f } = hubFactors(1, 0.5);
  near(F, 0.908920, 1e-3);
  near(V, 0.550103, 1e-3);
  assert.equal(f, 1);
  near(kFactors(2).Z, 5 / 3);
});

test('Appendix 2 gasket seating width and bolt loads', () => {
  const r = appendix2({ type: 'integral', A: 30.5, B: 19, C: 27, t: 3, g0: 0.5, g1: 1, h: 4, nBolts: 24, boltDia: 1.125,
    material: 'SA-105', boltMaterial: 'SA-193-B7', gasket: 'spiral-cs', gOD: 22, gID: 20.25, P: 200, T: 300 });
  near(r.N, 0.875); near(r.b0, 0.4375); near(r.b, 0.5 * Math.sqrt(0.4375)); near(r.G, 22 - 2 * r.b);
  near(r.Wm1, 0.785 * r.G ** 2 * 200 + 2 * r.b * Math.PI * r.G * 2.5 * 200);
  near(r.Wm2, Math.PI * r.b * r.G * 10000);
  near(r.Ab, 24 * 0.728);
});

test('Zick K factors for 120° and 150° saddles', () => {
  const r = zick({ Q: 1, L: 480, A: 48, H: 24, R: 48, t: 0.5, theta: 120, S: 1, Sy: 1, Bc: 1 });
  near(r.K1, 0.107, 0.01); near(r.K2, 1.171, 0.002); near(r.K3, 0.053, 0.01); near(r.K5, 0.760, 0.002);
  const s = zick({ Q: 1, L: 480, A: 48, H: 24, R: 48, t: 0.5, theta: 150, S: 1, Sy: 1, Bc: 1 });
  near(s.K2, 0.799, 0.002); near(s.K5, 0.673, 0.002);
});

test('ASCE 7 Kz', () => {
  near(Kz(30, 'C'), 2.01 * (30 / 900) ** (2 / 9.5));
  near(Kz(5, 'C'), Kz(15, 'C'));
});

test('UG-37 area replacement, no pad', () => {
  const host = { type: 'shell', D: 60 };
  const r = reinforcement({
    n: { OD: 8.625, tn: 0.5, c: 0, material: 'SA-516-70', leg41: 0.375 },
    host: { tEff: 0.5, D: 60, material: 'SA-516-70', element: host }, P: 150, T: 100,
  });
  const S = allowable('SA-516-70', 100);
  const tr = 150 * 30 / (S - 90), d = 8.625 - 1;
  near(r.A, d * tr);
  near(r.A1, Math.max(d * (0.5 - tr), 2 * 1 * (0.5 - tr)));
  const trn = 150 * d / 2 / (S - 90);
  near(r.A2, 5 * (0.5 - trn) * 0.5);
  near(r.A41, 0.375 ** 2);
});

test('geometry: 2:1 head volume = πD³/24 and cylinder volume', () => {
  const p = layout([{ type: 'head', kind: 'ellipsoidal', D: 60, t: 0.5, ratio: 2, sf: 0, material: 'SA-516-70' },
    { type: 'shell', D: 60, length: 100, t: 0.5, material: 'SA-516-70' }]);
  near(elementVolume(p[0]), Math.PI * 60 ** 3 / 24, 1e-3);
  near(elementVolume(p[1]), Math.PI * 900 * 100, 1e-6);
  // Horizontal half-full cylinder
  near(elementVolume(p[1], { orientation: 'horizontal', level: 30, Rmax: 30 }), Math.PI * 900 * 50, 1e-3);
});

test('units round trip', () => {
  near(toDisplay(212, 'temperature', 'SI'), 100);
  near(fromDisplay(100, 'temperature', 'SI'), 212);
  near(fromDisplay(toDisplay(150, 'pressure', 'SI'), 'pressure', 'SI'), 150);
  near(toDisplay(1, 'length', 'SI'), 25.4);
});

for (const f of fs.readdirSync(new URL('../examples/', import.meta.url))) {
  test(`example ${f} analyzes and passes`, () => {
    const model = JSON.parse(fs.readFileSync(new URL(`../examples/${f}`, import.meta.url)));
    const r = analyze(model);
    assert.deepEqual(r.fails, []);
    assert.ok(r.mawp.P >= model.design.P);
    assert.ok(r.weights.operating > r.weights.empty);
    assert.ok(r.hydro.Ptest > r.mawp.P);
  });
}

test('analysis flags an under-thickness shell', () => {
  const model = JSON.parse(fs.readFileSync(new URL('../examples/vertical-column.json', import.meta.url)));
  model.elements[1].t = 0.3125;
  const r = analyze(model);
  assert.ok(r.fails.some(x => x.startsWith('Shell 1')));
});
