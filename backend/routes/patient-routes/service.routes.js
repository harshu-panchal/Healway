const express = require('express');
const router = express.Router();
const Service = require('../../models/Service');
const asyncHandler = require('../../middleware/asyncHandler');

// GET /api/services (Public route)
router.get('/', asyncHandler(async (req, res) => {
    const services = await Service.find({ isActive: true })
        .select('name description')
        .sort({ name: 1 });

    return res.status(200).json({
        success: true,
        data: services,
    });
}));

module.exports = router;
