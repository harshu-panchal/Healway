const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getDashboardStats,
  getRecentActivities,
  getChartData,
} = require('../../controllers/admin-controllers/adminDashboardController');

router.get('/stats', protect('admin'), authorize('admin'), getDashboardStats);
router.get('/activities', protect('admin'), authorize('admin'), getRecentActivities);
router.get('/charts', protect('admin'), authorize('admin'), getChartData);

module.exports = router;

