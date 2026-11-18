import { tx } from '../db.js';
import {
  ASSIGNMENT_STATUSES, InputError, PRIORITIES, PROJECT_STATUSES, REVISION_STATUSES, STAGES,
  pick, requireId, setClause,
} from '../validate.js';

const PROJECT_RULES = {
  code: { type: 'text', required: true, max: 30, label: 'Project code' },
  name: { type: 'text', required: true, max: 150, label: 'Project name' },
  client: { type: 'text', max: 150, label: 'Client' },
  stage: { type: 'text', oneOf: STAGES, label: 'Stage' },
  status: { type: 'text', oneOf: PROJECT_STATUSES, label: 'Status' },
  priority: { type: 'text', oneOf: PRIORITIES, label: 'Priority' },
  start_date: { type: 'date', label: 'Start date' },
  deadline: { type: 'date', label: 'Deadline' },
  description: { type: 'text', max: 2000, label: 'Description' },
  lead_id: { type: 'id', label: 'Project lead' },
};

const ASSIGNMENT_RULES = {
  user_id: { type: 'id', required: true, label: 'Person' },
  part: { type: 'text', required: true, max: 200, label: 'Part of the work' },
  status: { type: 'text', oneOf: ASSIGNMENT_STATUSES, label: 'Status' },
  due_date: { type: 'date', label: 'Due date' },
  notes: { type: 'text', max: 1000, label: 'Notes' },
};

const REVISION_RULES = {
  rev: { type: 'text', required: true, max: 20, label: 'Revision' },
  description: { type: 'text', max: 300, label: 'Description' },
  status: { type: 'text', oneOf: REVISION_STATUSES, label: 'Status' },
  submitted_on: { type: 'date', label: 'Submitted on' },
  returned_on: { type: 'date', label: 'Returned on' },
  submitted_by: { type: 'id', label: 'Submitted by' },
  remarks: { type: 'text', max: 1000, label: 'Remarks' },
};

const LABELS = {
  code: 'code', name: 'name', client: 'client', stage: 'stage', status: 'status', priority: 'priority',
  start_date: 'start date', deadline: 'deadline', description: 'description', lead_id: 'lead',
  part: 'part', due_date: 'due date', notes: 'notes', user_id: 'person', rev: 'revision',
  submitted_on: 'submitted date', returned_on: 'returned date', submitted_by: 'submitted by', remarks: 'remarks',
};

export default function projectRoutes(r, { db, log }) {
  const userName = (id) => (id ? db.prepare('SELECT name FROM users WHERE id = ?').get(id)?.name ?? 'someone' : 'nobody');
  const requireActiveUser = (id, label) => {
    if (id && !db.prepare('SELECT 1 FROM users WHERE id = ? AND active = 1').get(id)) {
      throw new InputError(`${label} must be an active team member.`);
    }
  };
  const getProject = (id) => {
    const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!p) throw new InputError('That project was not found.', 404);
    return p;
  };
  // "status from In progress to Completed; deadline from 01 Dec to 15 Dec"
  const describeChanges = (before, after, nameFields = []) => Object.keys(after)
    .filter((k) => (before[k] ?? null) !== (after[k] ?? null))
    .map((k) => {
      const show = (v) => (v === null || v === undefined ? 'blank' : nameFields.includes(k) ? userName(v) : k === 'description' || k === 'notes' || k === 'remarks' ? 'updated text' : String(v));
      return k === 'description' || k === 'notes' || k === 'remarks' ? `updated the ${LABELS[k]}` : `${LABELS[k] || k} from ${show(before[k])} to ${show(after[k])}`;
    });

  // ---------------------------------------------------------------- projects

  r.get('/projects', (req, res) => {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
    const q = typeof req.query.q === 'string' && req.query.q.trim() ? `%${req.query.q.trim()}%` : null;
    const mine = req.query.mine === '1' ? req.user.id : null;
    const rows = db.prepare(`
      SELECT p.id, p.code, p.name, p.client, p.stage, p.status, p.priority, p.start_date, p.deadline,
             p.lead_id, lead.name AS lead_name, p.updated_at,
             (SELECT COUNT(*) FROM assignments a WHERE a.project_id = p.id) AS parts_total,
             (SELECT COUNT(*) FROM assignments a WHERE a.project_id = p.id AND a.status = 'Done') AS parts_done,
             (SELECT rev FROM revisions v WHERE v.project_id = p.id ORDER BY v.id DESC LIMIT 1) AS latest_rev,
             (SELECT status FROM revisions v WHERE v.project_id = p.id ORDER BY v.id DESC LIMIT 1) AS latest_rev_status,
             (SELECT group_concat(name, ', ') FROM (
                SELECT DISTINCT u.name FROM assignments a JOIN users u ON u.id = a.user_id
                WHERE a.project_id = p.id ORDER BY u.name)) AS members
      FROM projects p LEFT JOIN users lead ON lead.id = p.lead_id
      WHERE (:status IS NULL OR (:status = 'active' AND p.status <> 'Completed') OR p.status = :status)
        AND (:q IS NULL OR p.code LIKE :q OR p.name LIKE :q OR p.client LIKE :q)
        AND (:mine IS NULL OR p.lead_id = :mine
             OR EXISTS (SELECT 1 FROM assignments a WHERE a.project_id = p.id AND a.user_id = :mine))
      ORDER BY p.status = 'Completed', p.deadline IS NULL, p.deadline, p.code COLLATE NOCASE`)
      .all({ status, q, mine });
    res.json(rows);
  });

  r.post('/projects', (req, res) => {
    const f = pick(req.body, PROJECT_RULES);
    requireActiveUser(f.lead_id, 'Project lead');
    if (db.prepare('SELECT 1 FROM projects WHERE code = ?').get(f.code)) throw new InputError('Another project already uses that code.', 409);
    const id = tx(db, () => {
      const pid = db.prepare(`
        INSERT INTO projects (code, name, client, stage, status, priority, start_date, deadline, description, lead_id, created_by)
        VALUES (:code, :name, :client, :stage, :status, :priority, :start_date, :deadline, :description, :lead_id, :created_by)`)
        .run({
          client: null, stage: null, start_date: null, deadline: null, description: null, lead_id: null,
          ...f, status: f.status ?? 'Not started', priority: f.priority ?? 'Medium', created_by: req.user.id,
        }).lastInsertRowid;
      log(pid, req.user.id, 'created the project');
      return pid;
    });
    res.status(201).json({ id });
  });

  r.get('/projects/:id', (req, res) => {
    const id = requireId(req.params.id);
    const project = db.prepare(`
      SELECT p.*, lead.name AS lead_name, creator.name AS created_by_name
      FROM projects p
      LEFT JOIN users lead ON lead.id = p.lead_id
      LEFT JOIN users creator ON creator.id = p.created_by
      WHERE p.id = ?`).get(id);
    if (!project) throw new InputError('That project was not found.', 404);
    project.assignments = db.prepare(`
      SELECT a.*, u.name AS user_name FROM assignments a JOIN users u ON u.id = a.user_id
      WHERE a.project_id = ? ORDER BY a.due_date IS NULL, a.due_date, a.id`).all(id);
    project.revisions = db.prepare(`
      SELECT v.*, u.name AS submitted_by_name FROM revisions v LEFT JOIN users u ON u.id = v.submitted_by
      WHERE v.project_id = ? ORDER BY v.id DESC`).all(id);
    project.activity = db.prepare(`
      SELECT a.id, a.action, a.created_at, u.name AS user_name FROM activity a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.project_id = ? ORDER BY a.id DESC LIMIT 100`).all(id);
    res.json(project);
  });

  r.patch('/projects/:id', (req, res) => {
    const id = requireId(req.params.id);
    const before = getProject(id);
    const f = pick(req.body, PROJECT_RULES, { partial: true });
    if ('lead_id' in f) requireActiveUser(f.lead_id, 'Project lead');
    if (f.code && db.prepare('SELECT 1 FROM projects WHERE code = ? AND id <> ?').get(f.code, id)) {
      throw new InputError('Another project already uses that code.', 409);
    }
    const changes = describeChanges(before, f, ['lead_id']);
    if (changes.length) {
      tx(db, () => {
        db.prepare(`UPDATE projects SET ${setClause(f)}, updated_at = datetime('now') WHERE id = :id`).run({ ...f, id });
        log(id, req.user.id, `changed ${changes.join('; ')}`);
      });
    }
    res.json({ ok: true });
  });

  r.delete('/projects/:id', (req, res) => {
    const id = requireId(req.params.id);
    const p = getProject(id);
    if (req.user.role !== 'admin' && p.lead_id !== req.user.id) {
      throw new InputError('Only an admin or the project lead can delete a project.', 403);
    }
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------- assignments (who does which part)

  const getAssignment = (id) => {
    const a = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    if (!a) throw new InputError('That assignment was not found.', 404);
    return a;
  };
  const touch = (projectId) => db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);

  r.post('/projects/:id/assignments', (req, res) => {
    const projectId = requireId(req.params.id);
    getProject(projectId);
    const f = pick(req.body, ASSIGNMENT_RULES);
    requireActiveUser(f.user_id, 'Person');
    const id = tx(db, () => {
      const aid = db.prepare(`
        INSERT INTO assignments (project_id, user_id, part, status, due_date, notes)
        VALUES (:project_id, :user_id, :part, :status, :due_date, :notes)`)
        .run({ due_date: null, notes: null, ...f, status: f.status ?? 'Not started', project_id: projectId }).lastInsertRowid;
      log(projectId, req.user.id, `assigned "${f.part}" to ${userName(f.user_id)}`);
      touch(projectId);
      return aid;
    });
    res.status(201).json({ id });
  });

  r.patch('/assignments/:id', (req, res) => {
    const id = requireId(req.params.id);
    const before = getAssignment(id);
    const f = pick(req.body, ASSIGNMENT_RULES, { partial: true });
    if ('user_id' in f) requireActiveUser(f.user_id, 'Person');
    const changes = describeChanges(before, f, ['user_id']);
    if (changes.length) {
      tx(db, () => {
        db.prepare(`UPDATE assignments SET ${setClause(f)}, updated_at = datetime('now') WHERE id = :id`).run({ ...f, id });
        log(before.project_id, req.user.id, `updated "${f.part ?? before.part}": ${changes.join('; ')}`);
        touch(before.project_id);
      });
    }
    res.json({ ok: true });
  });

  r.delete('/assignments/:id', (req, res) => {
    const id = requireId(req.params.id);
    const a = getAssignment(id);
    tx(db, () => {
      db.prepare('DELETE FROM assignments WHERE id = ?').run(id);
      log(a.project_id, req.user.id, `removed "${a.part}" (${userName(a.user_id)})`);
      touch(a.project_id);
    });
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------- revisions

  const getRevision = (id) => {
    const v = db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
    if (!v) throw new InputError('That revision was not found.', 404);
    return v;
  };

  r.post('/projects/:id/revisions', (req, res) => {
    const projectId = requireId(req.params.id);
    getProject(projectId);
    const f = pick(req.body, REVISION_RULES);
    requireActiveUser(f.submitted_by, 'Submitted by');
    const id = tx(db, () => {
      const vid = db.prepare(`
        INSERT INTO revisions (project_id, rev, description, status, submitted_on, returned_on, submitted_by, remarks)
        VALUES (:project_id, :rev, :description, :status, :submitted_on, :returned_on, :submitted_by, :remarks)`)
        .run({
          description: null, submitted_on: null, returned_on: null, submitted_by: null, remarks: null,
          ...f, status: f.status ?? 'In preparation', project_id: projectId,
        }).lastInsertRowid;
      log(projectId, req.user.id, `added revision ${f.rev} (${f.status ?? 'In preparation'})`);
      touch(projectId);
      return vid;
    });
    res.status(201).json({ id });
  });

  r.patch('/revisions/:id', (req, res) => {
    const id = requireId(req.params.id);
    const before = getRevision(id);
    const f = pick(req.body, REVISION_RULES, { partial: true });
    if ('submitted_by' in f) requireActiveUser(f.submitted_by, 'Submitted by');
    const changes = describeChanges(before, f, ['submitted_by']);
    if (changes.length) {
      tx(db, () => {
        db.prepare(`UPDATE revisions SET ${setClause(f)} WHERE id = :id`).run({ ...f, id });
        log(before.project_id, req.user.id, `updated revision ${f.rev ?? before.rev}: ${changes.join('; ')}`);
        touch(before.project_id);
      });
    }
    res.json({ ok: true });
  });

  r.delete('/revisions/:id', (req, res) => {
    const id = requireId(req.params.id);
    const v = getRevision(id);
    tx(db, () => {
      db.prepare('DELETE FROM revisions WHERE id = ?').run(id);
      log(v.project_id, req.user.id, `deleted revision ${v.rev}`);
      touch(v.project_id);
    });
    res.json({ ok: true });
  });
}
