const multer = require('multer');

// Standardized limits
const LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB (plenty for high-res source to be compressed)
  DOCUMENT: 1 * 1024 * 1024,   // 1MB (as per requirement for docs)
  PROFILE: 2 * 1024 * 1024,    // 2MB (sufficient for profile photos)
};

// Use memory storage
const storage = multer.memoryStorage();

// File filter with standard checks
const fileFilter = (req, file, cb) => {
  const allowedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedImageMimeTypes.includes(file.mimetype) || allowedDocMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'), false);
  }
};

// Configure multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LIMITS.IMAGE, // Default limit
  },
});

/**
 * Middleware for signature upload (Stricter limit)
 */
const uploadSignature = (fieldName = 'image') => {
  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Signatures must be PNG, JPEG, or WEBP.'), false);
      }
    },
    limits: {
      fileSize: 500 * 1024, // 500KB source is enough for a signature
    },
  }).single(fieldName);
};

/**
 * Middleware for document upload (1MB limit per requirement)
 */
const uploadDocumentMiddleware = (fieldName = 'file') => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: LIMITS.DOCUMENT,
    },
  }).single(fieldName);
};

// Existing helpers (updated with appropriate limits)
const uploadSingle = (fieldName = 'file') => upload.single(fieldName);
const uploadMultiple = (fieldName = 'files', maxCount = 10) => upload.array(fieldName, maxCount);
const uploadFields = (fields) => upload.fields(fields);

const uploadImage = (fieldName = 'image') => {
  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed.'), false);
      }
    },
    limits: {
      fileSize: LIMITS.IMAGE,
    },
  }).single(fieldName);
};

const uploadPDF = (fieldName = 'pdf') => {
  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed.'), false);
      }
    },
    limits: {
      fileSize: LIMITS.DOCUMENT, // PDFs limited to 1MB per requirement
    },
  }).single(fieldName);
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadImage,
  uploadPDF,
  uploadSignature,
  uploadDocument: uploadDocumentMiddleware,
};
