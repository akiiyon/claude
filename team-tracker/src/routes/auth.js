import rateLimit from 'express-rate-limit';
import {
  clearSessionCookie, createSession, destroySession, destroyUserSessions, hashPassword, requireUser,
  sessionToken, setSessionCookie, verifyPassword,
} from '../auth.js';
import { tx } from '../db.js';
import { InputError, pick } from '../validate.js';

const MIN_PASSWORD = 8;

export function checkPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new InputError(`Password must be at least ${MIN_PASSWORD} characters.`);
  }
  if (password.length > 200) throw new InputError('Password is too long.');
}

export default function authRoutes(r, { db, config, today }) {
  const userCount = () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const signIn = (res, userId) => {
    const { token, expires } = createSession(db, userId, config.sessionDays);
    setSessionCookie(res, token, expires, config.cookieSecure);
  };

  r.get('/session', (req, res) => {
    res.json({
      user: req.user,
      needsSetup: userCount() === 0,
      today: today(),
      workDays: config.workDays,
    });
  });

  // First run only: creates the first admin account.
  r.post('/setup', (req, res) => {
    const f = pick(req.body, {
      name: { type: 'text', required: true, max: 80, label: 'Name' },
      email: { type: 'text', required: true, max: 120, label: 'Email' },
      title: { type: 'text', max: 80, label: 'Job title' },
    });
    checkPassword(req.body.password);
    const id = tx(db, () => {
      if (userCount() > 0) throw new InputError('The app is already set up. Sign in instead.', 409);
      return db.prepare("INSERT INTO users (name, email, title, role, password_hash) VALUES (?, ?, ?, 'admin', ?)")
        .run(f.name, f.email.toLowerCase(), f.title ?? null, hashPassword(req.body.password)).lastInsertRowid;
    });
    signIn(res, id);
    res.status(201).json({ ok: true });
  });

  r.post('/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }), (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = db.prepare('SELECT id, password_hash, active FROM users WHERE email = ?').get(email);
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email or password is wrong.' });
    }
    signIn(res, user.id);
    res.json({ ok: true });
  });

  r.post('/logout', (req, res) => {
    destroySession(db, sessionToken(req));
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  r.post('/account/password', requireUser, (req, res) => {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!verifyPassword(String(req.body?.current ?? ''), row.password_hash)) {
      throw new InputError('Your current password is wrong.');
    }
    checkPassword(req.body?.next);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(req.body.next), req.user.id);
    destroyUserSessions(db, req.user.id, sessionToken(req));
    res.json({ ok: true });
  });
}
