const express = require('express');
const router = express.Router();
const Service = require('../../models/Service');
const { protect } = require('../../middleware/authMiddleware');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Get all services
// @route   GET /api/admin/services
// @access  Private (Admin)
router.get('/', protect('admin'), asyncHandler(async (req, res) => {
    const services = await Service.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: services,
    });
}));

// @desc    Create a new service
// @route   POST /api/admin/services
// @access  Private (Admin)
router.post('/', protect('admin'), asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const service = await Service.create({
        name,
        description,
    });

    res.status(201).json({
        success: true,
        data: service,
    });
}));

// @desc    Update a service
// @route   PUT /api/admin/services/:id
// @access  Private (Admin)
router.put('/:id', protect('admin'), asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    let service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
    }

    service = await Service.findByIdAndUpdate(
        req.params.id,
        { name, description, isActive },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: service,
    });
}));

// @desc    Delete a service
// @route   DELETE /api/admin/services/:id
// @access  Private (Admin)
router.delete('/:id', protect('admin'), asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
    }

    await service.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Service deleted successfully',
    });
}));

// @desc    Toggle service status
// @route   PATCH /api/admin/services/:id/toggle
// @access  Private (Admin)
router.patch('/:id/toggle', protect('admin'), asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
    }

    service.isActive = !service.isActive;
    await service.save();

    res.status(200).json({
        success: true,
        data: service,
    });
}));

module.exports = router;
