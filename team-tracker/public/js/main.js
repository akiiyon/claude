import { api } from './api.js';
import { h, mount, toast } from './ui.js';
import { renderSetup, renderLogin } from './views/auth.js';
import { renderHome } from './views/home.js';
import { renderDay } from './views/day.js';
import { renderTeam } from './views/team.js';
import { renderProjects } from './views/projects.js';
import { renderProject } from './views/project.js';
import { renderPeople } from './views/people.js';
import { renderAccount } from './views/account.js';

const main = document.getElementById('main');
const topbar = document.getElementById('topbar');

// Shared app state passed to every view.
export const app = {
  session: null,
  users: [],
  async refreshSession() {
    this.session = await api.get('/session');
    return this.session;
  },
  async loadUsers() {
    this.users = await api.get('/users');
    return this.users;
  },
  get today() { return this.session.today; },
  get me() { return this.session.user; },
  isAdmin() { return this.session.user?.role === 'admin'; },
  go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  },
};

const routes = [
  [/^#?\/?$/, 'home', () => renderHome(main, app)],
  [/^#\/day(?:\/(\d{4}-\d{2}-\d{2}))?$/, 'day', (m) => renderDay(main, app, m[1])],
  [/^#\/team(?:\/(\d{4}-\d{2}-\d{2}))?$/, 'team', (m) => renderTeam(main, app, m[1])],
  [/^#\/projects$/, 'projects', () => renderProjects(main, app)],
  [/^#\/projects\/(\d+)$/, 'projects', (m) => renderProject(main, app, Number(m[1]))],
  [/^#\/people$/, 'people', () => renderPeople(main, app)],
  [/^#\/account$/, 'account', () => renderAccount(main, app)],
];

function showChrome(signedIn) {
  topbar.hidden = !signedIn;
  if (!signedIn) return;
  document.getElementById('me-name').textContent = app.me.name;
  document.getElementById('nav-people').hidden = !app.isAdmin();
}

async function route() {
  // A dialog belongs to the page that opened it.
  document.querySelectorAll('dialog.modal').forEach((d) => d.dispatchEvent(new Event('cancel')));
  try {
    if (!app.session) await app.refreshSession();
    if (app.session.needsSetup) { showChrome(false); return renderSetup(main, app, start); }
    if (!app.me) { showChrome(false); return renderLogin(main, app, start); }
    showChrome(true);
    const hash = location.hash || '#/';
    const match = routes.find(([re]) => re.test(hash));
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (match?.[1] ?? '')));
    if (!match) {
      mount(main, h('div', { class: 'card' }, h('h1', {}, 'Page not found'), h('a', { href: '#/' }, 'Go to Home')));
      return;
    }
    if (!app.users.length) await app.loadUsers();
    await match[2](hash.match(match[0]));
    main.focus({ preventScroll: true });
  } catch (err) {
    if (err.status === 401) return;
    mount(main, h('div', { class: 'card' }, h('h1', {}, 'Could not load this page'), h('p', { class: 'muted' }, err.message)));
  }
}

async function start() {
  app.session = null;
  app.users = [];
  await route();
}

window.addEventListener('hashchange', route);
window.addEventListener('signed-out', () => {
  toast('Your session ended. Please sign in again.', true);
  start();
});
document.getElementById('logout').addEventListener('click', async () => {
  await api.post('/logout').catch(() => {});
  location.hash = '#/';
  start();
});

start();
