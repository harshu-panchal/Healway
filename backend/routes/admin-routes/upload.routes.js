const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { uploadImage } = require('../../middleware/uploadMiddleware');
const { uploadImage: uploadImageToCloud } = require('../../services/fileUploadService');
const asyncHandler = require('../../middleware/asyncHandler');
const { ROLES } = require('../../utils/constants');

// Upload announcement image (Standardized)
router.post('/announcement-image', protect(ROLES.ADMIN || 'admin'), uploadImage('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No image file uploaded',
        });
    }

    try {
        const result = await uploadImageToCloud(req.file, 'healway/admin-announcements');

        return res.status(200).json({
            success: true,
            message: 'Announcement image uploaded and optimized successfully',
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
            message: error.message || 'Failed to upload announcement image',
        });
    }
}));

router.post('/footer-image', protect(ROLES.ADMIN || 'admin'), uploadImage('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No image file uploaded',
        });
    }

    try {
        const result = await uploadImageToCloud(req.file, 'healway/footer-brand');

        return res.status(200).json({
            success: true,
            message: 'Footer image uploaded successfully',
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
            message: error.message || 'Failed to upload footer image',
        });
    }
}));

module.exports = router;
