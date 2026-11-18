import { api } from '../api.js';
import { buildFields, h, mount, readForm } from '../ui.js';

function authCard(main, { title, intro, fields, submitLabel, onSubmit }) {
  const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, submitLabel);
  const form = h('form', { class: 'stack' }, buildFields(fields), error, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    try {
      await onSubmit(readForm(form, fields));
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      submit.disabled = false;
    }
  });
  mount(main, h('div', { class: 'auth card' }, h('h1', {}, title), h('p', { class: 'muted' }, intro), form));
  form.querySelector('input').focus();
}

export function renderLogin(main, app, onDone) {
  authCard(main, {
    title: 'Team Tracker',
    intro: 'Sign in to see your day and your projects.',
    submitLabel: 'Sign in',
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'username' },
      { name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' },
    ],
    onSubmit: async (v) => {
      await api.post('/login', v);
      await onDone();
    },
  });
}

export function renderSetup(main, app, onDone) {
  authCard(main, {
    title: 'Set up Team Tracker',
    intro: 'Create the first account. It will be the admin, who adds the rest of the team.',
    submitLabel: 'Create admin account',
    fields: [
      { name: 'name', label: 'Your name', required: true, max: 80, autocomplete: 'name' },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120, autocomplete: 'username' },
      { name: 'title', label: 'Job title (optional)', max: 80 },
      { name: 'password', label: 'Password', type: 'password', required: true, minlength: 8, autocomplete: 'new-password', hint: 'At least 8 characters.' },
    ],
    onSubmit: async (v) => {
      await api.post('/setup', v);
      await onDone();
    },
  });
}
