const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const app = createApp({
  dbPath: process.env.DB_PATH || './data/tasks.db',
  version: process.env.APP_VERSION || 'dev',
  forceUnhealthy: process.env.FORCE_UNHEALTHY === 'true',
});

const server = app.listen(port, () => {
  console.log(`TaskTrack ${process.env.APP_VERSION || 'dev'} listening on port ${port}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
