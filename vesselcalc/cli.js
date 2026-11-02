// Command-line runner: node cli.js examples/vertical-column.json [--json]
import fs from 'node:fs';
import { analyze } from './src/engine/analyze.js';
import { fmt } from './src/engine/units.js';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Usage: node cli.js <model.json> [--json]'); process.exit(2); }
const model = JSON.parse(fs.readFileSync(file, 'utf8'));
const R = analyze(model);
if (flag === '--json') {
  const { placed, ...rest } = R; // drop functions
  console.log(JSON.stringify(rest, (k, v) => (typeof v === 'function' ? undefined : v), 2));
  process.exit(R.ok ? 0 : 1);
}
const U = model.units || 'US';
const f = (v, k, d) => fmt(v, k, U, d);
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${model.name}\n${'='.repeat(model.name.length)}`);
console.log(`Design: P ${f(R.design.P, 'pressure')} @ ${f(R.design.T, 'temperature', 0)}, Pext ${f(R.design.Pext, 'pressure')}, MDMT ${f(R.design.MDMT, 'temperature', 0)}\n`);
console.log(pad('Element', 22) + pad('Code', 16) + pad('t req', 14) + pad('t avail', 14) + pad('MAWP', 16) + 'Status');
for (const e of R.elements) {
  if (e.error) { console.log(pad(e.name, 22) + 'ERROR ' + e.error); continue; }
  console.log(pad(e.name, 22) + pad(e.internal.code, 16) + pad(f(e.internal.tr, 'length'), 14) + pad(f(e.tAvail, 'length'), 14) + pad(f(e.mawp, 'pressure'), 16) + (e.ok && e.okExt !== false ? 'OK' : 'FAIL'));
}
console.log();
for (const n of R.nozzles) {
  if (n.error || n.calc?.skip) { console.log(pad(n.name, 26) + (n.error || n.calc.skip)); continue; }
  console.log(pad(n.name, 26) + `A req ${f(n.calc.A, 'area')}, avail ${f(n.calc.Aavail, 'area')}, MAWP ${f(n.mawp, 'pressure')} ${n.ok ? 'OK' : 'FAIL'}`);
}
for (const fl of R.flanges) console.log(pad(fl.name, 26) + (fl.error || `App. 2 ${fl.ok ? 'OK' : 'FAIL'}, MAWP ${f(fl.mawp, 'pressure')}`));
console.log(`\nMAWP  ${f(R.mawp.P, 'pressure')}  (${R.mawp.what})`);
console.log(`MAP   ${f(R.map.P, 'pressure')}  (${R.map.what})`);
console.log(`Test  ${f(R.hydro.Ptest, 'pressure')}  (${R.hydro.code}, LSR ${R.hydro.LSR.toFixed(3)})`);
console.log(`MDMT  ${f(R.mdmt.computed, 'temperature', 0)}  (${R.mdmt.governing})`);
console.log(`Weight empty ${f(R.weights.empty, 'mass', 0)}, operating ${f(R.weights.operating, 'mass', 0)}, test ${f(R.weights.test, 'mass', 0)}`);
if (R.warnings.length) console.log('\nWarnings:\n  ' + R.warnings.join('\n  '));
console.log(R.ok ? '\nRESULT: all checks pass' : '\nRESULT: FAILURES\n  ' + R.fails.join('\n  '));
process.exit(R.ok ? 0 : 1);
