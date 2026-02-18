const asyncHandler = require('../../middleware/asyncHandler');
const Doctor = require('../../models/Doctor');
const { APPROVAL_STATUS } = require('../../utils/constants');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/admin/verifications/pending
exports.getPendingVerifications = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const verifications = [];

  if (!type || type === 'doctor') {
    const doctors = await Doctor.find({ status: APPROVAL_STATUS.PENDING })
      .select('firstName lastName email phone specialization licenseNumber documents createdAt')
      .sort({ createdAt: -1 })
      .skip(type === 'doctor' ? skip : 0)
      .limit(type === 'doctor' ? limit : 10);

    doctors.forEach(doctor => {
      verifications.push({
        _id: doctor._id,
        type: 'doctor',
        name: `${doctor.firstName} ${doctor.lastName}`,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        documents: doctor.documents,
        createdAt: doctor.createdAt,
      });
    });
  }

  // Sort by creation date
  verifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({
    success: true,
    data: {
      items: verifications.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total: verifications.length,
        totalPages: Math.ceil(verifications.length / limit) || 1,
      },
    },
  });
});
