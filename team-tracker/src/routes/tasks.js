import { tx } from '../db.js';
import { addDays, isIsoDate, nextWorkday } from '../dates.js';
import { InputError, pick, requireId } from '../validate.js';

const TASK_RULES = {
  title: { type: 'text', required: true, max: 300, label: 'Task' },
  project_id: { type: 'id', label: 'Project' },
};

const TASK_SELECT = `
  SELECT t.id, t.user_id, t.task_date, t.title, t.project_id, t.status, t.carried_from_id, t.carry_count,
         t.done_at, t.created_at, p.code AS project_code, p.name AS project_name
  FROM tasks t LEFT JOIN projects p ON p.id = t.project_id`;

export default function taskRoutes(r, { db, config, today }) {
  const dateParam = (v) => {
    if (v === undefined || v === '') return today();
    if (!isIsoDate(v)) throw new InputError('date must be YYYY-MM-DD.');
    return v;
  };
  const getOwnTask = (req, id) => {
    const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!t) throw new InputError('That task was not found.', 404);
    if (t.user_id !== req.user.id) throw new InputError('You can only change your own tasks.', 403);
    return t;
  };
  const checkProject = (projectId) => {
    if (projectId && !db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)) {
      throw new InputError('That project was not found.');
    }
  };
  // Where an unfinished task goes: today if it is from an earlier day, else the next working day.
  const carryTarget = (taskDate) => (taskDate < today() ? today() : nextWorkday(taskDate, config.workDays));
  const insertCarry = db.prepare(`
    INSERT INTO tasks (user_id, task_date, title, project_id, carried_from_id, carry_count)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const markCarried = db.prepare("UPDATE tasks SET status = 'carried', done_at = NULL WHERE id = ?");
  const carry = (t, to) => {
    const id = insertCarry.run(t.user_id, to, t.title, t.project_id, t.id, t.carry_count + 1).lastInsertRowid;
    markCarried.run(t.id);
    return id;
  };
  const countsFor = (tasks) => ({
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'done').length,
    open: tasks.filter((t) => t.status === 'open').length,
    carried: tasks.filter((t) => t.status === 'carried').length,
  });

  // ---------------------------------------------------------------- my day

  r.get('/tasks', (req, res) => {
    const date = dateParam(req.query.date);
    let userId = req.user.id;
    if (req.query.user && req.query.user !== 'me') userId = requireId(req.query.user, 'user');
    const tasks = db.prepare(`${TASK_SELECT} WHERE t.user_id = ? AND t.task_date = ? ORDER BY t.id`).all(userId, date);
    res.json({ date, today: today(), userId, tasks, counts: countsFor(tasks) });
  });

  // My open tasks from earlier days that were never closed.
  r.get('/tasks/unfinished', (req, res) => {
    const tasks = db.prepare(`${TASK_SELECT} WHERE t.user_id = ? AND t.status = 'open' AND t.task_date < ? ORDER BY t.task_date, t.id`)
      .all(req.user.id, today());
    res.json(tasks);
  });

  r.post('/tasks', (req, res) => {
    const f = pick(req.body, TASK_RULES);
    const date = dateParam(req.body?.date);
    if (date < today()) throw new InputError('Tasks can be added for today or a later day.');
    checkProject(f.project_id);
    const id = db.prepare('INSERT INTO tasks (user_id, task_date, title, project_id) VALUES (?, ?, ?, ?)')
      .run(req.user.id, date, f.title, f.project_id ?? null).lastInsertRowid;
    res.status(201).json({ id });
  });

  r.patch('/tasks/:id', (req, res) => {
    const id = requireId(req.params.id);
    const t = getOwnTask(req, id);
    if (t.status === 'carried') throw new InputError('This task was carried forward; change it on the day it was carried to.');
    const f = pick(req.body, TASK_RULES, { partial: true });
    checkProject(f.project_id);
    const status = req.body?.status;
    if (status !== undefined && status !== 'open' && status !== 'done') throw new InputError('Status must be open or done.');
    db.prepare(`
      UPDATE tasks SET title = :title, project_id = :project_id, status = :status,
        done_at = CASE WHEN :status = 'done' THEN COALESCE(done_at, datetime('now')) ELSE NULL END
      WHERE id = :id`).run({
      id,
      title: f.title ?? t.title,
      project_id: 'project_id' in f ? f.project_id : t.project_id,
      status: status ?? t.status,
    });
    res.json({ ok: true });
  });

  r.post('/tasks/:id/carry', (req, res) => {
    const id = requireId(req.params.id);
    const t = getOwnTask(req, id);
    if (t.status !== 'open') throw new InputError('Only an open task can be carried forward.');
    let to = carryTarget(t.task_date);
    if (req.body?.to !== undefined && req.body.to !== null && req.body.to !== '') {
      to = dateParam(req.body.to);
      if (to <= t.task_date || to < today()) throw new InputError('Carry a task to a later day, today or after.');
    }
    const newId = tx(db, () => carry(t, to));
    res.json({ id: newId, to });
  });

  // End of day: carry every task still open on that day to the next working day.
  r.post('/tasks/close-day', (req, res) => {
    const date = dateParam(req.body?.date);
    const to = carryTarget(date);
    const open = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND task_date = ? AND status = 'open'").all(req.user.id, date);
    tx(db, () => open.forEach((t) => carry(t, to)));
    res.json({ carried: open.length, to });
  });

  // Bring forgotten open tasks from earlier days into today.
  r.post('/tasks/rollover', (req, res) => {
    const day = today();
    const open = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND task_date < ? AND status = 'open'").all(req.user.id, day);
    tx(db, () => open.forEach((t) => carry(t, day)));
    res.json({ carried: open.length, to: day });
  });

  r.delete('/tasks/:id', (req, res) => {
    const id = requireId(req.params.id);
    const t = getOwnTask(req, id);
    if (t.status === 'carried') throw new InputError('A carried task stays as a record of that day.');
    tx(db, () => {
      // If this was a carried copy, the original becomes open again instead of pointing at nothing.
      if (t.carried_from_id) db.prepare("UPDATE tasks SET status = 'open' WHERE id = ? AND status = 'carried'").run(t.carried_from_id);
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    });
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------- team

  r.get('/team', (req, res) => {
    const date = dateParam(req.query.date);
    const users = db.prepare('SELECT id, name, title FROM users WHERE active = 1 ORDER BY name COLLATE NOCASE').all();
    const tasks = db.prepare(`${TASK_SELECT} WHERE t.task_date = ? ORDER BY t.id`).all(date);
    const members = users.map((u) => {
      const own = tasks.filter((t) => t.user_id === u.id);
      return { ...u, tasks: own, counts: countsFor(own) };
    });
    res.json({
      date,
      today: today(),
      members,
      counts: { ...countsFor(tasks), people: users.length, planned: members.filter((m) => m.tasks.length).length },
    });
  });

  // ---------------------------------------------------------------- home summary

  r.get('/summary', (req, res) => {
    const day = today();
    const soon = addDays(day, 14);
    const mine = db.prepare('SELECT status FROM tasks WHERE user_id = ? AND task_date = ?').all(req.user.id, day);
    const team = db.prepare('SELECT user_id, status FROM tasks t JOIN users u ON u.id = t.user_id WHERE t.task_date = ? AND u.active = 1').all(day);
    const people = db.prepare('SELECT COUNT(*) AS n FROM users WHERE active = 1').get().n;
    const projectCols = `p.id, p.code, p.name, p.status, p.stage, p.priority, p.deadline, lead.name AS lead_name`;
    const fromProjects = `FROM projects p LEFT JOIN users lead ON lead.id = p.lead_id WHERE p.status <> 'Completed'`;
    res.json({
      today: day,
      me: {
        ...countsFor(mine),
        unfinished: db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status = 'open' AND task_date < ?").get(req.user.id, day).n,
      },
      team: { ...countsFor(team), people, planned: new Set(team.map((t) => t.user_id)).size },
      projects: {
        active: db.prepare(`SELECT COUNT(*) AS n ${fromProjects}`).get().n,
        overdue: db.prepare(`SELECT ${projectCols} ${fromProjects} AND p.deadline < ? ORDER BY p.deadline`).all(day),
        dueSoon: db.prepare(`SELECT ${projectCols} ${fromProjects} AND p.deadline >= ? AND p.deadline <= ? ORDER BY p.deadline`).all(day, soon),
      },
      myParts: db.prepare(`
        SELECT a.id, a.part, a.status, a.due_date, p.id AS project_id, p.code AS project_code, p.name AS project_name
        FROM assignments a JOIN projects p ON p.id = a.project_id
        WHERE a.user_id = ? AND a.status <> 'Done' AND p.status <> 'Completed'
        ORDER BY a.due_date IS NULL, a.due_date, p.code`).all(req.user.id),
    });
  });
}
