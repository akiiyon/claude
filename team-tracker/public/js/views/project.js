import { api } from '../api.js';
import { ASSIGNMENT_STATUSES, REVISION_STATUSES, asOptions, userOptions } from '../constants.js';
import {
  confirmDialog, deadlineCell, emptyRow, fmtDate, fmtDateTime, formDialog, h, mount, pill, progress, toast,
} from '../ui.js';
import { projectFields, projectPayload } from './projects.js';

export async function renderProject(main, app, id) {
  const p = await api.get(`/projects/${id}`);
  const today = app.today;
  const users = app.users;
  const refresh = () => renderProject(main, app, id);
  const act = async (fn, message) => {
    try {
      await fn();
      if (message) toast(message);
      await refresh();
    } catch (err) {
      toast(err.message, true);
    }
  };
  const canDelete = app.isAdmin() || p.lead_id === app.me.id;
  const done = p.assignments.filter((a) => a.status === 'Done').length;

  // ---------------------------------------------------------------- project
  const editProject = () => formDialog({
    title: `Edit ${p.code}`,
    fields: projectFields(users),
    values: p,
    onSubmit: (v) => api.patch(`/projects/${id}`, projectPayload(v)),
  }).then((ok) => ok && refresh());

  const deleteProject = async () => {
    if (!(await confirmDialog(`Delete ${p.code}?`, 'This removes the project with its parts, revisions and history. Daily tasks linked to it stay, without the link.'))) return;
    try {
      await api.del(`/projects/${id}`);
      toast(`${p.code} deleted`);
      app.go('#/projects');
    } catch (err) {
      toast(err.message, true);
    }
  };

  const statusSelect = (value, options, onChange, label) => h('select', { 'aria-label': label, onchange: (e) => onChange(e.target.value) },
    options.map((s) => h('option', { value: s, selected: s === value }, s)));

  // ---------------------------------------------------------------- parts
  const assignmentFields = [
    { name: 'user_id', label: 'Person', type: 'select', required: true, options: userOptions(users) },
    { name: 'part', label: 'Part of the work', required: true, max: 200, placeholder: 'e.g. Intake gate design calculations' },
    { name: 'status', label: 'Status', type: 'select', options: asOptions(ASSIGNMENT_STATUSES) },
    { name: 'due_date', label: 'Due date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea', max: 1000, full: true },
  ];
  const editAssignment = (a) => formDialog({
    title: a ? 'Edit part' : 'Assign a part',
    fields: assignmentFields,
    values: a || { user_id: app.me.id, status: 'Not started' },
    onSubmit: (v) => (a ? api.patch(`/assignments/${a.id}`, v) : api.post(`/projects/${id}/assignments`, v)),
  }).then((ok) => ok && refresh());

  const assignmentRow = (a) => h('tr', {},
    h('td', { class: 'nowrap' }, a.user_name),
    h('td', { class: 'wide' }, a.part, a.notes ? h('div', { class: 'small muted description' }, a.notes) : null),
    h('td', {}, statusSelect(a.status, ASSIGNMENT_STATUSES, (s) => act(() => api.patch(`/assignments/${a.id}`, { status: s }), 'Status updated'), `Status of ${a.part}`)),
    h('td', { class: 'nowrap' }, deadlineCell(a.due_date, today, a.status === 'Done')),
    h('td', { class: 'nowrap' },
      h('button', { type: 'button', class: 'icon-btn', onclick: () => editAssignment(a) }, 'Edit'),
      h('button', {
        type: 'button', class: 'icon-btn',
        onclick: async () => {
          if (await confirmDialog('Remove this part?', `${a.part} (${a.user_name})`, 'Remove')) act(() => api.del(`/assignments/${a.id}`), 'Part removed');
        },
      }, 'Remove')));

  // ---------------------------------------------------------------- revisions
  const revisionFields = [
    { name: 'rev', label: 'Revision', required: true, max: 20, placeholder: 'e.g. R0' },
    { name: 'status', label: 'Status', type: 'select', options: asOptions(REVISION_STATUSES) },
    { name: 'description', label: 'What changed / what was submitted', max: 300, full: true },
    { name: 'submitted_on', label: 'Submitted on', type: 'date' },
    { name: 'returned_on', label: 'Returned on', type: 'date' },
    { name: 'submitted_by', label: 'Submitted by', type: 'select', options: userOptions(users, 'Not set') },
    { name: 'remarks', label: 'Remarks / client comments', type: 'textarea', max: 1000, full: true },
  ];
  const nextRev = () => {
    const last = p.revisions[0]?.rev;
    const m = last && last.match(/^(.*?)(\d+)$/);
    return m ? `${m[1]}${Number(m[2]) + 1}` : last ? '' : 'R0';
  };
  const editRevision = (v) => formDialog({
    title: v ? `Edit revision ${v.rev}` : 'Add revision',
    fields: revisionFields,
    values: v || { rev: nextRev(), status: 'In preparation' },
    onSubmit: (vals) => {
      const body = { ...vals, submitted_by: vals.submitted_by || null };
      return v ? api.patch(`/revisions/${v.id}`, body) : api.post(`/projects/${id}/revisions`, body);
    },
  }).then((ok) => ok && refresh());

  const revisionRow = (v) => h('tr', {},
    h('td', { class: 'nowrap mono' }, v.rev),
    h('td', { class: 'wide' }, v.description || h('span', { class: 'muted' }, '—'), v.remarks ? h('div', { class: 'small muted description' }, v.remarks) : null),
    h('td', {}, statusSelect(v.status, REVISION_STATUSES, (s) => act(() => api.patch(`/revisions/${v.id}`, { status: s }), 'Status updated'), `Status of ${v.rev}`)),
    h('td', { class: 'nowrap' }, fmtDate(v.submitted_on) || h('span', { class: 'muted' }, '—')),
    h('td', { class: 'nowrap' }, fmtDate(v.returned_on) || h('span', { class: 'muted' }, '—')),
    h('td', { class: 'nowrap' }, v.submitted_by_name || h('span', { class: 'muted' }, '—')),
    h('td', { class: 'nowrap' },
      h('button', { type: 'button', class: 'icon-btn', onclick: () => editRevision(v) }, 'Edit'),
      h('button', {
        type: 'button', class: 'icon-btn',
        onclick: async () => {
          if (await confirmDialog(`Delete revision ${v.rev}?`, 'Its record will be removed from this project.')) act(() => api.del(`/revisions/${v.id}`), 'Revision deleted');
        },
      }, 'Delete')));

  // ---------------------------------------------------------------- page
  const detail = (label, value) => h('div', {}, h('dt', {}, label), h('dd', {}, value || h('span', { class: 'muted' }, '—')));

  mount(main,
    h('p', {}, h('a', { href: '#/projects' }, '← All projects')),
    h('div', { class: 'page-head' },
      h('div', {},
        h('h1', {}, h('span', { class: 'mono' }, p.code), ' · ', p.name),
        h('div', { class: 'row' }, pill(p.status), pill(p.priority), p.stage ? pill(p.stage, '') : null)),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: editProject }, 'Edit project'),
        canDelete ? h('button', { type: 'button', class: 'btn btn-danger', onclick: deleteProject }, 'Delete') : null)),

    h('section', { class: 'card' },
      h('dl', { class: 'details' },
        detail('Client', p.client),
        detail('Project lead', p.lead_name),
        detail('Start date', fmtDate(p.start_date)),
        detail('Deadline', p.deadline ? deadlineCell(p.deadline, today, p.status === 'Completed') : null),
        detail('Parts done', p.assignments.length ? h('div', { class: 'stack small num' }, `${done} of ${p.assignments.length}`, progress(done, p.assignments.length)) : null),
        detail('Latest revision', p.revisions[0] ? `${p.revisions[0].rev} · ${p.revisions[0].status}` : null)),
      p.description ? h('p', { class: 'description' }, p.description) : null),

    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', {}, 'Who is doing what'),
        h('button', { type: 'button', class: 'btn', onclick: () => editAssignment(null) }, 'Assign a part')),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ['Person', 'Part', 'Status', 'Due', ''].map((t) => h('th', {}, t)))),
          h('tbody', {}, p.assignments.length ? p.assignments.map(assignmentRow) : emptyRow(5, 'No parts assigned yet.'))))),

    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', {}, 'Revisions'),
        h('button', { type: 'button', class: 'btn', onclick: () => editRevision(null) }, 'Add revision')),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ['Rev', 'Description', 'Status', 'Submitted', 'Returned', 'By', ''].map((t) => h('th', {}, t)))),
          h('tbody', {}, p.revisions.length ? p.revisions.map(revisionRow) : emptyRow(7, 'No revisions yet.'))))),

    h('section', { class: 'card' },
      h('h2', {}, 'History'),
      p.activity.length
        ? h('ul', { class: 'list activity' }, p.activity.map((a) => h('li', {},
          h('time', { datetime: a.created_at }, fmtDateTime(a.created_at)),
          h('strong', {}, a.user_name || 'Someone'), ' ', a.action)))
        : h('p', { class: 'empty' }, 'No changes yet.')));
}
