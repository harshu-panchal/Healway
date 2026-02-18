const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  createAnnouncement,
  getMyAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../../controllers/doctor-controllers/doctorAnnouncementController');

router.post('/', protect('doctor'), createAnnouncement);
router.get('/', protect('doctor'), getMyAnnouncements);
router.patch('/:id', protect('doctor'), updateAnnouncement);
router.delete('/:id', protect('doctor'), deleteAnnouncement);

module.exports = router;
