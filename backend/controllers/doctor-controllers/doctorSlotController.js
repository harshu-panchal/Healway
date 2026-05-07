const asyncHandler = require('../../middleware/asyncHandler');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');

// GET /api/doctors/slots/:date - Get slots for a specific date
exports.getSlotsByDate = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { date } = req.params;

    const doctor = await Doctor.findById(id).select('dailySlots availability availabilitySlots fees');

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    // Find slots for the specific date
    const dateSlots = doctor.dailySlots?.find(
        slot => new Date(slot.date).toDateString() === new Date(date).toDateString()
    );

    return res.status(200).json({
        success: true,
        data: {
            date,
            slots: dateSlots?.slots || [],
            hasCustomSlots: !!dateSlots,
        },
    });
});

// POST /api/doctors/slots - Create/Update slots for a specific date
exports.createOrUpdateSlots = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { date, slots } = req.body;

    if (!date || !slots || !Array.isArray(slots)) {
        return res.status(400).json({
            success: false,
            message: 'Date and slots array are required',
        });
    }

    // Validate slot structure
    for (const slot of slots) {
        if (!slot.consultationType || !slot.startTime || !slot.endTime) {
            return res.status(400).json({
                success: false,
                message: 'Each slot must have consultationType, startTime, and endTime',
            });
        }

        if (!['in_person', 'video_call', 'voice_call'].includes(slot.consultationType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid consultation type. Must be in_person, video_call, or voice_call',
            });
        }
    }

    // Helper to convert time string to minutes for comparison
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        
        let hours, minutes;
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            // Handle 12-hour format
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
        } else {
            // Handle 24-hour format
            const parts = timeStr.split(':');
            hours = parseInt(parts[0], 10);
            minutes = parseInt(parts[1], 10);
        }
        return hours * 60 + minutes;
    };

    // Check for overlapping or duplicate slots
    for (let i = 0; i < slots.length; i++) {
        const currentSlot = slots[i];
        const start1 = timeToMinutes(currentSlot.startTime);
        const end1 = timeToMinutes(currentSlot.endTime);

        for (let j = i + 1; j < slots.length; j++) {
            const otherSlot = slots[j];
            const start2 = timeToMinutes(otherSlot.startTime);
            const end2 = timeToMinutes(otherSlot.endTime);
            
            // Overlap condition: S1 < E2 and S2 < E1
            if (start1 < end2 && start2 < end1) {
                const type1 = currentSlot.consultationType.replace('_', ' ');
                const type2 = otherSlot.consultationType.replace('_', ' ');
                return res.status(400).json({
                    success: false,
                    message: `Time conflict: ${currentSlot.startTime}-${currentSlot.endTime} (${type1}) overlaps with ${otherSlot.startTime}-${otherSlot.endTime} (${type2}). Please ensure slots do not overlap across any consultation type.`,
                });
            }
        }
    }

    const doctor = await Doctor.findById(id);

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    // Initialize dailySlots if not exists
    if (!doctor.dailySlots) {
        doctor.dailySlots = [];
    }

    // Find existing date entry
    const existingDateIndex = doctor.dailySlots.findIndex(
        slot => new Date(slot.date).toDateString() === new Date(date).toDateString()
    );

    const slotData = {
        date: new Date(date),
        slots: slots.map(slot => ({
            consultationType: slot.consultationType,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isFree: slot.isFree !== undefined ? slot.isFree : false,
        })),
    };

    if (existingDateIndex !== -1) {
        // Update existing date slots
        doctor.dailySlots[existingDateIndex] = slotData;
    } else {
        // Add new date slots
        doctor.dailySlots.push(slotData);
    }

    await doctor.save();

    return res.status(200).json({
        success: true,
        message: 'Slots updated successfully',
        data: slotData,
    });
});

// PATCH /api/doctors/slots/:date/free - Mark specific slots as free
exports.freeSlots = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { date } = req.params;
    const { slotIndices } = req.body; // Array of slot indices to mark as free

    if (!slotIndices || !Array.isArray(slotIndices)) {
        return res.status(400).json({
            success: false,
            message: 'slotIndices array is required',
        });
    }

    const doctor = await Doctor.findById(id);

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    // Find the date entry
    const dateSlotIndex = doctor.dailySlots?.findIndex(
        slot => new Date(slot.date).toDateString() === new Date(date).toDateString()
    );

    if (dateSlotIndex === -1 || !doctor.dailySlots) {
        return res.status(404).json({
            success: false,
            message: 'No slots found for this date',
        });
    }

    // Mark specified slots as free
    slotIndices.forEach(index => {
        if (doctor.dailySlots[dateSlotIndex].slots[index]) {
            doctor.dailySlots[dateSlotIndex].slots[index].isFree = true;
        }
    });

    await doctor.save();

    return res.status(200).json({
        success: true,
        message: 'Slots marked as free successfully',
        data: doctor.dailySlots[dateSlotIndex],
    });
});

// PATCH /api/doctors/slots/:date/occupy - Mark specific slots as occupied (remove free status)
exports.occupySlots = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { date } = req.params;
    const { slotIndices } = req.body; // Array of slot indices to mark as occupied

    if (!slotIndices || !Array.isArray(slotIndices)) {
        return res.status(400).json({
            success: false,
            message: 'slotIndices array is required',
        });
    }

    const doctor = await Doctor.findById(id);

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    // Find the date entry
    const dateSlotIndex = doctor.dailySlots?.findIndex(
        slot => new Date(slot.date).toDateString() === new Date(date).toDateString()
    );

    if (dateSlotIndex === -1 || !doctor.dailySlots) {
        return res.status(404).json({
            success: false,
            message: 'No slots found for this date',
        });
    }

    // Mark specified slots as occupied
    slotIndices.forEach(index => {
        if (doctor.dailySlots[dateSlotIndex].slots[index]) {
            doctor.dailySlots[dateSlotIndex].slots[index].isFree = false;
        }
    });

    await doctor.save();

    return res.status(200).json({
        success: true,
        message: 'Slots marked as occupied successfully',
        data: doctor.dailySlots[dateSlotIndex],
    });
});

// DELETE /api/doctors/slots/:date - Delete all slots for a specific date
exports.deleteSlotsByDate = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { date } = req.params;

    const doctor = await Doctor.findById(id);

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    if (!doctor.dailySlots) {
        return res.status(404).json({
            success: false,
            message: 'No slots found',
        });
    }

    // Remove the date entry
    doctor.dailySlots = doctor.dailySlots.filter(
        slot => new Date(slot.date).toDateString() !== new Date(date).toDateString()
    );

    await doctor.save();

    return res.status(200).json({
        success: true,
        message: 'Slots deleted successfully',
    });
});

// GET /api/doctors/slots/range - Get slots for a date range
exports.getSlotsByDateRange = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'startDate and endDate are required',
        });
    }

    const doctor = await Doctor.findById(id).select('dailySlots');

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filter slots within the date range
    const slotsInRange = doctor.dailySlots?.filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= start && slotDate <= end;
    }) || [];

    return res.status(200).json({
        success: true,
        data: slotsInRange,
    });
});

// GET /api/doctors/slots/available/:date - Get available slots for booking (excludes booked ones)
exports.getAvailableSlots = asyncHandler(async (req, res) => {
    const { id } = req.auth;
    const { date } = req.params;

    const doctor = await Doctor.findById(id).select('dailySlots');

    if (!doctor) {
        return res.status(404).json({
            success: false,
            message: 'Doctor not found',
        });
    }

    // Find slots for the specific date
    const dateSlots = doctor.dailySlots?.find(
        slot => new Date(slot.date).toDateString() === new Date(date).toDateString()
    );

    if (!dateSlots) {
        return res.status(200).json({
            success: true,
            data: {
                date,
                slots: [],
            },
        });
    }

    // Get all appointments for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
        doctor: id,
        appointmentDate: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
        status: { $nin: ['cancelled', 'rejected'] },
    }).select('appointmentTime consultationType');

    // Mark slots as booked if they have appointments
    const slotsWithAvailability = dateSlots.slots.map(slot => {
        const isBooked = appointments.some(
            apt =>
                apt.appointmentTime === slot.startTime &&
                apt.consultationType === slot.consultationType
        );

        return {
            ...slot.toObject ? slot.toObject() : slot,
            isBooked,
            isAvailable: !isBooked && !slot.isFree,
        };
    });

    return res.status(200).json({
        success: true,
        data: {
            date,
            slots: slotsWithAvailability,
        },
    });
});
