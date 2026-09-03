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
app.use(cors({ origin: config.clientUrl, credentials: true }));
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
