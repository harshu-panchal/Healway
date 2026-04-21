const express = require('express');
const router = express.Router();
const Specialty = require('../../models/Specialty');
const Doctor = require('../../models/Doctor');
const { APPROVAL_STATUS } = require('../../utils/constants');
const asyncHandler = require('../../middleware/asyncHandler');

// GET /api/specialties (Public route)
router.get('/', asyncHandler(async (req, res) => {
  const specialties = await Specialty.find({ isActive: true })
    .select('name description icon')
    .sort({ name: 1 })
    .lean();

  const specialtiesWithCounts = await Promise.all(specialties.map(async (specialty) => {
    const count = await Doctor.countDocuments({
      specialization: new RegExp(`^${specialty.name}$`, 'i'),
      status: APPROVAL_STATUS.APPROVED,
      isActive: true
    });
    return { ...specialty, doctorCount: count };
  }));

  return res.status(200).json({
    success: true,
    data: specialtiesWithCounts,
  });
}));

module.exports = router;

