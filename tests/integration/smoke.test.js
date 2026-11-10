// Runs against a live server. Example: BASE_URL=http://localhost:3000 npm run test:integration
const request = require('supertest');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('live TaskTrack server', () => {
  test('health endpoint is ok', async () => {
    const res = await request(BASE_URL).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('task lifecycle: create, update, filter, delete', async () => {
    const created = await request(BASE_URL).post('/api/tasks').send({ title: 'integration test task' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const updated = await request(BASE_URL).put(`/api/tasks/${id}`).send({ status: 'Done' });
    expect(updated.body.status).toBe('Done');

    const done = await request(BASE_URL).get('/api/tasks').query({ status: 'Done' });
    expect(done.body.some((t) => t.id === id)).toBe(true);

    const removed = await request(BASE_URL).delete(`/api/tasks/${id}`);
    expect(removed.status).toBe(204);
  });

  test('metrics endpoint responds', async () => {
    const res = await request(BASE_URL).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
