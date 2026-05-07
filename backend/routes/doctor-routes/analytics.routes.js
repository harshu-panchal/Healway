const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAnalyticsSummary,
  getFollowersList,
  getAnalyticsCharts
} = require('../../controllers/doctor-controllers/doctorAnalyticsController');

// All analytics routes are protected for doctors only
router.use(protect('doctor'));

router.get('/summary', getAnalyticsSummary);
router.get('/followers', getFollowersList);
router.get('/charts', getAnalyticsCharts);

module.exports = router;
