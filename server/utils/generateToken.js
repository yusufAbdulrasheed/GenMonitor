const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate Access and Refresh Tokens
 * @param {string} id - User ID
 * @param {string} email - User Email
 * @param {string} role - User Role
 * @returns {object} { accessToken, refreshToken }
 */
const generateTokens = (id, email, role) => {
  const accessToken = jwt.sign(
    { id, email, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const refreshToken = jwt.sign(
    { id },
    config.refreshSecret,
    { expiresIn: config.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
