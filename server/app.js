const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { attachAudit } = require('./middlewares/audit');
const { uploadRoot } = require('./middlewares/upload');

const app = express();

app.set('trust proxy', 1);

// Middlewares
// Reflect any allow-listed browser origin (see CLIENT_URL); allow non-browser
// callers (health checks, curl, server-to-server) that send no Origin header.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
// Express 5 leaves req.body undefined when there is no JSON body; normalise it
// so controllers can always read req.body.* safely.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
app.use(cookieParser());
app.use(attachAudit);

// Uploaded work-order attachments
app.use('/uploads', express.static(uploadRoot));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: config.nodeEnv }));

// Keep-alive: ping our own /health on an interval so a free Render web service
// doesn't spin down after ~15 min of inactivity. No-op in tests / when the
// self URL is unknown (see config.enableKeepAlive).
if (config.enableKeepAlive) {
  const pingUrl = `${config.keepAliveUrl}/health`;
  const timer = setInterval(() => {
    fetch(pingUrl)
      .then((r) => console.log(`[keep-alive] ${pingUrl} -> ${r.status}`))
      .catch((err) => console.warn(`[keep-alive] ${pingUrl} failed: ${err.message}`));
  }, config.keepAliveIntervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[keep-alive] pinging ${pingUrl} every ${config.keepAliveIntervalMs}ms`);
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));
app.use('/api/generators', require('./routes/generatorRoutes'));
app.use('/api/work-orders', require('./routes/workOrderRoutes'));
app.use('/api/maintenance-plans', require('./routes/maintenancePlanRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/thresholds', require('./routes/thresholdRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/api-keys', require('./routes/apiKeyRoutes'));
app.use('/api/ingest', require('./routes/ingestRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/seed', require('./routes/seedRoutes'));

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
