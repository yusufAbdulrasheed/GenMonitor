const express = require("express");
const {
  login,
  refresh,
  resetRequest,
  resetComplete,
  updateProfile,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { loginLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/reset-request", resetRequest);
router.post("/reset-complete", resetComplete);

router.put("/profile", protect, updateProfile);

module.exports = router;
