const express = require("express");
const {
  createUser,
  deactivateUser,
  reactivateUser,
  getUsers,
  getAssignableUsers,
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/rbacMiddleware");

const router = express.Router();

router.use(protect);

// Assignment picker — available to roles that assign work.
router.get("/assignable", authorizeRoles("Admin", "Engineer", "NOC Manager"), getAssignableUsers);

// The rest of the user-management surface is Admin-only.
router.use(authorizeRoles("Admin"));

router.route("/").get(getUsers).post(createUser);
router.patch("/:id/deactivate", deactivateUser);
router.patch("/:id/reactivate", reactivateUser);

module.exports = router;
