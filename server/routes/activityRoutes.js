const express = require('express');
const router = express.Router();
const { getActivity } = require('../controllers/activityController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect, authorizeRoles('Admin', 'NOC Manager'));

router.get('/', getActivity);

module.exports = router;
