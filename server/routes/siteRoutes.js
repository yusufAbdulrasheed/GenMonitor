const express = require('express');
const router = express.Router();
const { getSites, createSite } = require('../controllers/siteController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.use(protect);

router.route('/')
  .get(getSites)
  .post(authorizeRoles('Admin'), createSite);

module.exports = router;
