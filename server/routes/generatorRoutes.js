const express = require('express');
const router = express.Router();
const {
  getGenerators,
  createGenerator,
  getRealtimeData,
  updateGenerator,
  decommissionGenerator,
  ingestMonitoringReading,
  getGeneratorHistoryData,
} = require('../controllers/generatorController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect);

router.route('/')
  .get(getGenerators) // All authenticated users can view
  .post(authorizeRoles('Admin'), createGenerator); // Only Admin can create

router.route('/realtime').get(getRealtimeData);
router.route('/:id/readings').post(ingestMonitoringReading);
router.route('/:id/history').get(getGeneratorHistoryData);

router.route('/:id')
  .put(authorizeRoles('Admin', 'Engineer'), updateGenerator); // Admin/Engineer edit

router.route('/:id/decommission')
  .patch(authorizeRoles('Admin'), decommissionGenerator); // Admin decommission

module.exports = router;
