const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/apiKeyController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect, authorizeRoles('Admin'));

router.get('/', ctrl.getApiKeys);
router.post('/', ctrl.createApiKey);
router.patch('/:id/revoke', ctrl.revokeApiKey);
router.delete('/:id', ctrl.deleteApiKey);

module.exports = router;
