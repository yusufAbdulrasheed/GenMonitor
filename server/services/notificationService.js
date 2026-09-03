const User = require('../models/User');
const Notification = require('../models/Notification');
const realtime = require('./realtime');
const sendEmail = require('../utils/emailService');

/**
 * Create an in-app notification for a user, push it over the socket, and email
 * when their preferences opt in for this severity.
 */
const notifyUser = async (user, { title, body, type = 'system', link, alertId, workOrderId, severity }) => {
  if (!user) return null;
  const prefs = user.notificationPrefs || {};

  let notification = null;
  if (prefs.inApp !== false) {
    notification = await Notification.create({
      userId: user._id,
      title,
      body,
      type,
      link,
      alertId,
      workOrderId,
    });
    realtime.emitToUser(user._id, 'notification:new', notification.toJSON());
  }

  const shouldEmail =
    (severity === 'critical' && prefs.emailOnCritical !== false) ||
    (severity === 'warning' && prefs.emailOnWarning === true);

  if (shouldEmail && user.email) {
    try {
      await sendEmail({ email: user.email, subject: title, message: `${title}\n\n${body || ''}`.trim() });
    } catch (err) {
      console.error('[notify] email failed:', err.message);
    }
  }

  return notification;
};

const notifyRoles = async (roles, payload) => {
  const users = await User.find({ role: { $in: roles }, isActive: true });
  await Promise.all(users.map((u) => notifyUser(u, payload)));
};

module.exports = { notifyUser, notifyRoles };
