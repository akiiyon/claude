import { api } from '../api.js';
import { buildFields, h, mount, readForm, toast } from '../ui.js';

export async function renderAccount(main, app) {
  const me = app.me;
  const fields = [
    { name: 'current', label: 'Current password', type: 'password', required: true, autocomplete: 'current-password' },
    { name: 'next', label: 'New password', type: 'password', required: true, minlength: 8, autocomplete: 'new-password', hint: 'At least 8 characters.' },
  ];
  const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Change password');
  const form = h('form', { class: 'stack' }, h('div', { class: 'form-grid' }, buildFields(fields)), error, h('div', {}, submit));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    try {
      await api.post('/account/password', readForm(form, fields));
      form.reset();
      toast('Password changed. Other devices have been signed out.');
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
    submit.disabled = false;
  });

  mount(main,
    h('div', { class: 'page-head' }, h('h1', {}, 'My account')),
    h('section', { class: 'card' },
      h('dl', { class: 'details' },
        h('div', {}, h('dt', {}, 'Name'), h('dd', {}, me.name)),
        h('div', {}, h('dt', {}, 'Email'), h('dd', {}, me.email)),
        h('div', {}, h('dt', {}, 'Job title'), h('dd', {}, me.title || '—')),
        h('div', {}, h('dt', {}, 'Role'), h('dd', {}, me.role === 'admin' ? 'Admin' : 'Member'))),
      h('p', { class: 'small muted' }, 'To change your name, email or title, ask an admin.')),
    h('section', { class: 'card' }, h('h2', {}, 'Change password'), form));
}
