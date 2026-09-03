const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/maintenancePlanController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect);

const planner = authorizeRoles('Admin', 'Engineer');

router.get('/', ctrl.getPlans);
router.post('/run-sweep', planner, ctrl.runSweep);
router.get('/:id', ctrl.getPlan);
router.post('/', planner, ctrl.createPlan);
router.put('/:id', planner, ctrl.updatePlan);
router.delete('/:id', planner, ctrl.deletePlan);

module.exports = router;
