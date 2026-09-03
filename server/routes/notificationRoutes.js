const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  getPrefs,
  updatePrefs,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.get('/prefs', getPrefs);
router.put('/prefs', updatePrefs);
router.patch('/:id/read', markRead);

module.exports = router;
