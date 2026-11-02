// 2D elevation sketch of the vessel as SVG. Vertical vessels are drawn with
// the axis upward; horizontal vessels left to right.
import { layout } from '../engine/geometry.js';
import { fmt } from '../engine/units.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let uidCounter = 0;

export function sketch(model, { selected, units = 'US', results } = {}) {
  const uid = `s${++uidCounter}`;
  let placed;
  try { placed = layout(model.elements); } catch { return '<svg viewBox="0 0 10 10"></svg>'; }
  if (!placed.length) return '<svg viewBox="0 0 10 10"></svg>';
  const vertical = model.design.orientation !== 'horizontal';
  const sup = model.supports || {};
  const skirt = vertical && sup.type === 'skirt' ? sup.skirt : null;
  const bottomLen = placed[0].type === 'head' ? placed[0].len : 0;
  const zOff = skirt ? Math.max(skirt.height - bottomLen, 0) : 0;
  const total = placed[placed.length - 1].z1;
  const Rmax = Math.max(...placed.map(p => (p.type === 'cone' ? Math.max(p.D1, p.D2) : p.D) / 2 + p.t));
  const nozReach = Math.max(0, ...(model.nozzles || []).map(n => n.projection || 6));
  const saddleH = !vertical && sup.type === 'saddles' ? Rmax * 0.45 : 0;

  // World extents: a = axial, r = radial
  const aMin = -Math.max(Rmax * 0.15, nozReach * 0.6), aMax = total + zOff + Math.max(Rmax * 0.15, nozReach * 0.6);
  const rExt = Rmax + nozReach + Rmax * 0.15;
  const W = 1000, H = 1000;
  let toXY, scale;
  if (vertical) {
    scale = Math.min((H - 80) / (aMax - aMin), (W - 160) / (2 * rExt));
    toXY = (a, r) => [W / 2 + r * scale, H - 40 - (a - aMin) * scale];
  } else {
    scale = Math.min((W - 80) / (aMax - aMin), (H - 160) / (2 * rExt + saddleH));
    toXY = (a, r) => [40 + (a - aMin) * scale, H / 2 - saddleH * scale / 2 - r * scale];
  }
  const pt = (a, r) => toXY(a, r).map(v => v.toFixed(1)).join(',');

  // Profiles
  const N = 40;
  const outer = [], inner = [];
  for (const p of placed) {
    for (let i = 0; i <= N; i++) {
      const zl = p.len * i / N;
      const r = p.type === 'head' && p.kind === 'flat' ? p.D / 2 : p.r(zl);
      let ro = r + p.t;
      // close the head apex outward by the thickness
      const za = p.z0 + zl + zOff;
      let zo = za;
      if (p.type === 'head' && p.kind !== 'flat') {
        if (p.facing === 'start' && i === 0) zo = za - p.t;
        if (p.facing === 'end' && i === N) zo = za + p.t;
        if (r < 1e-6) ro = 0;
      }
      outer.push([zo, ro]);
      inner.push([za, r]);
    }
  }
  const poly = (pts, sign = 1) => pts.map(([a, r]) => pt(a, sign * r));
  const outerPath = [...poly(outer, 1), ...poly(outer.slice().reverse(), -1)].join(' ');
  const innerPath = [...poly(inner, 1), ...poly(inner.slice().reverse(), -1)].join(' ');

  const out = [];
  out.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="sketch" role="img" aria-label="Vessel elevation sketch">`);
  out.push(`<defs><clipPath id="inside-${uid}"><polygon points="${innerPath}"/></clipPath>
    </defs>`);

  // Supports (behind)
  if (skirt) {
    const ro = skirt.D / 2, ri = ro - skirt.t;
    const top = skirt.height;
    out.push(`<polygon class="support" points="${pt(0, ri)} ${pt(0, ro)} ${pt(top, ro)} ${pt(top, ri)}"/>`);
    out.push(`<polygon class="support" points="${pt(0, -ri)} ${pt(0, -ro)} ${pt(top, -ro)} ${pt(top, -ri)}"/>`);
    out.push(`<polygon class="support" points="${pt(0, -skirt.baseOD / 2)} ${pt(0, skirt.baseOD / 2)} ${pt(skirt.baseT || 1, skirt.baseOD / 2)} ${pt(skirt.baseT || 1, -skirt.baseOD / 2)}"/>`);
    const [gx1, gy] = toXY(0, -rExt), [gx2] = toXY(0, rExt);
    out.push(`<line class="grade" x1="${gx1}" y1="${gy}" x2="${gx2}" y2="${gy}"/>`);
  }
  if (!vertical && sup.type === 'saddles') {
    const A = sup.saddles?.A || 24;
    const tl0 = placed[0].type === 'head' ? placed[0].z1 - (placed[0].sf || 0) : 0;
    const last = placed[placed.length - 1];
    const tl1 = last.type === 'head' ? last.z0 + (last.sf || 0) : last.z1;
    const b = sup.saddles?.b || 8;
    for (const a of [tl0 + A, tl1 - A]) {
      const r0 = -(Rmax) * 0.85, r1 = -(Rmax + saddleH);
      out.push(`<polygon class="support" points="${pt(a - b * 1.5, r1)} ${pt(a + b * 1.5, r1)} ${pt(a + b / 2, r0)} ${pt(a - b / 2, r0)}"/>`);
    }
    const [gx1, gy] = toXY(aMin, -(Rmax + saddleH)), [gx2] = toXY(aMax, -(Rmax + saddleH));
    out.push(`<line class="grade" x1="${gx1}" y1="${gy}" x2="${gx2}" y2="${gy}"/>`);
  }

  // Vessel
  out.push(`<polygon class="metal" points="${outerPath}"/>`);
  out.push(`<polygon class="cavity" points="${innerPath}"/>`);

  // Liquid
  const d = model.design;
  if (d.sg > 0 && d.level > 0) {
    if (vertical) {
      const lv = Math.min(d.level, total) + zOff;
      out.push(`<g clip-path="url(#inside-${uid})"><polygon class="liquid" points="${pt(zOff - 1, -Rmax)} ${pt(zOff - 1, Rmax)} ${pt(lv, Rmax)} ${pt(lv, -Rmax)}"/></g>`);
    } else {
      const lv = -Rmax + Math.min(d.level, 2 * Rmax);
      out.push(`<g clip-path="url(#inside-${uid})"><polygon class="liquid" points="${pt(-1, -Rmax)} ${pt(total + 1, -Rmax)} ${pt(total + 1, lv)} ${pt(-1, lv)}"/></g>`);
    }
  }

  // Element bands (clickable) and seams
  placed.forEach((p, i) => {
    const pts = [];
    for (let k = 0; k <= N; k++) { const zl = p.len * k / N; const r = p.type === 'head' && p.kind === 'flat' ? p.D / 2 : p.r(zl); pts.push([p.z0 + zl + zOff, r + p.t]); }
    const band = [...poly(pts, 1), ...poly(pts.slice().reverse(), -1)].join(' ');
    const res = results?.elements?.[i];
    const bad = res && (res.error || res.ok === false || res.okExt === false);
    out.push(`<polygon class="band${selected === `el:${i}` ? ' sel' : ''}${bad ? ' bad' : ''}" data-select="el:${i}" points="${band}"><title>${esc(p.name)}</title></polygon>`);
    if (i > 0) { const r = p.r(0) + p.t; out.push(`<line class="seam" x1="${toXY(p.z0 + zOff, -r)[0]}" y1="${toXY(p.z0 + zOff, -r)[1]}" x2="${toXY(p.z0 + zOff, r)[0]}" y2="${toXY(p.z0 + zOff, r)[1]}"/>`); }
  });

  // Stiffening rings
  for (const [i, rg] of (model.rings || []).entries()) {
    const host = placed.find(p => p.type === 'shell' && rg.z >= p.z0 && rg.z <= p.z1);
    if (!host) continue;
    const r0 = host.D / 2 + host.t, a = rg.z + zOff;
    for (const s of [1, -1]) out.push(`<polygon class="ring${selected === `ring:${i}` ? ' sel' : ''}" data-select="ring:${i}" points="${pt(a - rg.w / 2, s * r0)} ${pt(a + rg.w / 2, s * r0)} ${pt(a + rg.w / 2, s * (r0 + rg.h))} ${pt(a - rg.w / 2, s * (r0 + rg.h))}"/>`);
  }

  // Nozzles
  for (const [i, n] of (model.nozzles || []).entries()) {
    const host = placed.find(p => p.id === n.on);
    if (!host) continue;
    const sel = selected === `noz:${i}` ? ' sel' : '';
    const res = results?.nozzles?.[i];
    const bad = res && (res.error || res.ok === false) ? ' bad' : '';
    const proj = n.projection || 6;
    const ro = n.OD / 2;
    if (host.type === 'head') {
      // Axial nozzle on a head at radial offset
      const off = n.offset || 0;
      const zl = host.facing === 'start' ? 0 : host.len;
      const rAt = off;
      // Find axial position on head surface at radius off
      let aSurf = host.z0 + zl;
      for (let k = 0; k <= 200; k++) {
        const zz = host.len * k / 200;
        if (host.r(zz) >= Math.abs(rAt)) { aSurf = host.z0 + zz; if (host.facing === 'start') break; }
      }
      const dir = host.facing === 'start' ? -1 : 1;
      const a0 = aSurf + zOff, a1 = (host.facing === 'start' ? host.z0 : host.z1) + zOff + dir * proj;
      out.push(`<polygon class="nozzle${sel}${bad}" data-select="noz:${i}" points="${pt(a0, off - ro)} ${pt(a1, off - ro)} ${pt(a1, off + ro)} ${pt(a0, off + ro)}"><title>${esc(n.mark)} ${esc(n.name)}</title></polygon>`);
      if (n.flangeClass) out.push(`<polygon class="flange" points="${pt(a1, off - ro * 1.6)} ${pt(a1 + dir * ro * 0.35, off - ro * 1.6)} ${pt(a1 + dir * ro * 0.35, off + ro * 1.6)} ${pt(a1, off + ro * 1.6)}"/>`);
      out.push(label(toXY(a1 + dir * ro * 0.9, off), n.mark));
    } else {
      const a = host.z0 + (n.z ?? host.len / 2) + zOff;
      const rShell = host.r(n.z ?? host.len / 2) + host.t;
      const ang = ((n.angle || 0) % 360 + 360) % 360;
      if (ang === 90 || ang === 270) {
        const [cx, cy] = toXY(a, 0);
        out.push(`<circle class="nozzle${sel}${bad}" data-select="noz:${i}" cx="${cx}" cy="${cy}" r="${ro * scale}"><title>${esc(n.mark)} ${esc(n.name)}</title></circle>`);
        if (n.padOD > 0) out.push(`<circle class="pad" cx="${cx}" cy="${cy}" r="${n.padOD / 2 * scale}"/>`);
        out.push(label([cx + ro * scale + 6, cy], n.mark));
      } else {
        const s = ang > 90 && ang < 270 ? -1 : 1;
        const r1 = s * (rShell + proj);
        if (n.padOD > 0) out.push(`<polygon class="pad" points="${pt(a - n.padOD / 2, s * rShell)} ${pt(a + n.padOD / 2, s * rShell)} ${pt(a + n.padOD / 2, s * (rShell + n.padT))} ${pt(a - n.padOD / 2, s * (rShell + n.padT))}"/>`);
        out.push(`<polygon class="nozzle${sel}${bad}" data-select="noz:${i}" points="${pt(a - ro, s * (rShell - host.t))} ${pt(a + ro, s * (rShell - host.t))} ${pt(a + ro, r1)} ${pt(a - ro, r1)}"><title>${esc(n.mark)} ${esc(n.name)}</title></polygon>`);
        if (n.flangeClass) out.push(`<polygon class="flange" points="${pt(a - ro * 1.6, r1)} ${pt(a + ro * 1.6, r1)} ${pt(a + ro * 1.6, r1 + s * ro * 0.35)} ${pt(a - ro * 1.6, r1 + s * ro * 0.35)}"/>`);
        out.push(label(toXY(a, r1 + s * (ro * 0.35 + 8 / scale)), n.mark));
      }
    }
  }

  // Dimensions
  const dimA = (a0, a1, rr, text) => {
    const [x0, y0] = toXY(a0, rr), [x1, y1] = toXY(a1, rr);
    const [tx, ty] = [(x0 + x1) / 2, (y0 + y1) / 2];
    return `<line class="dim" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" marker-start="url(#arr-${uid})" marker-end="url(#arr-${uid})"/>
      <text class="dimtext" x="${tx + (vertical ? 6 : 0)}" y="${ty + (vertical ? 0 : -6)}" ${vertical ? 'writing-mode="tb" dominant-baseline="middle"' : 'text-anchor="middle"'}>${esc(text)}</text>`;
  };
  out.push(`<defs><marker id="arr-${uid}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrow"/></marker></defs>`);
  const tl0 = placed[0].type === 'head' ? placed[0].z1 - (placed[0].sf || 0) : 0;
  const last = placed[placed.length - 1];
  const tl1 = last.type === 'head' ? last.z0 + (last.sf || 0) : last.z1;
  out.push(dimA(tl0 + zOff, tl1 + zOff, -(Rmax + nozReach * 0.4 + Rmax * 0.08), `T/T ${fmt(tl1 - tl0, 'length', units, units === 'SI' ? 0 : 2)}`));

  out.push('</svg>');
  return out.join('\n');

  function label([x, y], text) {
    return `<text class="nlabel" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${esc(text)}</text>`;
  }
}
