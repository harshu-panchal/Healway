const express = require('express');
const {
  createDoctor,
  getDoctors,
  getDoctorById,
  getDoctorStats,
  updateDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  verifyDoctor,
  rejectDoctor,
  toggleFeatured,
  getPendingVerifications,
  getDoctorPopularityStats,
} = require('../../controllers/admin-controllers/adminProviderController');
const { protect } = require('../../middleware/authMiddleware');
const { sanitizeInput } = require('../../middleware/validationMiddleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// All routes in this file are admin-protected
router.use(protect(ROLES.ADMIN));

// Doctors management
router.get('/doctors/popularity', getDoctorPopularityStats);
router.get('/doctors', getDoctors);
router.post('/doctors', sanitizeInput, createDoctor);
router.patch('/doctors/reorder', sanitizeInput, require('../../controllers/admin-controllers/adminProviderController').updateDoctorsOrder);
router.get('/doctors/:id', getDoctorById);
router.patch('/doctors/:id', sanitizeInput, updateDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.get('/doctors/:id/stats', getDoctorStats);
router.patch('/doctors/:id/verify', sanitizeInput, verifyDoctor);
router.patch('/doctors/:id/reject', sanitizeInput, rejectDoctor);
router.patch('/doctors/:id/toggle-featured', sanitizeInput, toggleFeatured);
router.patch('/doctors/:id/toggle-status', toggleDoctorStatus);





// Pending verifications overview
router.get('/verifications/pending', getPendingVerifications);

module.exports = router;

