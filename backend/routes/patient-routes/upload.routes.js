const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { uploadImage } = require('../../middleware/uploadMiddleware');
const { uploadProfileImage } = require('../../services/fileUploadService');
const asyncHandler = require('../../middleware/asyncHandler');

// Upload profile image
router.post('/profile-image', protect('patient'), uploadImage('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file uploaded',
    });
  }

  try {
    const result = await uploadProfileImage(req.file, req.user._id, 'patient');

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile image',
    });
  }
}));

module.exports = router;


