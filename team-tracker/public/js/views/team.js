import { api } from '../api.js';
import { fmtDay, h, mount, progress } from '../ui.js';
import { dayNav, taskMeta } from './day.js';

const ICON = { done: ['✓', 'Done'], carried: ['→', 'Carried forward'], open: ['○', 'Open'] };

export async function renderTeam(main, app, dateParam) {
  const today = app.today;
  const date = dateParam || today;
  const team = await api.get(`/team?date=${date}`);
  const c = team.counts;
  const worked = c.total - c.carried;

  // People who planned first, then by name.
  const members = [...team.members].sort((a, b) => (b.tasks.length > 0) - (a.tasks.length > 0) || a.name.localeCompare(b.name));

  const memberCard = (m) => {
    const mc = m.counts;
    return h('section', { class: 'card' },
      h('div', { class: 'member-head' },
        h('h3', {}, m.name, m.id === app.me.id ? h('span', { class: 'muted small' }, ' (you)') : null),
        m.tasks.length ? h('span', { class: 'small muted num' }, `${mc.done} of ${mc.total - mc.carried} done`) : null),
      m.title ? h('p', { class: 'small muted' }, m.title) : null,
      m.tasks.length ? progress(mc.done, mc.total - mc.carried) : null,
      m.tasks.length
        ? h('ul', { class: 'tasks' }, m.tasks.map((t) => h('li', { class: `task is-${t.status}` },
          h('span', { class: `state-icon state-${t.status}`, title: ICON[t.status][1], 'aria-label': ICON[t.status][1] }, ICON[t.status][0]),
          h('div', {}, h('div', { class: 'task-title' }, t.title), taskMeta(t)),
          h('span'))))
        : h('p', { class: 'empty' }, date <= today ? 'No tasks planned.' : 'Nothing planned yet.'));
  };

  mount(main,
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Team day'), h('p', { class: 'sub' }, `${fmtDay(date)}${date === today ? ' · today' : ''}`)),
      dayNav('#/team', date, today)),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'People who planned'),
        h('span', { class: 'tile-value' }, String(c.planned), h('small', {}, ` / ${c.people}`))),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Tasks done'),
        h('span', { class: 'tile-value' }, String(c.done), h('small', {}, ` / ${worked}`))),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Still open'), h('span', { class: 'tile-value' }, String(c.open))),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Carried forward'), h('span', { class: 'tile-value' }, String(c.carried)))),
    members.length ? h('div', { class: 'team-grid' }, members.map(memberCard)) : h('p', { class: 'empty' }, 'No team members yet.'));
}
