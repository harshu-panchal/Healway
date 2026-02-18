const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAllAnnouncements,
  createAdminAnnouncement,
  updateAnnouncement,
  updateAnnouncementStatus,
  deleteAnnouncement,
  getAnnouncementMetrics,
} = require('../../controllers/admin-controllers/adminAnnouncementController');

router.get('/', protect('admin'), getAllAnnouncements);
router.post('/', protect('admin'), createAdminAnnouncement);
router.get('/metrics', protect('admin'), getAnnouncementMetrics);
router.patch('/:id/status', protect('admin'), updateAnnouncementStatus);
router.patch('/:id', protect('admin'), updateAnnouncement);
router.delete('/:id', protect('admin'), deleteAnnouncement);

module.exports = router;
