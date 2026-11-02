// Renders analysis results as HTML sections. Every main check shows the code
// formula, the substituted numbers and the outcome, so the sheet can be used
// to learn (and hand-verify) the method.
import { fmt, toDisplay, unitLabel } from '../engine/units.js';
import { getMaterial } from '../engine/materials.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function makeReport(model, R, units = 'US') {
  const U = units;
  const v = (x, k, d) => fmt(x, k, U, d);
  // bare number in display units, for formula substitution
  const n = (x, k, d) => {
    if (x == null || !Number.isFinite(x)) return '—';
    const y = toDisplay(x, k, U);
    const a = Math.abs(y);
    const dd = d ?? (a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 3 : 4);
    return y.toFixed(dd);
  };
  const badge = ok => ok == null ? '' : ok ? '<span class="pass">PASS</span>' : '<span class="fail">FAIL</span>';
  const row = (label, value, note = '') => `<tr><th>${label}</th><td>${value}</td><td class="note">${note}</td></tr>`;
  const table = (head, rows, cls = '') => `<div class="tw"><table class="grid ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const kv = rows => `<table class="kv"><tbody>${rows.join('')}</tbody></table>`;
  const eq = (lhs, formula, subst, result) => `<div class="eq"><span class="lhs">${lhs}</span> = <span class="f">${formula}</span><br><span class="lhs"></span> = <span class="s">${subst}</span> = <b>${result}</b></div>`;

  const d = R.design;
  const pu = unitLabel('pressure', U), lu = unitLabel('length', U);
  const sections = {};

  // ---------------------------------------------------------- Summary
  {
    const statusCls = R.ok ? 'ok' : 'bad';
    let h = `<div class="status ${statusCls}">${R.ok ? 'All checks pass' : `${R.fails.length} check${R.fails.length === 1 ? '' : 's'} failed`}</div>`;
    h += `<div class="cards">
      ${card('MAWP (hot, corroded)', v(R.mawp.P, 'pressure'), `Governed by ${esc(R.mawp.what)}`)}
      ${card('MAP (new, cold)', v(R.map.P, 'pressure'), esc(R.map.what))}
      ${card(`${d.testType === 'pneumatic' ? 'Pneumatic' : 'Hydro'} test pressure`, v(R.hydro.Ptest, 'pressure'), `${R.hydro.code}, LSR ${R.hydro.LSR.toFixed(3)}`)}
      ${card('Computed MDMT', v(R.mdmt.computed, 'temperature', 0), `Required ${v(d.MDMT, 'temperature', 0)} ${R.mdmt.ok ? '✓' : '✗'}`)}
      ${card('Empty / operating weight', `${v(R.weights.empty, 'mass', 0)}`, `Operating ${v(R.weights.operating, 'mass', 0)} · Test ${v(R.weights.test, 'mass', 0)}`)}
      ${card('Volume', v(R.weights.volume, 'volume', 2), `Overall inside length ${v(R.overall.length, 'length', 1)}`)}
    </div>`;
    if (R.fails.length) h += `<h4>Failures</h4><ul class="fails">${R.fails.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
    if (R.warnings.length) h += `<h4>Warnings</h4><ul class="warns">${R.warnings.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
    h += '<h4>Pressure parts</h4>';
    const ext = d.Pext > 0;
    h += table(['Element', 'Material', 'Code', `P design (${pu})`, `t req (${lu})`, `t avail (${lu})`, `MAWP (${pu})`, `MAP (${pu})`, ...(ext ? [`Pa ext (${pu})`] : []), 'Status'],
      R.elements.map(e => e.error ? [esc(e.name), esc(e.material), `<span class="fail">${esc(e.error)}</span>`, '', '', '', '', '', ...(ext ? [''] : []), badge(false)]
        : [esc(e.name), esc(e.material), e.internal.code, n(e.Pdesign, 'pressure'), n(e.internal.tr, 'length'), n(e.tAvail, 'length'), n(e.mawp, 'pressure'), n(e.map, 'pressure'),
          ...(ext ? [e.external ? n(e.external.Pa, 'pressure') : '—'] : []), badge(e.ok && e.okExt !== false)]));
    h += '<h4>MAWP candidates</h4>';
    h += table(['Limiting component', `MAWP at top (${pu})`], R.mawpCandidates.map(c => [esc(c.what), n(c.P, 'pressure')]));
    sections.summary = { title: 'Summary', html: h };
  }

  // ---------------------------------------------------------- Internal pressure
  {
    let h = `<p class="lead">Internal pressure per ASME VIII-1 UG-27 / UG-32 / App. 1-2, 1-4 at design temperature ${v(d.T, 'temperature', 0)} in the corroded condition. Static liquid head is added to the design pressure of each element.</p>`;
    for (const [i, e] of R.elements.entries()) {
      const el = model.elements[i];
      h += `<section class="calc"><h4>${esc(e.name)} — ${esc(kindLabel(el))} ${e.error ? '' : badge(e.ok)}</h4>`;
      if (e.error) { h += `<p class="fail">${esc(e.error)}</p></section>`; continue; }
      const c = el.c || 0, E = el.E ?? 1;
      const S = e.S, P = e.Pdesign, t = e.tAvail;
      h += kv([
        row('Material / allowable stress S', `${esc(el.material)} — ${v(S, 'stress')}`, `at ${v(d.T, 'temperature', 0)}`),
        row('Design pressure P', v(P, 'pressure'), `${v(d.P, 'pressure')} + static head ${v(e.staticHead, 'pressure')}`),
        row('Joint efficiency E', E.toFixed(2)),
        row('Available thickness t', v(t, 'length'), `${n(el.t, 'length')} × (1 − ${el.ut || 0}) − ${n(c + (el.cExt || 0), 'length')} corrosion`),
      ]);
      h += formulaFor(el, e, { S, E, P, t, c });
      h += `<p>Required thickness incl. corrosion: <b>${v(e.tReqTotal, 'length')}</b> · Nominal: ${v(el.t, 'length')} · MAP (new & cold, S = ${v(e.Sa, 'stress')}): <b>${v(e.map, 'pressure')}</b></p>`;
      h += '</section>';
    }
    if (R.junctions.length) {
      h += '<h4>Cone-to-cylinder junctions (App. 1-5)</h4>';
      h += table(['Junction', 'P/(S·E1)', 'Δ (deg)', `Required area (${unitLabel('area', U)})`, `Available (${unitLabel('area', U)})`, 'Status'],
        R.junctions.map(j => j.error ? [esc(j.name), '', '', '', '', esc(j.error)] : [esc(j.name), j.ratio.toFixed(5), j.delta.toFixed(1), n(j.required, 'area'), n(j.available, 'area'), j.note ? `${badge(true)} ${esc(j.note)}` : badge(j.ok)]));
    }
    sections.internal = { title: 'Internal pressure', html: h };
  }

  // ---------------------------------------------------------- External pressure
  if (d.Pext > 0) {
    let h = `<p class="lead">External pressure ${v(d.Pext, 'pressure')} per UG-28 (cylinders), UG-33 (heads, cones). Factor A from the geometric chart (closed form), Factor B from an approximation of the ASME II-D material chart.</p>`;
    for (const [i, e] of R.elements.entries()) {
      const x = e.external; if (!x) continue;
      const el = model.elements[i];
      h += `<section class="calc"><h4>${esc(e.name)} ${badge(e.okExt)}</h4>`;
      if (el.type === 'shell') {
        h += kv([row('Design length L', v(x.L, 'length'), 'between lines of support (incl. 1/3 head depth)'), row('Do', v(x.Do, 'length')),
          row('L/Do, Do/t', `${x.LDo.toFixed(3)}, ${x.Dot.toFixed(2)}`), row('Factor A', x.A.toExponential(4)), row('Factor B', v(x.B, 'stress'), x.elastic ? 'elastic region' : 'plastic region'),
          row('E (modulus)', v(x.E, 'modulus'))]);
        h += x.Dot >= 10
          ? eq('Pa', x.elastic ? '2·A·E / (3·(Do/t))' : '4·B / (3·(Do/t))', x.elastic ? `2×${x.A.toExponential(3)}×${n(x.E, 'modulus', 0)} / (3×${x.Dot.toFixed(2)})` : `4×${n(x.B, 'stress')} / (3×${x.Dot.toFixed(2)})`, v(x.Pa, 'pressure'))
          : `<p>Do/t &lt; 10 → UG-28(c)(2): Pa = ${v(x.Pa, 'pressure')}</p>`;
      } else if (el.type === 'cone' || el.kind === 'conical') {
        h += kv([row('Equivalent length Le', v(x.Le, 'length')), row('Equivalent thickness te = t·cos α', v(x.te, 'length')), row('Factor A', x.A.toExponential(4)), row('Factor B', v(x.B, 'stress'))]);
        h += `<p>Pa = <b>${v(x.Pa, 'pressure')}</b> (${x.code})</p>`;
      } else if (x.Ro) {
        h += kv([row('Outside spherical radius Ro', v(x.Ro, 'length')), row('Ro/t', x.Rot.toFixed(2)), row('Factor A = 0.125/(Ro/t)', x.A.toExponential(4)), row('Factor B', v(x.B, 'stress'))]);
        h += eq('Pa', 'B / (Ro/t)', `${n(x.B, 'stress')} / ${x.Rot.toFixed(2)}`, v(x.Pa, 'pressure'));
        if (x.tr167 != null) h += `<p>UG-33(a)(1) check with 1.67 × Pext on the internal-pressure formula: t req = ${v(x.tr167, 'length')}</p>`;
      } else {
        h += `<p>Pa = <b>${v(x.Pa, 'pressure')}</b> (${x.code})</p>`;
      }
      h += `<p>Required thickness for external pressure (corroded): <b>${v(x.tr, 'length')}</b> · available ${v(e.tAvail, 'length')}</p></section>`;
    }
    if (R.rings.length) {
      h += '<h4>Stiffening rings (UG-29)</h4>';
      h += table(['Position', 'Ring', `Ls (${lu})`, 'Factor A', `I'_s req (${unitLabel('inertia', U)})`, `I' available (${unitLabel('inertia', U)})`, 'Status'],
        R.rings.map(r => r.skip ? [n(r.z, 'length'), '', '', '', '', '', esc(r.skip)] : [n(r.z, 'length'), `${n(r.h, 'length')} × ${n(r.w, 'length')}`, n(r.Ls, 'length'), r.A.toExponential(3), n(r.IsP, 'inertia'), n(r.Ip, 'inertia'), badge(r.ok)]));
    }
    sections.external = { title: 'External pressure', html: h };
  }

  // ---------------------------------------------------------- Nozzles
  {
    let h = '<p class="lead">Opening reinforcement by area replacement (UG-37), with the UG-40 limits, UG-41 weld strength paths and UG-45 minimum neck thickness. Corroded condition, F = 1.</p>';
    if (!R.nozzles.length) h += '<p>No nozzles defined.</p>';
    for (const r of R.nozzles) {
      h += `<section class="calc"><h4>${esc(r.name)} on ${esc(r.host || '?')} ${badge(r.ok)}</h4>`;
      if (r.error) { h += `<p class="fail">${esc(r.error)}</p></section>`; continue; }
      const c = r.calc;
      if (c.skip) { h += `<p>${esc(c.skip)}</p></section>`; continue; }
      h += kv([
        row('Finished opening d (corroded)', v(c.d, 'length')),
        row('Shell t / tr (E = 1)', `${v(c.t, 'length')} / ${v(c.tr, 'length')}`),
        row('Neck tn / trn', `${v(c.tn, 'length')} / ${v(c.trn, 'length')}`),
        row('Strength reduction fr1, fr2, fr3, fr4', `${c.fr1.toFixed(3)}, ${c.fr2.toFixed(3)}, ${c.fr3.toFixed(3)}, ${c.fr4.toFixed(3)}`),
        row('Reinforcement limits', `±${v(c.limitDia / 2, 'length')} from axis (total ${v(c.limitDia, 'length')}), ${v(c.limitNormal, 'length')} normal to wall`),
      ]);
      h += eq('A required', 'd·tr·F + 2·tn·tr·F·(1 − fr1)', `${n(c.d, 'length')}×${n(c.tr, 'length')} + 2×${n(c.tn, 'length')}×${n(c.tr, 'length')}×(1 − ${c.fr1.toFixed(3)})`, v(c.A, 'area'));
      h += table(['Area', 'Meaning', `Value (${unitLabel('area', U)})`], [
        ['A1', 'Excess in shell', n(c.A1, 'area')], ['A2', 'Excess in nozzle wall (outward)', n(c.A2, 'area')], ['A3', 'Inward nozzle projection', n(c.A3, 'area')],
        ['A41', 'Outward nozzle weld', n(c.A41, 'area')], ['A42', 'Pad outer weld', n(c.A42, 'area')], ['A43', 'Inward nozzle weld', n(c.A43, 'area')], ['A5', 'Reinforcing pad', n(c.A5, 'area')],
        ['<b>Total</b>', '', `<b>${n(c.Aavail, 'area')}</b> ${c.Aavail >= c.A ? '≥' : '<'} ${n(c.A, 'area')}`],
      ]);
      if (c.smallExempt) h += '<p class="note">UG-36(c)(3): opening qualifies as a small opening — area replacement calculation not mandatory.</p>';
      const g = c.ug45;
      h += `<p>UG-45 neck thickness: ta = ${v(g.ta, 'length')}, tb1 = ${v(g.tb1, 'length')}, tb3 (std. wall × 0.875 + c) = ${v(g.tb3, 'length')} → required <b>${v(g.tReq, 'length')}</b>, available ${v(g.tAvail, 'length')} ${badge(g.ok)}</p>`;
      const w = c.welds;
      h += table(['UG-41 load path', `Load (${unitLabel('force', U)})`, `Strength (${unitLabel('force', U)})`, 'Status'], [
        ['1-1 (pad weld + neck shear)', n(Math.min(w.W, w.W11), 'force'), n(w.path11, 'force'), badge(w.ok11)],
        ['2-2 (nozzle welds + groove)', n(Math.min(w.W, w.W22), 'force'), n(w.path22, 'force'), badge(w.ok22)],
        ['3-3 (pad weld + groove)', n(Math.min(w.W, w.W33), 'force'), n(w.path33, 'force'), badge(w.ok33)],
      ]);
      h += `<p>Nozzle MAWP (reinforcement-limited, at top): <b>${v(r.mawp, 'pressure')}</b>${r.rating ? ` · Class ${r.n.flangeClass} flange rating at ${v(d.T, 'temperature', 0)}: <b>${v(r.rating, 'pressure')}</b>` : ''}</p>`;
      h += '</section>';
    }
    sections.nozzles = { title: 'Nozzles', html: h };
  }

  // ---------------------------------------------------------- Flanges
  if (R.flanges.length) {
    let h = '<p class="lead">Bolted flange design by Mandatory Appendix 2 (Taylor-Forge method): bolt loads, moments, hub/radial/tangential stresses for operating and gasket-seating conditions, and flange rigidity (2-14).</p>';
    for (const f of R.flanges) {
      h += `<section class="calc"><h4>${esc(f.name)} ${badge(f.ok)}</h4>`;
      if (f.error) { h += `<p class="fail">${esc(f.error)}</p></section>`; continue; }
      const c = f.calc;
      h += kv([
        row('Gasket', `${esc(c.gasket.name)} — m = ${c.gasket.m}, y = ${v(c.gasket.y, 'stress')}`),
        row('N, b0, b, G', `${n(c.N, 'length')}, ${n(c.b0, 'length')}, ${n(c.b, 'length')}, ${n(c.G, 'length')} ${lu}`),
        row('Allowables Sfo / Sfa / Sb / Sa', `${n(c.Sfo, 'stress')} / ${n(c.Sfa, 'stress')} / ${n(c.Sb, 'stress')} / ${n(c.Sa, 'stress')} ${unitLabel('stress', U)}`),
      ]);
      h += eq('H', '0.785·G²·P', `0.785×${n(c.G, 'length')}²×${n(d.P, 'pressure')}`, v(c.H, 'force'));
      h += eq('Hp', '2·b·π·G·m·P', `2×${n(c.b, 'length')}×π×${n(c.G, 'length')}×${c.gasket.m}×${n(d.P, 'pressure')}`, v(c.Hp, 'force'));
      h += eq('Wm1', 'H + Hp', `${n(c.H, 'force')} + ${n(c.Hp, 'force')}`, v(c.Wm1, 'force'));
      h += eq('Wm2', 'π·b·G·y', `π×${n(c.b, 'length')}×${n(c.G, 'length')}×${n(c.gasket.y, 'stress')}`, v(c.Wm2, 'force'));
      h += `<p>Required bolt area Am = max(Wm1/Sb, Wm2/Sa) = <b>${v(c.Am, 'area')}</b>; provided Ab = <b>${v(c.Ab, 'area')}</b> ${badge(c.Ab >= c.Am)}</p>`;
      h += table(['Load', `Force (${unitLabel('force', U)})`, `Arm (${lu})`], [['HD', n(c.HD, 'force'), n(c.hD, 'length')], ['HT', n(c.HT, 'force'), n(c.hT, 'length')], ['HG', n(c.HG, 'force'), n(c.hG, 'length')]]);
      h += `<p>Mo (operating) = <b>${v(c.Mo, 'moment')}</b>, Mg (seating) = <b>${v(c.Mg, 'moment')}</b>. K = ${c.K.toFixed(4)}, T = ${c.Tf.toFixed(4)}, U = ${c.U.toFixed(4)}, Y = ${c.Y.toFixed(4)}, Z = ${c.Z.toFixed(4)}, F = ${c.F.toFixed(4)}, V = ${c.V.toFixed(4)}, f = ${c.f.toFixed(4)}, L = ${c.L.toFixed(4)}</p>`;
      h += table(['Stress', `Operating (${unitLabel('stress', U)})`, 'Allowable', `Seating (${unitLabel('stress', U)})`, 'Allowable', 'Status'],
        c.op.checks.map(([k, s, a], i) => { const [, s2, a2] = c.seat.checks[i]; return [k, n(s, 'stress'), n(a, 'stress'), n(s2, 'stress'), n(a2, 'stress'), badge(s <= a && s2 <= a2)]; }));
      h += `<p>Rigidity index J: operating ${c.Jop.toFixed(3)}, seating ${c.Jseat.toFixed(3)} (≤ 1.0) ${badge(c.Jop <= 1 && c.Jseat <= 1)} · Flange MAWP: <b>${v(f.mawp, 'pressure')}</b></p>`;
      h += '</section>';
    }
    sections.flanges = { title: 'Flanges', html: h };
  }

  // ---------------------------------------------------------- MDMT
  {
    let h = `<p class="lead">Impact test exemption per UCS-66 (curves A–D), UCS-66.1 coincident-ratio reduction, UG-20(f) and UHA-51(d). Required MDMT ${v(d.MDMT, 'temperature', 0)}.</p>`;
    h += table(['Part', 'Material', 'Curve', `Governing t (${lu})`, `Curve MDMT`, 'Ratio tr·E/(t−c)', 'Reduction', 'Part MDMT', 'Note'],
      R.mdmt.parts.map(p => [esc(p.name), esc(p.material), p.curve || '—', p.tg != null ? n(p.tg, 'length') : '—', p.base != null ? v(p.base, 'temperature', 0) : '—',
        p.ratio != null ? p.ratio.toFixed(3) : '—', p.reduction != null ? (Number.isFinite(p.reduction) ? `${(U === 'SI' ? p.reduction * 5 / 9 : p.reduction).toFixed(0)}°` : 'exempt (≤0.35)') : '—',
        v(p.mdmt, 'temperature', 0), esc(p.note || (p.ug20f ? 'UG-20(f) exempt' : ''))]));
    h += `<p>Computed vessel MDMT: <b>${v(R.mdmt.computed, 'temperature', 0)}</b> (governed by ${esc(R.mdmt.governing)}) ${badge(R.mdmt.ok)}</p>`;
    sections.mdmt = { title: 'MDMT', html: h };
  }

  // ---------------------------------------------------------- Hydrotest
  {
    const H = R.hydro;
    let h = `<p class="lead">${H.code}: test pressure = ${H.factor} × ${d.hydroBasis === 'design' ? 'design pressure' : 'MAWP'} × LSR, where LSR is the lowest ratio of allowable stress at test temperature to that at design temperature (governing: ${esc(H.lsrMat)}).</p>`;
    h += eq('P test', `${H.factor} · ${d.hydroBasis === 'design' ? 'P' : 'MAWP'} · LSR`, `${H.factor} × ${n(H.basis, 'pressure')} × ${H.LSR.toFixed(4)}`, v(H.Ptest, 'pressure'));
    h += `<p>Test position: ${esc(H.position)}. Membrane stress at test pressure (+ water head, new & cold) limited to 90% of yield:</p>`;
    h += table(['Element', `Pressure at element (${pu})`, `Stress (${unitLabel('stress', U)})`, `0.9·Sy (${unitLabel('stress', U)})`, 'Status'],
      H.elements.map(e => [esc(e.name), n(e.Pt, 'pressure'), n(e.stress, 'stress'), n(e.allow, 'stress'), badge(e.ok)]));
    sections.hydro = { title: 'Pressure test', html: h };
  }

  // ---------------------------------------------------------- Weights
  {
    const W = R.weights;
    let h = '<p class="lead">Weights from mid-surface area × thickness × density (nominal thickness), liquid by numerical integration of the inside profile.</p>';
    h += table(['Element', `Metal (${unitLabel('mass', U)})`, `Volume (${unitLabel('volume', U)})`, `Operating liquid (${unitLabel('mass', U)})`, `Insulation (${unitLabel('mass', U)})`],
      W.per.map(p => [esc(p.name), n(p.metal, 'mass', 0), n(p.vol, 'volume', 3), n(p.liquid, 'mass', 0), n(p.insul, 'mass', 0)]));
    h += table(['Weight case', 'Value'], [
      ['Shells & heads', v(W.shellsHeads, 'mass', 0)], ['Nozzles (necks, pads, flanges — estimate)', v(W.nozzles, 'mass', 0)],
      ['Fabricated (shop) weight', v(W.fabricated, 'mass', 0)], ['Details / internals', v(W.details, 'mass', 0)], ['Insulation', v(W.insulation, 'mass', 0)],
      ['<b>Empty</b>', `<b>${v(W.empty, 'mass', 0)}</b>`], ['Operating liquid', v(W.liquid + W.detailsOp, 'mass', 0)], ['<b>Operating</b>', `<b>${v(W.operating, 'mass', 0)}</b>`],
      ['Water to fill', v(W.water, 'mass', 0)], ['<b>Test (full of water)</b>', `<b>${v(W.test, 'mass', 0)}</b>`], ['Total internal volume', v(W.volume, 'volume', 3)],
    ]);
    sections.weights = { title: 'Weights', html: h };
  }

  // ---------------------------------------------------------- Wind & seismic
  if (R.wind || R.seismic) {
    let h = '';
    const per = R.supports?.period;
    if (per) h += `<p>Natural period (Rayleigh method): operating <b>${per.T.toFixed(3)} s</b>, empty ${per.Te.toFixed(3)} s; overall height ${v(per.H, 'length', 1)}.</p>`;
    if (R.wind) {
      const w = R.wind.input;
      h += `<h4>Wind — ASCE 7 style</h4><p class="lead">qz = 0.00256·Kz·Kzt·Kd·Ke·V² (psf), F = qz·G·Cf·Af. V = ${v(w.V, 'velocity', 0)}, Exposure ${esc(w.exposure)}, G = ${w.G}, Cf = ${w.Cf}, diameter ×${w.Dmult}.</p>`;
      h += table(['Station', `Elev. (${lu})`, 'qz (psf)', `Wind dia. (${lu})`, `Force (${unitLabel('force', U)})`], R.wind.forces.map(s => [esc(s.name), `${n(s.z0, 'length', 0)}–${n(s.z1, 'length', 0)}`, s.qz.toFixed(2), n(s.Dw, 'length', 1), n(s.F, 'force', 0)]));
      h += `<p>Base shear <b>${v(R.wind.base.V, 'force', 0)}</b>, base moment <b>${v(R.wind.base.M, 'moment', 0)}</b></p>`;
    }
    if (R.seismic) {
      const s = R.seismic, o = s.op;
      h += `<h4>Seismic — ASCE 7 equivalent lateral force</h4><p class="lead">Cs = SDS/(R/Ie) = ${(s.input.SDS / (s.input.R / s.input.Ie)).toFixed(4)}, limited by SD1/(T·R/Ie) = ${o.CsMax.toFixed(4)}, minimum ${o.CsMin.toFixed(4)} → <b>Cs = ${o.Cs.toFixed(4)}</b>. Vertical distribution exponent k = ${o.k.toFixed(2)}. Vertical acceleration 0.2·SDS = ${o.vertical.toFixed(3)} g (informational).</p>`;
      h += `<p>Operating: V = <b>${v(o.V, 'force', 0)}</b>, base moment <b>${v(s.base.M, 'moment', 0)}</b>. Empty: V = ${v(s.empty.V, 'force', 0)}, base moment ${v(s.baseEmpty.M, 'moment', 0)}.</p>`;
    }
    sections.loads = { title: 'Wind & seismic', html: h };
  }

  // ---------------------------------------------------------- Longitudinal
  if (R.longitudinal.length) {
    let h = '<p class="lead">Combined longitudinal stress at the bottom of each cylindrical/conical element (UG-22, UG-23): σ = P·R/(2t) − W/(2π·Rm·t) ± M/(π·Rm²·t). Tension limit S·E (×1.2 with wind/seismic, UG-23(d)); compression limit min(B, S) (×1.2 with wind/seismic). Hydrotest limits use the lesser of 0.9·Sy and 1.3·S.</p>';
    for (const l of R.longitudinal) {
      h += `<h4>${esc(l.name)} at elevation ${v(l.z, 'length', 1)} ${badge(l.ok)}</h4>`;
      h += table(['Load case', `P (${pu})`, `W above (${unitLabel('force', U)})`, `M (${unitLabel('moment', U)})`, 'σ pressure', 'σ weight', 'σ bending', 'Tension', 'Allow', 'Compr.', 'Allow', 'Status'],
        l.cases.map(c => [esc(c.case), n(c.P, 'pressure'), n(c.W, 'force', 0), n(c.M, 'moment', 0), n(c.sp, 'stress', 0), n(c.sw, 'stress', 0), n(c.sb, 'stress', 0), n(c.tens, 'stress', 0), n(c.allowT, 'stress', 0), n(c.comp, 'stress', 0), n(c.allowC, 'stress', 0), badge(c.ok)]), 'small');
    }
    sections.longitudinal = { title: 'Longitudinal stress', html: h };
  }

  // ---------------------------------------------------------- Supports
  if (R.supports && (R.supports.calc || R.supports.cases)) {
    const s = R.supports;
    let h = '';
    if (s.type === 'skirt') {
      const c = s.calc;
      h += `<p class="lead">Skirt, anchor bolts and base ring at grade. Governing overturning moment from ${esc(s.Mgov)}: <b>${v(s.M, 'moment', 0)}</b>.</p>`;
      h += table(['Check', 'Calculated', 'Allowable', 'Status'], c.checks.map(x => [esc(x.name), v(x.value, x.kind || 'stress'), v(x.allow, x.kind || 'stress'), badge(x.value <= x.allow)]));
      h += `<p>Anchor bolt tension per bolt = 4M/(N·BC) − W/N = <b>${v(c.boltLoad, 'force', 0)}</b>; required root area ${v(c.boltReqArea, 'area')} vs provided ${v(c.boltRootArea, 'area')}. Base ring overhang ${v(c.baseOverhang, 'length')}; t req = l·√(3·fc/Sb).</p>`;
    } else if (s.type === 'saddles') {
      h += `<p class="lead">L.P. Zick analysis of a horizontal vessel on two saddles. L (T/T) = ${v(s.L, 'length', 1)}, head depth H = ${v(s.H, 'length')}, mean radius R = ${v(s.R, 'length')}.</p>`;
      for (const c of s.cases) {
        h += `<h4>${esc(c.case)} — saddle load Q = ${v(c.Q, 'force', 0)} ${badge(c.ok)}</h4>`;
        h += `<p>M1 (at saddle) = ${v(c.M1, 'moment', 0)}, M2 (midspan) = ${v(c.M2, 'moment', 0)}; K1 = ${c.K1.toFixed(4)}, K2 = ${c.K2.toFixed(4)}, K3 = ${c.K3.toFixed(4)}, K5 = ${c.K5.toFixed(4)}${c.headStiffened ? ' (A ≤ R/2: heads stiffen the shell)' : ''}</p>`;
        h += table(['Stress', 'Calculated', 'Allowable', 'Status'], c.checks.map(x => [esc(x.name), v(x.value, 'stress'), v(x.allow, 'stress'), badge(x.value <= x.allow)]));
      }
    }
    sections.supports = { title: 'Supports', html: h };
  }

  return sections;

  function card(title, value, sub) {
    return `<div class="card"><div class="ct">${title}</div><div class="cv">${value}</div><div class="cs">${sub}</div></div>`;
  }

  function kindLabel(el) {
    if (el.type === 'shell') return 'Cylindrical shell';
    if (el.type === 'cone') return 'Conical section';
    return { ellipsoidal: `Ellipsoidal head ${el.ratio || 2}:1`, torispherical: 'Torispherical (F&D) head', hemispherical: 'Hemispherical head', conical: 'Conical head', flat: 'Flat head' }[el.kind] || el.kind;
  }

  function formulaFor(el, e, { S, E, P, t, c }) {
    const x = e.internal;
    const D = (el.D ?? 0) + 2 * c, R = D / 2;
    const tr = v(x.tr, 'length'), mw = v(x.mawp, 'pressure');
    const SE = `${n(S, 'stress')}×${E}`;
    if (el.type === 'shell') {
      if (x.code.startsWith('App')) return `<p>Thick wall (P > 0.385·S·E or t > R/2): App. 1-2 → tr = R·(√Z − 1) = ${tr}, MAWP = ${mw}</p>`;
      const El = el.El ?? E;
      return eq('tr (circ.)', 'P·R / (S·E − 0.6·P)', `${n(P, 'pressure')}×${n(R, 'length')} / (${SE} − 0.6×${n(P, 'pressure')})`, v(x.trCirc, 'length'))
        + eq('tr (long.)', 'P·R / (2·S·El + 0.4·P)', `${n(P, 'pressure')}×${n(R, 'length')} / (2×${n(S, 'stress')}×${El} + 0.4×${n(P, 'pressure')})`, v(x.trLong, 'length'))
        + eq('MAWP', 'S·E·t / (R + 0.6·t) − static head', `${SE}×${n(t, 'length')} / (${n(R, 'length')} + 0.6×${n(t, 'length')}) − ${n(e.staticHead, 'pressure')}`, v(e.mawp, 'pressure'));
    }
    if (el.type === 'cone') {
      const Dl = Math.max(el.D1, el.D2) + 2 * c;
      return `<p>Half-apex angle α = ${x.alpha.toFixed(2)}°</p>` + eq('tr', 'P·D / (2·cos α·(S·E − 0.6·P))', `${n(P, 'pressure')}×${n(Dl, 'length')} / (2×${Math.cos(x.alpha * Math.PI / 180).toFixed(4)}×(${SE} − 0.6×${n(P, 'pressure')}))`, tr)
        + `<p>MAWP (top) = ${v(e.mawp, 'pressure')}</p>`;
    }
    switch (el.kind) {
      case 'ellipsoidal':
        return eq('K', '(2 + (D/2h)²) / 6', `(2 + ${el.ratio || 2}²) / 6`, x.K.toFixed(4))
          + eq('tr', 'P·D·K / (2·S·E − 0.2·P)', `${n(P, 'pressure')}×${n(D, 'length')}×${x.K.toFixed(4)} / (2×${SE} − 0.2×${n(P, 'pressure')})`, tr)
          + eq('MAWP', '2·S·E·t / (K·D + 0.2·t) − static head', `2×${SE}×${n(t, 'length')} / (${x.K.toFixed(4)}×${n(D, 'length')} + 0.2×${n(t, 'length')}) − ${n(e.staticHead, 'pressure')}`, v(e.mawp, 'pressure'));
      case 'torispherical': {
        const L = (el.crownR || el.D) + c, r = (el.knuckleR || 0.06 * (el.crownR || el.D)) + c;
        return eq('M', '¼·(3 + √(L/r))', `0.25×(3 + √(${n(L, 'length')}/${n(r, 'length')}))`, x.M.toFixed(4))
          + eq('tr', 'P·L·M / (2·S·E − 0.2·P)', `${n(P, 'pressure')}×${n(L, 'length')}×${x.M.toFixed(4)} / (2×${SE} − 0.2×${n(P, 'pressure')})`, tr)
          + eq('MAWP', '2·S·E·t / (L·M + 0.2·t) − static head', `2×${SE}×${n(t, 'length')} / (${n(L, 'length')}×${x.M.toFixed(4)} + 0.2×${n(t, 'length')}) − ${n(e.staticHead, 'pressure')}`, v(e.mawp, 'pressure'));
      }
      case 'hemispherical':
        if (x.code.startsWith('App')) return `<p>Thick sphere: App. 1-3 → tr = ${tr}, MAWP = ${mw}</p>`;
        return eq('tr', 'P·L / (2·S·E − 0.2·P)', `${n(P, 'pressure')}×${n(R, 'length')} / (2×${SE} − 0.2×${n(P, 'pressure')})`, tr)
          + eq('MAWP', '2·S·E·t / (L + 0.2·t) − static head', `2×${SE}×${n(t, 'length')} / (${n(R, 'length')} + 0.2×${n(t, 'length')}) − ${n(e.staticHead, 'pressure')}`, v(e.mawp, 'pressure'));
      case 'conical': {
        const a = el.alpha || 30;
        return eq('tr', 'P·D / (2·cos α·(S·E − 0.6·P))', `${n(P, 'pressure')}×${n(D, 'length')} / (2×${Math.cos(a * Math.PI / 180).toFixed(4)}×(${SE} − 0.6×${n(P, 'pressure')}))`, tr) + `<p>MAWP (top) = ${v(e.mawp, 'pressure')}</p>`;
      }
      case 'flat':
        return eq('tr', 'd·√(C·P / (S·E))', `${n(D, 'length')}×√(${el.C ?? 0.33}×${n(P, 'pressure')} / (${SE}))`, tr)
          + eq('MAWP', '(t/d)²·S·E / C − static head', `(${n(t, 'length')}/${n(D, 'length')})²×${SE} / ${el.C ?? 0.33} − ${n(e.staticHead, 'pressure')}`, v(e.mawp, 'pressure'));
      default: return '';
    }
  }
}

export function materialInfo(id) {
  try { const m = getMaterial(id); return `${m.spec} ${m.grade} (${m.form}), Sy ${m.Sy / 1000} ksi, Su ${m.Su / 1000} ksi${m.curve ? `, UCS-66 curve ${m.curve}` : ''}`; } catch { return ''; }
}
