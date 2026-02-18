const asyncHandler = require("../../middleware/asyncHandler");
const Appointment = require("../../models/Appointment");
const Doctor = require("../../models/Doctor");
const Patient = require("../../models/Patient");
const Transaction = require("../../models/Transaction");
const { getIO } = require("../../config/socket");
const {
  sendAppointmentConfirmationEmail,
  sendDoctorAppointmentNotification,
  sendAppointmentCancellationEmail,
  createAppointmentNotification,
} = require("../../services/notificationService");
// Redis removed
const { ROLES } = require("../../utils/constants");
const {
  getISTTime,
  getISTDate,
  getISTTimeInMinutes,
  getISTHourMinute,
} = require("../../utils/timezoneUtils");

/**
 * Helper: Normalize consultation mode to standard format
 */
const normalizeConsultationMode = (mode) => {
  if (!mode) return 'IN_PERSON';
  const normalized = mode.toUpperCase();
  if (normalized === 'VIDEO_CALL' || normalized === 'VIDEO') return 'VIDEO';
  if (normalized === 'VOICE_CALL' || normalized === 'CALL') return 'CALL';
  if (normalized === 'IN_PERSON') return 'IN_PERSON';
  // Backward compatibility
  if (normalized === 'INPERSON') return 'IN_PERSON';
  return normalized;
};

/**
 * Helper: Check if consultation type requires token (CALL or VIDEO)
 */
const requiresToken = (consultationMode) => {
  const mode = normalizeConsultationMode(consultationMode);
  return mode === 'CALL' || mode === 'VIDEO';
};

/**
 * Helper: Get session slots for a given date and consultation mode
 * Returns array of { startTime, endTime, isFree }
 */
const getSessionSlots = (doctor, appointmentDate, consultationMode) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[appointmentDate.getDay()];
  const mode = normalizeConsultationMode(consultationMode);

  // New Logic: availabilitySlots with arrays
  if (doctor.availabilitySlots) {
    const sessionTimingDays = doctor.availabilitySlots.selectedDays;

    // Check if day is selected
    let dayIncluded = false;
    if (Array.isArray(sessionTimingDays) && sessionTimingDays.length > 0) {
      const dayNameLower = dayName.toLowerCase();
      dayIncluded = sessionTimingDays.some(day => day && day.toLowerCase() === dayNameLower);
    }

    if (dayIncluded) {
      let slots = [];
      if (mode === 'IN_PERSON' && Array.isArray(doctor.availabilitySlots.inPerson)) {
        slots = doctor.availabilitySlots.inPerson;
      } else if (mode === 'VIDEO' && Array.isArray(doctor.availabilitySlots.videoCall)) {
        slots = doctor.availabilitySlots.videoCall;
      } else if (mode === 'CALL' && Array.isArray(doctor.availabilitySlots.voiceCall)) {
        slots = doctor.availabilitySlots.voiceCall;
      } else if ((mode === 'VIDEO' || mode === 'CALL') && doctor.availabilitySlots.callVideo && !Array.isArray(doctor.availabilitySlots.videoCall) && !Array.isArray(doctor.availabilitySlots.voiceCall)) {
        // Fallback to old shared callVideo object if strict arrays not found
        if (doctor.availabilitySlots.callVideo.startTime) {
          return [{
            startTime: doctor.availabilitySlots.callVideo.startTime,
            endTime: doctor.availabilitySlots.callVideo.endTime,
            isFree: false
          }];
        }
      }

      // Filter out incomplete slots
      return slots.filter(s => s.startTime && s.endTime).map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        isFree: s.isFree || false
      }));
    }
  }

  // Fallback to old availability array
  if (doctor.availability && Array.isArray(doctor.availability)) {
    const dayAvailability = doctor.availability.find(avail => avail.day === dayName);
    if (dayAvailability) {
      let slot;
      if (mode === 'CALL' || mode === 'VIDEO') {
        slot = dayAvailability.slots?.find(s => s.consultationType === 'call_video');
      } else if (mode === 'IN_PERSON') {
        slot = dayAvailability.slots?.find(s => s.consultationType === 'in_person');
      }

      // If slot found in old structure
      if (slot && slot.startTime) {
        return [{ startTime: slot.startTime, endTime: slot.endTime || dayAvailability.endTime, isFree: slot.isFree || false }];
      }
      // Very old structure fallback
      if (dayAvailability.startTime) {
        return [{ startTime: dayAvailability.startTime, endTime: dayAvailability.endTime, isFree: false }];
      }
    }
  }

  return [];
};


/**
 * Helper: Convert time string (HH:MM or HH:MM AM/PM) to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;

  // Handle 12-hour format (e.g., "10:00 AM", "2:30 PM")
  const pmMatch = timeStr.match(/(\d+):(\d+)\s*PM/i);
  if (pmMatch) {
    let hours = parseInt(pmMatch[1], 10);
    const minutes = parseInt(pmMatch[2], 10);
    if (hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }

  const amMatch = timeStr.match(/(\d+):(\d+)\s*AM/i);
  if (amMatch) {
    let hours = parseInt(amMatch[1], 10);
    const minutes = parseInt(amMatch[2], 10);
    if (hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Handle 24-hour format (e.g., "10:00", "14:30")
  const match = timeStr.match(/(\d+):(\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }

  return null;
};

/**
 * Helper: Calculate expected time for CALL/VIDEO consultation based on MULTIPLE SLOTS
 * Iterates through slots to find where the token falls.
 */
const calculateExpectedTime = (appointmentDate, slots, tokenNumber, averageConsultationMinutes) => {
  if (!slots || !slots.length || !tokenNumber || !averageConsultationMinutes) return null;

  // Sort slots by start time just in case
  const sortedSlots = [...slots].sort((a, b) => {
    const tA = timeToMinutes(a.startTime);
    const tB = timeToMinutes(b.startTime);
    return tA - tB;
  });

  let currentTokenCount = 0;

  for (const slot of sortedSlots) {
    const startMins = timeToMinutes(slot.startTime);
    const endMins = timeToMinutes(slot.endTime);

    if (startMins !== null && endMins !== null) {
      let duration = endMins - startMins;
      if (duration < 0) duration += 1440;

      // Calculate capacity of this slot
      const slotCapacity = Math.floor(duration / averageConsultationMinutes);

      // Check if token falls in this slot
      if (tokenNumber <= currentTokenCount + slotCapacity) {
        // Found the slot
        const relativeToken = tokenNumber - currentTokenCount;
        const expectedMinutes = startMins + ((relativeToken - 1) * averageConsultationMinutes);

        const expectedDate = new Date(appointmentDate);
        const hours = Math.floor(expectedMinutes / 60);
        const minutes = expectedMinutes % 60;
        expectedDate.setHours(hours, minutes, 0, 0);

        // Adjust for day overflow if needed (simplified)
        return expectedDate;
      }

      currentTokenCount += slotCapacity;
    }
  }

  return null; // Token exceeds total capacity
};

/**
 * Helper: Get next token number for a given date and consultation mode
 */
const getNextTokenNumber = async (doctorId, appointmentDate, consultationMode) => {
  const mode = normalizeConsultationMode(consultationMode);

  // Only generate token for CALL/VIDEO
  if (mode !== 'CALL' && mode !== 'VIDEO') {
    return null;
  }

  // Create date range for the appointment date
  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Count existing appointments with tokens for this date and mode
  const existingAppointments = await Appointment.find({
    doctorId,
    appointmentDate: {
      $gte: startOfDay,
      $lt: endOfDay
    },
    consultationMode: { $in: [mode, mode.toLowerCase(), 'call', 'video_call', 'CALL', 'VIDEO'] },
    tokenNumber: { $ne: null },
    status: { $nin: ['cancelled'] }
  }).sort({ tokenNumber: -1 }).limit(1);

  if (existingAppointments.length > 0 && existingAppointments[0].tokenNumber) {
    return existingAppointments[0].tokenNumber + 1;
  }

  return 1;
};

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/patients/appointments
exports.getAppointments = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { status, date, doctor } = req.query;
  const { page, limit, skip } = buildPagination(req);

  // Only run maintenance (delete old pending) on the first page to save DB cycles
  if (page === 1) {
    const thirtyMinutesAgo = new Date(getISTTime().getTime() - 30 * 60 * 1000);
    await Appointment.deleteMany({
      patientId: id,
      paymentStatus: "pending",
      status: { $in: ["pending_payment", "scheduled", "confirmed"] },
      createdAt: { $lt: thirtyMinutesAgo },
    });
  }

  const filter = { patientId: id };

  if (status) {
    if (status === "scheduled") {
      filter.status = { $in: ["scheduled", "confirmed"] };
      filter.rescheduledAt = { $exists: false };
    } else if (status === "rescheduled") {
      filter.rescheduledAt = { $exists: true };
      filter.status = { $in: ["scheduled", "confirmed"] };
    } else if (status === "cancelled") {
      filter.status = "cancelled";
    } else {
      filter.status = status;
      if (status !== "cancelled") {
        filter.paymentStatus = { $ne: "pending" };
      }
    }
  }

  if (date) {
    const dateObj = new Date(date);
    filter.appointmentDate = {
      $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
      $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
    };
  }
  if (doctor) filter.doctorId = doctor;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate(
        "doctorId",
        "firstName lastName specialization profileImage consultationFee clinicDetails"
      )
      .sort({ appointmentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: appointments.map(apt => ({ ...apt, id: apt._id })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/patients/appointments/upcoming
exports.getUpcomingAppointments = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  const appointments = await Appointment.find({
    patientId: id,
    appointmentDate: { $gte: new Date() },
    status: { $in: ["scheduled", "confirmed"] },
    paymentStatus: { $ne: "pending" },
  })
    .populate(
      "doctorId",
      "firstName lastName specialization profileImage consultationFee clinicDetails"
    )
    .sort({ appointmentDate: 1, time: 1 })
    .limit(10)
    .lean();

  return res.status(200).json({
    success: true,
    data: appointments.map(apt => ({ ...apt, id: apt._id })),
  });
});

// POST /api/patients/appointments
exports.createAppointment = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const {
    doctorId,
    appointmentDate,
    time,
    reason,
    appointmentType,
    consultationMode,
    // Patient Details for 'Someone Else'
    patientType,
    patientName,
    patientEmail,
    patientPhone,
    patientAge,
    patientGender,
  } = req.body;

  if (!doctorId || !appointmentDate || !time) {
    return res.status(400).json({
      success: false,
      message: "Doctor ID, appointment date, and time are required",
    });
  }

  // Parse appointment date properly (YYYY-MM-DD format)
  let parsedAppointmentDate;
  if (
    typeof appointmentDate === "string" &&
    appointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    const [year, month, day] = appointmentDate.split("-").map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const localYear = utcDate.getFullYear();
    const localMonth = utcDate.getMonth();
    const localDay = utcDate.getDate();
    parsedAppointmentDate = new Date(localYear, localMonth, localDay, 0, 0, 0, 0);
  } else {
    parsedAppointmentDate = new Date(appointmentDate);
  }
  parsedAppointmentDate.setHours(0, 0, 0, 0);

  // Parallelize doctor lookup and duplicate appointment checks
  const [doctor, existingAppointment, doctorCancelledToday] = await Promise.all([
    Doctor.findById(doctorId).lean(),
    Appointment.findOne({
      patientId: id,
      doctorId,
      appointmentDate: parsedAppointmentDate,
      status: { $nin: ["cancelled"] },
    }).select('_id').lean(),
    Appointment.findOne({
      patientId: id,
      doctorId,
      appointmentDate: parsedAppointmentDate,
      status: "cancelled",
      cancelledBy: "doctor",
    }).select('_id').lean(),
  ]);

  if (!doctor || doctor.status !== "approved" || !doctor.isActive) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found or not available",
    });
  }

  if (existingAppointment) {
    return res.status(400).json({
      success: false,
      message: "You already have an appointment with this doctor on this date",
    });
  }

  if (doctorCancelledToday) {
    return res.status(400).json({
      success: false,
      message: "Doctor has cancelled your appointment for this date. You cannot book another appointment with this doctor on the same date. Please select a different date.",
    });
  }

  // Normalize consultation mode
  let normalizedMode = normalizeConsultationMode(consultationMode || "in_person");

  // For Centers (isDoctor: false), force IN_PERSON and bypass mode validation
  if (!doctor.isDoctor) {
    normalizedMode = 'IN_PERSON';
  }

  const needsToken = requiresToken(normalizedMode);

  // Validate mode is supported by doctor (Skip for Centers)
  if (doctor.isDoctor) {
    const doctorModes = doctor.consultationModes || [];
    const normalizedDoctorModes = doctorModes.map(m => normalizeConsultationMode(m));
    if (!normalizedDoctorModes.includes(normalizedMode)) {
      return res.status(400).json({
        success: false,
        message: `Doctor does not support ${normalizedMode.replace('_', ' ')} consultations`,
      });
    }
  }

  // For Call/Video, check slot capacity before creating appointment
  // Also perform checks for doctor appointments only
  if (needsToken && doctor.isDoctor) {
    const availableSlots = getSessionSlots(doctor, parsedAppointmentDate, normalizedMode);

    if (availableSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Doctor has not configured ${normalizedMode.replace('_', ' ')} slots for this date`,
      });
    }

    // Calculate total slots available by summing up ranges
    const avgTime = doctor.averageConsultationMinutes || 20;
    let totalSlots = 0;

    availableSlots.forEach(slot => {
      const startMins = timeToMinutes(slot.startTime);
      const endMins = timeToMinutes(slot.endTime);
      if (startMins !== null && endMins !== null) {
        let duration = endMins - startMins;
        if (duration < 0) duration += 1440; // Handle cross midnight
        const slotsInrange = Math.floor(duration / avgTime);
        totalSlots += Math.max(0, slotsInrange);
      }
    });

    if (totalSlots > 0) {
      // Define strict mode filter for capacity check to avoid cross-mode interference
      let bookingModes;
      if (normalizedMode === 'IN_PERSON') {
        bookingModes = ['IN_PERSON', 'in_person', 'clinic_visit', 'CLINIC_VISIT', 'clinic', 'CLINIC'];
      } else {
        // Both CALL and VIDEO share the same 'callVideo' time slots/capacity?
        // Wait, if I separated them in Doctor Model, they should have separate capacity if configured separately.
        // However, existing appointments might use legacy modes.
        // If doctor uses 'videoCall' array, he has capacity for video.
        // If doctor uses 'voiceCall' array, he has capacity for voice.
        // They are now distinct capacities.

        if (normalizedMode === 'VIDEO') {
          bookingModes = ['VIDEO', 'VIDEO_CALL', 'video', 'video_call', 'video_meeting'];
        } else {
          bookingModes = ['CALL', 'VOICE_CALL', 'call', 'voice_call'];
        }
      }

      // Count existing bookings (paid or pending payment within 30 mins)
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const existingCount = await Appointment.countDocuments({
        doctorId,
        appointmentDate: parsedAppointmentDate,
        consultationMode: { $in: bookingModes },
        status: { $nin: ['cancelled'] },
        $or: [
          { paymentStatus: 'paid' },
          { paymentStatus: 'free' },
          { paymentStatus: 'partial' },
          { paymentStatus: 'pending', createdAt: { $gte: thirtyMinsAgo } }
        ]
      });

      if (existingCount >= totalSlots) {
        return res.status(400).json({
          success: false,
          message: 'No slots available for this date and mode. Please select another date or mode.',
        });
      }
    }
  }

  // Get clinic times for IN_PERSON - Use 1st slot for backward compat
  let clinicStartTime = null;
  let clinicEndTime = null;
  if (normalizedMode === 'IN_PERSON') {
    const slots = getSessionSlots(doctor, parsedAppointmentDate, normalizedMode);
    if (slots.length > 0) {
      clinicStartTime = slots[0].startTime;
      clinicEndTime = slots[slots.length - 1].endTime;
    }
  }

  // Calculate fee
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[parsedAppointmentDate.getDay()];

  let feeType = 'inPerson';
  if (normalizedMode === 'VIDEO') feeType = 'videoCall';
  if (normalizedMode === 'CALL') feeType = 'voiceCall';

  // Check if this day requires payment (fees structure days)
  let calculatedFee = 0;
  let requiresPayment = true;

  if (doctor.fees && doctor.fees[feeType]) {
    const feeData = doctor.fees[feeType];
    const selectedDays = feeData.selectedDays || [];

    // Use case-insensitive comparison to handle any case mismatches
    const dayNameLower = dayName.toLowerCase();
    const dayIncluded = selectedDays.length > 0
      ? selectedDays.some(day => day && day.toLowerCase() === dayNameLower)
      : false;

    // Debug log for Monday specifically
    if (dayName === 'Monday') {
      console.log('💰 createAppointment - Monday payment check:', {
        doctorId: doctor._id?.toString(),
        date: parsedAppointmentDate.toISOString().split('T')[0],
        feeType: feeType,
        dayName: dayName,
        selectedDays: selectedDays,
        dayIncluded: dayIncluded,
        feeData: {
          original: feeData.original,
          final: feeData.final,
          selectedDays: feeData.selectedDays
        }
      });
    }

    if (selectedDays.length > 0) {
      if (!dayIncluded) {
        // Day is NOT in fees.selectedDays - FREE booking
        calculatedFee = 0;
        requiresPayment = false;
        if (dayName === 'Monday') {
          console.log('✅ Monday is FREE (not in fees.selectedDays)');
        }
      } else {
        // Day IS in fees.selectedDays - PAID booking
        calculatedFee = feeData.final || 0;
        requiresPayment = calculatedFee > 0;
        if (dayName === 'Monday') {
          console.log('✅ Monday is PAID (in fees.selectedDays)', {
            calculatedFee: calculatedFee,
            requiresPayment: requiresPayment
          });
        }
      }
    } else {
      // No selectedDays set - default to FREE (not set = free)
      calculatedFee = 0;
      requiresPayment = false;
      if (dayName === 'Monday') {
        console.log('✅ Monday is FREE (no selectedDays set)');
      }
    }
  } else {
    // No fees structure - default to FREE (not set = free)
    calculatedFee = 0;
    requiresPayment = false;
    if (dayName === 'Monday') {
      console.log('✅ Monday is FREE (no fees structure)');
    }
  }

  // Override for Centers (Diagnostic/Tests):
  // They might not have detailed fee structures setup yet.
  // If no fees are set, we might default to PAID if they have a 'consultationFee' set globally
  if (!doctor.isDoctor && !doctor.fees) {
    // If it's a center and no complex fees, check simple consultationFee
    if (doctor.consultationFee > 0) {
      calculatedFee = doctor.consultationFee;
      requiresPayment = true;
    }
  }

  // NEW LOGIC: Check if the specific slot allows FREE booking
  // We need to see if the requested 'time' falls within an 'isFree: true' slot
  const appointmentTimeMins = timeToMinutes(time);
  if (appointmentTimeMins !== null && doctor.availabilitySlots) {
    const slots = getSessionSlots(doctor, parsedAppointmentDate, normalizedMode);
    const matchingSlot = slots.find(s => {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      return start !== null && end !== null && appointmentTimeMins >= start && appointmentTimeMins < end;
    });

    if (matchingSlot && matchingSlot.isFree) {
      console.log("🎁 Selected slot is marked as FREE in availability configuration");
      calculatedFee = 0;
      requiresPayment = false;
      if (dayName === 'Monday') console.log("✅ Monday slot override: FREE");
    }
  }

  // Determine payment status based on whether payment is required
  let paymentStatus = "pending";
  let appointmentStatus = "pending_payment";

  // Check if patient specifically requested COD for in-person appointment
  const requestedCOD = req.body.paymentMethod === 'cod' && normalizedMode === 'IN_PERSON';
  const isCODAllowed = doctor.fees?.inPerson?.codEnabled === true;

  // Check if there is a previous appointment cancelled by doctor for the same mode
  // If found, and it was paid/partial, don't charge again (re-use the credit)
  const previousCancelledByDoctor = await Appointment.findOne({
    patientId: id,
    doctorId,
    consultationMode: normalizedMode,
    status: "cancelled",
    cancelledBy: "doctor",
    paymentStatus: { $in: ["paid", "partial"] },
  }).sort({ createdAt: -1 });

  if (previousCancelledByDoctor) {
    console.log("♻️ Found doctor-cancelled appointment, skipping payment for re-booking");
    paymentStatus = "free"; // Mark as free to skip payment flow
    appointmentStatus = "scheduled"; // Set to scheduled (pending approval) instead of auto-confirmed
    requiresPayment = false;
  } else if (!requiresPayment || calculatedFee === 0) {
    // Free booking - no payment required
    paymentStatus = "free";
    appointmentStatus = "scheduled"; // Set to scheduled (pending approval) for free bookings instead of auto-confirmed
  } else if (requestedCOD && isCODAllowed) {
    // COD requested and allowed - confirmed without upfront payment
    console.log("💵 COD requested and allowed, confirming appointment");
    paymentStatus = "pending";
    appointmentStatus = "scheduled";
    requiresPayment = false; // Set to false here so it skips wallet/razorpay logic in this step
  }

  // Prepare appointment data based on consultation type
  const appointmentData = {
    patientId: id,
    doctorId,
    appointmentDate: parsedAppointmentDate,
    time: time || "Consultation",
    reason: reason || "Consultation",
    appointmentType: appointmentType || "New",
    consultationMode: normalizedMode, // Store normalized mode
    fee: calculatedFee,
    paidAmount: 0,
    remainingAmount: (requiresPayment || requestedCOD) ? calculatedFee : 0,
    status: appointmentStatus,
    // queueStatus: "waiting",
    paymentStatus: paymentStatus,
    // Add "Someone Else" details
    patientType: patientType || 'Self',
    patientName: patientType === 'Else' ? patientName : undefined,
    patientEmail: patientType === 'Else' ? patientEmail : undefined,
    patientPhone: patientType === 'Else' ? patientPhone : undefined,
    patientAge: patientType === 'Else' ? patientAge : undefined,
    patientGender: patientType === 'Else' ? patientGender : undefined,
  };

  // For CALL/VIDEO: Store averageConsultationTime (token and expectedTime assigned after payment)
  if (needsToken) {
    appointmentData.averageConsultationTime = doctor.averageConsultationMinutes || 20;
    appointmentData.duration = doctor.averageConsultationMinutes || 20; // Keep for backward compatibility
    appointmentData.tokenNumber = null; // Will be assigned after payment
    appointmentData.expectedTime = null; // Will be calculated after payment
    appointmentData.clinicStartTime = null; // Explicitly null for CALL/VIDEO
    appointmentData.clinicEndTime = null; // Explicitly null for CALL/VIDEO
  } else {
    // For IN_PERSON: Store clinic times, NO token, NO expectedTime, NO averageConsultationTime
    appointmentData.clinicStartTime = clinicStartTime;
    appointmentData.clinicEndTime = clinicEndTime;
    appointmentData.tokenNumber = null; // Explicitly null for IN_PERSON
    appointmentData.expectedTime = null; // Explicitly null for IN_PERSON
    appointmentData.averageConsultationTime = null; // Explicitly null for IN_PERSON
    appointmentData.duration = null; // No duration tracking for IN_PERSON
  }

  const appointment = await Appointment.create(appointmentData);

  // Handle automatic wallet payment
  if (requiresPayment && paymentStatus !== "free") {
    const patient = await Patient.findById(id);
    if (patient && patient.walletBalance > 0) {
      const deduction = Math.min(patient.walletBalance, calculatedFee);

      if (deduction > 0) {
        // Deduct from wallet
        patient.walletBalance -= deduction;
        await patient.save();

        // Create transaction
        await Transaction.create({
          userId: id,
          userType: 'patient',
          type: 'payment',
          amount: deduction,
          status: 'completed',
          description: 'Payment for appointment (Wallet)',
          appointmentId: appointment._id,
          category: 'appointment',
          paymentMethod: 'wallet',
          metadata: { type: 'wallet_deduction' }
        });

        // Update appointment
        appointment.paidAmount = deduction;
        appointment.remainingAmount = calculatedFee - deduction;
        appointment.paymentStatus = (deduction >= calculatedFee) ? 'paid' : 'partial';

        if (appointment.paymentStatus === 'paid') {
          appointment.status = 'scheduled';

          if (needsToken) {
            const tokenNumber = await getNextTokenNumber(doctorId, parsedAppointmentDate, normalizedMode);
            if (tokenNumber) {
              appointment.tokenNumber = tokenNumber;

              // Calculate expected time using multiple slots logic
              const slots = getSessionSlots(doctor, parsedAppointmentDate, normalizedMode);
              if (slots.length > 0) {
                appointment.expectedTime = calculateExpectedTime(
                  parsedAppointmentDate,
                  slots,
                  tokenNumber,
                  appointment.averageConsultationTime || 20
                );
              }
            }
          }
        }

        await appointment.save();
        console.log(`✅ Appointment ${appointment._id} paid via wallet (${deduction})`);
      }
    }
  }

  // Cache invalidation removed (Redis removed)

  // Get patient data for email
  const patient = await Patient.findById(id);

  // Emit real-time event
  try {
    const io = getIO();
    const populatedAppointment = await Appointment.findById(
      appointment._id
    ).populate("patientId", "firstName lastName phone");

    io.to(`doctor-${doctorId}`).emit("appointment:created", {
      appointment: populatedAppointment
    });
  } catch (error) {
    console.error("Socket.IO error:", error);
  }

  // Get appointment - only necessary fields
  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate("doctorId", "firstName lastName specialization profileImage")
    .select("-__v");

  return res.status(201).json({
    success: true,
    message: "Appointment created successfully",
    data: populatedAppointment,
  });
});

// PATCH /api/patients/appointments/:id
exports.updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { appointmentId } = req.params;
  const updateData = req.body;

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: id,
  });
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  if (
    appointment.status === "completed" ||
    appointment.status === "cancelled"
  ) {
    return res.status(400).json({
      success: false,
      message: "Cannot update completed or cancelled appointment",
    });
  }

  Object.assign(appointment, updateData);
  await appointment.save();

  // Cache invalidation removed (Redis removed)

  // Emit real-time event
  try {
    const io = getIO();
    io.to(`doctor-${appointment.doctorId}`).emit("appointment:updated", {
      appointment: await Appointment.findById(appointment._id).populate(
        "patientId",
        "firstName lastName"
      ),
    });
  } catch (error) {
    console.error("Socket.IO error:", error);
  }

  return res.status(200).json({
    success: true,
    message: "Appointment updated successfully",
    data: appointment,
  });
});

// DELETE /api/patients/appointments/:id
exports.cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const appointmentId = req.params.id; // Route parameter is :id, not :appointmentId

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: id,
  });
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  if (
    appointment.status === "completed" ||
    appointment.status === "cancelled"
  ) {
    return res.status(400).json({
      success: false,
      message: "Appointment already completed or cancelled",
    });
  }

  // If payment is pending, DELETE the appointment instead of cancelling
  // This ensures failed payment appointments are not stored in the database
  if (appointment.paymentStatus === "pending") {
    // Delete the appointment
    await Appointment.findByIdAndDelete(appointment._id);

    // Cache invalidation removed (Redis removed)

    return res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
    });
  }

  // For paid appointments, cancel normally (don't delete)
  appointment.status = "cancelled";
  // Use IST time for doctor session operations
  appointment.cancelledAt = getISTTime();
  appointment.cancellationReason = req.body.reason || "Cancelled by patient";
  await appointment.save();

  // Cache invalidation removed (Redis removed)

  // Get patient and doctor data for email
  const patient = await Patient.findById(id);
  const doctor = await Doctor.findById(appointment.doctorId);

  // Emit real-time event
  try {
    const io = getIO();
    io.to(`doctor-${appointment.doctorId}`).emit("appointment:cancelled", {
      appointmentId: appointment._id,
    });
  } catch (error) {
    console.error("Socket.IO error:", error);
  }

  // Send email notifications
  try {
    await sendAppointmentCancellationEmail({
      patient,
      doctor,
      appointment,
      cancelledBy: "patient",
    }).catch((error) =>
      console.error("Error sending appointment cancellation email:", error)
    );
  } catch (error) {
    console.error("Error sending email notifications:", error);
  }

  // Create in-app notifications
  try {
    const populatedAppointment = await Appointment.findById(
      appointment._id
    ).populate("doctorId", "firstName lastName specialization profileImage");

    // Notify patient
    await createAppointmentNotification({
      userId: id,
      userType: "patient",
      appointment: populatedAppointment,
      eventType: "cancelled",
      doctor: populatedAppointment.doctorId,
    }).catch((error) =>
      console.error("Error creating patient cancellation notification:", error)
    );

    // Notify doctor
    await createAppointmentNotification({
      userId: appointment.doctorId,
      userType: "doctor",
      appointment: populatedAppointment,
      eventType: "cancelled",
      patient,
    }).catch((error) =>
      console.error("Error creating doctor cancellation notification:", error)
    );
  } catch (error) {
    console.error("Error creating notifications:", error);
  }

  return res.status(200).json({
    success: true,
    message: "Appointment cancelled successfully",
  });
});

// PATCH /api/patients/appointments/:id/reschedule - Reschedule appointment
exports.rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const appointmentId = req.params.id;
  const { appointmentDate, time, newConsultationMode } = req.body;

  if (!appointmentDate) {
    return res.status(400).json({
      success: false,
      message: "Appointment date is required",
    });
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: id,
  });
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  if (appointment.status === "completed") {
    return res.status(400).json({
      success: false,
      message: "Cannot reschedule a completed appointment",
    });
  }

  // Parse and normalize new appointment date
  let normalizedAppointmentDate;
  if (
    typeof appointmentDate === "string" &&
    appointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    const [year, month, day] = appointmentDate.split("-").map(Number);
    normalizedAppointmentDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  } else {
    normalizedAppointmentDate = new Date(appointmentDate);
    normalizedAppointmentDate.setHours(0, 0, 0, 0);
  }

  // If appointment was cancelled by doctor, block rescheduling to the same date
  if (appointment.cancelledBy === "doctor") {
    const originalDate = new Date(appointment.appointmentDate);
    originalDate.setHours(0, 0, 0, 0);

    if (normalizedAppointmentDate.getTime() === originalDate.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule to the same date. The doctor cancelled this appointment, please select a different date.",
      });
    }
  }

  // Check if there's already an appointment for this patient with this doctor on this date
  const existingOnNewDate = await Appointment.findOne({
    patientId: id,
    doctorId: appointment.doctorId,
    appointmentDate: normalizedAppointmentDate,
    status: { $nin: ["cancelled"] },
    _id: { $ne: appointment._id }
  });

  if (existingOnNewDate) {
    return res.status(400).json({
      success: false,
      message: "You already have an appointment with this doctor on this date",
    });
  }

  const doctor = await Doctor.findById(appointment.doctorId);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  // Get current consultation mode
  const currentMode = normalizeConsultationMode(appointment.consultationMode);

  // Check if consultation mode is being changed
  let finalMode = currentMode;
  let walletCredit = 0;

  if (newConsultationMode) {
    const requestedMode = normalizeConsultationMode(newConsultationMode);

    // Only allow mode change for doctor-cancelled appointments (free reschedule benefit)
    if (appointment.cancelledBy !== "doctor") {
      return res.status(400).json({
        success: false,
        message: "Cannot change consultation mode. Mode change is only allowed for appointments cancelled by the doctor.",
      });
    }

    // Verify the new mode is available for this doctor
    const availableModes = (doctor.consultationModes || []).map(m => normalizeConsultationMode(m));
    if (!availableModes.includes(requestedMode)) {
      return res.status(400).json({
        success: false,
        message: `Doctor does not offer ${requestedMode} consultations.`,
      });
    }

    // Calculate fee for current and new mode
    const getFeeForMode = (mode) => {
      if (mode === 'IN_PERSON') return doctor.fees?.inPerson?.final || 0;
      if (mode === 'VIDEO') return doctor.fees?.videoCall?.final || 0;
      if (mode === 'CALL') return doctor.fees?.voiceCall?.final || 0;
      return 0;
    };

    // We compare with the actual paid amount to determine if refund is needed
    // This handles partial payments or previous refunds correctly
    const currentPaidAmount = appointment.paidAmount || 0;
    const newFee = getFeeForMode(requestedMode);

    console.log("💰 Reschedule mode change:", {
      currentMode,
      requestedMode,
      currentPaidAmount,
      newFee,
    });

    // If new fee is less than what was paid, credit the difference to wallet
    if (newFee < currentPaidAmount) {
      walletCredit = currentPaidAmount - newFee;

      // Update patient's wallet balance
      const patient = await Patient.findById(id);
      if (patient) {
        patient.walletBalance = (patient.walletBalance || 0) + walletCredit;
        await patient.save();

        // Create a transaction record for the wallet credit
        await Transaction.create({
          userId: id,
          userType: "patient",
          type: "refund",
          amount: walletCredit,
          status: "completed",
          description: `Refund for consultation mode change from ${currentMode} to ${requestedMode}`,
          referenceId: appointment._id.toString(),
          category: "appointment",
          appointmentId: appointment._id,
          metadata: {
            originalMode: currentMode,
            newMode: requestedMode,
            originalPaidAmount: currentPaidAmount,
            newFee: newFee,
            reason: "doctor_cancelled_reschedule",
          },
        });

        console.log("✅ Wallet credited:", {
          patientId: id,
          amount: walletCredit,
          newBalance: patient.walletBalance,
        });

        // Update appointment's paid amount to reflect the refund
        // This ensures subsequent reschedules don't double-refund
        appointment.paidAmount = newFee;
      }
    } else if (newFee > currentPaidAmount) {
      // If new fee is more than what was paid, try to deduct from wallet
      const additionalNeeded = newFee - currentPaidAmount;
      const patient = await Patient.findById(id);

      if (patient && patient.walletBalance > 0) {
        const deduction = Math.min(patient.walletBalance, additionalNeeded);

        if (deduction > 0) {
          patient.walletBalance -= deduction;
          await patient.save();

          // Create transaction record for wallet deduction
          await Transaction.create({
            userId: id,
            userType: "patient",
            type: "payment",
            amount: deduction,
            status: "completed",
            description: `Payment for consultation mode change from ${currentMode} to ${requestedMode} (Wallet)`,
            referenceId: appointment._id.toString(),
            category: "appointment",
            appointmentId: appointment._id,
            metadata: {
              originalMode: currentMode,
              newMode: requestedMode,
              additionalNeeded,
              deduction
            },
          });

          // Update appointment's paid amount
          appointment.paidAmount = (appointment.paidAmount || 0) + deduction;

          console.log("✅ Wallet deducted for reschedule:", {
            patientId: id,
            amount: deduction,
            newBalance: patient.walletBalance,
          });
        }
      }
    }
    // Update appointment with new mode and fee
    finalMode = requestedMode;
    appointment.consultationMode = requestedMode;
    appointment.fee = newFee;

    // Update remainingAmount and paymentStatus
    appointment.remainingAmount = Math.max(0, appointment.fee - (appointment.paidAmount || 0));
    if (appointment.remainingAmount <= 0) {
      appointment.paymentStatus = 'paid';
    } else if ((appointment.paidAmount || 0) > 0) {
      appointment.paymentStatus = 'partial';
    } else {
      appointment.paymentStatus = 'pending';
    }
  }

  const oldDate = appointment.appointmentDate;
  appointment.appointmentDate = normalizedAppointmentDate;
  appointment.time = time || appointment.time;
  appointment.rescheduledAt = getISTTime();
  appointment.rescheduledBy = "patient";
  appointment.status = "scheduled"; // Ensure it's active if it was cancelled

  // Handle consultation type-specific fields on reschedule
  if (requiresToken(finalMode)) {
    // For CALL/VIDEO: Recalculate token and expectedTime for new date
    const newTokenNumber = await getNextTokenNumber(
      appointment.doctorId,
      normalizedAppointmentDate,
      finalMode
    );

    if (newTokenNumber && doctor) {
      appointment.tokenNumber = newTokenNumber;
      appointment.averageConsultationTime = doctor.averageConsultationMinutes || 20;
      const sessionStartTime = getSessionStartTime(doctor, normalizedAppointmentDate, finalMode);
      if (sessionStartTime) {
        appointment.expectedTime = calculateExpectedTime(
          normalizedAppointmentDate,
          sessionStartTime,
          newTokenNumber,
          appointment.averageConsultationTime
        );
      }
    }
    // Clear clinic times if they exist
    appointment.clinicStartTime = null;
    appointment.clinicEndTime = null;
  } else {
    // For IN_PERSON: Update clinic times, clear token and expectedTime
    appointment.clinicStartTime = getSessionStartTime(doctor, normalizedAppointmentDate, finalMode);
    appointment.clinicEndTime = getSessionEndTime(doctor, normalizedAppointmentDate, finalMode);
    appointment.tokenNumber = null;
    appointment.expectedTime = null;
    appointment.averageConsultationTime = null;
  }

  await appointment.save();

  // Cache invalidation removed (Redis removed)

  // Emit real-time event
  const io = getIO();
  io.to(`doctor-${appointment.doctorId}`).emit("appointment:rescheduled", {
    appointment: await Appointment.findById(appointment._id).populate(
      "patientId",
      "firstName lastName"
    ),
  });

  // Send email and notifications
  try {
    const patient = await Patient.findById(id);

    await sendAppointmentConfirmationEmail({
      patient,
      doctor,
      appointment,
    }).catch(e => console.error("Reschedule email error:", e));

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("doctorId", "firstName lastName specialization profileImage");

    await createAppointmentNotification({
      userId: id,
      userType: "patient",
      appointment: populatedAppointment,
      eventType: "rescheduled",
      doctor,
    });

    await createAppointmentNotification({
      userId: appointment.doctorId,
      userType: "doctor",
      appointment: populatedAppointment,
      eventType: "rescheduled",
      patient,
    });
  } catch (error) {
    console.error("Notifications error:", error);
  }

  // Prepare response message
  let message = "Appointment rescheduled successfully";
  if (walletCredit > 0) {
    message += `. ₹${walletCredit} has been credited to your wallet.`;
  }

  return res.status(200).json({
    success: true,
    message,
    data: await Appointment.findById(appointment._id).populate(
      "doctorId",
      "firstName lastName specialization profileImage consultationFee clinicDetails"
    ),
    walletCredit: walletCredit > 0 ? walletCredit : undefined,
  });
});

// POST /api/patients/appointments/:id/payment/order - Create payment order for appointment
exports.createAppointmentPaymentOrder = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const appointmentId = req.params.id;
  const { paymentType } = req.body; // 'full' or 'confirmSlot'

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  if (appointment.paymentStatus === "paid") {
    return res.status(400).json({
      success: false,
      message: "Payment already completed for this appointment",
    });
  }

  if (!appointment.fee || appointment.fee <= 0) {
    return res.status(400).json({
      success: false,
      message: "Appointment fee is not set or invalid",
    });
  }

  // Get doctor to check confirm slot amount (only for in-person)
  const doctor = await Doctor.findById(appointment.doctorId);

  // Calculate how much still needs to be paid
  let paymentAmount = appointment.remainingAmount || 0;

  // Handle in-person confirm slot logic
  if (paymentType === 'confirmSlot' && appointment.consultationMode === 'IN_PERSON') {
    const confirmAmount = doctor?.fees?.inPerson?.confirmSlotAmount || 0;

    // If patient already paid some amount via wallet, check if they still need to pay for confirmation
    const alreadyPaid = appointment.paidAmount || 0;

    if (alreadyPaid >= confirmAmount) {
      return res.status(400).json({
        success: false,
        message: "Slot is already confirmed via wallet balance",
      });
    }

    // They only need to pay the difference to reach the confirmation threshold
    paymentAmount = confirmAmount - alreadyPaid;

    // Safety check
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Slot is already confirmed",
      });
    }
  }

  // Final validation of payment amount
  if (paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "No remaining amount to pay",
    });
  }

  // Create Razorpay order
  const { createOrder } = require("../../services/paymentService");
  const order = await createOrder(paymentAmount, "INR", {
    appointmentId: appointment._id.toString(),
    patientId: id,
    type: "appointment",
    paymentType: paymentType || 'full',
  });

  return res.status(200).json({
    success: true,
    message: "Payment order created successfully",
    data: {
      orderId: order.orderId,
      amount: order.amount / 100, // Convert from paise to rupees
      currency: order.currency,
      appointmentId: appointment._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
      paymentType: paymentType || 'full',
    },
  });
});

// POST /api/patients/appointments/:id/payment/verify - Verify and confirm appointment payment
exports.verifyAppointmentPayment = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const appointmentId = req.params.id;
  const { paymentId, orderId, signature, paymentMethod } = req.body;

  if (!paymentId || !orderId || !signature) {
    return res.status(400).json({
      success: false,
      message: "Payment ID, Order ID, and Signature are required",
    });
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  if (appointment.paymentStatus === "paid") {
    return res.status(400).json({
      success: false,
      message: "Payment already completed for this appointment",
    });
  }

  // Verify payment signature
  const {
    verifyPayment,
    getPaymentDetails,
  } = require("../../services/paymentService");
  const isValid = verifyPayment(orderId, paymentId, signature);

  if (!isValid) {
    // Create failed transaction record
    await Transaction.create({
      userId: id,
      userType: "patient",
      type: "payment",
      amount: appointment.fee,
      status: "failed",
      description: `Appointment payment failed - Invalid signature for appointment ${appointment._id}`,
      referenceId: appointment._id.toString(),
      category: "appointment",
      paymentMethod: paymentMethod || "razorpay",
      paymentId: paymentId,
      appointmentId: appointment._id,
      metadata: {
        orderId: orderId,
        error: "Invalid payment signature",
      },
    });

    // Delete appointment since payment failed
    await Appointment.findByIdAndDelete(appointment._id);

    return res.status(400).json({
      success: false,
      message: "Invalid payment signature. Please try booking again.",
    });
  }

  // Get payment details from Razorpay
  const paymentDetails = await getPaymentDetails(paymentId);

  if (
    paymentDetails.payment.status !== "captured" &&
    paymentDetails.payment.status !== "authorized"
  ) {
    // Create failed transaction record
    await Transaction.create({
      userId: id,
      userType: "patient",
      type: "payment",
      amount: appointment.fee,
      status: "failed",
      description: `Appointment payment failed - Payment not successful for appointment ${appointment._id}`,
      referenceId: appointment._id.toString(),
      category: "appointment",
      paymentMethod: paymentMethod || "razorpay",
      paymentId: paymentId,
      appointmentId: appointment._id,
      metadata: {
        orderId: orderId,
        razorpayStatus: paymentDetails.payment.status,
        error: "Payment not successful",
      },
    });

    // Delete appointment since payment failed
    await Appointment.findByIdAndDelete(appointment._id);

    return res.status(400).json({
      success: false,
      message: "Payment not successful. Please try booking again.",
    });
  }

  // Get payment details to determine amount paid
  const paymentAmount = paymentDetails.payment.amount; // Already converted from paise to rupees by paymentService

  // Calculate payment status
  const totalPaid = (appointment.paidAmount || 0) + paymentAmount;
  const remaining = appointment.fee - totalPaid;

  // Update appointment payment details
  appointment.paidAmount = totalPaid;
  appointment.remainingAmount = Math.max(0, remaining);

  // Set payment status based on amount paid
  if (remaining <= 0) {
    appointment.paymentStatus = "paid";
    appointment.status = "scheduled";
  } else {
    appointment.paymentStatus = "partial";
    appointment.status = "scheduled"; // Appointment is confirmed even with partial payment
  }

  appointment.paymentId = paymentId;
  appointment.orderId = orderId;
  appointment.paymentMethod = paymentMethod || "razorpay";
  appointment.paidAt = getISTTime();

  // For CALL/VIDEO: Assign token and calculate expectedTime ONCE
  const normalizedMode = normalizeConsultationMode(appointment.consultationMode);
  if (requiresToken(normalizedMode)) {
    // Get next token number
    const tokenNumber = await getNextTokenNumber(
      appointment.doctorId,
      appointment.appointmentDate,
      normalizedMode
    );

    if (tokenNumber) {
      appointment.tokenNumber = tokenNumber;

      // Calculate expectedTime ONCE: sessionStartTime + (tokenNumber - 1) * averageConsultationTime
      const doctor = await Doctor.findById(appointment.doctorId);
      if (doctor && appointment.averageConsultationTime) {
        const sessionStartTime = getSessionStartTime(doctor, appointment.appointmentDate, normalizedMode);
        if (sessionStartTime) {
          appointment.expectedTime = calculateExpectedTime(
            appointment.appointmentDate,
            sessionStartTime,
            tokenNumber,
            appointment.averageConsultationTime
          );
        }
      }
    }
  }
  // For IN_PERSON: Do nothing - tokenNumber and expectedTime remain null

  await appointment.save();

  // Create successful transaction record
  await Transaction.create({
    userId: id,
    userType: "patient",
    type: "payment",
    amount: appointment.fee,
    status: "completed",
    description: `Appointment payment successful for appointment ${appointment._id}`,
    referenceId: appointment._id.toString(),
    category: "appointment",
    paymentMethod: paymentMethod || "razorpay",
    paymentId: paymentId,
    appointmentId: appointment._id,
    metadata: {
      orderId: orderId,
      razorpayStatus: paymentDetails.payment.status,
    },
  });

  // Cache invalidation removed (Redis removed)

  // Send response immediately, then handle email and notifications asynchronously
  const responseData = {
    success: true,
    message: "Payment verified and appointment confirmed",
    data: appointment,
  };

  // Send response first
  res.status(200).json(responseData);

  // Send email and notifications asynchronously (fire and forget)
  // This won't block the response
  setImmediate(async () => {
    try {
      const patient = await Patient.findById(id);
      const doctor = await Doctor.findById(appointment.doctorId);

      // Send email (don't await - fire and forget)
      sendAppointmentConfirmationEmail({
        patient,
        doctor,
        appointment,
      }).catch((e) => console.error("Confirmation email error:", e));

      const populatedAppointment = await Appointment.findById(appointment._id)
        .populate("doctorId", "firstName lastName specialization profileImage");

      // Send notifications (don't await - fire and forget)
      createAppointmentNotification({
        userId: id,
        userType: "patient",
        appointment: populatedAppointment,
        eventType: "confirmed",
        doctor,
      }).catch((e) => console.error("Patient notification error:", e));

      createAppointmentNotification({
        userId: appointment.doctorId,
        userType: "doctor",
        appointment: populatedAppointment,
        eventType: "confirmed",
        patient,
      }).catch((e) => console.error("Doctor notification error:", e));
    } catch (error) {
      console.error("Background notifications error:", error);
    }
  });
});

// Export helpers for other controllers
exports.normalizeConsultationMode = normalizeConsultationMode;
exports.requiresToken = requiresToken;
exports.getNextTokenNumber = getNextTokenNumber;
exports.getSessionSlots = getSessionSlots;
exports.calculateExpectedTime = calculateExpectedTime;


