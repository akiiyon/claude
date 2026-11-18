import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUser, requireUser } from './auth.js';
import { todayIn } from './dates.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// clock is injectable so tests can fix "today".
export function createApp({ db, config, clock = () => new Date() }) {
  const ctx = {
    db,
    config,
    today: () => todayIn(config.tz, clock()),
    log(projectId, userId, action) {
      db.prepare('INSERT INTO activity (project_id, user_id, action) VALUES (?, ?, ?)').run(projectId, userId, action);
    },
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: '200kb' }));

  // Cross-site requests can't send a JSON body without a CORS preflight, which this app never
  // grants, so requiring JSON on every write blocks cross-site form posts (CSRF).
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && !req.is('application/json')) {
      return res.status(415).json({ error: 'Send requests as JSON.' });
    }
    next();
  });
  app.use('/api', loadUser(db));

  const open = express.Router();
  authRoutes(open, ctx);
  app.use('/api', open);

  const api = express.Router();
  api.use(requireUser);
  userRoutes(api, ctx);
  projectRoutes(api, ctx);
  taskRoutes(api, ctx);
  app.use('/api', api);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(express.static(publicDir, { index: 'index.html' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
  });

  return app;
}
