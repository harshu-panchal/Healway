const asyncHandler = require('../../middleware/asyncHandler');
const Appointment = require('../../models/Appointment');
const Doctor = require('../../models/Doctor');
const Prescription = require('../../models/Prescription');
const Transaction = require('../../models/Transaction');

// GET /api/patients/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalAppointments,
    upcomingAppointments,
    totalPrescriptions,
    activePrescriptions,
    totalTransactions,
    todayAppointments,
    recommendedDoctors,
  ] = await Promise.all([
    Appointment.countDocuments({ patientId: id }),
    Appointment.find({
      patientId: id,
      appointmentDate: { $gte: today },
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
    })
      .populate('doctorId', 'firstName lastName specialization profileImage consultationFee original_fees discount_amount clinicDetails')
      .sort({ appointmentDate: 1 })
      .limit(5)
      .lean(),
    Prescription.countDocuments({ patientId: id }),
    Prescription.countDocuments({ patientId: id, status: 'active' }),
    Transaction.countDocuments({ userId: id, userType: 'patient' }),
    Appointment.countDocuments({
      patientId: id,
      appointmentDate: { $gte: today, $lt: tomorrow },
    }),
    Doctor.find({ status: 'approved', isActive: true })
      .select('firstName lastName specialization services profileImage consultationFee original_fees discount_amount fees clinicDetails experienceYears consultationModes sortOrder accessMode')
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const formatFullAddress = (clinicDetails) => {
    if (!clinicDetails?.address) return null;
    const addr = clinicDetails.address;
    const parts = [];
    if (addr.line1) parts.push(addr.line1);
    if (addr.line2) parts.push(addr.line2);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.pincode || addr.postalCode) parts.push(addr.pincode || addr.postalCode);
    return parts.join(', ').trim();
  };

  const transformedUpcomingAppointments = upcomingAppointments.map(apt => ({
    _id: apt._id,
    id: apt._id,
    doctorId: apt.doctorId?._id || apt.doctorId,
    doctorName: apt.doctorId?.firstName && apt.doctorId?.lastName
      ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`
      : apt.doctorId?.name || 'Doctor',
    doctorSpecialty: apt.doctorId?.specialization || apt.doctorId?.specialty || 'General',
    doctorImage: apt.doctorId?.profileImage || null,
    appointmentDate: apt.appointmentDate,
    appointmentTime: apt.time || apt.appointmentTime,
    status: apt.status,
    consultationFee: apt.doctorId?.consultationFee || 0,
    original_fees: apt.doctorId?.original_fees || 0,
    discount_amount: apt.doctorId?.discount_amount || 0,
    type: apt.appointmentType || apt.type || 'in_person',
    clinic: apt.doctorId?.clinicDetails?.name || null,
    location: formatFullAddress(apt.doctorId?.clinicDetails) || null,
    tokenNumber: apt.tokenNumber || null,
    fee: apt.fee || apt.doctorId?.consultationFee || 0,
  }));

  const transformedDoctors = recommendedDoctors.map((doctor) => ({
    ...doctor,
    id: doctor._id,
    doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
  }));

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalAppointments,
        totalPrescriptions,
        activePrescriptions,
        totalTransactions,
        todayAppointments,
      },
      upcomingAppointments: transformedUpcomingAppointments,
      recommendedDoctors: transformedDoctors
    }
  });
});

