const http = require('http');
const config = require('./config/env'); // loads dotenv + validates
const connectDB = require('./config/db');
const app = require('./app');
const scheduler = require('./utils/scheduler');
const { initSocket } = require('./socket');

const start = async () => {
  await connectDB();

  const server = http.createServer(app);

  if (config.socketEnabled) {
    initSocket(server);
  }

  scheduler.start();

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down`);
    scheduler.stop();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();
