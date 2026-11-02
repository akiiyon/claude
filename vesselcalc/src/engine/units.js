// Unit handling. The engine works internally in US customary units:
//   length in, pressure/stress psi, temperature °F, force lbf, mass lb,
//   moment in-lbf, area in², volume in³, velocity mph.
// The UI converts on input and output.

export const KINDS = {
  length:   { US: { u: 'in',     f: 1 },        SI: { u: 'mm',   f: 25.4 } },
  pressure: { US: { u: 'psi',    f: 1 },        SI: { u: 'MPa',  f: 0.00689476 } },
  stress:   { US: { u: 'psi',    f: 1 },        SI: { u: 'MPa',  f: 0.00689476 } },
  modulus:  { US: { u: 'psi',    f: 1 },        SI: { u: 'MPa',  f: 0.00689476 } },
  force:    { US: { u: 'lbf',    f: 1 },        SI: { u: 'N',    f: 4.448222 } },
  mass:     { US: { u: 'lb',     f: 1 },        SI: { u: 'kg',   f: 0.45359237 } },
  moment:   { US: { u: 'in-lbf', f: 1 },        SI: { u: 'N-m',  f: 0.112984829 } },
  area:     { US: { u: 'in²',    f: 1 },        SI: { u: 'mm²',  f: 645.16 } },
  inertia:  { US: { u: 'in⁴',    f: 1 },        SI: { u: 'mm⁴',  f: 416231.4256 } },
  volume:   { US: { u: 'ft³',    f: 1 / 1728 }, SI: { u: 'm³',   f: 1.6387064e-5 } },
  velocity: { US: { u: 'mph',    f: 1 },        SI: { u: 'm/s',  f: 0.44704 } },
  angle:    { US: { u: '°',      f: 1 },        SI: { u: '°',    f: 1 } },
  ratio:    { US: { u: '',       f: 1 },        SI: { u: '',     f: 1 } },
  time:     { US: { u: 's',      f: 1 },        SI: { u: 's',    f: 1 } },
  accel:    { US: { u: 'g',      f: 1 },        SI: { u: 'g',    f: 1 } },
  temperature: { US: { u: '°F' }, SI: { u: '°C' } },
};

export function toDisplay(value, kind, sys = 'US') {
  if (value == null || Number.isNaN(value)) return value;
  if (kind === 'temperature') return sys === 'SI' ? (value - 32) * 5 / 9 : value;
  const k = KINDS[kind];
  if (!k) return value;
  return value * k[sys].f;
}

export function fromDisplay(value, kind, sys = 'US') {
  if (value == null || value === '' || Number.isNaN(+value)) return value;
  value = +value;
  if (kind === 'temperature') return sys === 'SI' ? value * 9 / 5 + 32 : value;
  const k = KINDS[kind];
  if (!k) return value;
  return value / k[sys].f;
}

export function unitLabel(kind, sys = 'US') {
  const k = KINDS[kind];
  return k ? k[sys].u : '';
}

export function fmt(value, kind, sys = 'US', digits) {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '—';
  const v = toDisplay(value, kind, sys);
  const a = Math.abs(v);
  let d = digits;
  if (d == null) d = a === 0 ? 0 : a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
  const s = a >= 1e7 || (a > 0 && a < 1e-4) ? v.toExponential(3) : v.toFixed(d);
  const u = unitLabel(kind, sys);
  return u ? `${s} ${u}` : s;
}
