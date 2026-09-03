const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.LOGIN_RATE_MAX) || 5,
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  // Don't throttle inside the test suite (single process, many logins).
  skip: () => config.isTest,
});

module.exports = { loginLimiter };
