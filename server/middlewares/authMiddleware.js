const jwt = require('jsonwebtoken');
const { ErrorResponse } = require('./errorHandler');
const User = require('../models/User');
const config = require('../config/env');

const protect = async (req, res, next) => {
  let token;

  // Check if token exists in cookies
  if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Fallback to Bearer token
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 403));
    }

    // Set user to req object
    req.user = user;
    next();
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

module.exports = { protect };
