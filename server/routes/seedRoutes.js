const express = require('express');
const router = express.Router();
const { seedDatabase } = require('../controllers/seedController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.route('/').post(protect, authorizeRoles('Admin'), seedDatabase);

module.exports = router;
