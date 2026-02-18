const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getRevenueOverview,
  getProviderRevenue,
} = require('../../controllers/admin-controllers/adminRevenueController');

router.get('/', protect('admin'), authorize('admin'), getRevenueOverview);
router.get('/providers/:type', protect('admin'), authorize('admin'), getProviderRevenue);

module.exports = router;

