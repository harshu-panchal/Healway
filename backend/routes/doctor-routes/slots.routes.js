const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
    getSlotsByDate,
    createOrUpdateSlots,
    freeSlots,
    occupySlots,
    deleteSlotsByDate,
    getSlotsByDateRange,
    getAvailableSlots,
} = require('../../controllers/doctor-controllers/doctorSlotController');

// GET /api/doctors/slots/range - Get slots for a date range
router.get('/range', protect('doctor'), getSlotsByDateRange);

// GET /api/doctors/slots/available/:date - Get available slots (for booking)
router.get('/available/:date', protect('doctor'), getAvailableSlots);

// GET /api/doctors/slots/:date - Get slots for a specific date
router.get('/:date', protect('doctor'), getSlotsByDate);

// POST /api/doctors/slots - Create or update slots for a specific date
router.post('/', protect('doctor'), createOrUpdateSlots);

// PATCH /api/doctors/slots/:date/free - Mark specific slots as free
router.patch('/:date/free', protect('doctor'), freeSlots);

// PATCH /api/doctors/slots/:date/occupy - Mark specific slots as occupied
router.patch('/:date/occupy', protect('doctor'), occupySlots);

// DELETE /api/doctors/slots/:date - Delete all slots for a specific date
router.delete('/:date', protect('doctor'), deleteSlotsByDate);

module.exports = router;
