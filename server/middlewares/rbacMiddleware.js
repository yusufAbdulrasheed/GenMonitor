const { ErrorResponse } = require('./errorHandler');

// Grant access to specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { authorizeRoles };
