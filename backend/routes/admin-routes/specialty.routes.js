const express = require('express');
const router = express.Router();
const Specialty = require('../../models/Specialty');
const { protect } = require('../../middleware/authMiddleware');
const { uploadImage } = require('../../middleware/uploadMiddleware');
const { uploadImage: uploadImageToCloud, deleteFromCloudinary, deleteFile, STANDARDS } = require('../../services/fileUploadService');
const { ROLES } = require('../../utils/constants');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Get all specialties (including inactive)
// @route   GET /api/admin/specialties
// @access  Private (Admin)
router.get('/', protect(ROLES.ADMIN), asyncHandler(async (req, res) => {
    const specialties = await Specialty.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: specialties,
    });
}));

// @desc    Create a new specialty
// @route   POST /api/admin/specialties
// @access  Private (Admin)
router.post('/', protect(ROLES.ADMIN), uploadImage('icon'), asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    let iconUrl = '';
    let iconPublicId = '';

    if (req.file) {
        const result = await uploadImageToCloud(req.file, 'healway/specialties', '', STANDARDS.SPECIALTY_ICON);
        iconUrl = result.url;
        iconPublicId = result.publicId;
    }

    const specialty = await Specialty.create({
        name,
        description,
        icon: iconUrl,
        iconPublicId, // Add this field to your schema if not exists
    });

    res.status(201).json({
        success: true,
        data: specialty,
    });
}));

// @desc    Update a specialty
// @route   PUT /api/admin/specialties/:id
// @access  Private (Admin)
router.put('/:id', protect(ROLES.ADMIN), uploadImage('icon'), asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    let specialty = await Specialty.findById(req.params.id);

    if (!specialty) {
        return res.status(404).json({ success: false, message: 'Specialty not found' });
    }

    let iconUrl = specialty.icon;
    let iconPublicId = specialty.iconPublicId;

    if (req.file) {
        // Delete old icon if exists
        if (specialty.iconPublicId) {
            // Delete from Cloudinary
            await deleteFromCloudinary(specialty.iconPublicId);
        } else if (specialty.icon && specialty.icon.startsWith('/uploads/')) {
            // Delete legacy local file
            try {
                await deleteFile(specialty.icon.replace('/uploads/', ''));
            } catch (error) {
                console.error('Failed to delete old local icon:', error);
            }
        }

        const result = await uploadImageToCloud(req.file, 'healway/specialties', '', STANDARDS.SPECIALTY_ICON);
        iconUrl = result.url;
        iconPublicId = result.publicId;
    }

    // Prepare update object
    const updateData = { name, description, icon: iconUrl, isActive };
    if (iconPublicId) updateData.iconPublicId = iconPublicId;

    specialty = await Specialty.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: specialty,
    });
}));

// @desc    Delete a specialty
// @route   DELETE /api/admin/specialties/:id
// @access  Private (Admin)
router.delete('/:id', protect(ROLES.ADMIN), asyncHandler(async (req, res) => {
    const specialty = await Specialty.findById(req.params.id);

    if (!specialty) {
        return res.status(404).json({ success: false, message: 'Specialty not found' });
    }

    // Delete icon file
    if (specialty.iconPublicId) {
        // Delete from Cloudinary
        await deleteFromCloudinary(specialty.iconPublicId);
    } else if (specialty.icon && specialty.icon.startsWith('/uploads/')) {
        // Delete legacy local file
        try {
            await deleteFile(specialty.icon.replace('/uploads/', ''));
        } catch (error) {
            console.error('Failed to delete local icon:', error);
        }
    }

    await specialty.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Specialty deleted successfully',
    });
}));

// @desc    Toggle specialty status
// @route   PATCH /api/admin/specialties/:id/toggle
// @access  Private (Admin)
router.patch('/:id/toggle', protect(ROLES.ADMIN), asyncHandler(async (req, res) => {
    const specialty = await Specialty.findById(req.params.id);

    if (!specialty) {
        return res.status(404).json({ success: false, message: 'Specialty not found' });
    }

    specialty.isActive = !specialty.isActive;
    await specialty.save();

    res.status(200).json({
        success: true,
        data: specialty,
    });
}));

module.exports = router;
