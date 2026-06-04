const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../../controllers/admin-controllers/bannerController');

router.get('/', protect('admin'), getAllBanners);
router.post('/', protect('admin'), createBanner);
router.patch('/:id', protect('admin'), updateBanner);
router.delete('/:id', protect('admin'), deleteBanner);

module.exports = router;
