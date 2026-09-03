const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ingestReadings } = require('../controllers/ingestController');
const { apiKeyAuth } = require('../middlewares/apiKeyAuth');
const config = require('../config/env');

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.INGEST_RATE_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
});

router.post('/readings', ingestLimiter, apiKeyAuth, ingestReadings);

module.exports = router;
