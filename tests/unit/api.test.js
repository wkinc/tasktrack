const os = require('os');
const path = require('path');
const fs = require('fs');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { buildTask, DEFAULTS } = require('../../src/validation');

describe('health and metrics', () => {
  test('GET /health reports ok with version and uptime', async () => {
    const res = await request(createApp({ version: '42-abc1234' })).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('42-abc1234');
    expect(typeof res.body.uptime).toBe('number');
  });

  test('GET /health fails when FORCE_UNHEALTHY is on', async () => {
    const res = await request(createApp({ forceUnhealthy: true })).get('/health');
    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
  });

  test('GET /metrics exposes request counters', async () => {
    const app = createApp();
    await request(app).get('/api/tasks');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
  });

  test('home page is served', async () => {
    const res = await request(createApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('TaskTrack');
  });
});

describe('tasks API', () => {
  let app;
  beforeEach(() => {
    app = createApp();
  });

  test('POST creates a task with defaults', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '  Write report ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      title: 'Write report',
      description: '',
      due_date: null,
      priority: 'Medium',
      status: 'To Do',
    });
  });

  test('POST rejects bad input', async () => {
    const bad = [
      {},
      { title: '   ' },
      { title: 'x'.repeat(201) },
      { title: 'ok', description: 5 },
      { title: 'ok', due_date: '31/12/2026' },
      { title: 'ok', due_date: '2026-02-31' },
      { title: 'ok', priority: 'Urgent' },
      { title: 'ok', status: 'Blocked' },
    ];
    for (const body of bad) {
      const res = await request(app).post('/api/tasks').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    }
  });

  test('POST rejects invalid JSON', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid JSON');
  });

  test('GET lists tasks and filters by status', async () => {
    await request(app).post('/api/tasks').send({ title: 'A' });
    await request(app).post('/api/tasks').send({ title: 'B', status: 'Done' });
    await request(app).post('/api/tasks').send({ title: 'C', status: 'In Progress' });

    const all = await request(app).get('/api/tasks');
    expect(all.body).toHaveLength(3);

    const done = await request(app).get('/api/tasks').query({ status: 'Done' });
    expect(done.body.map((t) => t.title)).toEqual(['B']);
  });

  test('GET rejects an unknown status filter', async () => {
    const res = await request(app).get('/api/tasks').query({ status: 'Nope' });
    expect(res.status).toBe(400);
  });

  test('PUT updates only the given fields', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', priority: 'High' });
    const res = await request(app)
      .put('/api/tasks/1')
      .send({ status: 'Done', due_date: '2026-11-01' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'A', priority: 'High', status: 'Done', due_date: '2026-11-01' });
  });

  test('PUT can clear the due date', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', due_date: '2026-11-01' });
    const res = await request(app).put('/api/tasks/1').send({ due_date: '' });
    expect(res.body.due_date).toBeNull();
  });

  test('PUT returns 404 for a missing task and 400 for bad input', async () => {
    const missing = await request(app).put('/api/tasks/99').send({ title: 'x' });
    expect(missing.status).toBe(404);

    await request(app).post('/api/tasks').send({ title: 'A' });
    const bad = await request(app).put('/api/tasks/1').send({ status: 'Blocked' });
    expect(bad.status).toBe(400);
  });

  test('DELETE removes a task and 404s the second time', async () => {
    await request(app).post('/api/tasks').send({ title: 'A' });
    const first = await request(app).delete('/api/tasks/1');
    expect(first.status).toBe(204);
    const second = await request(app).delete('/api/tasks/1');
    expect(second.status).toBe(404);
    const list = await request(app).get('/api/tasks');
    expect(list.body).toHaveLength(0);
  });
});

describe('storage and validation helpers', () => {
  test('data survives restarting the app (file database)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasktrack-'));
    const dbPath = path.join(dir, 'nested', 'tasks.db');
    await request(createApp({ dbPath })).post('/api/tasks').send({ title: 'Persist me' });
    const res = await request(createApp({ dbPath })).get('/api/tasks');
    expect(res.body.map((t) => t.title)).toEqual(['Persist me']);
           try {
         fs.rmSync(dir, { recursive: true, force: true });
       } catch {
         // Windows keeps the database file locked until the process exits, so ignore cleanup errors
       }
  });

  test('buildTask applies defaults', () => {
    expect(buildTask({ title: 'x' }, DEFAULTS).value.status).toBe('To Do');
  });
});

// Fail tset
// test('DEMO: deliberately failing test', () => {
//   expect(1).toBe(2);
// });