import { api } from '../api.js';
import { emptyRow, formDialog, h, mount, pill } from '../ui.js';

export async function renderPeople(main, app) {
  if (!app.isAdmin()) {
    mount(main, h('div', { class: 'card' }, h('h1', {}, 'People'), h('p', { class: 'muted' }, 'Only an admin can manage the team.')));
    return;
  }
  const people = await api.get('/users?all=1');
  const refresh = async () => {
    await app.loadUsers();
    await renderPeople(main, app);
  };

  const fields = (isNew) => [
    { name: 'name', label: 'Name', required: true, max: 80 },
    { name: 'email', label: 'Email (used to sign in)', type: 'email', required: true, max: 120 },
    { name: 'title', label: 'Job title', max: 80 },
    { name: 'role', label: 'Role', type: 'select', options: [['member', 'Member'], ['admin', 'Admin (can manage people)']] },
    {
      name: 'password', label: isNew ? 'Temporary password' : 'New password (leave blank to keep)', type: 'password',
      required: isNew, minlength: 8, autocomplete: 'new-password', hint: 'At least 8 characters. They can change it under their name, top right.',
    },
    ...(isNew ? [] : [{ name: 'active', label: 'Active (can sign in and appears in lists)', type: 'checkbox', full: true }]),
  ];

  const edit = (u) => formDialog({
    title: u ? `Edit ${u.name}` : 'Add a team member',
    fields: fields(!u),
    values: u ? { ...u, active: Boolean(u.active) } : { role: 'member' },
    submitLabel: u ? 'Save' : 'Add person',
    onSubmit: (v) => {
      const body = { ...v };
      if (u && !body.password) delete body.password;
      return u ? api.patch(`/users/${u.id}`, body) : api.post('/users', body);
    },
  }).then((ok) => ok && refresh());

  mount(main,
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'People'), h('p', { class: 'sub' }, 'Everyone who can sign in. Inactive people keep their history but cannot sign in.')),
      h('button', { type: 'button', class: 'btn btn-primary', onclick: () => edit(null) }, 'Add a team member')),
    h('section', { class: 'card' },
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ['Name', 'Email', 'Job title', 'Role', 'Status', ''].map((t) => h('th', {}, t)))),
          h('tbody', {}, people.length ? people.map((u) => h('tr', {},
            h('td', { class: 'nowrap' }, u.name, u.id === app.me.id ? h('span', { class: 'muted small' }, ' (you)') : null),
            h('td', {}, u.email),
            h('td', {}, u.title || h('span', { class: 'muted' }, '—')),
            h('td', {}, u.role === 'admin' ? pill('Admin', 'accent') : 'Member'),
            h('td', {}, u.active ? pill('Active', 'ok') : pill('Inactive')),
            h('td', {}, h('button', { type: 'button', class: 'icon-btn', onclick: () => edit(u) }, 'Edit'))))
            : emptyRow(6, 'No people yet.'))))));
}
