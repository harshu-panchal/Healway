const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getActiveBanners,
} = require('../../controllers/admin-controllers/bannerController');

router.get('/', protect('patient'), getActiveBanners);

module.exports = router;
