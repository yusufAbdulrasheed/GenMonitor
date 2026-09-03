// Centralised environment configuration + validation.
// Throws early (process exit) if a required secret is missing so the app never
// silently falls back to an insecure default.

require('dotenv').config();

const REQUIRED = ['MONGO_URI', 'JWT_SECRET', 'REFRESH_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());

if (missing.length > 0) {
  console.error(
    `\n[config] Missing required environment variable(s): ${missing.join(', ')}\n` +
      '[config] Copy server/.env.example to server/.env and fill in the values.\n'
  );
  process.exit(1);
}

const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const config = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',

  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  // Send auth cookies with the Secure flag. Defaults to production; override
  // with COOKIE_SECURE=false when running a prod build over plain HTTP locally.
  cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),
  accessTokenMaxAgeMs: Number(process.env.ACCESS_TOKEN_MAX_AGE_MS) || 15 * 60 * 1000,
  refreshTokenMaxAgeMs: Number(process.env.REFRESH_TOKEN_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,

  // Telemetry simulator: on by default outside production.
  enableSimulation: bool(process.env.ENABLE_SIMULATION, !isProduction),
  simulationIntervalMs: Number(process.env.SIMULATION_INTERVAL_MS) || 10000,

  // Background scheduler (alert sweep, maintenance-plan generation, retention).
  enableScheduler: bool(process.env.ENABLE_SCHEDULER, !isProduction),
  alertSweepIntervalMs: Number(process.env.ALERT_SWEEP_INTERVAL_MS) || 30000,
  maintenanceSweepIntervalMs: Number(process.env.MAINTENANCE_SWEEP_INTERVAL_MS) || 5 * 60 * 1000,
  retentionSweepIntervalMs: Number(process.env.RETENTION_SWEEP_INTERVAL_MS) || 60 * 60 * 1000,

  // Time-series readings retention (days). 0 disables the TTL index.
  readingRetentionDays: Number(process.env.READING_RETENTION_DAYS) || 90,

  // Real-time push.
  socketEnabled: bool(process.env.SOCKET_ENABLED, true),

  // Work-order attachment uploads.
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024,

  // Destructive /api/seed endpoint: allowed by default outside production.
  allowSeed: bool(process.env.ALLOW_SEED, !isProduction),

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
};

module.exports = config;
