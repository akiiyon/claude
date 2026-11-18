import { api } from '../api.js';
import { addDays, fmtDay, formDialog, h, mount, toast } from '../ui.js';

// ISO weekday: 1 = Monday ... 7 = Sunday
const weekday = (s) => new Date(`${s}T00:00:00Z`).getUTCDay() || 7;

export function nextWorkday(s, workDays) {
  let d = addDays(s, 1);
  for (let i = 0; i < 7 && !workDays.includes(weekday(d)); i++) d = addDays(d, 1);
  return d;
}

// Prev / date picker / next / Today, linking to base + '/' + date.
export function dayNav(base, date, today) {
  const picker = h('input', { type: 'date', value: date, 'aria-label': 'Pick a day' });
  picker.addEventListener('change', () => { if (picker.value) location.hash = `${base}/${picker.value}`; });
  return h('div', { class: 'day-nav' },
    h('a', { class: 'btn', href: `${base}/${addDays(date, -1)}`, 'aria-label': 'Previous day' }, '‹'),
    picker,
    h('a', { class: 'btn', href: `${base}/${addDays(date, 1)}`, 'aria-label': 'Next day' }, '›'),
    date !== today ? h('a', { class: 'btn', href: base }, 'Today') : null);
}

export function taskMeta(t) {
  return h('div', { class: 'task-meta' },
    t.project_code ? h('a', { class: 'tag', href: `#/projects/${t.project_id}`, title: t.project_name }, t.project_code) : null,
    t.carry_count ? h('span', {}, `carried in${t.carry_count > 1 ? ` (${t.carry_count} times)` : ''}`) : null,
    t.status === 'carried' ? h('span', {}, 'carried forward') : null);
}

export async function renderDay(main, app, dateParam) {
  const today = app.today;
  const date = dateParam || today;
  const [day, unfinished, projects] = await Promise.all([
    api.get(`/tasks?date=${date}`),
    date === today ? api.get('/tasks/unfinished') : Promise.resolve([]),
    api.get('/projects?status=active'),
  ]);
  const projectOptions = [['', 'No project'], ...projects.map((p) => [p.id, `${p.code} · ${p.name}`])];
  const refresh = () => renderDay(main, app, dateParam);
  const act = async (fn, message) => {
    try {
      const r = await fn();
      if (message) toast(typeof message === 'function' ? message(r) : message);
      await refresh();
    } catch (err) {
      toast(err.message, true);
    }
  };
  const carryTo = date < today ? today : nextWorkday(date, app.session.workDays);
  const isPast = date < today;
  const canAdd = date >= today;

  // ---------------------------------------------------------------- add form
  let addForm = null;
  if (canAdd) {
    const title = h('input', { type: 'text', name: 'title', maxlength: 300, required: true, placeholder: 'What will you do?', 'aria-label': 'Task' });
    const project = h('select', { name: 'project_id', 'aria-label': 'Project' },
      projectOptions.map(([v, l]) => h('option', { value: v }, l)));
    addForm = h('form', { class: 'add-task' }, title, project, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Add task'));
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!title.value.trim()) return;
      try {
        await api.post('/tasks', { title: title.value, project_id: project.value || null, date });
        const keep = project.value;
        await refresh();
        const again = main.querySelector('.add-task');
        again.elements.project_id.value = keep;
        again.elements.title.focus();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  // ---------------------------------------------------------------- task rows
  const editTask = (t) => formDialog({
    title: 'Edit task',
    fields: [
      { name: 'title', label: 'Task', required: true, max: 300, full: true },
      { name: 'project_id', label: 'Project', type: 'select', options: projectOptions, full: true },
    ],
    values: { title: t.title, project_id: t.project_id ?? '' },
    onSubmit: (v) => api.patch(`/tasks/${t.id}`, { title: v.title, project_id: v.project_id || null }),
  }).then((ok) => ok && refresh());

  const row = (t) => {
    const carried = t.status === 'carried';
    const left = carried
      ? h('span', { class: 'state-icon state-carried', title: 'Carried forward', 'aria-label': 'Carried forward' }, '→')
      : h('input', {
        type: 'checkbox', checked: t.status === 'done', 'aria-label': `Mark "${t.title}" as done`,
        onchange: (e) => act(() => api.patch(`/tasks/${t.id}`, { status: e.target.checked ? 'done' : 'open' })),
      });
    const actions = carried ? [] : [
      t.status === 'open' ? h('button', {
        type: 'button', class: 'btn btn-small', title: `Move to ${fmtDay(carryTo)}`,
        onclick: () => act(() => api.post(`/tasks/${t.id}/carry`), (r) => `Carried to ${fmtDay(r.to)}`),
      }, 'Carry forward') : null,
      h('button', { type: 'button', class: 'icon-btn', title: 'Edit', 'aria-label': `Edit "${t.title}"`, onclick: () => editTask(t) }, 'Edit'),
      h('button', {
        type: 'button', class: 'icon-btn', title: 'Delete', 'aria-label': `Delete "${t.title}"`,
        onclick: () => act(() => api.del(`/tasks/${t.id}`), 'Task deleted'),
      }, 'Delete'),
    ];
    return h('li', { class: `task is-${t.status}` },
      left,
      h('div', {}, h('div', { class: 'task-title' }, t.title), taskMeta(t)),
      h('div', { class: 'task-actions' }, actions));
  };

  const c = day.counts;
  const summary = c.total
    ? `${c.total} ${c.total === 1 ? 'task' : 'tasks'} · ${c.done} done · ${c.open} open${c.carried ? ` · ${c.carried} carried forward` : ''}`
    : '';

  const endOfDay = c.open && !isPast ? h('div', { class: 'end-day' },
    h('p', { class: 'muted' }, `${c.open} still open. At the end of the day, tick what you finished and carry the rest to ${fmtDay(carryTo)}.`),
    h('button', {
      type: 'button', class: 'btn btn-primary',
      onclick: () => act(() => api.post('/tasks/close-day', { date }), (r) => `Day closed. ${r.carried} carried to ${fmtDay(r.to)}.`),
    }, 'Close the day')) : null;

  const pastNote = isPast && c.open ? h('div', { class: 'end-day' },
    h('p', { class: 'muted' }, `${c.open} ${c.open === 1 ? 'task was' : 'tasks were'} left open on this day.`),
    h('button', {
      type: 'button', class: 'btn',
      onclick: () => act(() => api.post('/tasks/close-day', { date }), (r) => `${r.carried} carried to today.`),
    }, 'Carry them to today')) : null;

  mount(main,
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'My day'), h('p', { class: 'sub' }, `${fmtDay(date)}${date === today ? ' · today' : ''}`)),
      dayNav('#/day', date, today)),

    unfinished.length ? h('div', { class: 'banner banner-warn' },
      h('span', {}, `${unfinished.length} unfinished ${unfinished.length === 1 ? 'task' : 'tasks'} from earlier days (${[...new Set(unfinished.map((t) => fmtDay(t.task_date)))].join(', ')}).`),
      h('button', {
        type: 'button', class: 'btn btn-primary',
        onclick: () => act(() => api.post('/tasks/rollover'), (r) => `${r.carried} brought to today.`),
      }, 'Bring them to today')) : null,

    h('section', { class: 'card' },
      addForm,
      summary ? h('p', { class: 'small muted' }, summary) : null,
      day.tasks.length
        ? h('ul', { class: 'tasks' }, day.tasks.map(row))
        : h('p', { class: 'empty' }, canAdd ? 'No tasks yet. Add what you plan to do.' : 'No tasks on this day.'),
      endOfDay,
      pastNote));

  if (addForm && !unfinished.length) addForm.elements.title.focus({ preventScroll: true });
}
