import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

// Starts the app on a random port with an in-memory database and a fixed clock.
export async function startApp({ now = '2026-11-18T06:00:00Z', workDays = [1, 2, 3, 4, 5, 6] } = {}) {
  const db = openDb(':memory:');
  const clock = { now: new Date(now) };
  const config = { tz: 'Asia/Kolkata', workDays, cookieSecure: false, sessionDays: 14 };
  const app = createApp({ db, config, clock: () => clock.now });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    db,
    base,
    setNow: (iso) => { clock.now = new Date(iso); },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// A tiny client that keeps the session cookie, like a browser.
export function client(base) {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b = {}) => call('POST', p, b),
    patch: (p, b = {}) => call('PATCH', p, b),
    del: (p) => call('DELETE', p, {}),
  };
}

export async function setupTeam(base) {
  const admin = client(base);
  await admin.post('/api/setup', { name: 'Asha Rao', email: 'asha@example.com', password: 'correct-horse-1' });
  await admin.post('/api/users', { name: 'Ravi Iyer', email: 'ravi@example.com', password: 'ravi-password-1' });
  const ravi = client(base);
  await ravi.post('/api/login', { email: 'ravi@example.com', password: 'ravi-password-1' });
  return { admin, ravi };
}
