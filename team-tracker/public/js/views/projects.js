import { api } from '../api.js';
import { PRIORITIES, PROJECT_STATUSES, STAGES, asOptions, userOptions } from '../constants.js';
import { deadlineCell, emptyRow, formDialog, h, mount, pill, progress } from '../ui.js';

// Filters survive moving between pages during a visit.
const filters = { status: 'active', q: '', mine: false };

export function projectFields(users) {
  return [
    { name: 'code', label: 'Project code', required: true, max: 30, placeholder: 'e.g. PSP01' },
    { name: 'name', label: 'Project name', required: true, max: 150 },
    { name: 'client', label: 'Client', max: 150 },
    { name: 'lead_id', label: 'Project lead', type: 'select', options: userOptions(users, 'No lead') },
    { name: 'stage', label: 'Stage', type: 'select', options: asOptions(STAGES, 'Not set') },
    { name: 'status', label: 'Status', type: 'select', options: asOptions(PROJECT_STATUSES) },
    { name: 'priority', label: 'Priority', type: 'select', options: asOptions(PRIORITIES) },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'deadline', label: 'Deadline', type: 'date' },
    { name: 'description', label: 'Description', type: 'textarea', max: 2000, full: true },
  ];
}

export function projectPayload(v) {
  return { ...v, lead_id: v.lead_id || null, stage: v.stage || null };
}

export async function renderProjects(main, app) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  if (filters.mine) params.set('mine', '1');
  const rows = await api.get(`/projects?${params}`);
  const today = app.today;
  const refresh = () => renderProjects(main, app);

  const newProject = () => formDialog({
    title: 'New project',
    fields: projectFields(app.users),
    values: { status: 'Not started', priority: 'Medium', lead_id: app.me.id },
    submitLabel: 'Create project',
    onSubmit: (v) => api.post('/projects', projectPayload(v)),
  }).then((r) => r && app.go(`#/projects/${r.id}`));

  const search = h('input', { type: 'search', placeholder: 'Search code, name or client', value: filters.q, 'aria-label': 'Search projects' });
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      filters.q = search.value.trim();
      await refresh();
      const again = main.querySelector('input[type="search"]');
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }, 250);
  });
  const status = h('select', { 'aria-label': 'Status filter', onchange: (e) => { filters.status = e.target.value; refresh(); } },
    [['active', 'All active'], ['', 'All projects'], ...PROJECT_STATUSES.map((s) => [s, s])]
      .map(([v, l]) => h('option', { value: v, selected: filters.status === v }, l)));
  const mine = h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: filters.mine, onchange: (e) => { filters.mine = e.target.checked; refresh(); } }), 'Only mine');

  const tr = (p) => {
    const row = h('tr', { class: 'link-row', onclick: () => app.go(`#/projects/${p.id}`) },
      h('td', { class: 'nowrap' }, h('a', { href: `#/projects/${p.id}`, class: 'mono' }, p.code)),
      h('td', { class: 'wide' }, p.name, p.client ? h('div', { class: 'small muted' }, p.client) : null),
      h('td', { class: 'nowrap' }, p.stage || h('span', { class: 'muted' }, '—')),
      h('td', {}, pill(p.status)),
      h('td', {}, pill(p.priority)),
      h('td', { class: 'nowrap' }, p.lead_name || h('span', { class: 'muted' }, '—')),
      h('td', { class: 'small' }, p.members || h('span', { class: 'muted' }, '—')),
      h('td', { class: 'nowrap' }, p.parts_total
        ? h('div', { class: 'stack small num' }, `${p.parts_done} of ${p.parts_total}`, progress(p.parts_done, p.parts_total))
        : h('span', { class: 'muted' }, '—')),
      h('td', { class: 'nowrap' }, p.latest_rev ? h('span', {}, h('span', { class: 'mono' }, p.latest_rev), ' ', h('span', { class: 'small muted' }, p.latest_rev_status)) : h('span', { class: 'muted' }, '—')),
      h('td', { class: 'nowrap' }, deadlineCell(p.deadline, today, p.status === 'Completed')));
    return row;
  };

  mount(main,
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Projects'), h('p', { class: 'sub' }, `${rows.length} ${rows.length === 1 ? 'project' : 'projects'}`)),
      h('button', { type: 'button', class: 'btn btn-primary', onclick: newProject }, 'New project')),
    h('section', { class: 'card' },
      h('div', { class: 'row' }, search, status, mine),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ['Code', 'Project', 'Stage', 'Status', 'Priority', 'Lead', 'Team', 'Parts done', 'Latest rev', 'Deadline'].map((t) => h('th', {}, t)))),
          h('tbody', {}, rows.length ? rows.map(tr) : emptyRow(10, filters.q || filters.mine || filters.status ? 'No projects match these filters.' : 'No projects yet. Create the first one.'))))));
}
