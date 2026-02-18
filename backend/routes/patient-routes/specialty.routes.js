const express = require('express');
const router = express.Router();
const Specialty = require('../../models/Specialty');
const asyncHandler = require('../../middleware/asyncHandler');

// GET /api/specialties (Public route)
router.get('/', asyncHandler(async (req, res) => {
  const specialties = await Specialty.find({ isActive: true })
    .select('name description icon doctorCount')
    .sort({ name: 1 });

  return res.status(200).json({
    success: true,
    data: specialties,
  });
}));

module.exports = router;

