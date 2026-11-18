import { api } from '../api.js';
import { addDays, deadlineCell, fmtDate, fmtDay, h, mount, pill } from '../ui.js';

function tile(label, value, total, href, bad) {
  return h('a', { class: `tile${bad ? ' is-bad' : ''}`, href },
    h('span', { class: 'tile-label' }, label),
    h('span', { class: 'tile-value' }, String(value), total !== undefined ? h('small', {}, ` / ${total}`) : null));
}

function projectList(rows, today, emptyText) {
  if (!rows.length) return h('p', { class: 'empty' }, emptyText);
  return h('ul', { class: 'list' }, rows.map((p) => h('li', {},
    h('span', {}, h('a', { href: `#/projects/${p.id}` }, `${p.code} · ${p.name}`), ' ', pill(p.status)),
    h('span', { class: 'small' }, deadlineCell(p.deadline, today)))));
}

export async function renderHome(main, app) {
  const s = await api.get('/summary');
  const first = app.me.name.split(' ')[0];

  mount(main,
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, `Hello, ${first}`), h('p', { class: 'sub' }, fmtDay(s.today)))),

    s.me.unfinished ? h('div', { class: 'banner banner-warn' },
      h('span', {}, `You have ${s.me.unfinished} unfinished ${s.me.unfinished === 1 ? 'task' : 'tasks'} from earlier days.`),
      h('a', { class: 'btn', href: '#/day' }, 'Go to my day')) : null,

    h('div', { class: 'tiles' },
      tile('My tasks done today', s.me.done, s.me.total - s.me.carried, '#/day'),
      tile('Team members who planned today', s.team.planned, s.team.people, '#/team'),
      tile('Team tasks done today', s.team.done, s.team.total - s.team.carried, '#/team'),
      tile('Active projects', s.projects.active, undefined, '#/projects'),
      tile('Projects past deadline', s.projects.overdue.length, undefined, '#/projects', s.projects.overdue.length > 0)),

    s.me.total === 0 && !s.me.unfinished ? h('div', { class: 'banner banner-warn' },
      h('span', {}, 'You have not planned today yet.'),
      h('a', { class: 'btn btn-primary', href: '#/day' }, 'Plan my day')) : null,

    h('div', { class: 'grid-2' },
      h('section', { class: 'card' },
        h('h2', {}, 'My parts of projects'),
        s.myParts.length
          ? h('ul', { class: 'list' }, s.myParts.map((a) => h('li', {},
            h('span', {}, h('a', { href: `#/projects/${a.project_id}`, class: 'tag' }, a.project_code), ' ', a.part),
            h('span', { class: 'row small' }, pill(a.status), a.due_date ? deadlineCell(a.due_date, s.today) : null))))
          : h('p', { class: 'empty' }, 'Nothing assigned to you right now.')),
      h('section', { class: 'card' },
        h('h2', {}, 'Deadlines in the next 14 days'),
        projectList(s.projects.dueSoon, s.today, `No project deadlines before ${fmtDate(addDays(s.today, 14))}.`))),

    s.projects.overdue.length ? h('section', { class: 'card' },
      h('h2', {}, 'Past deadline'),
      projectList(s.projects.overdue, s.today, '')) : null);
}

