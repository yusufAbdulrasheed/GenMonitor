const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  assignAlert,
  addNote,
} = require('../controllers/alertController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect);

const responder = authorizeRoles('Admin', 'Engineer', 'NOC Manager', 'Technician');
const manager = authorizeRoles('Admin', 'Engineer', 'NOC Manager');

router.get('/', getAlerts);
router.get('/stats', getAlertStats);
router.patch('/:id/acknowledge', responder, acknowledgeAlert);
router.post('/:id/notes', responder, addNote);
router.patch('/:id/resolve', manager, resolveAlert);
router.patch('/:id/assign', manager, assignAlert);

module.exports = router;
