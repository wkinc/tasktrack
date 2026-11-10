const path = require('path');
const express = require('express');
const client = require('prom-client');
const { openDb, createRepository } = require('./db');
const { STATUSES, DEFAULTS, buildTask } = require('./validation');

function createApp(options = {}) {
  const {
    dbPath = ':memory:',
    version = 'dev',
    forceUnhealthy = false,
  } = options;

  const repo = createRepository(openDb(dbPath));
  const app = express();
  const startedAt = Date.now();

  // Application metrics (own registry so tests can create many apps)
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });
  const requestCount = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [registry],
  });
  const requestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });

  app.use((req, res, next) => {
    const end = requestDuration.startTimer();
    res.on('finish', () => {
      const labels = {
        method: req.method,
        route: req.route ? req.route.path : 'other',
        status: res.statusCode,
      };
      requestCount.inc(labels);
      end(labels);
    });
    next();
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => {
    const body = {
      status: forceUnhealthy ? 'error' : 'ok',
      version,
      uptime: Math.round((Date.now() - startedAt) / 1000),
    };
    res.status(forceUnhealthy ? 500 : 200).json(body);
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  });

  app.get('/api/tasks', (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    res.json(repo.all(status));
  });

  app.post('/api/tasks', (req, res) => {
    const result = buildTask(req.body, DEFAULTS);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(repo.create(result.value));
  });

  app.put('/api/tasks/:id', (req, res) => {
    const existing = repo.find(req.params.id);
    if (!existing) return res.status(404).json({ error: 'task not found' });
    const result = buildTask(req.body, existing);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(repo.update(existing.id, result.value));
  });

  app.delete('/api/tasks/:id', (req, res) => {
    if (!repo.delete(req.params.id)) return res.status(404).json({ error: 'task not found' });
    res.status(204).end();
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'invalid JSON' });
    }
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
