const express = require('express');
const router = express.Router();
const { getSummary, getGeneratorSummary } = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/summary', getSummary);
router.get('/generators/:id', getGeneratorSummary);

module.exports = router;
