const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
} = require('../../controllers/admin-controllers/adminUserController');
const { protect } = require('../../middleware/authMiddleware');
const { sanitizeInput } = require('../../middleware/validationMiddleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// All routes in this file are admin-protected
router.use(protect(ROLES.ADMIN));

// Users (Patients) management
router.get('/users', getUsers);
router.post('/users', sanitizeInput, createUser);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', sanitizeInput, updateUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;

