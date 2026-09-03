const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middlewares/errorHandler');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokens } = require('../utils/generateToken');
const sendEmail = require('../utils/emailService');
const config = require('../config/env');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const cookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSameSite,
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: config.accessTokenMaxAgeMs });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: config.refreshTokenMaxAgeMs });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Account is deactivated', 403));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const { accessToken, refreshToken } = generateTokens(user._id, user.email, user.role);

  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + config.refreshTokenMaxAgeMs),
  });

  setAuthCookies(res, { accessToken, refreshToken });

  if (req.audit) {
    await req.audit({ action: 'login', entity: 'Auth', entityId: user._id, entityLabel: user.email, actor: user });
  }

  res.status(200).json({ success: true, user: publicUser(user) });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    const record = await RefreshToken.findOneAndUpdate({ token: refreshToken }, { isValid: false });
    if (record && req.audit) {
      await req.audit({ action: 'logout', entity: 'Auth', entityId: record.userId });
    }
  }

  // Clearing a cookie only works when the attributes match those it was set
  // with, so reuse cookieOptions (secure / sameSite included).
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @desc    Refresh session
// @route   POST /api/auth/refresh
// @access  Public
const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return next(new ErrorResponse('Refresh token is required', 400));
  }

  const tokenRecord = await RefreshToken.findOne({ token: refreshToken });

  if (!tokenRecord || !tokenRecord.isValid || tokenRecord.isExpired()) {
    return next(new ErrorResponse('Invalid or expired refresh token', 401));
  }

  try {
    const decoded = jwt.verify(refreshToken, config.refreshSecret);

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new ErrorResponse('Invalid user or account deactivated', 401));
    }

    // Rotate: invalidate old token, issue a fresh pair
    tokenRecord.isValid = false;
    await tokenRecord.save();

    const tokens = generateTokens(user._id, user.email, user.role);

    await RefreshToken.create({
      userId: user._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + config.refreshTokenMaxAgeMs),
    });

    setAuthCookies(res, tokens);

    res.status(200).json({ success: true });
  } catch (error) {
    return next(new ErrorResponse('Invalid or expired refresh token', 401));
  }
});

// @desc    Request password reset
// @route   POST /api/auth/reset-request
// @access  Public
const resetRequest = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email', 400));
  }

  const user = await User.findOne({ email });

  if (user) {
    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 60 minutes

    await user.save();

    const resetUrl = `${config.clientUrl}/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) requested a password reset for your account.\n\nOpen the following link to choose a new password:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;

    try {
      await sendEmail({ email: user.email, subject: 'Password reset request', message });
    } catch (err) {
      console.error('Reset email could not be sent', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
    }
  }

  // Respond 200 regardless of whether the user exists, to prevent enumeration.
  res.status(200).json({ success: true, message: 'Password reset email sent if account exists' });
});

// @desc    Complete password reset
// @route   POST /api/auth/reset-complete
// @access  Public
const resetComplete = asyncHandler(async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return next(new ErrorResponse('Token and new password are required', 400));
  }

  if (newPassword.length < 6) {
    return next(new ErrorResponse('Password must be at least 6 characters long', 400));
  }

  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  // Invalidate all refresh tokens for this user for security
  await RefreshToken.updateMany({ userId: user._id }, { isValid: false });

  res.status(200).json({ success: true, message: 'Password reset successful' });
});

// @desc    Update self profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone, currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id);

  if (newPassword) {
    if (!currentPassword) {
      return next(new ErrorResponse('Current password is required to change password', 401));
    }

    if (newPassword.length < 6) {
      return next(new ErrorResponse('New password must be at least 6 characters long', 400));
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(new ErrorResponse('Incorrect current password', 401));
    }

    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    user.password = await bcrypt.hash(newPassword, salt);

    // Invalidate refresh tokens on password change
    await RefreshToken.updateMany({ userId: user._id }, { isValid: false });
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  res.status(200).json({ success: true, user: publicUser(user) });
});

module.exports = {
  login,
  logout,
  refresh,
  resetRequest,
  resetComplete,
  updateProfile,
};
