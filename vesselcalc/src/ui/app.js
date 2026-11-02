// UI controller: model state, tree, property forms, sketch, results tabs.
import { analyze } from '../engine/analyze.js';
import { toDisplay, fromDisplay, unitLabel, fmt } from '../engine/units.js';
import { FIELDS, DEFAULTS, blankModel, normalize } from './schema.js';
import { sketch } from './sketch.js';
import { makeReport, materialInfo } from './report.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STORE = 'vesselcalc.model.v1';

const state = {
  model: load() || blankModel(),
  selected: 'design',
  units: 'US',
  tab: 'summary',
  results: null,
  error: null,
};
state.units = state.model.units || 'US';

function load() {
  try { const s = localStorage.getItem(STORE); return s ? normalize(JSON.parse(s)) : null; } catch { return null; }
}
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(state.model)); } catch { /* storage unavailable */ }
}

// ------------------------------------------------------------------ analysis
let timer;
function schedule() { clearTimeout(timer); timer = setTimeout(run, 120); }
function run() {
  try { state.results = analyze(state.model); state.error = null; } catch (e) { state.results = null; state.error = e.message; console.error(e); }
  persist();
  renderTree(); renderSketch(); renderQuick(); renderResults(); renderPropsResult();
}

// ------------------------------------------------------------------ selection helpers
function target(sel = state.selected) {
  const m = state.model;
  const [kind, idx] = sel.split(':');
  const i = +idx;
  switch (kind) {
    case 'design': return { obj: m.design, fields: FIELDS.design, title: 'Design conditions' };
    case 'el': { const e = m.elements[i]; return e && { obj: e, fields: FIELDS[e.type], title: e.name || e.type, sub: e.type }; }
    case 'noz': { const n = m.nozzles[i]; return n && { obj: n, fields: FIELDS.nozzle, title: `${n.mark || ''} ${n.name || 'Nozzle'}`, sub: 'Nozzle' }; }
    case 'flg': { const f = m.flanges[i]; return f && { obj: f, fields: FIELDS.flange, title: f.name, sub: 'Bolted flange (App. 2)' }; }
    case 'ring': { const r = m.rings[i]; return r && { obj: r, fields: FIELDS.ring, title: `Stiffening ring ${i + 1}`, sub: 'UG-29' }; }
    case 'det': { const r = m.details[i]; return r && { obj: r, fields: FIELDS.detail, title: r.name, sub: 'Weight detail' }; }
    case 'supports': return { obj: m.supports, fields: FIELDS.supports, title: 'Supports' };
    case 'wind': return { obj: m.wind, fields: FIELDS.wind, title: 'Wind loads' };
    case 'seismic': return { obj: m.seismic, fields: FIELDS.seismic, title: 'Seismic loads' };
    case 'insulation': return { obj: m.insulation, fields: FIELDS.insulation, title: 'Insulation' };
    default: return null;
  }
}

function select(sel) {
  state.selected = sel;
  renderTree(); renderSketch(); renderProps();
}

// ------------------------------------------------------------------ tree
function status(sel) {
  const R = state.results;
  if (!R) return 'none';
  const [kind, idx] = sel.split(':');
  const i = +idx;
  if (kind === 'el') { const e = R.elements[i]; return !e ? 'none' : (e.error || !e.ok || e.okExt === false) ? 'bad' : 'ok'; }
  if (kind === 'noz') { const n = R.nozzles[i]; return !n ? 'none' : n.ok ? 'ok' : 'bad'; }
  if (kind === 'flg') { const f = R.flanges[i]; return !f ? 'none' : f.ok ? 'ok' : 'bad'; }
  if (kind === 'ring') { const r = R.rings[i]; return !r || r.skip ? 'none' : r.ok ? 'ok' : 'bad'; }
  if (kind === 'supports') return R.supports?.ok == null ? 'none' : R.supports.ok ? 'ok' : 'bad';
  if (kind === 'design') return R.ok ? 'ok' : 'bad';
  return 'none';
}

function renderTree() {
  const m = state.model;
  const item = (sel, label, ctrls = '') => `<div class="item${state.selected === sel ? ' sel' : ''}" data-select="${sel}"><span class="dot ${status(sel)}"></span><span class="lbl">${esc(label)}</span>${ctrls}</div>`;
  const ctl = (kind, i, n) => `${i > 0 ? `<button class="mini" data-act="up" data-kind="${kind}" data-i="${i}" title="Move up" aria-label="Move up">▲</button>` : ''}${i < n - 1 ? `<button class="mini" data-act="down" data-kind="${kind}" data-i="${i}" title="Move down" aria-label="Move down">▼</button>` : ''}<button class="mini" data-act="dup" data-kind="${kind}" data-i="${i}" title="Duplicate" aria-label="Duplicate">⧉</button><button class="mini" data-act="del" data-kind="${kind}" data-i="${i}" title="Delete" aria-label="Delete">✕</button>`;
  let h = '<h3>Vessel</h3>';
  h += item('design', 'Design conditions');
  h += `<h3>Elements <span>${m.design.orientation === 'vertical' ? 'bottom → top' : 'left → right'}</span></h3>`;
  m.elements.forEach((e, i) => { h += item(`el:${i}`, `${e.name || e.type}${e.type === 'head' ? ` (${e.kind})` : ''}`, ctl('elements', i, m.elements.length)); });
  h += '<div class="addrow"><button data-add="shell">+ Shell</button><button data-add="head">+ Head</button><button data-add="cone">+ Cone</button></div>';
  h += '<h3>Nozzles</h3>';
  m.nozzles.forEach((n, i) => { h += item(`noz:${i}`, `${n.mark || ''} ${n.name || ''}`, ctl('nozzles', i, m.nozzles.length)); });
  h += '<div class="addrow"><button data-add="nozzle">+ Nozzle</button></div>';
  h += '<h3>Body flanges</h3>';
  m.flanges.forEach((f, i) => { h += item(`flg:${i}`, f.name, ctl('flanges', i, m.flanges.length)); });
  h += '<div class="addrow"><button data-add="flange">+ Flange</button></div>';
  h += '<h3>Stiffening rings</h3>';
  m.rings.forEach((r, i) => { h += item(`ring:${i}`, `Ring @ ${fmt(r.z, 'length', state.units, state.units === 'SI' ? 0 : 1)}`, ctl('rings', i, m.rings.length)); });
  h += '<div class="addrow"><button data-add="ring">+ Ring</button></div>';
  h += '<h3>Loads & supports</h3>';
  h += item('supports', `Supports: ${m.supports.type}`);
  h += item('wind', `Wind ${m.wind.enabled ? 'on' : 'off'}`);
  h += item('seismic', `Seismic ${m.seismic.enabled ? 'on' : 'off'}`);
  h += item('insulation', 'Insulation');
  h += '<h3>Weights / details</h3>';
  m.details.forEach((d, i) => { h += item(`det:${i}`, d.name, ctl('details', i, m.details.length)); });
  h += '<div class="addrow"><button data-add="detail">+ Weight</button></div>';
  $('#tree').innerHTML = h;
}

$('#tree').addEventListener('click', e => {
  const b = e.target.closest('button');
  const m = state.model;
  if (b?.dataset.add) {
    const t = b.dataset.add;
    if (['shell', 'head', 'cone'].includes(t)) {
      const ids = new Set(m.elements.map(x => x.id));
      let k = m.elements.length + 1; while (ids.has(`E${k}`)) k++;
      const prev = m.elements[m.elements.length - 1];
      const D = prev ? (prev.type === 'cone' ? prev.D2 : prev.D) : 60;
      const el = { ...DEFAULTS[t], id: `E${k}`, name: `${t[0].toUpperCase()}${t.slice(1)} ${k}`, ...(t === 'cone' ? { D1: D, D2: D * 0.6 } : { D }) };
      // Insert before a closing head so new shells go inside the vessel
      const lastIsHead = prev && prev.type === 'head' && m.elements.length > 1;
      const at = t !== 'head' && lastIsHead ? m.elements.length - 1 : m.elements.length;
      m.elements.splice(at, 0, el);
      select(`el:${at}`);
    } else if (t === 'nozzle') {
      const host = m.elements.find(x => x.type === 'shell') || m.elements[0];
      m.nozzles.push({ ...DEFAULTS.nozzle, mark: `N${m.nozzles.length + 1}`, name: 'Nozzle', on: host?.id });
      select(`noz:${m.nozzles.length - 1}`);
    } else if (t === 'flange') { m.flanges.push({ ...DEFAULTS.flange }); select(`flg:${m.flanges.length - 1}`); }
    else if (t === 'ring') { m.rings.push({ ...DEFAULTS.ring }); select(`ring:${m.rings.length - 1}`); }
    else if (t === 'detail') { m.details.push({ ...DEFAULTS.detail }); select(`det:${m.details.length - 1}`); }
    schedule();
    return;
  }
  if (b?.dataset.act) {
    const arr = m[b.dataset.kind], i = +b.dataset.i;
    const pre = { elements: 'el', nozzles: 'noz', flanges: 'flg', rings: 'ring', details: 'det' }[b.dataset.kind];
    if (b.dataset.act === 'del') {
      if (b.dataset.kind === 'elements' && arr.length <= 1) return;
      const removed = arr.splice(i, 1)[0];
      if (b.dataset.kind === 'elements') m.nozzles = m.nozzles.filter(n => n.on !== removed.id);
      select(arr.length ? `${pre}:${Math.min(i, arr.length - 1)}` : 'design');
    } else if (b.dataset.act === 'dup') {
      const copy = structuredClone(arr[i]);
      if (b.dataset.kind === 'elements') { const ids = new Set(arr.map(x => x.id)); let k = arr.length + 1; while (ids.has(`E${k}`)) k++; copy.id = `E${k}`; copy.name = `${copy.name} copy`; }
      arr.splice(i + 1, 0, copy); select(`${pre}:${i + 1}`);
    } else {
      const j = b.dataset.act === 'up' ? i - 1 : i + 1;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      select(`${pre}:${j}`);
    }
    schedule();
    return;
  }
  const it = e.target.closest('[data-select]');
  if (it) select(it.dataset.select);
});

// ------------------------------------------------------------------ properties form
function fieldHtml(f, obj, prefix = '') {
  if (f.show && !f.show(obj)) return '';
  const id = `f_${prefix}${f.key}`;
  const val = obj[f.key];
  let input;
  if (f.type === 'select') {
    input = `<select id="${id}" data-key="${prefix}${f.key}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'checkbox') {
    input = `<input id="${id}" type="checkbox" data-key="${prefix}${f.key}"${val ? ' checked' : ''}>`;
  } else if (f.type === 'text') {
    input = `<input id="${id}" type="text" data-key="${prefix}${f.key}" value="${esc(val ?? '')}">`;
  } else {
    const disp = val == null || val === '' ? '' : +toDisplay(+val, f.kind, state.units).toPrecision(6);
    input = `<input id="${id}" type="number" step="any" data-key="${prefix}${f.key}" data-kind="${f.kind}" value="${disp}">`;
  }
  const u = f.kind && unitLabel(f.kind, state.units);
  return `<div class="f"><label for="${id}">${esc(f.label)}${u ? ` <span class="u">(${u})</span>` : ''}</label>${input}${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}</div>`;
}

function renderProps() {
  const t = target();
  if (!t) { $('#props').innerHTML = '<p>Select an item.</p>'; return; }
  let h = `<h2>${esc(t.title)}</h2>${t.sub ? `<div class="sub">${esc(t.sub)}</div>` : ''}`;
  let fields = t.fields;
  if (state.selected.startsWith('noz:')) {
    fields = fields.map(f => f.key === 'on' ? { ...f, options: state.model.elements.map(e => [e.id, `${e.name} (${e.type})`]) } : f);
    const host = state.model.elements.find(e => e.id === t.obj.on);
    fields = fields.filter(f => host?.type === 'head' ? f.key !== 'z' : f.key !== 'offset');
  }
  h += fields.map(f => fieldHtml(f, t.obj)).join('');
  if (t.obj.material) h += `<div class="info">${esc(materialInfo(t.obj.material))}</div>`;
  if (state.selected === 'supports') {
    if (t.obj.type === 'skirt') h += `<div class="group"><h3>Skirt & base ring</h3>${FIELDS.skirt.map(f => fieldHtml(f, t.obj.skirt, 'skirt.')).join('')}</div>`;
    if (t.obj.type === 'saddles') h += `<div class="group"><h3>Saddles</h3>${FIELDS.saddles.map(f => fieldHtml(f, t.obj.saddles, 'saddles.')).join('')}</div>`;
  }
  if (state.selected === 'design') {
    h += `<div class="group"><h3>Tip</h3><div class="help">Pick an item in the tree or click the sketch to edit it. Every change re-runs the full calculation; results are below. Values are stored internally in US units, so switching units never changes the design.</div></div>`;
  }
  h += '<div class="result" id="propres"></div>';
  $('#props').innerHTML = h;
  renderPropsResult();
}

function renderPropsResult() {
  const box = $('#propres');
  if (!box) return;
  const R = state.results, U = state.units;
  if (!R) { box.innerHTML = state.error ? `<span class="fail">${esc(state.error)}</span>` : ''; return; }
  const [kind, idx] = state.selected.split(':');
  const i = +idx;
  let h = '';
  if (kind === 'el') {
    const e = R.elements[i];
    if (e?.error) h = `<span class="fail">${esc(e.error)}</span>`;
    else if (e) {
      h = `<b>${e.ok ? '✓' : '✗'} ${esc(e.internal.code)}</b><br>S = ${fmt(e.S, 'stress', U)} · P = ${fmt(e.Pdesign, 'pressure', U)}<br>t required ${fmt(e.internal.tr, 'length', U)} + c → ${fmt(e.tReqTotal, 'length', U)}<br>t available ${fmt(e.tAvail, 'length', U)}<br>MAWP ${fmt(e.mawp, 'pressure', U)} · MAP ${fmt(e.map, 'pressure', U)}`;
      if (e.external) h += `<br>External: Pa ${fmt(e.external.Pa, 'pressure', U)} ${e.okExt ? '✓' : '✗'}${e.external.L ? ` (L = ${fmt(e.external.L, 'length', U)})` : ''}`;
    }
  } else if (kind === 'noz') {
    const n = R.nozzles[i];
    if (n?.error) h = `<span class="fail">${esc(n.error)}</span>`;
    else if (n?.calc?.skip) h = esc(n.calc.skip);
    else if (n) h = `<b>${n.ok ? '✓' : '✗'} UG-37</b><br>A required ${fmt(n.calc.A, 'area', U)}<br>A available ${fmt(n.calc.Aavail, 'area', U)}<br>UG-45: ${fmt(n.calc.ug45.tReq, 'length', U)} req / ${fmt(n.calc.ug45.tAvail, 'length', U)} ${n.calc.ug45.ok ? '✓' : '✗'}<br>MAWP ${fmt(n.mawp, 'pressure', U)}${n.rating ? `<br>Flange rating ${fmt(n.rating, 'pressure', U)}` : ''}`;
  } else if (kind === 'flg') {
    const f = R.flanges[i];
    if (f?.error) h = `<span class="fail">${esc(f.error)}</span>`;
    else if (f) h = `<b>${f.ok ? '✓' : '✗'} App. 2</b><br>Bolt area ${fmt(f.calc.Ab, 'area', U)} provided / ${fmt(f.calc.Am, 'area', U)} req<br>J operating ${f.calc.Jop.toFixed(3)}, seating ${f.calc.Jseat.toFixed(3)}<br>MAWP ${fmt(f.mawp, 'pressure', U)}`;
  } else if (kind === 'ring') {
    const r = R.rings[i];
    if (r?.skip) h = esc(r.skip);
    else if (r) h = `<b>${r.ok ? '✓' : '✗'} UG-29</b><br>I'_s required ${fmt(r.IsP, 'inertia', U)}<br>I' available ${fmt(r.Ip, 'inertia', U)}`;
  } else if (kind === 'design') {
    h = `<b>${R.ok ? '✓ All checks pass' : `✗ ${R.fails.length} failure(s)`}</b><br>MAWP ${fmt(R.mawp.P, 'pressure', U)} (${esc(R.mawp.what)})<br>Test pressure ${fmt(R.hydro.Ptest, 'pressure', U)}`;
  } else if (kind === 'supports' && R.supports?.ok != null) {
    h = `<b>${R.supports.ok ? '✓' : '✗'} ${esc(R.supports.type)}</b> — see the Supports tab.`;
  }
  box.innerHTML = h;
  box.style.display = h ? '' : 'none';
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let k = 0; k < parts.length - 1; k++) o = o[parts[k]];
  o[parts[parts.length - 1]] = value;
}

$('#props').addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset.key || el.tagName === 'SELECT' || el.type === 'checkbox') return;
  const t = target();
  let v = el.value;
  if (el.type === 'number') { if (v === '' || Number.isNaN(+v)) return; v = fromDisplay(+v, el.dataset.kind, state.units); }
  setPath(t.obj, el.dataset.key, v);
  if (el.dataset.key === 'name' || el.dataset.key === 'mark') renderTree();
  schedule();
});
$('#props').addEventListener('change', e => {
  const el = e.target;
  if (!el.dataset.key || (el.tagName !== 'SELECT' && el.type !== 'checkbox')) return;
  const t = target();
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.key === 'flangeClass') v = +v;
  setPath(t.obj, el.dataset.key, v);
  renderProps(); renderTree();
  schedule();
});

// ------------------------------------------------------------------ sketch & quick bar
function renderSketch() {
  $('#sketch').innerHTML = sketch(state.model, { selected: state.selected, units: state.units, results: state.results });
}
$('#sketch').addEventListener('click', e => { const t = e.target.closest('[data-select]'); if (t) select(t.dataset.select); });

function renderQuick() {
  const R = state.results, U = state.units;
  if (!R) { $('#quick').innerHTML = `<span class="st-bad">Error: ${esc(state.error)}</span>`; return; }
  $('#quick').innerHTML = [
    `<span class="${R.ok ? 'st-ok' : 'st-bad'}">${R.ok ? '✓ All checks pass' : `✗ ${R.fails.length} failure(s)`}</span>`,
    `MAWP <b>${fmt(R.mawp.P, 'pressure', U)}</b>`,
    `MAP <b>${fmt(R.map.P, 'pressure', U)}</b>`,
    `Test <b>${fmt(R.hydro.Ptest, 'pressure', U)}</b>`,
    `MDMT <b>${fmt(R.mdmt.computed, 'temperature', U, 0)}</b>`,
    `Empty <b>${fmt(R.weights.empty, 'mass', U, 0)}</b>`,
    `Operating <b>${fmt(R.weights.operating, 'mass', U, 0)}</b>`,
  ].join('');
}

// ------------------------------------------------------------------ results tabs
function renderResults() {
  const R = state.results;
  if (!R) { $('#tabs').innerHTML = ''; $('#tabbody').innerHTML = `<p class="fail">${esc(state.error)}</p>`; return; }
  const secs = makeReport(state.model, R, state.units);
  if (!secs[state.tab]) state.tab = 'summary';
  $('#tabs').innerHTML = Object.entries(secs).map(([k, s]) => `<button role="tab" data-tab="${k}" class="${k === state.tab ? 'on' : ''}" aria-selected="${k === state.tab}">${esc(s.title)}</button>`).join('');
  $('#tabbody').innerHTML = secs[state.tab].html;
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab;
  try { localStorage.setItem('vesselcalc.tab', state.tab); } catch { /* ignore */ }
  renderResults();
});

// ------------------------------------------------------------------ header actions
function setModel(m) {
  state.model = normalize(m);
  state.units = state.model.units || state.units;
  state.selected = 'design';
  syncHeader(); renderProps(); run();
}
function syncHeader() {
  $('#vname').value = state.model.name || '';
  document.querySelectorAll('[data-units]').forEach(b => b.classList.toggle('on', b.dataset.units === state.units));
}
$('#vname').addEventListener('input', e => { state.model.name = e.target.value; persist(); });
$('#btnNew').addEventListener('click', () => { if (confirm('Start a new vessel? Unsaved changes to the current model will be lost.')) setModel(blankModel()); });
$('#selExample').addEventListener('change', async e => {
  const v = e.target.value; e.target.value = '';
  if (!v) return;
  try { const r = await fetch(`examples/${v}.json`); setModel(await r.json()); } catch (err) { alert(`Could not load example: ${err.message}`); }
});
$('#fileOpen').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { setModel(JSON.parse(await f.text())); } catch (err) { alert(`Could not open file: ${err.message}`); }
  e.target.value = '';
});
$('#btnSave').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ ...state.model, units: state.units }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(state.model.name || 'vessel').replace(/[^\w.-]+/g, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
document.querySelectorAll('[data-units]').forEach(b => b.addEventListener('click', () => {
  state.units = b.dataset.units; state.model.units = state.units;
  syncHeader(); renderProps(); renderTree(); renderSketch(); renderQuick(); renderResults(); persist();
}));
$('#btnPrint').addEventListener('click', () => {
  const R = state.results;
  if (!R) return;
  const secs = makeReport(state.model, R, state.units);
  const now = new Date().toLocaleString();
  $('#printable').innerHTML = `<h1>${esc(state.model.name)}</h1><p>Pressure vessel calculation report — generated ${esc(now)} by VesselCalc (educational). Units: ${state.units}.</p>
    <div class="sk">${sketch(state.model, { units: state.units })}</div>
    ${Object.values(secs).map(s => `<h2 class="sec">${esc(s.title)}</h2>${s.html}`).join('')}`;
  window.print();
});

// ------------------------------------------------------------------ boot
try { state.tab = localStorage.getItem('vesselcalc.tab') || 'summary'; } catch { /* ignore */ }
syncHeader();
renderProps();
run();
