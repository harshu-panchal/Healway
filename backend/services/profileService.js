const { getModelForRole, ROLES } = require('../utils/getModelForRole');
const { deleteFile } = require('./fileUploadService');

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Extract file path/URL for deletion
 * @param {String} url - File URL (Cloudinary URL, '/uploads/profiles/image.jpg', etc.)
 * @returns {String|null} - URL/path suitable for deleteFile, or null if nothing to delete
 */
const extractFilePathFromUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // If it's a Cloudinary URL, return it as-is (deleteFile will extract public_id)
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary')) {
    return url;
  }

  // If it's some other external URL, don't delete it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return null;
  }

  // Legacy local path (e.g., '/uploads/profiles/image.jpg')
  // Return it, deleteFile will handle gracefully (skip with log)
  if (url.startsWith('/uploads/')) {
    return url.replace('/uploads/', '');
  }

  // If it already looks like a relative path, return as is
  if (url.includes('/') && !url.startsWith('/')) {
    return url;
  }

  return null;
};

/**
 * Delete old file if it exists and is different from new file
 * @param {String} oldUrl - Old file URL
 * @param {String} newUrl - New file URL
 */
const deleteOldFileIfNeeded = async (oldUrl, newUrl) => {
  // Only delete if old and new URLs are different
  // If newUrl is 'PLACEHOLDER_TO_FORCE_DELETE', it will always trigger deletion
  if (!oldUrl || !newUrl || (newUrl !== 'PLACEHOLDER_TO_FORCE_DELETE' && oldUrl === newUrl)) {
    return;
  }

  const oldFilePath = extractFilePathFromUrl(oldUrl);

  // Nothing to delete
  if (!oldFilePath) {
    return;
  }

  try {
    await deleteFile(oldFilePath);
    console.log(`✅ Old file deleted: ${oldFilePath}`);
  } catch (error) {
    // Don't throw error, just log it - file deletion failure shouldn't block profile update
    console.error(`⚠️ Failed to delete old file (${oldFilePath}):`, error.message);
  }
};

/**
 * Delete old files from documents object when new documents are uploaded
 * @param {Object} oldDocuments - Old documents object
 * @param {Object} newDocuments - New documents object
 */
const deleteOldDocumentFiles = async (oldDocuments, newDocuments) => {
  if (!oldDocuments || !newDocuments) {
    return;
  }

  const oldDocsArray = Array.isArray(oldDocuments) ? oldDocuments : Object.values(oldDocuments);
  const newDocsArray = Array.isArray(newDocuments) ? newDocuments : Object.values(newDocuments);

  // Helper to extract URL from document object
  const getUrl = (doc) => {
    if (!doc) return null;
    if (typeof doc === 'string') return doc;
    return doc.fileUrl || doc.imageUrl || doc.url || null;
  };

  // Get all URLs in new documents to avoid deleting files that are still in use
  const newUrls = new Set(
    newDocsArray.map(getUrl).filter(url => url !== null)
  );

  // Check each old document
  for (const oldDoc of oldDocsArray) {
    const oldUrl = getUrl(oldDoc);

    // If old URL exists and is not in the new set of URLs, delete it
    if (oldUrl && !newUrls.has(oldUrl)) {
      await deleteOldFileIfNeeded(oldUrl, 'PLACEHOLDER_TO_FORCE_DELETE');
    }
  }
};

const toPlainObject = (value) => (value && typeof value.toObject === 'function' ? value.toObject() : value);

const ensureUniqueField = async (Model, field, value, currentId, message) => {
  if (!value) {
    return;
  }

  const existing = await Model.findOne({ [field]: value, _id: { $ne: currentId } });

  if (existing) {
    throw createError(409, message || `${field} already in use.`);
  }
};

const mergeObjects = (existingValue, newValue) => {
  if (!newValue || typeof newValue !== 'object') {
    return existingValue;
  }

  const base = existingValue ? toPlainObject(existingValue) : {};

  // Helper function to sort days in chronological order
  const sortDays = (days) => {
    if (!Array.isArray(days) || days.length === 0) return days || [];
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days
      .filter(day => dayOrder.includes(day))
      .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  };

  // Special handling for availabilitySlots - sort selectedDays
  if (newValue && typeof newValue === 'object' && (newValue.selectedDays !== undefined || newValue.inPerson !== undefined || newValue.callVideo !== undefined)) {
    const merged = { ...base, ...newValue };

    // Sort selectedDays if present
    if (newValue.selectedDays !== undefined) {
      merged.selectedDays = Array.isArray(newValue.selectedDays)
        ? sortDays(newValue.selectedDays)
        : [];
    } else if (merged.selectedDays && Array.isArray(merged.selectedDays)) {
      merged.selectedDays = sortDays(merged.selectedDays);
    }

    return merged;
  }

  // Special handling for fees object to ensure all consultation types are preserved
  if (newValue && typeof newValue === 'object' && (newValue.inPerson !== undefined || newValue.videoCall !== undefined || newValue.voiceCall !== undefined)) {
    const merged = { ...base };

    // Merge each fee type individually to preserve structure
    if (newValue.inPerson !== undefined) {
      // If inPerson is explicitly set (even if null or empty object), merge it
      if (newValue.inPerson === null) {
        merged.inPerson = null;
      } else if (typeof newValue.inPerson === 'object') {
        // Preserve existing inPerson fields if they exist
        const existingInPerson = base.inPerson || {};
        merged.inPerson = { ...existingInPerson, ...newValue.inPerson };

        // Always process selectedDays if inPerson object is provided
        if (newValue.inPerson.selectedDays !== undefined) {
          // Explicitly set selectedDays - handle empty arrays
          merged.inPerson.selectedDays = Array.isArray(newValue.inPerson.selectedDays)
            ? sortDays(newValue.inPerson.selectedDays)
            : [];
        } else if (merged.inPerson.selectedDays === undefined) {
          // If not provided and doesn't exist, set to empty array
          merged.inPerson.selectedDays = [];
        } else if (Array.isArray(merged.inPerson.selectedDays)) {
          // Sort existing selectedDays
          merged.inPerson.selectedDays = sortDays(merged.inPerson.selectedDays);
        } else {
          // Ensure it's an array
          merged.inPerson.selectedDays = [];
        }
      }
    }
    if (newValue.videoCall !== undefined) {
      // If videoCall is explicitly set (even if null or empty object), merge it
      if (newValue.videoCall === null) {
        merged.videoCall = null;
      } else if (typeof newValue.videoCall === 'object') {
        // Preserve existing videoCall fields if they exist
        const existingVideoCall = base.videoCall || {};
        merged.videoCall = { ...existingVideoCall, ...newValue.videoCall };

        // Always process selectedDays if videoCall object is provided
        if (newValue.videoCall.selectedDays !== undefined) {
          // Explicitly set selectedDays - handle empty arrays
          merged.videoCall.selectedDays = Array.isArray(newValue.videoCall.selectedDays)
            ? sortDays(newValue.videoCall.selectedDays)
            : [];
        } else if (merged.videoCall.selectedDays === undefined) {
          // If not provided and doesn't exist, set to empty array
          merged.videoCall.selectedDays = [];
        } else if (Array.isArray(merged.videoCall.selectedDays)) {
          // Sort existing selectedDays
          merged.videoCall.selectedDays = sortDays(merged.videoCall.selectedDays);
        } else {
          // Ensure it's an array
          merged.videoCall.selectedDays = [];
        }
      }
    }
    if (newValue.voiceCall !== undefined) {
      // If voiceCall is explicitly set (even if null or empty object), merge it
      if (newValue.voiceCall === null) {
        merged.voiceCall = null;
      } else if (typeof newValue.voiceCall === 'object') {
        // Preserve existing voiceCall fields if they exist
        const existingVoiceCall = base.voiceCall || {};
        merged.voiceCall = { ...existingVoiceCall, ...newValue.voiceCall };

        // Always process selectedDays if voiceCall object is provided
        if (newValue.voiceCall.selectedDays !== undefined) {
          // Explicitly set selectedDays - handle empty arrays
          merged.voiceCall.selectedDays = Array.isArray(newValue.voiceCall.selectedDays)
            ? sortDays(newValue.voiceCall.selectedDays)
            : [];
        } else if (merged.voiceCall.selectedDays === undefined) {
          // If not provided and doesn't exist, set to empty array
          merged.voiceCall.selectedDays = [];
        } else if (Array.isArray(merged.voiceCall.selectedDays)) {
          // Sort existing selectedDays
          merged.voiceCall.selectedDays = sortDays(merged.voiceCall.selectedDays);
        } else {
          // Ensure it's an array
          merged.voiceCall.selectedDays = [];
        }
      }
    }

    return merged;
  }

  return { ...base, ...newValue };
};

const handleArrayReplace = async (doc, field, updates, arrayReplaceFields) => {
  if (!arrayReplaceFields.includes(field)) return;
  if (updates[field] === undefined) return;

  // For documents field, ensure it's an array and delete old files before replacing
  if (field === 'documents') {
    if (Array.isArray(updates[field])) {
      // Filter out invalid documents that might cause Mongoose validation errors
      const validDocuments = updates[field].filter(d => d && d.name && d.fileUrl);

      if (doc[field]) {
        await deleteOldDocumentFiles(doc[field], validDocuments);
      }

      doc[field] = validDocuments;
      doc.markModified(field);
    }
    // If documents is not an array (e.g., empty object {}), ignore it to avoid validation errors
    return;
  }

  doc[field] = updates[field];
  doc.markModified(field);
};

const applyPatientUpdates = async (doc, updates, Model) => {
  const allowedScalars = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'profileImage'];
  const mergeFields = ['address', 'emergencyContact'];
  const arrayReplaceFields = ['allergies'];

  // Fields that are required and shouldn't be set to empty string
  const requiredFields = ['firstName', 'lastName'];
  // Enum fields that should be set to undefined instead of empty string
  const enumFields = ['gender', 'bloodGroup'];

  if (updates.email && updates.email !== doc.email) {
    await ensureUniqueField(Model, 'email', updates.email, doc._id, 'Email already registered.');
    doc.email = updates.email.toLowerCase().trim();
  }

  if (updates.phone && updates.phone !== doc.phone) {
    await ensureUniqueField(Model, 'phone', updates.phone, doc._id, 'Phone number already registered.');
    doc.phone = updates.phone;
  }

  // Delete old profile image if new one is being uploaded
  if (updates.profileImage && doc.profileImage && doc.profileImage !== updates.profileImage) {
    await deleteOldFileIfNeeded(doc.profileImage, updates.profileImage);
  }

  allowedScalars.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== undefined) {
      const value = updates[field];

      // Skip empty strings for required fields (keep existing value)
      if (requiredFields.includes(field) && value === '') {
        return;
      }

      // Set empty strings to undefined for enum fields
      if (enumFields.includes(field) && value === '') {
        doc[field] = undefined;
        return;
      }

      doc[field] = value;
    }
  });

  mergeFields.forEach((field) => {
    if (updates[field] !== undefined) {
      doc[field] = mergeObjects(doc[field], updates[field]);
      doc.markModified(field);
    }
  });

  for (const field of arrayReplaceFields) {
    await handleArrayReplace(doc, field, updates, arrayReplaceFields);
  }
};

const applyDoctorUpdates = async (doc, updates, Model) => {
  const allowedScalars = [
    'firstName',
    'lastName',
    'experienceYears',
    'bio',
    'specialization',
    'gender',
    'original_fees',
    'discount_amount',
    'consultationFee',
    'profileImage',
    'qualification',
    'licenseNumber',
    'averageConsultationMinutes',
    'isActive',
  ];
  const mergeFields = ['clinicDetails', 'digitalSignature', 'fees', 'availabilitySlots'];
  const arrayReplaceFields = ['education', 'languages', 'consultationModes', 'availability', 'documents'];
  const mergeFieldsForDoctor = ['availabilitySlots'];

  if (updates.phone && updates.phone !== doc.phone) {
    await ensureUniqueField(Model, 'phone', updates.phone, doc._id, 'Phone number already registered.');
    doc.phone = updates.phone;
  }

  // Delete old profile image if new one is being uploaded
  if (updates.profileImage && doc.profileImage && doc.profileImage !== updates.profileImage) {
    await deleteOldFileIfNeeded(doc.profileImage, updates.profileImage);
  }

  // Delete old digital signature if new one is being uploaded
  if (updates.digitalSignature && doc.digitalSignature) {
    const oldSignature = typeof doc.digitalSignature === 'string'
      ? doc.digitalSignature
      : doc.digitalSignature.imageUrl || doc.digitalSignature.url;
    const newSignature = typeof updates.digitalSignature === 'string'
      ? updates.digitalSignature
      : updates.digitalSignature.imageUrl || updates.digitalSignature.url;

    if (oldSignature && newSignature && oldSignature !== newSignature) {
      await deleteOldFileIfNeeded(oldSignature, newSignature);
    }
  }

  allowedScalars.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== undefined) {
      doc[field] = updates[field];
    }
  });

  for (const field of mergeFields) {
    if (updates[field] !== undefined) {
      // For digitalSignature field, already handled above
      const oldValue = doc[field];
      doc[field] = mergeObjects(doc[field], updates[field]);
      doc.markModified(field);

      // For nested objects like fees, also mark nested paths as modified
      if (field === 'fees' && doc.fees) {
        // Always mark nested paths as modified when fees is updated
        doc.markModified('fees');
        if (doc.fees.inPerson !== undefined) {
          doc.markModified('fees.inPerson');
          if (doc.fees.inPerson.selectedDays !== undefined) {
            doc.markModified('fees.inPerson.selectedDays');
            console.log('📝 Marking fees.inPerson.selectedDays as modified:', {
              doctorId: doc._id?.toString(),
              selectedDays: doc.fees.inPerson.selectedDays,
              isArray: Array.isArray(doc.fees.inPerson.selectedDays),
              length: Array.isArray(doc.fees.inPerson.selectedDays) ? doc.fees.inPerson.selectedDays.length : 'N/A'
            });
          }
        }
        if (doc.fees.videoCall !== undefined) {
          doc.markModified('fees.videoCall');
          if (doc.fees.videoCall.selectedDays !== undefined) {
            doc.markModified('fees.videoCall.selectedDays');
            console.log('📝 Marking fees.videoCall.selectedDays as modified:', {
              doctorId: doc._id?.toString(),
              selectedDays: doc.fees.videoCall.selectedDays,
              isArray: Array.isArray(doc.fees.videoCall.selectedDays),
              length: Array.isArray(doc.fees.videoCall.selectedDays) ? doc.fees.videoCall.selectedDays.length : 'N/A'
            });
          }
        }
        if (doc.fees.voiceCall !== undefined) {
          doc.markModified('fees.voiceCall');
          if (doc.fees.voiceCall.selectedDays !== undefined) {
            doc.markModified('fees.voiceCall.selectedDays');
            console.log('📝 Marking fees.voiceCall.selectedDays as modified:', {
              doctorId: doc._id?.toString(),
              selectedDays: doc.fees.voiceCall.selectedDays,
              isArray: Array.isArray(doc.fees.voiceCall.selectedDays),
              length: Array.isArray(doc.fees.voiceCall.selectedDays) ? doc.fees.voiceCall.selectedDays.length : 'N/A'
            });
          }
        }
      }
      // For availabilitySlots, mark nested paths
      if (field === 'availabilitySlots' && doc.availabilitySlots) {
        doc.markModified('availabilitySlots');
        if (doc.availabilitySlots.selectedDays !== undefined) {
          doc.markModified('availabilitySlots.selectedDays');
          console.log('📝 Marking availabilitySlots.selectedDays as modified:', {
            doctorId: doc._id?.toString(),
            selectedDays: doc.availabilitySlots.selectedDays,
            isArray: Array.isArray(doc.availabilitySlots.selectedDays),
            length: Array.isArray(doc.availabilitySlots.selectedDays) ? doc.availabilitySlots.selectedDays.length : 'N/A'
          });
        }
        if (doc.availabilitySlots.inPerson) doc.markModified('availabilitySlots.inPerson');
        if (doc.availabilitySlots.callVideo) doc.markModified('availabilitySlots.callVideo');
      }
    }
  }

  for (const field of arrayReplaceFields) {
    await handleArrayReplace(doc, field, updates, arrayReplaceFields);
  }

  // If availability is updated, log it for debugging
  if (updates.availability !== undefined) {
    console.log(`📅 Doctor ${doc._id} updated availability:`, {
      availabilityCount: updates.availability?.length || 0,
      availability: updates.availability?.map(a => {
        if (a.slots && Array.isArray(a.slots)) {
          return {
            day: a.day,
            slots: a.slots.map(s => ({
              consultationType: s.consultationType,
              startTime: s.startTime,
              endTime: s.endTime
            }))
          }
        }
        return { day: a.day, startTime: a.startTime, endTime: a.endTime }
      }) || [],
    });
  }
};


const applyAdminUpdates = async (doc, updates, Model, { requester } = {}) => {
  const allowedScalars = ['name', 'phone', 'profileImage'];

  if (updates.email && updates.email !== doc.email) {
    throw createError(400, 'Email cannot be changed.');
  }

  if (updates.phone && updates.phone !== doc.phone) {
    await ensureUniqueField(Model, 'phone', updates.phone, doc._id, 'Phone number already registered.');
    doc.phone = updates.phone;
  }

  // Delete old profile image if new one is being uploaded
  if (updates.profileImage && doc.profileImage && doc.profileImage !== updates.profileImage) {
    await deleteOldFileIfNeeded(doc.profileImage, updates.profileImage);
  }

  allowedScalars.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== undefined) {
      doc[field] = updates[field];
    }
  });

  if (Object.prototype.hasOwnProperty.call(updates, 'permissions')) {
    if (!requester || !requester.isSuperAdmin) {
      throw createError(403, 'Only super admins can update permissions.');
    }
    doc.permissions = Array.isArray(updates.permissions) ? updates.permissions : [];
    doc.markModified('permissions');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
    if (!requester || !requester.isSuperAdmin || String(doc._id) === String(requester._id)) {
      throw createError(403, 'Only super admins can change active status of other admins.');
    }
    doc.isActive = Boolean(updates.isActive);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'isSuperAdmin')) {
    if (!requester || !requester.isSuperAdmin || String(doc._id) === String(requester._id)) {
      throw createError(403, 'Only super admins can modify super admin status of other admins.');
    }
    doc.isSuperAdmin = Boolean(updates.isSuperAdmin);
  }
};

const updateHandlers = {
  [ROLES.PATIENT]: applyPatientUpdates,
  [ROLES.DOCTOR]: applyDoctorUpdates,

  [ROLES.ADMIN]: applyAdminUpdates,
};

const getProfileByRoleAndId = async (role, id) => {
  const Model = getModelForRole(role);
  const document = await Model.findById(id).select('-password');

  if (!document) {
    throw createError(404, `${role} not found`);
  }

  return document;
};

const updateProfileByRoleAndId = async (role, id, updates, options = {}) => {
  const Model = getModelForRole(role);
  const document = await Model.findById(id);

  if (!document) {
    throw createError(404, `${role} not found`);
  }

  const handler = updateHandlers[role];

  if (!handler) {
    throw createError(400, 'Profile updates are not supported for this role.');
  }

  await handler(document, updates, Model, options);

  // Debug log before save
  if (updates.fees) {
    console.log('💾 Before save - fees structure:', {
      doctorId: document._id?.toString(),
      fees: JSON.stringify(document.fees, null, 2),
      isModified: document.isModified('fees'),
      modifiedPaths: document.modifiedPaths()
    });
  }
  if (updates.availabilitySlots) {
    console.log('💾 Before save - availabilitySlots:', {
      doctorId: document._id?.toString(),
      availabilitySlots: JSON.stringify(document.availabilitySlots, null, 2),
      isModified: document.isModified('availabilitySlots'),
      modifiedPaths: document.modifiedPaths()
    });
  }

  await document.save();

  // Debug log after save
  if (updates.fees) {
    const savedDoc = await Model.findById(document._id);
    console.log('✅ After save - fees structure:', {
      doctorId: savedDoc._id?.toString(),
      fees: JSON.stringify(savedDoc.fees, null, 2)
    });
  }
  if (updates.availabilitySlots) {
    const savedDoc = await Model.findById(document._id);
    console.log('✅ After save - availabilitySlots:', {
      doctorId: savedDoc._id?.toString(),
      availabilitySlots: JSON.stringify(savedDoc.availabilitySlots, null, 2)
    });
  }

  // If doctor availability was updated, log it
  if (role === ROLES.DOCTOR && updates.availability !== undefined) {
    const savedDoc = await Model.findById(id);
    console.log(`✅ Doctor ${id} profile updated with new availability:`, {
      availabilityCount: savedDoc.availability?.length || 0,
      availability: savedDoc.availability?.map(a => {
        if (a.slots && Array.isArray(a.slots)) {
          return {
            day: a.day,
            slots: a.slots.map(s => ({
              consultationType: s.consultationType,
              startTime: s.startTime,
              endTime: s.endTime
            }))
          }
        }
        return { day: a.day, startTime: a.startTime, endTime: a.endTime }
      }) || [],
    });
    console.log(`ℹ️ Note: Sessions will be created automatically when appointments are booked for specific dates.`);
  }

  return Model.findById(id).select('-password');
};

module.exports = {
  getProfileByRoleAndId,
  updateProfileByRoleAndId,
};


