const express = require('express');
const router = express.Router();
const {
  getThresholds,
  getEffectiveThresholds,
  upsertThreshold,
  deleteThreshold,
} = require('../controllers/thresholdController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect);

router.get('/', getThresholds);
router.get('/effective/:generatorId', getEffectiveThresholds);
router.put('/', authorizeRoles('Admin', 'Engineer'), upsertThreshold);
router.delete('/:id', authorizeRoles('Admin'), deleteThreshold);

module.exports = router;
