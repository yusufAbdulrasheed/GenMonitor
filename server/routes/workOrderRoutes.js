const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workOrderController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const { upload } = require('../middlewares/upload');

router.use(protect);

const technician = authorizeRoles('Admin', 'Engineer', 'Technician');

router.get('/', ctrl.getWorkOrders);
router.get('/stats', ctrl.getWorkOrderStats);
router.get('/:id', ctrl.getWorkOrder);

router.post('/', technician, ctrl.createWorkOrder);
router.put('/:id', technician, ctrl.updateWorkOrder);
router.patch('/:id/status', technician, ctrl.changeStatus);
router.patch('/:id/assign', technician, ctrl.assignWorkOrder);
router.post('/:id/parts', technician, ctrl.addPart);
router.delete('/:id/parts/:partId', technician, ctrl.removePart);
router.post('/:id/attachments', technician, upload.single('file'), ctrl.addAttachment);
router.post('/:id/sign-off', technician, ctrl.signOff);
router.delete('/:id', authorizeRoles('Admin'), ctrl.deleteWorkOrder);

module.exports = router;
