// DOM helpers. Everything user-provided goes in as text nodes, never as HTML.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'required' || k === 'hidden') el[k] = Boolean(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

// ---------------------------------------------------------------- dates
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const parse = (s) => new Date(`${s}T00:00:00Z`);

export function fmtDate(s) {
  if (!s) return '';
  const d = parse(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtDay(s) {
  const d = parse(s);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function fmtDateTime(sqlUtc) {
  // SQLite datetime('now') is UTC "YYYY-MM-DD HH:MM:SS"
  const d = new Date(`${sqlUtc.replace(' ', 'T')}Z`);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function addDays(s, n) {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

// "due today", "in 3 days", "5 days late"
export function deadlineText(deadline, today) {
  if (!deadline) return '';
  const n = daysBetween(today, deadline);
  if (n === 0) return 'due today';
  if (n === 1) return 'tomorrow';
  if (n > 1) return `in ${n} days`;
  return n === -1 ? '1 day late' : `${-n} days late`;
}

export function deadlineCell(deadline, today, done) {
  if (!deadline) return h('span', { class: 'muted' }, '—');
  const n = daysBetween(today, deadline);
  const cls = done ? 'muted' : n < 0 ? 'pill pill-bad' : n <= 7 ? 'pill pill-warn' : 'muted';
  return h('span', {}, fmtDate(deadline), ' ', h('span', { class: `small ${cls}` }, done ? '' : deadlineText(deadline, today)));
}

// ---------------------------------------------------------------- status pills
const STATUS_KIND = {
  'Not started': '', 'In progress': 'accent', 'On hold': 'warn', 'Under review': 'accent', Completed: 'ok', Done: 'ok',
  'In preparation': '', Submitted: 'accent', Approved: 'ok', 'Approved with comments': 'ok',
  'Revise & resubmit': 'warn', Rejected: 'bad', High: 'bad', Medium: 'warn', Low: '',
};

export function pill(text, kind) {
  const k = kind ?? STATUS_KIND[text] ?? '';
  return h('span', { class: `pill${k ? ` pill-${k}` : ''}` }, text);
}

export function progress(done, total) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i'));
  bar.firstChild.style.width = `${pct}%`;
  return bar;
}

// ---------------------------------------------------------------- toasts
export function toast(message, isError = false) {
  const t = h('div', { class: `toast${isError ? ' is-error' : ''}`, role: isError ? 'alert' : 'status' }, message);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), isError ? 6000 : 3000);
}

// ---------------------------------------------------------------- forms in a dialog

// fields: [{name, label, type: text|textarea|date|select|password|email|checkbox, options:[[value,label]], required, full, value, placeholder, hint}]
let fieldSeq = 0;

export function buildFields(fields, values = {}) {
  return fields.map((f) => {
    const value = values[f.name] ?? f.value ?? '';
    const id = `f-${f.name}-${++fieldSeq}`;
    const hintId = f.hint ? `${id}-hint` : undefined;
    const common = { id, name: f.name, required: f.required, 'aria-describedby': hintId };
    let control;
    if (f.type === 'select') {
      control = h('select', common,
        f.options.map(([v, label]) => h('option', { value: v, selected: String(v) === String(value ?? '') }, label)));
    } else if (f.type === 'textarea') {
      control = h('textarea', { ...common, maxlength: f.max, placeholder: f.placeholder, value });
    } else if (f.type === 'checkbox') {
      return h('label', { class: `check${f.full ? ' full' : ''}` },
        h('input', { type: 'checkbox', name: f.name, checked: Boolean(value) }), f.label);
    } else {
      control = h('input', {
        ...common, type: f.type || 'text', maxlength: f.max, placeholder: f.placeholder,
        value, autocomplete: f.autocomplete || 'off', minlength: f.minlength,
      });
    }
    return h('div', { class: `field${f.full ? ' full' : ''}` }, h('label', { for: id }, f.label), control,
      f.hint ? h('small', { class: 'muted', id: hintId }, f.hint) : null);
  });
}

export function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    out[f.name] = f.type === 'checkbox' ? el.checked : el.value;
  }
  return out;
}

// Opens a dialog with a form. onSubmit(values) may throw; its message is shown in the dialog.
export function formDialog({ title, intro, fields, values, submitLabel = 'Save', danger, onSubmit }) {
  return new Promise((resolve) => {
    const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const submit = h('button', { type: 'submit', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}` }, submitLabel);
    const cancel = h('button', { type: 'button', class: 'btn' }, 'Cancel');
    const form = h('form', { method: 'dialog', novalidate: false },
      h('h2', {}, title),
      intro ? h('p', { class: 'muted' }, intro) : null,
      fields?.length ? h('div', { class: 'form-grid' }, buildFields(fields, values)) : null,
      error,
      h('div', { class: 'modal-actions' }, cancel, submit));
    const dialog = h('dialog', { class: 'modal' }, form);
    const close = (result) => { dialog.close(); dialog.remove(); resolve(result); };
    cancel.addEventListener('click', () => close(null));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      try {
        const result = await onSubmit(readForm(form, fields || []));
        close(result ?? true);
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        submit.disabled = false;
      }
    });
    document.body.append(dialog);
    dialog.showModal();
    const first = form.querySelector('input, select, textarea');
    if (first) first.focus();
  });
}

export function confirmDialog(title, intro, submitLabel = 'Delete') {
  return formDialog({ title, intro, fields: [], submitLabel, danger: true, onSubmit: () => true });
}

export function emptyRow(colspan, text) {
  return h('tr', {}, h('td', { colspan, class: 'empty' }, text));
}
