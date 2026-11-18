import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { client, setupTeam, startApp } from './helpers.js';

describe('accounts', () => {
  let app;
  before(async () => { app = await startApp(); });
  after(() => app.close());

  test('first visit asks for setup, then setup creates an admin and signs in', async () => {
    const c = client(app.base);
    assert.equal((await c.get('/api/session')).body.needsSetup, true);
    const res = await c.post('/api/setup', { name: 'Asha', email: 'Asha@Example.com', password: 'long-enough-1' });
    assert.equal(res.status, 201);
    const s = (await c.get('/api/session')).body;
    assert.equal(s.needsSetup, false);
    assert.equal(s.user.role, 'admin');
    assert.equal(s.user.email, 'asha@example.com');
    assert.equal(s.today, '2026-11-18');
  });

  test('setup cannot run twice', async () => {
    const res = await client(app.base).post('/api/setup', { name: 'X', email: 'x@example.com', password: 'long-enough-1' });
    assert.equal(res.status, 409);
  });

  test('wrong password is refused; API needs sign-in', async () => {
    const c = client(app.base);
    assert.equal((await c.post('/api/login', { email: 'asha@example.com', password: 'nope-nope-1' })).status, 401);
    assert.equal((await c.get('/api/projects')).status, 401);
  });

  test('members cannot manage people; deactivated people cannot sign in', async () => {
    const admin = client(app.base);
    await admin.post('/api/login', { email: 'asha@example.com', password: 'long-enough-1' });
    const created = await admin.post('/api/users', { name: 'Ravi', email: 'ravi@example.com', password: 'ravi-pass-12' });
    assert.equal(created.status, 201);
    const ravi = client(app.base);
    assert.equal((await ravi.post('/api/login', { email: 'ravi@example.com', password: 'ravi-pass-12' })).status, 200);
    assert.equal((await ravi.post('/api/users', { name: 'Y', email: 'y@example.com', password: 'whatever-12' })).status, 403);
    await admin.patch(`/api/users/${created.body.id}`, { active: false });
    assert.equal((await ravi.get('/api/session')).body.user, null, 'existing session ends');
    assert.equal((await ravi.post('/api/login', { email: 'ravi@example.com', password: 'ravi-pass-12' })).status, 401);
  });

  test('the last admin cannot be demoted', async () => {
    const admin = client(app.base);
    await admin.post('/api/login', { email: 'asha@example.com', password: 'long-enough-1' });
    const me = (await admin.get('/api/session')).body.user;
    assert.equal((await admin.patch(`/api/users/${me.id}`, { role: 'member' })).status, 400);
  });

  test('writes must be JSON', async () => {
    const res = await fetch(`${app.base}/api/login`, { method: 'POST', body: 'email=a&password=b', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(res.status, 415);
  });
});

describe('projects', () => {
  let app; let admin; let ravi;
  before(async () => {
    app = await startApp();
    ({ admin, ravi } = await setupTeam(app.base));
  });
  after(() => app.close());

  test('create, assign parts, add revisions, and see it all in detail and the list', async () => {
    const users = (await admin.get('/api/users')).body;
    const raviId = users.find((u) => u.name === 'Ravi Iyer').id;
    const asha = users.find((u) => u.name === 'Asha Rao').id;
    const p = await admin.post('/api/projects', {
      code: 'PSP01', name: 'Northridge PSP - HM works', client: 'Client A', stage: 'DPR',
      status: 'In progress', priority: 'High', deadline: '2026-11-25', lead_id: asha,
    });
    assert.equal(p.status, 201);
    const id = p.body.id;

    const a = await ravi.post(`/api/projects/${id}/assignments`, { user_id: raviId, part: 'Intake gate design', due_date: '2026-11-22' });
    assert.equal(a.status, 201);
    await admin.post(`/api/projects/${id}/assignments`, { user_id: asha, part: 'Penstock design', status: 'Done' });
    await ravi.patch(`/api/assignments/${a.body.id}`, { status: 'In progress' });
    await admin.post(`/api/projects/${id}/revisions`, { rev: 'R0', status: 'Submitted', submitted_on: '2026-11-10', submitted_by: asha });
    await admin.post(`/api/projects/${id}/revisions`, { rev: 'R1', status: 'In preparation' });
    await admin.patch(`/api/projects/${id}`, { status: 'Under review', deadline: '2026-11-30' });

    const detail = (await ravi.get(`/api/projects/${id}`)).body;
    assert.equal(detail.lead_name, 'Asha Rao');
    assert.equal(detail.assignments.length, 2);
    assert.equal(detail.assignments.find((x) => x.part === 'Intake gate design').status, 'In progress');
    assert.deepEqual(detail.revisions.map((v) => v.rev), ['R1', 'R0']);
    assert.ok(detail.activity.some((x) => /status from In progress to Under review/.test(x.action)));
    assert.ok(detail.activity.some((x) => /deadline from 2026-11-25 to 2026-11-30/.test(x.action)));

    const list = (await ravi.get('/api/projects?status=active')).body;
    assert.equal(list.length, 1);
    assert.equal(list[0].parts_total, 2);
    assert.equal(list[0].parts_done, 1);
    assert.equal(list[0].latest_rev, 'R1');
    assert.equal(list[0].members, 'Asha Rao, Ravi Iyer');
    assert.equal((await ravi.get('/api/projects?mine=1')).body.length, 1);
    assert.equal((await ravi.get('/api/projects?q=northridge')).body.length, 1);
    assert.equal((await ravi.get('/api/projects?status=Completed')).body.length, 0);
  });

  test('validation: duplicate code, bad status, bad date, unknown lead', async () => {
    assert.equal((await admin.post('/api/projects', { code: 'psp01', name: 'Dup' })).status, 409);
    assert.equal((await admin.post('/api/projects', { code: 'X1', name: 'X', status: 'Done-ish' })).status, 400);
    assert.equal((await admin.post('/api/projects', { code: 'X1', name: 'X', deadline: '2026-02-30' })).status, 400);
    assert.equal((await admin.post('/api/projects', { code: 'X1', name: 'X', lead_id: 999 })).status, 400);
    assert.equal((await admin.post('/api/projects', { name: 'No code' })).status, 400);
  });

  test('only an admin or the lead can delete a project', async () => {
    const id = (await ravi.post('/api/projects', { code: 'TMP', name: 'Temp' })).body.id;
    assert.equal((await ravi.del(`/api/projects/${id}`)).status, 403);
    assert.equal((await admin.del(`/api/projects/${id}`)).status, 200);
    assert.equal((await admin.get(`/api/projects/${id}`)).status, 404);
  });
});

describe('daily tasks', () => {
  let app; let admin; let ravi;
  before(async () => {
    // Wednesday 18 Nov 2026, 11:30 in India
    app = await startApp({ now: '2026-11-18T06:00:00Z' });
    ({ admin, ravi } = await setupTeam(app.base));
  });
  after(() => app.close());

  test('add tasks for today, mark one done, carry one forward', async () => {
    const t1 = (await ravi.post('/api/tasks', { title: 'Check skin plate stresses' })).body.id;
    const t2 = (await ravi.post('/api/tasks', { title: 'Reply to CRS comments' })).body.id;
    await ravi.patch(`/api/tasks/${t1}`, { status: 'done' });
    const carried = await ravi.post(`/api/tasks/${t2}/carry`);
    assert.equal(carried.status, 200);
    assert.equal(carried.body.to, '2026-11-19');

    const today = (await ravi.get('/api/tasks')).body;
    assert.equal(today.date, '2026-11-18');
    assert.deepEqual(today.counts, { total: 2, done: 1, open: 0, carried: 1 });
    const tomorrow = (await ravi.get('/api/tasks?date=2026-11-19')).body;
    assert.equal(tomorrow.tasks.length, 1);
    assert.equal(tomorrow.tasks[0].title, 'Reply to CRS comments');
    assert.equal(tomorrow.tasks[0].carry_count, 1);
    assert.equal(tomorrow.tasks[0].carried_from_id, t2);
  });

  test('close day carries everything still open, skipping non-working days', async () => {
    app.setNow('2026-11-21T06:00:00Z'); // Saturday; work days Mon-Sat
    await ravi.post('/api/tasks', { title: 'A' });
    await ravi.post('/api/tasks', { title: 'B' });
    const closed = await ravi.post('/api/tasks/close-day', { date: '2026-11-21' });
    assert.deepEqual(closed.body, { carried: 2, to: '2026-11-23' }, 'Sunday is skipped');
    assert.equal((await ravi.get('/api/tasks?date=2026-11-23')).body.tasks.length, 2);
  });

  test('forgotten tasks from earlier days roll over into today', async () => {
    app.setNow('2026-11-24T06:00:00Z'); // Tuesday: Monday's A and B were never closed
    const unfinished = (await ravi.get('/api/tasks/unfinished')).body;
    assert.equal(unfinished.length, 3, 'A and B from Monday, plus the carried CRS task from Thursday');
    const rolled = await ravi.post('/api/tasks/rollover');
    assert.equal(rolled.body.carried, 3);
    assert.equal(rolled.body.to, '2026-11-24');
    assert.equal((await ravi.get('/api/tasks/unfinished')).body.length, 0);
    const crs = (await ravi.get('/api/tasks')).body.tasks.find((t) => t.title === 'Reply to CRS comments');
    assert.equal(crs.carry_count, 2);
  });

  test('people cannot change each other\'s tasks, and cannot add tasks to past days', async () => {
    const id = (await ravi.post('/api/tasks', { title: 'Mine' })).body.id;
    assert.equal((await admin.patch(`/api/tasks/${id}`, { status: 'done' })).status, 403);
    assert.equal((await admin.del(`/api/tasks/${id}`)).status, 403);
    assert.equal((await ravi.post('/api/tasks', { title: 'Old', date: '2026-11-01' })).status, 400);
    assert.equal((await ravi.post('/api/tasks', { title: 'Plan ahead', date: '2026-11-26' })).status, 201);
  });

  test('carried tasks are a fixed record; deleting a carried copy reopens the original', async () => {
    const id = (await ravi.post('/api/tasks', { title: 'Temp' })).body.id;
    const copy = (await ravi.post(`/api/tasks/${id}/carry`)).body.id;
    assert.equal((await ravi.patch(`/api/tasks/${id}`, { status: 'done' })).status, 400);
    assert.equal((await ravi.del(`/api/tasks/${id}`)).status, 400);
    assert.equal((await ravi.del(`/api/tasks/${copy}`)).status, 200);
    const t = (await ravi.get('/api/tasks')).body.tasks.find((x) => x.id === id);
    assert.equal(t.status, 'open');
  });

  test('team view shows everyone\'s day, including who has not planned', async () => {
    await admin.post('/api/tasks', { title: 'Review DBR' });
    const team = (await ravi.get('/api/team')).body;
    assert.equal(team.date, '2026-11-24');
    assert.equal(team.members.length, 2);
    assert.equal(team.counts.planned, 2);
    const asha = team.members.find((m) => m.name === 'Asha Rao');
    assert.equal(asha.tasks[0].title, 'Review DBR');
  });

  test('home summary', async () => {
    const users = (await admin.get('/api/users')).body;
    const raviId = users.find((u) => u.name === 'Ravi Iyer').id;
    const pid = (await admin.post('/api/projects', { code: 'HEP02', name: 'Silver Valley', deadline: '2026-11-30' })).body.id;
    await admin.post('/api/projects', { code: 'OLD', name: 'Late one', deadline: '2026-11-01' });
    await admin.post(`/api/projects/${pid}/assignments`, { user_id: raviId, part: 'Radial gate' });
    const s = (await ravi.get('/api/summary')).body;
    assert.equal(s.today, '2026-11-24');
    assert.deepEqual(s.projects.dueSoon.map((p) => p.code), ['HEP02']);
    assert.deepEqual(s.projects.overdue.map((p) => p.code), ['OLD']);
    assert.equal(s.myParts.length, 1);
    assert.equal(s.myParts[0].part, 'Radial gate');
  });
});
