const asyncHandler = require('../../middleware/asyncHandler');
const Doctor = require('../../models/Doctor');

// Helper function to sort days in chronological order
const sortDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) return days || [];
  const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days
    .filter(day => dayOrder.includes(day))
    .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
};

// GET /api/doctors/availability - Get availability schedule
exports.getAvailability = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  const doctor = await Doctor.findById(id).select('availability availabilitySlots blockedDates breakTimes temporaryAvailability averageConsultationMinutes fees');

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  // Sort days in availabilitySlots.selectedDays
  const availabilitySlots = doctor.availabilitySlots ? {
    ...doctor.availabilitySlots.toObject ? doctor.availabilitySlots.toObject() : doctor.availabilitySlots,
    selectedDays: doctor.availabilitySlots.selectedDays ? sortDays(doctor.availabilitySlots.selectedDays) : []
  } : null;

  // Sort days in fees structure
  let fees = null;
  if (doctor.fees) {
    fees = { ...doctor.fees.toObject ? doctor.fees.toObject() : doctor.fees };
    if (fees.inPerson && fees.inPerson.selectedDays) {
      fees.inPerson.selectedDays = sortDays(fees.inPerson.selectedDays);
    }
    if (fees.videoCall && fees.videoCall.selectedDays) {
      fees.videoCall.selectedDays = sortDays(fees.videoCall.selectedDays);
    }
    if (fees.voiceCall && fees.voiceCall.selectedDays) {
      fees.voiceCall.selectedDays = sortDays(fees.voiceCall.selectedDays);
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      availability: doctor.availability || [],
      availabilitySlots: availabilitySlots,
      blockedDates: doctor.blockedDates || [],
      breakTimes: doctor.breakTimes || [],
      temporaryAvailability: doctor.temporaryAvailability || [],
      averageConsultationMinutes: doctor.averageConsultationMinutes || 20,
      fees: fees,
    },
  });
});

// PATCH /api/doctors/availability - Update availability schedule
exports.updateAvailability = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { availability, availabilitySlots, blockedDates, breakTimes, temporaryAvailability, averageConsultationMinutes } = req.body;

  const updateData = {};
  
  // Handle availability
  if (availability !== undefined) {
    updateData.availability = Array.isArray(availability) ? availability : [];
  }
  
  // Handle availabilitySlots - sort selectedDays and ensure empty arrays are saved
  if (availabilitySlots !== undefined) {
    if (availabilitySlots === null || availabilitySlots === undefined) {
      updateData.availabilitySlots = null;
    } else {
      const processedSlots = { ...availabilitySlots };
      
      // Sort selectedDays in chronological order
      if (processedSlots.selectedDays !== undefined) {
        processedSlots.selectedDays = Array.isArray(processedSlots.selectedDays) 
          ? sortDays(processedSlots.selectedDays)
          : [];
      }
      
      updateData.availabilitySlots = processedSlots;
    }
  }
  
  // Handle other fields
  if (blockedDates !== undefined) {
    updateData.blockedDates = Array.isArray(blockedDates) ? blockedDates : [];
  }
  if (breakTimes !== undefined) {
    updateData.breakTimes = Array.isArray(breakTimes) ? breakTimes : [];
  }
  if (temporaryAvailability !== undefined) {
    updateData.temporaryAvailability = Array.isArray(temporaryAvailability) ? temporaryAvailability : [];
  }
  if (averageConsultationMinutes !== undefined) {
    updateData.averageConsultationMinutes = averageConsultationMinutes;
  }

  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('availability availabilitySlots blockedDates breakTimes temporaryAvailability averageConsultationMinutes');

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  // Sort days in response as well
  const responseData = {
    availability: doctor.availability || [],
    availabilitySlots: doctor.availabilitySlots ? {
      ...doctor.availabilitySlots,
      selectedDays: doctor.availabilitySlots.selectedDays ? sortDays(doctor.availabilitySlots.selectedDays) : []
    } : null,
    blockedDates: doctor.blockedDates || [],
    breakTimes: doctor.breakTimes || [],
    temporaryAvailability: doctor.temporaryAvailability || [],
    averageConsultationMinutes: doctor.averageConsultationMinutes || 20,
  };

  return res.status(200).json({
    success: true,
    message: 'Availability updated successfully',
    data: responseData,
  });
});

