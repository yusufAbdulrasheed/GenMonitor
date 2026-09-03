const express = require('express');
const router = express.Router();
const { generateFuelReport, generateMaintenanceCSV } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect);
router.use(authorizeRoles('Admin', 'Engineer', 'NOC Manager'));

router.route('/fuel-runtime').get(generateFuelReport);
router.route('/maintenance-csv').get(generateMaintenanceCSV);

module.exports = router;
