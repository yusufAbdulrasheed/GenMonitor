const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Current user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.unreadOnly === 'true') filter.read = false;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(notifications);
});

// @desc    Unread count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.json({ count });
});

// @desc    Mark one read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json(notification);
});

// @desc    Mark all read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});

// @desc    Get notification preferences
// @route   GET /api/notifications/prefs
// @access  Private
const getPrefs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPrefs');
  res.json(user.notificationPrefs || {});
});

// @desc    Update notification preferences
// @route   PUT /api/notifications/prefs
// @access  Private
const updatePrefs = asyncHandler(async (req, res) => {
  const { emailOnCritical, emailOnWarning, inApp } = req.body;
  const user = await User.findById(req.user._id);
  user.notificationPrefs = {
    emailOnCritical: emailOnCritical ?? user.notificationPrefs?.emailOnCritical ?? true,
    emailOnWarning: emailOnWarning ?? user.notificationPrefs?.emailOnWarning ?? false,
    inApp: inApp ?? user.notificationPrefs?.inApp ?? true,
  };
  await user.save();
  res.json(user.notificationPrefs);
});

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead, getPrefs, updatePrefs };
