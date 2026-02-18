const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { uploadImage, uploadSignature: uploadSignatureMiddleware } = require('../../middleware/uploadMiddleware');
const { uploadProfileImage, uploadSignature, uploadImage: uploadImageToCloud } = require('../../services/fileUploadService');
const asyncHandler = require('../../middleware/asyncHandler');
const { ROLES } = require('../../utils/constants');

// Upload profile image
router.post('/profile-image', protect(ROLES.DOCTOR), uploadImage('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file uploaded',
    });
  }

  try {
    const result = await uploadProfileImage(req.file, req.user._id, 'doctor');

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        size: result.size
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile image',
    });
  }
}));

// Upload digital signature
router.post('/signature', protect(ROLES.DOCTOR), uploadSignatureMiddleware('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file uploaded',
    });
  }

  try {
    const result = await uploadSignature(req.file, req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Digital signature uploaded and standardized successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        size: result.size
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload signature',
    });
  }
}));

// Upload announcement image
router.post('/announcement-image', protect(ROLES.DOCTOR), uploadImage('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file uploaded',
    });
  }

  try {
    const result = await uploadImageToCloud(req.file, 'healway/announcements');

    return res.status(200).json({
      success: true,
      message: 'Announcement image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload announcement image',
    });
  }
}));

module.exports = router;
