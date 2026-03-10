const cloudinary = require('../config/cloudinary.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// --- Standardization Constants ---
const STANDARDS = {
  PROFILE_IMAGE: {
    width: 512,
    height: 512,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'webp',
  },
  SIGNATURE: {
    width: 400,
    height: 150,
    crop: 'fit', // Maintain aspect ratio within bounds
    quality: 'auto',
    fetch_format: 'webp', // WebP supports transparency and is efficient
    background: 'transparent',
  },
  DOCUMENT_IMAGE: {
    width: 1200, // Max width for docs
    crop: 'limit',
    quality: 'auto',
    fetch_format: 'webp',
  },
  SPECIALTY_ICON: {
    width: 256,
    height: 256,
    crop: 'limit',
    quality: 'auto',
    fetch_format: 'webp',
  },
  PUBLIC_PRESET: {
    quality: 'auto',
    fetch_format: 'auto',
  }
};

/**
 * Upload a buffer directly to Cloudinary with optional transformations.
 * @param {Buffer} buffer - File buffer
 * @param {String} folder - Cloudinary folder name
 * @param {Object} options - Additional Cloudinary options (public_id, transformation, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const cloudinaryUpload = (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: options.resource_type || 'image',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(buffer);
  });
};

/**
 * Get file extension from filename or mimetype
 */
const getFileExtension = (filename, mimetype) => {
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext) return ext;
  }
  if (mimetype) {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    };
    return mimeToExt[mimetype] || '';
  }
  return '';
};

/**
 * Determine the Cloudinary resource_type based on mimetype
 */
const getResourceType = (mimetype) => {
  if (!mimetype) return 'auto';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'image'; // PDF as image allows inline viewing on Cloudinary
  if (mimetype.startsWith('video/')) return 'video';
  return 'auto'; // Default to auto instead of raw
};

/**
 * Upload file to Cloudinary with automatic standardization
 * @param {Object} file - File object from multer
 * @param {String} folder - Cloudinary folder
 * @param {String} prefix - Optional prefix for public_id
 * @param {Object} standard - Transformation standard from STANDARDS
 * @returns {Promise<Object>} Upload result
 */
const uploadFile = async (file, folder = 'healway/temporary', prefix = '', standard = null) => {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    const ext = getFileExtension(file.originalname, file.mimetype);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const publicIdName = prefix ? `${prefix}_${timestamp}_${uniqueId}` : `${timestamp}_${uniqueId}`;
    const resourceType = getResourceType(file.mimetype);

    const options = {
      resource_type: resourceType,
      public_id: publicIdName,
    };

    // Apply standardization if it's an image and standard is provided
    if (resourceType === 'image' && standard) {
      options.transformation = [standard];
    } else if (resourceType === 'image') {
      // Default optimization for any other image
      options.transformation = [STANDARDS.PUBLIC_PRESET];
    }

    const result = await cloudinaryUpload(file.buffer, folder, options);

    return {
      success: true,
      url: result.secure_url,
      path: result.public_id,
      publicId: result.public_id,
      fileName: `${publicIdName}${ext}`,
      originalName: file.originalname,
      mimetype: result.resource_type === 'image' ? `image/${result.format}` : file.mimetype,
      size: result.bytes,
      folder,
      format: result.format,
      dimensions: result.width ? { width: result.width, height: result.height } : null,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Standardized Profile Image Upload
 */
const uploadProfileImage = async (file, userId, userType = 'user') => {
  if (!file) throw new Error('No image file provided');
  const folder = `healway/profiles/${userType}`;
  return uploadFile(file, folder, `profile_${userId}`, STANDARDS.PROFILE_IMAGE);
};

/**
 * Standardized Signature Upload
 */
const uploadSignature = async (file, doctorId) => {
  if (!file) throw new Error('No signature file provided');
  const folder = 'healway/doctors/signatures';
  return uploadFile(file, folder, `sig_${doctorId}`, STANDARDS.SIGNATURE);
};

/**
 * Standardized Document Upload (Image or PDF)
 */
const uploadDocument = async (file, folder = 'healway/documents', prefix = '') => {
  if (!file) throw new Error('No document provided');

  const resourceType = getResourceType(file.mimetype);
  const standard = resourceType === 'image' ? STANDARDS.DOCUMENT_IMAGE : null;

  return uploadFile(file, folder, prefix, standard);
};

/**
 * Legacy support / Generic image upload (with default optimization)
 */
const uploadImage = async (file, folder = 'healway/images', prefix = '') => {
  return uploadFile(file, folder, prefix, STANDARDS.PUBLIC_PRESET);
};

/**
 * Standardized PDF Upload
 */
const uploadPDF = async (file, folder = 'healway/documents', prefix = '') => {
  if (file.mimetype !== 'application/pdf') {
    throw new Error('Invalid file format. Only PDF files are allowed.');
  }
  return uploadFile(file, folder, prefix);
};

/**
 * Upload from buffer (e.g., generated PDFs or base64)
 */
const uploadFromBuffer = async (buffer, originalName, mimetype, folder = 'healway/temporary', prefix = '', standard = null) => {
  const file = { buffer, originalname: originalName, mimetype };
  return uploadFile(file, folder, prefix, standard);
};

const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com') && !url.includes('res.cloudinary')) return null;

  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    let pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);
    if (pathAfterUpload.match(/^v\d+\//)) pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    return pathAfterUpload.replace(/\.[^/.]+$/, '');
  } catch { return null; }
};

const deleteFile = async (filePathOrUrl) => {
  if (!filePathOrUrl) throw new Error('File path is required');
  try {
    let publicId = null;
    let resourceType = 'image';
    if (filePathOrUrl.includes('cloudinary.com') || filePathOrUrl.includes('res.cloudinary')) {
      publicId = extractPublicIdFromUrl(filePathOrUrl);
      if (filePathOrUrl.includes('/raw/')) resourceType = 'raw';
      else if (filePathOrUrl.includes('/video/')) resourceType = 'video';
    } else if (filePathOrUrl.includes('healway/')) {
      publicId = filePathOrUrl;
    } else {
      return { success: true, message: 'Legacy path skipped' };
    }
    if (!publicId) return { success: false, message: 'No publicId' };
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: result.result === 'ok', message: result.result };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return filePath;
};

module.exports = {
  STANDARDS,
  cloudinaryUpload,
  uploadFile,
  uploadImage,
  uploadProfileImage,
  uploadSignature,
  uploadDocument,
  uploadPDF,
  uploadFromBuffer,
  deleteFile,
  getFileUrl,
  extractPublicIdFromUrl,
  deleteFromCloudinary: deleteFile,
};
