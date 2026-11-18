import { destroyUserSessions, hashPassword, requireAdmin } from '../auth.js';
import { InputError, pick, requireId, setClause } from '../validate.js';
import { checkPassword } from './auth.js';

const RULES = {
  name: { type: 'text', required: true, max: 80, label: 'Name' },
  email: { type: 'text', required: true, max: 120, label: 'Email' },
  title: { type: 'text', max: 80, label: 'Job title' },
  role: { type: 'text', oneOf: ['admin', 'member'], label: 'Role' },
  active: { type: 'bool', label: 'Active' },
};

export default function userRoutes(r, { db }) {
  const list = (all) => db.prepare(`
    SELECT id, name, email, title, role, active FROM users
    ${all ? '' : 'WHERE active = 1'} ORDER BY active DESC, name COLLATE NOCASE`).all();

  // Everyone can list active team members (for pickers); admins can also see inactive ones.
  r.get('/users', (req, res) => {
    res.json(list(req.user.role === 'admin' && req.query.all === '1'));
  });

  r.post('/users', requireAdmin, (req, res) => {
    const f = pick(req.body, RULES);
    checkPassword(req.body?.password);
    const email = f.email.toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new InputError('Someone already uses that email.', 409);
    const id = db.prepare('INSERT INTO users (name, email, title, role, password_hash) VALUES (?, ?, ?, ?, ?)')
      .run(f.name, email, f.title ?? null, f.role ?? 'member', hashPassword(req.body.password)).lastInsertRowid;
    res.status(201).json({ id });
  });

  r.patch('/users/:id', requireAdmin, (req, res) => {
    const id = requireId(req.params.id);
    const target = db.prepare('SELECT id, role, active FROM users WHERE id = ?').get(id);
    if (!target) throw new InputError('That person was not found.', 404);
    const f = pick(req.body, RULES, { partial: true });
    if (f.email) {
      f.email = f.email.toLowerCase();
      if (db.prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?').get(f.email, id)) {
        throw new InputError('Someone already uses that email.', 409);
      }
    }
    // Keep at least one active admin.
    const losesAdmin = target.role === 'admin' && target.active && (f.role === 'member' || f.active === 0);
    if (losesAdmin && db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get().n <= 1) {
      throw new InputError('There must be at least one active admin.');
    }
    if (req.body?.password !== undefined && req.body.password !== '') {
      checkPassword(req.body.password);
      f.password_hash = hashPassword(req.body.password);
    }
    if (Object.keys(f).length) db.prepare(`UPDATE users SET ${setClause(f)} WHERE id = :id`).run({ ...f, id });
    if (f.active === 0 || f.password_hash) destroyUserSessions(db, id);
    res.json({ ok: true });
  });
}
