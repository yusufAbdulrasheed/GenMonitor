const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middlewares/errorHandler');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const config = require('../config/env');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
});

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, phone, role } = req.body;

  if (!name || !email || !role) {
    return res.status(422).json({ success: false, message: 'Please provide name, email, and role' });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email already exists' });
  }

  // Generate a random temporary password
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
  const hashedPassword = await bcrypt.hash(tempPassword, salt);

  const user = await User.create({
    name,
    email,
    phone,
    role,
    password: hashedPassword,
    isActive: true
  });

  // Send Welcome Email
  try {
    const loginUrl = `${config.clientUrl}/login`;
    const message = `Welcome to Generator Monitoring System.\n\nYour account has been created.\nRole: ${role}\nTemporary Password: ${tempPassword}\n\nPlease login at ${loginUrl} and change your password immediately.`;
    
    await sendEmail({
      email: user.email,
      subject: 'Welcome - Your Account Details',
      message
    });
  } catch (err) {
    console.error('Email could not be sent', err);
    // Continue anyway, but temp password might need to be retrieved from db manually if testing.
  }

  await req.audit({ action: 'create', entity: 'User', entityId: user._id, entityLabel: `${user.name} <${user.email}>`, meta: { role } });

  res.status(201).json({ success: true, user: publicUser(user) });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({}).select('-password');
  res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Minimal list of users that work can be assigned to
// @route   GET /api/users/assignable
// @access  Private/Admin,Engineer,NOC Manager
const getAssignableUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, role: { $in: ['Admin', 'Engineer', 'Technician'] } })
    .select('name role')
    .sort({ name: 1 });
  res.json(users.map((u) => ({ id: u._id, name: u.name, role: u.role })));
});


// @desc    Deactivate User
// @route   PATCH /api/users/:id/deactivate
// @access  Private/Admin
const deactivateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user._id.toString() === req.user.id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
  }

  user.isActive = false;
  await user.save();

  await req.audit({ action: 'update', entity: 'User', entityId: user._id, entityLabel: user.email, diff: { isActive: { from: true, to: false } } });

  res.status(200).json({ success: true, user: publicUser(user) });
});

// @desc    Reactivate User
// @route   PATCH /api/users/:id/reactivate
// @access  Private/Admin
const reactivateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  user.isActive = true;
  await user.save();

  await req.audit({ action: 'update', entity: 'User', entityId: user._id, entityLabel: user.email, diff: { isActive: { from: false, to: true } } });

  res.status(200).json({ success: true, user: publicUser(user) });
});

module.exports = {
  getUsers,
  getAssignableUsers,
  createUser,
  deactivateUser,
  reactivateUser
};
