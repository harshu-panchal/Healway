const asyncHandler = require('../../middleware/asyncHandler');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const Specialty = require('../../models/Specialty');
const City = require('../../models/City');
const State = require('../../models/State');
const Follow = require('../../models/Follow');
const ProfileView = require('../../models/ProfileView');
const { APPROVAL_STATUS } = require('../../utils/constants');
const { isDoctorVisibleToPatients, isDoctorBookableByPatients, getDoctorAccessMode } = require('../../utils/doctorAccess');

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
  const dayNameLower = dayName.toLowerCase();

  // New Logic: availabilitySlots with day-wise arrays
  if (doctor.availabilitySlots) {
    // 1. Check mode-specific availability days
    let modeSpecificDays = [];
    let modeArray = [];
    if (mode === 'IN_PERSON') {
      modeSpecificDays = doctor.availabilitySlots.inPersonSelectedDays || [];
      modeArray = doctor.availabilitySlots.inPerson || [];
    } else if (mode === 'VIDEO') {
      modeSpecificDays = doctor.availabilitySlots.videoCallSelectedDays || [];
      modeArray = doctor.availabilitySlots.videoCall || [];
    } else if (mode === 'CALL') {
      modeSpecificDays = doctor.availabilitySlots.voiceCallSelectedDays || [];
      modeArray = doctor.availabilitySlots.voiceCall || [];
    }

    let dayIncluded = Array.isArray(modeSpecificDays) &&
      modeSpecificDays.length > 0 &&
      modeSpecificDays.some(day => day && day.toLowerCase() === dayNameLower);

    // 2. Check if day exists in the slots array itself (Robust fallback)
    if (!dayIncluded && Array.isArray(modeArray)) {
      dayIncluded = modeArray.some(d => d.day && d.day.toLowerCase() === dayNameLower && Array.isArray(d.slots) && d.slots.length > 0);
    }

    // 3. Check global selectedDays (LEGACY/GLOBAL)
    if (!dayIncluded) {
      const sessionTimingDays = doctor.availabilitySlots.selectedDays || [];
      dayIncluded = Array.isArray(sessionTimingDays) &&
        sessionTimingDays.length > 0 &&
        sessionTimingDays.some(day => day && day.toLowerCase() === dayNameLower);
    }

    // 4. FALLBACK: Check mode-specific fees for selected days
    if (!dayIncluded && doctor.fees) {
      let modeFeeBlock = null;
      if (mode === 'IN_PERSON') modeFeeBlock = doctor.fees.inPerson;
      if (mode === 'VIDEO') modeFeeBlock = doctor.fees.videoCall;
      if (mode === 'CALL') modeFeeBlock = doctor.fees.voiceCall;

      if (modeFeeBlock && Array.isArray(modeFeeBlock.selectedDays)) {
        dayIncluded = modeFeeBlock.selectedDays.some(day => day && day.toLowerCase() === dayNameLower);
      }
    }

    if (dayIncluded) {
      let slots = [];
      
      // Retrieval logic based on mode
      if (mode === 'IN_PERSON' && Array.isArray(doctor.availabilitySlots.inPerson)) {
        if (doctor.availabilitySlots.inPerson.length > 0 && doctor.availabilitySlots.inPerson[0].day) {
          const dayConfig = doctor.availabilitySlots.inPerson.find(d => d.day && d.day.toLowerCase() === dayNameLower);
          slots = dayConfig ? (dayConfig.slots || []) : [];
        } else {
          slots = doctor.availabilitySlots.inPerson;
        }
      } else if (mode === 'VIDEO' && Array.isArray(doctor.availabilitySlots.videoCall)) {
        if (doctor.availabilitySlots.videoCall.length > 0 && doctor.availabilitySlots.videoCall[0].day) {
          const dayConfig = doctor.availabilitySlots.videoCall.find(d => d.day && d.day.toLowerCase() === dayNameLower);
          slots = dayConfig ? (dayConfig.slots || []) : [];
        } else {
          slots = doctor.availabilitySlots.videoCall;
        }
      } else if (mode === 'CALL' && Array.isArray(doctor.availabilitySlots.voiceCall)) {
        if (doctor.availabilitySlots.voiceCall.length > 0 && doctor.availabilitySlots.voiceCall[0].day) {
          const dayConfig = doctor.availabilitySlots.voiceCall.find(d => d.day && d.day.toLowerCase() === dayNameLower);
          slots = dayConfig ? (dayConfig.slots || []) : [];
        } else {
          slots = doctor.availabilitySlots.voiceCall;
        }
      } else if ((mode === 'VIDEO' || mode === 'CALL') && doctor.availabilitySlots.callVideo && !Array.isArray(doctor.availabilitySlots.videoCall) && !Array.isArray(doctor.availabilitySlots.voiceCall)) {
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
        slot = dayAvailability.slots?.find(s => 
          s.consultationType === 'call_video' || 
          s.consultationType === 'video_call' || 
          s.consultationType === 'voice_call'
        );
      } else if (mode === 'IN_PERSON') {
        slot = dayAvailability.slots?.find(s => s.consultationType === 'in_person');
      }

      if (slot && slot.startTime) {
        return [{ startTime: slot.startTime, endTime: slot.endTime || dayAvailability.endTime, isFree: slot.isFree || false }];
      }
      if (dayAvailability.startTime) {
        return [{ startTime: dayAvailability.startTime, endTime: dayAvailability.endTime, isFree: false }];
      }
    }
  }

  return [];
};

/**
 * Helper: Get session start time (Earliest) - Backward Compatibility
 */
const getSessionStartTime = (doctor, appointmentDate, consultationMode) => {
  const slots = getSessionSlots(doctor, appointmentDate, consultationMode);
  if (slots.length > 0) {
    return slots[0].startTime;
  }
  return null;
};

/**
 * Helper: Get session end time (Latest) - Backward Compatibility
 */
const getSessionEndTime = (doctor, appointmentDate, consultationMode) => {
  const slots = getSessionSlots(doctor, appointmentDate, consultationMode);
  if (slots.length > 0) {
    return slots[slots.length - 1].endTime;
  }
  return null;
};

/**
 * Helper: Convert time string (HH:MM or HH:MM AM/PM) to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;

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

  const match = timeStr.match(/(\d+):(\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  return null;
};

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 10000);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildSearchFilter = (search, fields = []) => {
  if (!search || !search.trim() || !fields.length) return {};
  const normalized = search.trim();
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (!tokens.length) return {};

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    $and: tokens.map((token) => {
      const regex = new RegExp(escapeRegex(token), 'i');
      return { $or: fields.map((field) => ({ [field]: regex })) };
    }),
  };
};

// GET /api/patients/doctors
exports.getDoctors = asyncHandler(async (req, res) => {
  const { search, specialty, city, state } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = { status: APPROVAL_STATUS.APPROVED, isActive: true };

  if (specialty && specialty !== 'undefined' && specialty.trim()) {
    filter.specialization = new RegExp(specialty.trim(), 'i');
  }
  if (city) filter['clinicDetails.address.city'] = new RegExp(city.trim(), 'i');
  if (state) filter['clinicDetails.address.state'] = new RegExp(state.trim(), 'i');

  // Only build search filter if search is provided and not "undefined"
  const searchFilter = (search && search !== 'undefined' && search.trim())
    ? buildSearchFilter(search, [
      'firstName',
      'lastName',
      'specialization',
      'services',
      'clinicDetails.name',
    ])
    : {};

  const finalFilter = Object.keys(searchFilter).length
    ? { $and: [filter, searchFilter] }
    : filter;

  // Generate a unique cache key based on query parameters
  const cacheKey = `doctors:list:${JSON.stringify({
    specialty: specialty || 'all',
    search: search || 'none',
    city: city || 'all',
    state: state || 'all',
    page,
    limit
  })}`;

  const [doctors, total] = await Promise.all([
    Doctor.find(finalFilter)
      .select('firstName lastName specialization services profileImage consultationFee original_fees discount_amount fees clinicDetails bio experienceYears consultationModes sortOrder accessMode')
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Doctor.countDocuments(finalFilter),
  ]);

  const response = {
    success: true,
    data: {
      items: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  };

  // Set cache-control headers to prevent caching issues
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  return res.status(200).json(response);
});

// GET /api/patients/doctors/suggestions?q=<query>
exports.getDoctorSearchSuggestions = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    return res.status(200).json({
      success: true,
      data: { suggestions: [] },
    });
  }

  const searchFilter = buildSearchFilter(q, [
    'firstName',
    'lastName',
    'specialization',
    'services',
    'clinicDetails.name',
  ]);

  const doctors = await Doctor.find({
    status: APPROVAL_STATUS.APPROVED,
    isActive: true,
    ...(Object.keys(searchFilter).length ? searchFilter : {}),
  })
    .select('firstName lastName specialization services clinicDetails sortOrder accessMode')
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(20)
    .lean();

  const lowerQ = q.toLowerCase();
  const tokens = lowerQ.split(/\s+/).filter(Boolean);
  const rankText = (text) => {
    const value = String(text || '').toLowerCase();
    if (!value) return -1;
    if (value.startsWith(lowerQ)) return 4;
    if (value.includes(lowerQ)) return 3;
    if (tokens.length && tokens.every((token) => value.includes(token))) return 2;
    if (tokens.length && tokens.some((token) => value.includes(token))) return 1;
    return -1;
  };

  const doctorSuggestions = [];
  const specializationMap = new Map();
  const serviceMap = new Map();
  const hospitalMap = new Map();

  doctors.forEach((doctor) => {
    const name = `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.replace(/\s+/g, ' ').trim();
    const nameRank = rankText(name);
    if (nameRank > 0) {
      doctorSuggestions.push({
        type: 'doctor',
        label: name,
        value: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
        score: nameRank,
      });
    }

    const specialization = String(doctor.specialization || '').trim();
    const specializationRank = rankText(specialization);
    if (specialization && specializationRank > 0 && !specializationMap.has(specialization.toLowerCase())) {
      specializationMap.set(specialization.toLowerCase(), {
        type: 'specialization',
        label: specialization,
        value: specialization,
        score: specializationRank,
      });
    }

    if (Array.isArray(doctor.services)) {
      doctor.services.forEach((service) => {
        const serviceName = String(service || '').trim();
        const serviceRank = rankText(serviceName);
        if (!serviceName || serviceRank <= 0) return;
        const key = serviceName.toLowerCase();
        if (!serviceMap.has(key)) {
          serviceMap.set(key, {
            type: 'service',
            label: serviceName,
            value: serviceName,
            score: serviceRank,
          });
        }
      });
    }

    const hospitalName = String(doctor.clinicDetails?.name || '').trim();
    const hospitalRank = rankText(hospitalName);
    if (hospitalName && hospitalRank > 0 && !hospitalMap.has(hospitalName.toLowerCase())) {
      hospitalMap.set(hospitalName.toLowerCase(), {
        type: 'hospital',
        label: hospitalName,
        value: hospitalName,
        score: hospitalRank,
      });
    }
  });

  const suggestions = [
    ...doctorSuggestions,
    ...specializationMap.values(),
    ...serviceMap.values(),
    ...hospitalMap.values(),
  ]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 10)
    .map(({ score, ...rest }) => rest);

  return res.status(200).json({
    success: true,
    data: { suggestions },
  });
});

// GET /api/patients/doctors/featured
exports.getFeaturedDoctors = asyncHandler(async (req, res) => {
  const cacheKey = 'doctors:featured:all';

  const doctors = await (async () => {
    const doctorsList = await Doctor.find({
      status: APPROVAL_STATUS.APPROVED,
      isActive: true,
      isFeatured: true,
    })
      .select('firstName lastName specialization profileImage consultationFee original_fees discount_amount fees clinicDetails bio experienceYears consultationModes isFeatured accessMode')
      .sort({ sortOrder: 1, updatedAt: -1 })
      .limit(10)
      .lean(); // Use lean() for better performance and to get plain objects

    // Transform doctors to ensure fees structure is correct
    return doctorsList.map(doctor => {
      // doctor is already a plain object from lean()
      const doctorObj = { ...doctor };

      // Ensure fees structure exists and is properly formatted
      if (!doctorObj.fees || typeof doctorObj.fees !== 'object') {
        doctorObj.fees = {};
      }

      // Get values from multiple sources (new structure, old structure, top-level fields)
      const originalFee = doctorObj.fees?.inPerson?.original ?? doctorObj.original_fees ?? 0;
      const discountFee = doctorObj.fees?.inPerson?.discount ?? doctorObj.discount_amount ?? 0;
      const calculatedFinal = Math.max(0, originalFee - discountFee);
      const storedFinal = doctorObj.fees?.inPerson?.final ?? doctorObj.consultationFee ?? calculatedFinal;

      // Use the calculated final if stored final is 0 or invalid, but original is set
      const finalFee = (storedFinal > 0) ? storedFinal : ((originalFee > 0) ? calculatedFinal : storedFinal);

      // Ensure inPerson fees exist with proper values
      doctorObj.fees.inPerson = {
        original: originalFee,
        discount: discountFee,
        final: finalFee,
        selectedDays: Array.isArray(doctorObj.fees?.inPerson?.selectedDays)
          ? doctorObj.fees.inPerson.selectedDays
          : []
      };

      // Also ensure top-level fields are set for backward compatibility
      doctorObj.original_fees = originalFee;
      doctorObj.discount_amount = discountFee;
      doctorObj.consultationFee = finalFee;

      // Ensure consultationModes is an array and remove duplicates
      if (!Array.isArray(doctorObj.consultationModes)) {
        doctorObj.consultationModes = doctorObj.consultationModes
          ? (typeof doctorObj.consultationModes === 'string' ? [doctorObj.consultationModes] : [])
          : ['in_person'];
      } else {
        // Remove duplicates
        doctorObj.consultationModes = Array.from(new Set(doctorObj.consultationModes));
      }

      // Ensure experienceYears is a number
      if (doctorObj.experienceYears === undefined || doctorObj.experienceYears === null) {
        doctorObj.experienceYears = 0;
      }

      return doctorObj;
    });
  })();

  return res.status(200).json({
    success: true,
    data: doctors,
  });
});

// GET /api/patients/doctors/:id
exports.getDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doctor = await Doctor.findById(id)
    .select('-password -otp -otpExpires')
    .lean(); // Use lean() for better performance

  if (!doctor || !isDoctorVisibleToPatients(doctor)) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  // Ensure fees structure is properly formatted
  if (!doctor.fees || typeof doctor.fees !== 'object') {
    doctor.fees = {};
  }

  // Ensure all fee types exist with proper structure
  if (!doctor.fees.inPerson || typeof doctor.fees.inPerson !== 'object') {
    doctor.fees.inPerson = {
      original: doctor.original_fees || 0,
      discount: doctor.discount_amount || 0,
      final: doctor.consultationFee || 0,
      confirmSlotPercentage: 0,
      codEnabled: false,
      confirmSlotAmount: 0,
      selectedDays: []
    };
  } else {
    // Ensure final is calculated
    if (doctor.fees.inPerson.final === undefined || doctor.fees.inPerson.final === null) {
      doctor.fees.inPerson.final = Math.max(0,
        (doctor.fees.inPerson.original || 0) - (doctor.fees.inPerson.discount || 0)
      );
    }
    // Ensure confirmSlotPercentage and confirmSlotAmount exist
    if (doctor.fees.inPerson.confirmSlotPercentage === undefined || doctor.fees.inPerson.confirmSlotPercentage === null) {
      doctor.fees.inPerson.confirmSlotPercentage = 0;
    }
    if (doctor.fees.inPerson.confirmSlotAmount === undefined || doctor.fees.inPerson.confirmSlotAmount === null) {
      doctor.fees.inPerson.confirmSlotAmount = Math.round((doctor.fees.inPerson.final * (doctor.fees.inPerson.confirmSlotPercentage || 0)) / 100);
    }
    if (!Array.isArray(doctor.fees.inPerson.selectedDays)) {
      doctor.fees.inPerson.selectedDays = [];
    }
  }

  if (!doctor.fees.videoCall || typeof doctor.fees.videoCall !== 'object') {
    doctor.fees.videoCall = {
      original: 0,
      discount: 0,
      final: 0,
      selectedDays: []
    };
  } else {
    if (doctor.fees.videoCall.final === undefined || doctor.fees.videoCall.final === null) {
      doctor.fees.videoCall.final = Math.max(0,
        (doctor.fees.videoCall.original || 0) - (doctor.fees.videoCall.discount || 0)
      );
    }
    if (!Array.isArray(doctor.fees.videoCall.selectedDays)) {
      doctor.fees.videoCall.selectedDays = [];
    }
  }

  if (!doctor.fees.voiceCall || typeof doctor.fees.voiceCall !== 'object') {
    doctor.fees.voiceCall = {
      original: 0,
      discount: 0,
      final: 0,
      selectedDays: []
    };
  } else {
    if (doctor.fees.voiceCall.final === undefined || doctor.fees.voiceCall.final === null) {
      doctor.fees.voiceCall.final = Math.max(0,
        (doctor.fees.voiceCall.original || 0) - (doctor.fees.voiceCall.discount || 0)
      );
    }
    if (!Array.isArray(doctor.fees.voiceCall.selectedDays)) {
      doctor.fees.voiceCall.selectedDays = [];
    }
  }

  // Check if current user is following this doctor
  let isFollowing = false;
  if (req.auth?.id) {
    const follow = await Follow.findOne({ patientId: req.auth.id, doctorId: id });
    isFollowing = !!follow;
  }

  return res.status(200).json({
    success: true,
    data: {
      doctor: {
        ...doctor,
        isFollowing
      },
    },
  });
});

// GET /api/patients/specialties
exports.getSpecialties = asyncHandler(async (req, res) => {
  const specialties = await Specialty.find({ isActive: true })
    .select('name description icon doctorCount sortOrder')
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  // Dynamically calculate doctorCount for each specialty to ensure accuracy
  const specialtiesWithCounts = await Promise.all(specialties.map(async (specialty) => {
    const count = await Doctor.countDocuments({
      specialization: new RegExp(`^${specialty.name}$`, 'i'),
      status: APPROVAL_STATUS.APPROVED,
      isActive: true
    });

    return {
      ...specialty,
      doctorCount: count
    };
  }));

  return res.status(200).json({
    success: true,
    data: specialtiesWithCounts,
  });
});

// GET /api/patients/specialties/:id/doctors
exports.getSpecialtyDoctors = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = buildPagination(req);

  const specialty = await Specialty.findById(id).select('name').lean();
  if (!specialty) {
    return res.status(404).json({
      success: false,
      message: 'Specialty not found',
    });
  }

  const [doctors, total] = await Promise.all([
    Doctor.find({
      specialization: new RegExp(specialty.name, 'i'),
      status: APPROVAL_STATUS.APPROVED,
      isActive: true,
    })
      .select('firstName lastName specialization profileImage consultationFee original_fees discount_amount fees clinicDetails experienceYears experience sortOrder accessMode')
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Doctor.countDocuments({
      specialization: new RegExp(specialty.name, 'i'),
      status: APPROVAL_STATUS.APPROVED,
      isActive: true,
    }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/patients/locations
exports.getLocations = asyncHandler(async (req, res) => {
  const [cities, states] = await Promise.all([
    City.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
    State.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      cities: cities.map((city) => city.name).filter(Boolean),
      states: states.map((state) => state.name).filter(Boolean),
    },
  });
});

// GET /api/patients/doctors/:id/slots
exports.checkDoctorSlotAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, mode = 'IN_PERSON' } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date is required (YYYY-MM-DD)',
    });
  }

  // 1️⃣ Doctor check
  const doctor = await Doctor.findById(id).lean();
  if (!doctor || !isDoctorVisibleToPatients(doctor)) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  if (!isDoctorBookableByPatients(doctor)) {
    return res.status(200).json({
      success: true,
      data: {
        available: false,
        totalSlots: 0,
        bookedSlots: 0,
        availableSlots: 0,
        nextToken: null,
        paymentInfo: {
          dayRequiresPayment: false,
          note: 'Booking is disabled by admin for this doctor',
        },
        accessMode: getDoctorAccessMode(doctor),
        message: 'Booking is currently disabled for this doctor',
        timeSlots: [],
      },
    });
  }

  // 2️⃣ Safe date parsing (timezone-proof)
  let appointmentDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    appointmentDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  } else {
    appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);
  }

  if (isNaN(appointmentDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date',
    });
  }

  const normalizedMode = normalizeConsultationMode(mode);
  const dayName = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ][appointmentDate.getDay()];

  // 3️⃣ Fetch session slots
  const slots = getSessionSlots(doctor, appointmentDate, normalizedMode);

  // Helper: check if DAY requires payment (slot may still be free)
  const checkDayRequiresPayment = () => {
    if (!doctor.fees) return false;

    let feeBlock = null;
    if (normalizedMode === 'IN_PERSON') feeBlock = doctor.fees.inPerson;
    if (normalizedMode === 'CALL') feeBlock = doctor.fees.voiceCall;
    if (normalizedMode === 'VIDEO') feeBlock = doctor.fees.videoCall;

    if (!feeBlock || !Array.isArray(feeBlock.selectedDays)) return false;

    const dayLower = dayName.toLowerCase();
    return feeBlock.selectedDays.some(
      d => d && d.toLowerCase() === dayLower
    );
  };

  const dayRequiresPayment = checkDayRequiresPayment();

  // 4️⃣ No slots configured
  if (!slots || slots.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        available: false,
        totalSlots: 0,
        bookedSlots: 0,
        availableSlots: 0,
        nextToken: null,
        paymentInfo: {
          dayRequiresPayment,
          note: 'Final fee depends on selected slot'
        },
        message: 'Doctor not available on this day',
        timeSlots: []
      }
    });
  }

  // 5️⃣ IN_PERSON → unlimited bookings (session-based)
  if (normalizedMode === 'IN_PERSON') {
    return res.status(200).json({
      success: true,
      data: {
        available: true,
        totalSlots: null,
        bookedSlots: null,
        availableSlots: null,
        nextToken: null,
        paymentInfo: {
          dayRequiresPayment,
          note: 'Final fee depends on selected slot'
        },
        message: 'Clinic available',
        timeSlots: slots.map(s => ({
          ...s,
          isFree: !!s.isFree
        })),
        sessionStartTime: slots[0]?.startTime,
        sessionEndTime: slots[slots.length - 1]?.endTime
      }
    });
  }

  // 6️⃣ Calculate total slots (CALL / VIDEO)
  const avgTime = doctor.averageConsultationMinutes || 20;
  let totalSlots = 0;

  slots.forEach(slot => {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    if (start === null || end === null) return;

    let duration = end - start;
    if (duration < 0) duration += 1440; // midnight crossing

    // Use Math.round to handle cases where a slot might be 19 mins instead of 20
    // and ensure every valid range has at least 1 slot if it's at least 50% of avgTime
    const slotsInRange = Math.max(0, Math.round(duration / avgTime));
    totalSlots += slotsInRange;
  });

  // 7️⃣ Mode-safe booking filter
  let bookingModes = [];
  if (normalizedMode === 'CALL') {
    bookingModes = ['CALL', 'VOICE_CALL', 'call', 'voice_call'];
  } else if (normalizedMode === 'VIDEO') {
    bookingModes = ['VIDEO', 'VIDEO_CALL', 'video', 'video_call', 'video_meeting'];
  }

  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);

  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

  const bookedSlots = await Appointment.countDocuments({
    doctorId: id,
    appointmentDate: { $gte: startOfDay, $lt: endOfDay },
    consultationMode: { $in: bookingModes },
    status: { $nin: ['cancelled'] },
    $or: [
      { paymentStatus: 'paid' },
      { paymentStatus: 'partial' },
      { paymentStatus: 'free' },
      { paymentStatus: 'pending', createdAt: { $gte: thirtyMinsAgo } }
    ]
  });

  const availableSlots = Math.max(0, totalSlots - bookedSlots);
  const isAvailable = totalSlots > 0 && availableSlots > 0;

  // 8️⃣ Preview next token (approx)
  let nextToken = null;
  if (requiresToken(normalizedMode)) {
    const last = await Appointment.findOne({
      doctorId: id,
      appointmentDate: { $gte: startOfDay, $lt: endOfDay },
      consultationMode: { $in: bookingModes },
      tokenNumber: { $ne: null },
      status: { $nin: ['cancelled'] }
    }).sort({ tokenNumber: -1 }).select('tokenNumber').lean();

    nextToken = last?.tokenNumber ? last.tokenNumber + 1 : 1;
  }

  // 9️⃣ Final response
  return res.status(200).json({
    success: true,
    data: {
      available: isAvailable,
      totalSlots,
      bookedSlots,
      availableSlots,
      nextToken,
      paymentInfo: {
        dayRequiresPayment,
        note: 'Final fee depends on selected slot'
      },
      message: isAvailable
        ? 'Slots available'
        : (totalSlots <= 0 ? 'Invalid configuration' : 'Fully booked'),
      timeSlots: slots.map(s => ({
        ...s,
        isFree: !!s.isFree,
        crossesMidnight:
          timeToMinutes(s.endTime) < timeToMinutes(s.startTime)
      })),
      sessionStartTime: slots[0]?.startTime,
      sessionEndTime: slots[slots.length - 1]?.endTime
    }
  });
});

/**
 * POST /api/patients/doctors/:id/follow - Toggle follow status
 */
exports.toggleFollowDoctor = asyncHandler(async (req, res) => {
  const patientId = req.auth.id;
  const doctorId = req.params.id;

  if (patientId === doctorId) {
    return res.status(400).json({
      success: false,
      message: "Doctors cannot follow themselves",
    });
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  const existingFollow = await Follow.findOne({ patientId, doctorId });

  if (existingFollow) {
    // Unfollow
    await Follow.deleteOne({ _id: existingFollow._id });
    
    // Decrement count atomically
    await Doctor.findByIdAndUpdate(doctorId, { $inc: { followerCount: -1 } });
    
    return res.status(200).json({
      success: true,
      message: "Unfollowed successfully",
      isFollowing: false,
    });
  } else {
    // Follow
    await Follow.create({ patientId, doctorId });
    
    // Increment count atomically
    await Doctor.findByIdAndUpdate(doctorId, { $inc: { followerCount: 1 } });
    
    return res.status(200).json({
      success: true,
      message: "Followed successfully",
      isFollowing: true,
    });
  }
});

/**
 * GET /api/patients/doctors/following - Get followed doctors list
 */
exports.getFollowedDoctors = asyncHandler(async (req, res) => {
  const patientId = req.auth.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await Follow.countDocuments({ patientId });
  const follows = await Follow.find({ patientId })
    .populate({
      path: 'doctorId',
      select: 'firstName lastName specialization profileImage clinicDetails fees experienceYears',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Filter out any null doctorId (if doctor was deleted)
  const doctors = follows.map(f => f.doctorId).filter(d => d !== null);

  res.status(200).json({
    success: true,
    data: doctors,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/patients/doctors/:id/view - Track profile view
 */
exports.recordProfileView = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const viewerId = req.auth?.id; // Optional
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Cooldown period: 30 minutes
  const cooldownPeriod = 30 * 60 * 1000;
  const cooldownDate = new Date(Date.now() - cooldownPeriod);

  // Check for recent view from same IP or Viewer
  const query = {
    doctorId,
    createdAt: { $gte: cooldownDate },
    $or: [{ ipAddress }]
  };
  
  if (viewerId) {
    query.$or.push({ viewerId });
  }

  const recentView = await ProfileView.findOne(query);

  if (!recentView) {
    // Record new view
    await ProfileView.create({
      doctorId,
      viewerId,
      ipAddress,
      userAgent
    });

    // Increment count atomically
    await Doctor.findByIdAndUpdate(doctorId, { $inc: { viewCount: 1 } });
    
    return res.status(200).json({
      success: true,
      message: "View recorded",
    });
  }

  res.status(200).json({
    success: true,
    message: "View skipped (cooldown active)",
  });
});
