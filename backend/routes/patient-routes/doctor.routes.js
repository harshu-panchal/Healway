const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getDoctors,
  getDoctorSearchSuggestions,
  getDoctorById,
  getFeaturedDoctors,
  getSpecialties,
  getSpecialtyDoctors,
  getLocations,
  checkDoctorSlotAvailability,
  toggleFollowDoctor,
  getFollowedDoctors,
  recordProfileView,
} = require('../../controllers/patient-controllers/patientDoctorController');

// Public routes (no auth required for discovery)
// IMPORTANT: Specific routes must come BEFORE parameterized routes

// Specialty routes
router.get('/specialties', getSpecialties);
router.get('/specialties/:id/doctors', getSpecialtyDoctors);

// Location routes
router.get('/locations', getLocations);

// Featured doctors
router.get('/featured', getFeaturedDoctors);
router.get('/suggestions', getDoctorSearchSuggestions);

// Followed doctors list (must be before :id)
router.get('/following', protect(), getFollowedDoctors);

// Parameterized routes (must come after specific routes)
router.post('/:id/follow', protect(), toggleFollowDoctor);
router.post('/:id/view', recordProfileView); // Optionally tracked
router.get('/:id/slots', checkDoctorSlotAvailability);
router.get('/:id', getDoctorById);
router.get('/', getDoctors);

module.exports = router;

