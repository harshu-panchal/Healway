const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getPendingVerifications,
} = require('../../controllers/admin-controllers/adminVerificationController');

router.get('/pending', protect('admin'), authorize('admin'), getPendingVerifications);

module.exports = router;

