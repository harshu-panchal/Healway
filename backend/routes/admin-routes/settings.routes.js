const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getSettings,
  updateSettings,
  updateCommissionRate,
} = require('../../controllers/admin-controllers/adminSettingsController');

router.get('/', protect('admin'), authorize('admin'), getSettings);
router.patch('/', protect('admin'), authorize('admin'), updateSettings);
router.patch('/commission', protect('admin'), authorize('admin'), updateCommissionRate);

module.exports = router;

