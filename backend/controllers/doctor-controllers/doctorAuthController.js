const Doctor = require('../../models/Doctor');
const Specialty = require('../../models/Specialty');
const asyncHandler = require('../../middleware/asyncHandler');
const { createAccessToken, createRefreshToken, verifyRefreshToken, blacklistToken, decodeToken } = require('../../utils/tokenService');
const { sendSignupAcknowledgementEmail } = require('../../services/emailService');
const { requestLoginOtp, verifyLoginOtp } = require('../../services/loginOtpService');
const { getProfileByRoleAndId, updateProfileByRoleAndId } = require('../../services/profileService');
const { notifyAdminsOfPendingSignup } = require('../../services/adminNotificationService');
const { ROLES, APPROVAL_STATUS } = require('../../utils/constants');
const {
  LOCATION_SOURCES,
  normalizeLocationSource,
  parseGeoPoint,
  extractAddressLocation,
} = require('../../utils/locationUtils');
const { cloudinaryUpload, uploadFromBuffer, STANDARDS } = require('../../services/fileUploadService');
const { canDoctorLogin, isTokenRevokedForDoctor } = require('../../utils/doctorAccess');

const parseName = ({ firstName, lastName, name }) => {
  if (firstName) {
    return {
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : lastName,
    };
  }

  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.shift(),
      lastName: parts.join(' '),
    };
  }

  return { firstName: undefined, lastName: undefined };
};

const buildAuthResponse = (user) => {
  const payload = { id: user._id, role: ROLES.DOCTOR };
  return {
    accessToken: createAccessToken(payload),
    refreshToken: createRefreshToken(payload),
  };
};

exports.registerDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    firstName,
    lastName,
    email,
    phone,
    gender,
    specialization,
    licenseNumber,
    experienceYears,
    experience,
    education,
    languages,
    services,
    consultationModes,
    clinicName,
    clinicAddress,
    clinicDetails,
    clinicLocation,
    clinicCoordinates,
    clinicLatitude,
    clinicLongitude,
    clinicLat,
    clinicLng,
    clinicLocationSource,
    bio,
    documents,
    consultationFee,
    original_fees,
    discount_amount,
    profileImage,
    isDoctor,
    hospitalImages,
  } = req.body;

  // Debug: Log received data
  console.log('📥 Registration Request Received:', {
    hasProfileImage: !!profileImage,
    profileImageType: typeof profileImage,
    profileImagePreview: profileImage?.substring(0, 30),
    hasClinicImages: !!req.body.clinicImages,
    clinicImagesCount: req.body.clinicImages?.length,
    hasDocuments: !!documents,
    documentsCount: documents?.length,
    allBodyKeys: Object.keys(req.body)
  });

  const resolvedName = parseName({ name, firstName, lastName });

  if (!resolvedName.firstName || !email || !phone || !specialization) {
    return res.status(400).json({
      success: false,
      message: 'Required fields missing. Provide name/firstName, email, phone, and specialization.',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = String(phone).trim();
  const normalizedSpecialization = String(specialization).trim();
  const normalizedLicenseNumber = licenseNumber ? String(licenseNumber).trim() : '';

  const specialtyExists = await Specialty.findOne({
    name: normalizedSpecialization,
    isActive: true,
  }).lean();

  if (!specialtyExists) {
    return res.status(400).json({
      success: false,
      message: 'Please select a valid specialization from the admin-added list.',
    });
  }

  const existingEmail = await Doctor.findOne({ email: normalizedEmail });

  if (existingEmail) {
    return res.status(400).json({ success: false, message: 'Email already registered.' });
  }

  const existingPhone = await Doctor.findOne({ phone: normalizedPhone });

  if (existingPhone) {
    return res.status(400).json({ success: false, message: 'Phone number already registered.' });
  }

  if (normalizedLicenseNumber) {
    const existingLicense = await Doctor.findOne({ licenseNumber: normalizedLicenseNumber });

    if (existingLicense) {
      return res.status(400).json({ success: false, message: 'License number already registered.' });
    }
  }

  let clinicPayload = clinicDetails ? { ...clinicDetails } : {};

  // Remove incomplete location objects (with only type but no coordinates)
  // Since we're not using GPS/map API, location should only be set if coordinates are explicitly provided
  if (clinicPayload.location) {
    const hasValidCoordinates =
      clinicPayload.location.coordinates &&
      Array.isArray(clinicPayload.location.coordinates) &&
      clinicPayload.location.coordinates.length === 2 &&
      Number.isFinite(clinicPayload.location.coordinates[0]) &&
      Number.isFinite(clinicPayload.location.coordinates[1]);

    if (!hasValidCoordinates) {
      delete clinicPayload.location;
      delete clinicPayload.locationSource;
    }
  }

  const rawClinicAddressInput =
    clinicAddress !== undefined ? clinicAddress : clinicPayload.address;

  const {
    address: normalizedClinicAddress,
    addressProvided: clinicAddressProvided,
    location: addressDerivedLocation,
    locationProvided: addressLocationProvided,
    locationSource: addressLocationSource,
    locationSourceProvided: addressLocationSourceProvided,
    error: addressLocationError,
  } = extractAddressLocation(rawClinicAddressInput);

  if (addressLocationError) {
    return res.status(400).json({
      success: false,
      message: addressLocationError,
    });
  }

  if (clinicAddressProvided) {
    if (normalizedClinicAddress) {
      clinicPayload.address = normalizedClinicAddress;
    } else {
      delete clinicPayload.address;
    }
  }

  if (clinicName) {
    clinicPayload.name = clinicName;
  }

  const legacyLocation = parseGeoPoint({
    location: clinicLocation ?? clinicDetails?.location,
    coordinates: clinicCoordinates,
    lat: clinicLat ?? clinicLatitude,
    lng: clinicLng ?? clinicLongitude,
    latitude: clinicLatitude,
    longitude: clinicLongitude,
  });

  if (legacyLocation.error) {
    return res.status(400).json({
      success: false,
      message: legacyLocation.error,
    });
  }

  delete clinicPayload.location;
  delete clinicPayload.locationSource;

  let clinicGeoPoint;
  let clinicLocationProvided = false;

  if (legacyLocation.provided) {
    clinicGeoPoint = legacyLocation.point;
    clinicLocationProvided = true;
  } else if (addressLocationProvided && addressDerivedLocation) {
    // Only use address-derived location if it has valid coordinates
    if (addressDerivedLocation.coordinates &&
      Array.isArray(addressDerivedLocation.coordinates) &&
      addressDerivedLocation.coordinates.length === 2) {
      clinicGeoPoint = addressDerivedLocation;
      clinicLocationProvided = true;
    }
  }

  // Only set location if we have valid coordinates
  // Since we're not using GPS/map API, skip location if coordinates are not explicitly provided
  if (clinicGeoPoint &&
    clinicGeoPoint.coordinates &&
    Array.isArray(clinicGeoPoint.coordinates) &&
    clinicGeoPoint.coordinates.length === 2 &&
    Number.isFinite(clinicGeoPoint.coordinates[0]) &&
    Number.isFinite(clinicGeoPoint.coordinates[1])) {
    clinicPayload.location = clinicGeoPoint;
  } else {
    // Ensure location is completely removed if invalid or missing
    delete clinicPayload.location;
    delete clinicPayload.locationSource;
  }

  let locationSourceValue;
  let locationSourceProvided = false;

  if (clinicLocationSource !== undefined) {
    const normalizedSource = normalizeLocationSource(clinicLocationSource);
    if (normalizedSource && !LOCATION_SOURCES.includes(normalizedSource)) {
      return res.status(400).json({
        success: false,
        message: `clinicLocationSource must be one of: ${LOCATION_SOURCES.join(
          ', '
        )}.`,
      });
    }
    locationSourceValue =
      normalizedSource === null ? undefined : normalizedSource;
    locationSourceProvided = true;
  } else if (clinicDetails?.locationSource !== undefined) {
    const normalizedSource = normalizeLocationSource(
      clinicDetails.locationSource
    );
    if (normalizedSource && !LOCATION_SOURCES.includes(normalizedSource)) {
      return res.status(400).json({
        success: false,
        message: `clinicLocationSource must be one of: ${LOCATION_SOURCES.join(
          ', '
        )}.`,
      });
    }
    locationSourceValue =
      normalizedSource === null ? undefined : normalizedSource;
    locationSourceProvided = true;
  } else if (addressLocationSourceProvided) {
    if (
      addressLocationSource &&
      !LOCATION_SOURCES.includes(addressLocationSource)
    ) {
      return res.status(400).json({
        success: false,
        message: `clinicLocationSource must be one of: ${LOCATION_SOURCES.join(
          ', '
        )}.`,
      });
    }
    locationSourceValue =
      addressLocationSource === null ? undefined : addressLocationSource;
    locationSourceProvided = true;
  }

  if (locationSourceProvided) {
    if (locationSourceValue) {
      clinicPayload.locationSource = locationSourceValue;
    } else {
      delete clinicPayload.locationSource;
    }
  }

  // Final validation: Ensure location has valid coordinates before saving
  // Since we're not using GPS/map API, completely remove location if coordinates are missing
  if (clinicPayload.location) {
    const hasValidCoordinates =
      clinicPayload.location.coordinates &&
      Array.isArray(clinicPayload.location.coordinates) &&
      clinicPayload.location.coordinates.length === 2 &&
      Number.isFinite(clinicPayload.location.coordinates[0]) &&
      Number.isFinite(clinicPayload.location.coordinates[1]);

    if (!hasValidCoordinates) {
      delete clinicPayload.location;
      delete clinicPayload.locationSource;
    } else {
      // Ensure type is 'Point' if coordinates are valid
      clinicPayload.location.type = 'Point';
    }
  }

  // Final cleanup: Remove location completely if it doesn't have valid coordinates
  if (clinicPayload && clinicPayload.location) {
    if (!clinicPayload.location.coordinates ||
      !Array.isArray(clinicPayload.location.coordinates) ||
      clinicPayload.location.coordinates.length !== 2 ||
      !Number.isFinite(clinicPayload.location.coordinates[0]) ||
      !Number.isFinite(clinicPayload.location.coordinates[1])) {
      delete clinicPayload.location;
      delete clinicPayload.locationSource;
    }
  }


  // Clean up empty clinicDetails object
  if (clinicPayload && Object.keys(clinicPayload).length === 0) {
    clinicPayload = undefined;
  }

  // Ensure clinicDetails.location is completely removed if invalid
  let finalClinicDetails = clinicPayload ? { ...clinicPayload } : undefined;
  if (finalClinicDetails && finalClinicDetails.location) {
    if (!finalClinicDetails.location.coordinates ||
      !Array.isArray(finalClinicDetails.location.coordinates) ||
      finalClinicDetails.location.coordinates.length !== 2) {
      delete finalClinicDetails.location;
      delete finalClinicDetails.locationSource;
    }
  }

  // Ensure consultationFee is properly converted to number without any rounding or modification
  let finalConsultationFee = undefined;
  if (consultationFee !== undefined && consultationFee !== null && consultationFee !== '') {
    // Convert to string first to preserve precision, then parse
    const feeStr = String(consultationFee).trim();
    const feeValue = parseFloat(feeStr);

    // Validate the parsed value - preserve exact value without any rounding
    if (!isNaN(feeValue) && isFinite(feeValue) && feeValue >= 0) {
      // Keep exact value - no rounding, no modification
      finalConsultationFee = feeValue;
    }
  }

  console.log('💰 Consultation Fee Processing:', {
    original: consultationFee,
    originalType: typeof consultationFee,
    stringValue: consultationFee !== undefined ? String(consultationFee) : 'undefined',
    parsed: finalConsultationFee,
    finalType: typeof finalConsultationFee,
    isInteger: finalConsultationFee !== undefined ? Number.isInteger(finalConsultationFee) : 'N/A',
  });

  // Migrate legacy 'video' consultation mode to 'call'
  const migratedConsultationModes = Array.isArray(consultationModes)
    ? consultationModes.map(mode => mode === 'video' ? 'call' : mode)
    : consultationModes;

  // Process clinic images: upload to Cloudinary
  const { clinicImages } = req.body;
  let processedClinicImages = [];

  console.log('🔍 Clinic Images Debug:', {
    received: !!clinicImages,
    isArray: Array.isArray(clinicImages),
    length: clinicImages?.length,
    firstImage: clinicImages?.[0] ? {
      name: clinicImages[0].name,
      hasData: !!clinicImages[0].data,
      dataType: typeof clinicImages[0].data,
      dataLength: clinicImages[0].data?.length,
      dataPreview: clinicImages[0].data?.substring(0, 50)
    } : null,
    fullFirstImage: clinicImages?.[0] ? JSON.stringify(clinicImages[0]).substring(0, 200) : null
  });

  if (clinicImages && Array.isArray(clinicImages) && clinicImages.length > 0) {
    try {
      console.log(`📸 Processing ${clinicImages.length} clinic images...`);

      for (const img of clinicImages.slice(0, 5)) { // Max 5 images
        if (img?.data) {
          try {
            console.log(`📤 Uploading image: ${img.name}`);

            const base64Data = img.data.includes(',')
              ? img.data.split(',')[1]
              : img.data;

            const buffer = Buffer.from(base64Data, 'base64');
            console.log(`📦 Buffer created, size: ${buffer.length} bytes`);

            const uploadResult = await cloudinaryUpload(
              buffer,
              'healway/clinics'
            );

            console.log(`✅ Uploaded to Cloudinary: ${uploadResult.secure_url}`);

            processedClinicImages.push({
              url: uploadResult.secure_url,
              publicId: uploadResult.public_id,
              uploadedAt: new Date(),
            });
          } catch (imgError) {
            console.error(`❌ Error uploading image ${img.name}:`, imgError);
          }
        } else {
          console.log(`⚠️ Image has no data:`, img?.name);
        }
      }

      console.log(`✅ Uploaded ${processedClinicImages.length} clinic images to Cloudinary`);
    } catch (error) {
      console.error('❌ Clinic image upload failed:', error);
    }
  } else {
    console.log('⚠️ No clinic images to process');
  }

  // Add clinic images to clinicDetails
  if (processedClinicImages.length > 0) {
    if (!finalClinicDetails) {
      finalClinicDetails = {};
    }
    finalClinicDetails.images = processedClinicImages;
  }

  // Process documents: convert base64 to files and upload to Cloudinary
  let processedDocuments = [];

  console.log('🔍 Documents Debug:', {
    received: !!documents,
    isArray: Array.isArray(documents),
    length: documents?.length,
    firstDoc: documents?.[0] ? {
      name: documents[0].name,
      hasData: !!documents[0].data,
      dataType: typeof documents[0].data,
      dataLength: documents[0].data?.length,
      dataPreview: documents[0].data?.substring(0, 50)
    } : null,
    fullFirstDoc: documents?.[0] ? JSON.stringify(documents[0]).substring(0, 200) : null
  });

  if (documents && Array.isArray(documents) && documents.length > 0) {
    try {
      console.log(`📄 Processing ${documents.length} documents...`);

      for (const doc of documents) {
        if (doc && doc.data && doc.name) {
          try {
            // Extract base64 data
            const base64Data = doc.data.includes(',') ? doc.data.split(',')[1] : doc.data;
            const buffer = Buffer.from(base64Data, 'base64');

            // Upload PDF to Cloudinary
            const uploadResult = await cloudinaryUpload(
              buffer,
              'healway/documents',
              { resource_type: 'raw' } // For PDFs
            );

            processedDocuments.push({
              name: doc.name,
              fileUrl: uploadResult.secure_url,
              publicId: uploadResult.public_id,
              uploadedAt: new Date(),
            });
          } catch (docError) {
            console.error(`❌ Error processing document ${doc.name}:`, docError);
          }
        }
      }

      console.log(`✅ Uploaded ${processedDocuments.length} documents to Cloudinary`);
    } catch (error) {
      console.error('❌ Error processing documents:', error);
    }
  }

  // Process profile image: upload to Cloudinary
  let processedProfileImage = profileImage;
  if (profileImage && typeof profileImage === 'string' && profileImage.startsWith('data:')) {
    try {
      console.log('📸 Processing profile image...');

      // Extract base64 data
      const base64Data = profileImage.includes(',') ? profileImage.split(',')[1] : profileImage;
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload image to Cloudinary
      const uploadResult = await cloudinaryUpload(
        buffer,
        'healway/profiles'
      );

      processedProfileImage = uploadResult.secure_url;
      console.log(`✅ Uploaded profile image to Cloudinary: ${processedProfileImage}`);
    } catch (error) {
      console.error('❌ Error uploading profile image:', error);
      // Keep original profileImage if upload fails
    }
  }

  const doctor = await Doctor.create({
    firstName: resolvedName.firstName,
    lastName: resolvedName.lastName || '',
    email: normalizedEmail,
    phone: normalizedPhone,
    specialization: normalizedSpecialization,
    licenseNumber: normalizedLicenseNumber || undefined,
    gender,
    experienceYears: experienceYears ?? experience,
    education,
    languages,
    services,
    consultationModes: migratedConsultationModes,
    clinicDetails: finalClinicDetails,
    bio,
    documents: processedDocuments.length > 0 ? processedDocuments : [],
    original_fees: original_fees || 0,
    discount_amount: discount_amount || 0,
    consultationFee: finalConsultationFee,
    profileImage: processedProfileImage,
    isDoctor: isDoctor !== undefined ? isDoctor : true,
    status: APPROVAL_STATUS.PENDING,
  });



  console.log('✅ Doctor created with consultationFee:', {
    doctorId: doctor._id,
    consultationFee: doctor.consultationFee,
    type: typeof doctor.consultationFee,
  });

  await sendSignupAcknowledgementEmail({
    role: ROLES.DOCTOR,
    email: doctor.email,
    name: `${doctor.firstName} ${doctor.lastName}`.trim(),
  });

  await notifyAdminsOfPendingSignup({ role: ROLES.DOCTOR, entity: doctor });

  // Create in-app notifications for all admins
  try {
    const Admin = require('../../models/Admin');
    const { createNotification } = require('../../services/notificationService');
    const admins = await Admin.find({ isActive: true });

    const doctorName = `${doctor.firstName} ${doctor.lastName}`.trim();

    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        userType: 'admin',
        type: 'system',
        title: 'New Doctor Registration',
        message: `Dr. ${doctorName} (${doctor.specialization || 'General'}) has registered and is awaiting approval. License: ${doctor.licenseNumber || 'N/A'}`,
        data: {
          providerId: doctor._id,
          providerType: 'doctor',
          providerName: doctorName,
          email: doctor.email,
          phone: doctor.phone,
          licenseNumber: doctor.licenseNumber,
          specialization: doctor.specialization,
          address: doctor.clinicDetails?.address || null,
          registrationDate: doctor.createdAt,
        },
        priority: 'medium',
        actionUrl: `/admin/doctors`,
        icon: 'doctor',
        sendEmail: false, // Email already sent via notifyAdminsOfPendingSignup
        emitSocket: true,
      }).catch((error) => console.error(`Error creating admin notification for doctor registration:`, error));
    }
  } catch (error) {
    console.error('Error creating admin notifications for doctor registration:', error);
  }

  return res.status(201).json({
    success: true,
    message: 'Doctor registration submitted for admin approval.',
    data: {
      doctor,
    },
  });
});

// Request login OTP
exports.requestLoginOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.',
    });
  }

  const result = await requestLoginOtp({ role: ROLES.DOCTOR, phone });

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      phone: result.phone,
    },
  });
});

// Verify OTP and login
exports.loginDoctor = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and OTP are required.',
    });
  }

  const result = await verifyLoginOtp({ role: ROLES.DOCTOR, phone, otp });
  const { user } = result;

  // Check approval status
  if (user.status && user.status !== APPROVAL_STATUS.APPROVED) {
    return res.status(403).json({
      success: false,
      message: user.status === APPROVAL_STATUS.PENDING
        ? 'Your account is pending admin approval. Please wait for approval before logging in.'
        : 'Your account has been rejected. Please contact support for assistance.',
      data: {
        status: user.status,
      },
    });
  }

  if (!canDoctorLogin(user)) {
    return res.status(403).json({
      success: false,
      message: 'Doctor access is disabled by admin.',
    });
  }

  const tokens = buildAuthResponse(user);

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      doctor: user,
      tokens,
    },
  });
});

exports.getDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await getProfileByRoleAndId(ROLES.DOCTOR, req.auth.id);

  return res.status(200).json({ success: true, data: doctor });
});

exports.updateDoctorProfile = asyncHandler(async (req, res) => {
  const updates = { ...req.body };

  if (updates.name && !updates.firstName) {
    const resolvedName = parseName({ name: updates.name });
    updates.firstName = resolvedName.firstName;
    updates.lastName = resolvedName.lastName;
  }

  if (updates.experience !== undefined && updates.experienceYears === undefined) {
    updates.experienceYears = updates.experience;
  }

  if (updates.consultationFee !== undefined && updates.consultationFee !== null && updates.consultationFee !== '') {
    const feeValue = parseFloat(String(updates.consultationFee));
    if (!isNaN(feeValue) && isFinite(feeValue)) {
      updates.consultationFee = feeValue;
    }
  }

  if (updates.original_fees !== undefined && updates.original_fees !== null && updates.original_fees !== '') {
    const feeValue = parseFloat(String(updates.original_fees));
    if (!isNaN(feeValue) && isFinite(feeValue)) {
      updates.original_fees = feeValue;
    }
  }

  if (updates.discount_amount !== undefined && updates.discount_amount !== null && updates.discount_amount !== '') {
    const feeValue = parseFloat(String(updates.discount_amount));
    if (!isNaN(feeValue) && isFinite(feeValue)) {
      updates.discount_amount = feeValue;
    }
  }

  // Migrate legacy 'video' consultation mode to 'call'
  if (updates.consultationModes !== undefined && Array.isArray(updates.consultationModes)) {
    updates.consultationModes = updates.consultationModes.map(mode => mode === 'video' ? 'call' : mode);
  }

  // Helper function to sort days in chronological order
  const sortDays = (days) => {
    if (!Array.isArray(days) || days.length === 0) return days || [];
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days
      .filter(day => dayOrder.includes(day))
      .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  };

  // Handle fees structure - sort selectedDays and ensure empty arrays are saved
  if (updates.fees !== undefined) {
    console.log('💰 Processing fees update:', {
      doctorId: req.auth.id,
      feesUpdate: JSON.stringify(updates.fees, null, 2)
    });

    if (updates.fees === null) {
      updates.fees = null;
    } else if (typeof updates.fees === 'object') {
      const processedFees = { ...updates.fees };

      // Sort selectedDays for inPerson - handle empty arrays explicitly
      if (processedFees.inPerson !== undefined) {
        if (processedFees.inPerson === null) {
          // Keep null as is
        } else if (typeof processedFees.inPerson === 'object') {
          processedFees.inPerson = { ...processedFees.inPerson };
          // Always process selectedDays if inPerson object is provided
          if (processedFees.inPerson.selectedDays !== undefined) {
            processedFees.inPerson.selectedDays = Array.isArray(processedFees.inPerson.selectedDays)
              ? sortDays(processedFees.inPerson.selectedDays)
              : [];
            console.log('✅ Processed inPerson.selectedDays:', processedFees.inPerson.selectedDays);
          } else {
            // If selectedDays not provided but inPerson object is, ensure it's an empty array
            processedFees.inPerson.selectedDays = [];
            console.log('⚠️ inPerson.selectedDays not provided, setting to empty array');
          }
        }
      }

      // Sort selectedDays for voiceCall - handle empty arrays explicitly
      if (processedFees.voiceCall !== undefined) {
        if (processedFees.voiceCall === null) {
          // Keep null as is
        } else if (typeof processedFees.voiceCall === 'object') {
          processedFees.voiceCall = { ...processedFees.voiceCall };
          // Always process selectedDays if voiceCall object is provided
          if (processedFees.voiceCall.selectedDays !== undefined) {
            processedFees.voiceCall.selectedDays = Array.isArray(processedFees.voiceCall.selectedDays)
              ? sortDays(processedFees.voiceCall.selectedDays)
              : [];
            console.log('✅ Processed voiceCall.selectedDays:', processedFees.voiceCall.selectedDays);
          } else {
            // If selectedDays not provided but voiceCall object is, ensure it's an empty array
            processedFees.voiceCall.selectedDays = [];
            console.log('⚠️ voiceCall.selectedDays not provided, setting to empty array');
          }
        }
      }

      // Sort selectedDays for videoCall - handle empty arrays explicitly
      if (processedFees.videoCall !== undefined) {
        if (processedFees.videoCall === null) {
          // Keep null as is
        } else if (typeof processedFees.videoCall === 'object') {
          processedFees.videoCall = { ...processedFees.videoCall };
          // Always process selectedDays if videoCall object is provided
          if (processedFees.videoCall.selectedDays !== undefined) {
            processedFees.videoCall.selectedDays = Array.isArray(processedFees.videoCall.selectedDays)
              ? sortDays(processedFees.videoCall.selectedDays)
              : [];
            console.log('✅ Processed videoCall.selectedDays:', processedFees.videoCall.selectedDays);
          } else {
            // If selectedDays not provided but videoCall object is, ensure it's an empty array
            processedFees.videoCall.selectedDays = [];
            console.log('⚠️ videoCall.selectedDays not provided, setting to empty array');
          }
        }
      }

      updates.fees = processedFees;
      console.log('💰 Final processed fees:', JSON.stringify(processedFees, null, 2));
    }
  }

  if (updates.clinicAddress !== undefined || updates.clinicName !== undefined) {
    updates.clinicDetails = updates.clinicDetails || {};
    if (updates.clinicName !== undefined) {
      updates.clinicDetails.name = updates.clinicName;
    }
  }

  const rawClinicAddressUpdate =
    updates.clinicAddress !== undefined
      ? updates.clinicAddress
      : updates.clinicDetails?.address;

  const {
    address: normalizedClinicAddress,
    addressProvided: clinicAddressProvided,
    location: addressDerivedLocation,
    locationProvided: addressLocationProvided,
    locationSource: addressLocationSource,
    locationSourceProvided: addressLocationSourceProvided,
    error: addressLocationError,
  } = extractAddressLocation(rawClinicAddressUpdate);

  if (addressLocationError) {
    return res.status(400).json({
      success: false,
      message: addressLocationError,
    });
  }

  if (clinicAddressProvided) {
    updates.clinicDetails = updates.clinicDetails || {};
    if (normalizedClinicAddress) {
      updates.clinicDetails.address = normalizedClinicAddress;
    } else {
      updates.clinicDetails.address = undefined;
    }
  }

  const legacyLocation = parseGeoPoint({
    location: updates.clinicLocation ?? updates.clinicDetails?.location,
    coordinates: updates.clinicCoordinates,
    lat: updates.clinicLat ?? updates.clinicLatitude,
    lng: updates.clinicLng ?? updates.clinicLongitude,
    latitude: updates.clinicLatitude,
    longitude: updates.clinicLongitude,
  });

  if (legacyLocation.error) {
    return res.status(400).json({
      success: false,
      message: legacyLocation.error,
    });
  }

  let locationShouldClear = false;
  let updatedClinicLocation;

  if (legacyLocation.provided) {
    updatedClinicLocation = legacyLocation.point;
    locationShouldClear = legacyLocation.point === null;
  } else if (addressLocationProvided) {
    updatedClinicLocation = addressDerivedLocation;
    locationShouldClear = addressDerivedLocation === null;
  } else if (
    updates.clinicDetails &&
    updates.clinicDetails.location === null
  ) {
    locationShouldClear = true;
  }

  if (updatedClinicLocation || locationShouldClear) {
    updates.clinicDetails = updates.clinicDetails || {};
    if (updatedClinicLocation) {
      updates.clinicDetails.location = updatedClinicLocation;
    } else {
      updates.clinicDetails.location = undefined;
    }
  }

  let locationSourceValue;
  let locationSourceUpdateProvided = false;

  if (updates.clinicLocationSource !== undefined) {
    const normalizedSource = normalizeLocationSource(
      updates.clinicLocationSource
    );
    if (normalizedSource && !LOCATION_SOURCES.includes(normalizedSource)) {
      return res.status(400).json({
        success: false,
        message: `clinicLocationSource must be one of: ${LOCATION_SOURCES.join(
          ', '
        )}.`,
      });
    }
    locationSourceValue =
      normalizedSource === null ? undefined : normalizedSource;
    locationSourceUpdateProvided = true;
  } else if (updates.clinicDetails?.locationSource !== undefined) {
    const normalizedSource = normalizeLocationSource(
      updates.clinicDetails.locationSource
    );
    if (normalizedSource && !LOCATION_SOURCES.includes(normalizedSource)) {
      return res.status(400).json({
        success: false,
        message: `clinicLocationSource must be one of: ${LOCATION_SOURCES.join(
          ', '
        )}.`,
      });
    }
    locationSourceValue =
      normalizedSource === null ? undefined : normalizedSource;
    locationSourceUpdateProvided = true;
  } else if (addressLocationSourceProvided) {
    if (
      addressLocationSource &&
      !LOCATION_SOURCES.includes(addressLocationSource)
    ) {
      return res.status(400).json({
        success: false,
        message: `clinicLocationSource must be one of: ${LOCATION_SOURCES.join(
          ', '
        )}.`,
      });
    }
    locationSourceValue =
      addressLocationSource === null ? undefined : addressLocationSource;
    locationSourceUpdateProvided = true;
  }

  if (locationSourceUpdateProvided) {
    updates.clinicDetails = updates.clinicDetails || {};
    if (locationSourceValue) {
      updates.clinicDetails.locationSource = locationSourceValue;
    } else {
      updates.clinicDetails.locationSource = undefined;
    }
  }

  delete updates.name;
  delete updates.experience;
  delete updates.clinicName;
  delete updates.clinicAddress;
  delete updates.clinicLocation;
  delete updates.clinicCoordinates;
  delete updates.clinicLatitude;
  delete updates.clinicLongitude;
  delete updates.clinicLat;
  delete updates.clinicLng;
  delete updates.clinicLocationSource;

  // Process profile image: upload to Cloudinary (Standardized)
  if (updates.profileImage && typeof updates.profileImage === 'string' && updates.profileImage.startsWith('data:')) {
    try {
      console.log('📸 Processing profile image update (Standardized)...');
      const base64Data = updates.profileImage.includes(',') ? updates.profileImage.split(',')[1] : updates.profileImage;
      const buffer = Buffer.from(base64Data, 'base64');

      const uploadResult = await uploadFromBuffer(
        buffer,
        'profile.jpg',
        'image/jpeg',
        'healway/profiles',
        `profile_${req.auth.id}`,
        STANDARDS.PROFILE_IMAGE
      );

      updates.profileImage = uploadResult.url;
      console.log(`✅ Uploaded standardized profile image: ${updates.profileImage}`);
    } catch (error) {
      console.error('❌ Error uploading profile image:', error);
    }
  }

  // Process digital signature: upload to Cloudinary (Standardized)
  if (updates.digitalSignature && typeof updates.digitalSignature === 'string' && updates.digitalSignature.startsWith('data:')) {
    try {
      console.log('✍️ Processing digital signature update (Standardized)...');
      const base64Data = updates.digitalSignature.includes(',') ? updates.digitalSignature.split(',')[1] : updates.digitalSignature;
      const buffer = Buffer.from(base64Data, 'base64');

      const uploadResult = await uploadFromBuffer(
        buffer,
        'signature.png',
        'image/png',
        'healway/doctors/signatures',
        `sig_${req.auth.id}`,
        STANDARDS.SIGNATURE
      );

      updates.digitalSignature = {
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedAt: new Date()
      };
      console.log(`✅ Uploaded standardized digital signature: ${uploadResult.url}`);
    } catch (error) {
      console.error('❌ Error uploading digital signature:', error);
    }
  }

  // Process clinic images: upload to Cloudinary (Standardized)
  const { clinicImages } = req.body;
  if (clinicImages && Array.isArray(clinicImages) && clinicImages.length > 0) {
    try {
      console.log(`📸 Processing ${clinicImages.length} clinic images for update (Standardized)...`);
      let processedClinicImages = [];

      for (const img of clinicImages.slice(0, 5)) { // Max 5 images
        if (img?.data) {
          try {
            console.log(`📤 Uploading image: ${img.name}`);
            const base64Data = img.data.includes(',') ? img.data.split(',')[1] : img.data;
            const buffer = Buffer.from(base64Data, 'base64');

            const uploadResult = await uploadFromBuffer(
              buffer,
              img.name || 'clinic_image.jpg',
              'image/jpeg',
              'healway/clinics',
              '',
              STANDARDS.PUBLIC_PRESET
            );

            processedClinicImages.push({
              url: uploadResult.url,
              publicId: uploadResult.publicId,
              uploadedAt: new Date(),
            });
          } catch (imgError) {
            console.error(`❌ Error uploading image ${img.name}:`, imgError);
          }
        }
      }

      console.log(`✅ Uploaded ${processedClinicImages.length} clinic images to Cloudinary`);

      if (processedClinicImages.length > 0) {
        updates.clinicDetails = updates.clinicDetails || {};
        updates.clinicDetails.images = processedClinicImages;
      }
    } catch (error) {
      console.error('❌ Clinic image upload failed:', error);
    }
  }

  // Process documents: upload to Cloudinary
  // Process documents: upload to Cloudinary (Standardized)
  const { documents } = req.body;
  if (documents && Array.isArray(documents) && documents.length > 0) {
    try {
      console.log(`📄 Processing ${documents.length} documents for update (Standardized)...`);
      let processedDocuments = [];

      for (const doc of documents) {
        if (doc && doc.data && doc.name) {
          try {
            const base64Data = doc.data.includes(',') ? doc.data.split(',')[1] : doc.data;
            const buffer = Buffer.from(base64Data, 'base64');

            // Determine standard based on extension
            const isImage = doc.name.match(/\.(jpg|jpeg|png|webp)$/i);
            const standard = isImage ? STANDARDS.DOCUMENT_IMAGE : null;

            const uploadResult = await uploadFromBuffer(
              buffer,
              doc.name,
              isImage ? 'image/jpeg' : 'application/pdf',
              'healway/documents',
              '',
              standard
            );

            processedDocuments.push({
              name: doc.name,
              fileUrl: uploadResult.url,
              publicId: uploadResult.publicId,
              uploadedAt: new Date(),
            });
          } catch (docError) {
            console.error(`❌ Error processing document ${doc.name}:`, docError);
          }
        }
      }

      if (processedDocuments.length > 0) {
        updates.documents = processedDocuments;
      }
    } catch (error) {
      console.error('❌ Error processing documents:', error);
    }
  }

  const doctor = await updateProfileByRoleAndId(ROLES.DOCTOR, req.auth.id, updates);

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: doctor,
  });
});

exports.logoutDoctor = asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  // Blacklist access token if provided
  if (accessToken) {
    try {
      const decoded = decodeToken(accessToken);
      if (decoded && decoded.id && decoded.role) {
        await blacklistToken(accessToken, 'access', decoded.id, decoded.role, 'logout');
      }
    } catch (error) {
      console.log('Error blacklisting access token:', error.message);
    }
  }

  // Blacklist refresh token if provided
  if (refreshToken) {
    try {
      const decoded = decodeToken(refreshToken);
      if (decoded && decoded.id && decoded.role) {
        await blacklistToken(refreshToken, 'refresh', decoded.id, decoded.role, 'logout');
      }
    } catch (error) {
      console.log('Error blacklisting refresh token:', error.message);
    }
  }

  res.clearCookie('token');
  res.clearCookie('refreshToken');
  return res.status(200).json({ success: true, message: 'Logout successful. All tokens have been revoked.' });
});

// Refresh token endpoint
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required.',
    });
  }

  try {
    const decoded = await verifyRefreshToken(refreshToken);
    const doctor = await Doctor.findById(decoded.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!canDoctorLogin(doctor)) {
      return res.status(403).json({
        success: false,
        message: 'Doctor access is disabled by admin.',
      });
    }

    if (isTokenRevokedForDoctor(doctor, decoded)) {
      return res.status(401).json({
        success: false,
        message: 'Your session has been ended by admin. Please login again.',
      });
    }

    // Token rotation - blacklist old refresh token
    try {
      await blacklistToken(refreshToken, 'refresh', decoded.id, decoded.role, 'refresh');
    } catch (error) {
      console.log('Error blacklisting old refresh token:', error.message);
    }

    const payload = { id: doctor._id, role: ROLES.DOCTOR };
    const newAccessToken = createAccessToken(payload);
    const newRefreshToken = createRefreshToken(payload);

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please login again.',
      });
    }
    if (error.name === 'TokenRevokedError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token. Please login again.',
      });
    }
    throw error;
  }
});

exports.getDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterRole = req.auth.role;
  const requesterId = String(req.auth.id);

  if (requesterRole !== ROLES.ADMIN && requesterId !== String(id)) {
    const error = new Error('You are not authorized to access this doctor profile.');
    error.status = 403;
    throw error;
  }

  const doctor = await getProfileByRoleAndId(ROLES.DOCTOR, id);

  return res.status(200).json({ success: true, data: doctor });
});

