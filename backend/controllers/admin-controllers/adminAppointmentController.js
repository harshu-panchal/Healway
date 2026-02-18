const asyncHandler = require('../../middleware/asyncHandler');
const Appointment = require('../../models/Appointment');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/admin/appointments
exports.getAppointments = asyncHandler(async (req, res) => {
  const { doctor, date, status, search, startDate, endDate } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const mongoose = require('mongoose');
  const Doctor = require('../../models/Doctor');
  const Patient = require('../../models/Patient');

  const filter = {
    paymentStatus: { $ne: 'pending' }, // Exclude pending payment appointments
  };

  // Handle doctor filter - can be doctorId or doctor name
  if (doctor) {
    // Check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(doctor)) {
      filter.doctorId = doctor;
    } else {
      // Search for doctor by name
      const doctors = await Doctor.find({
        $or: [
          { firstName: new RegExp(doctor, 'i') },
          { lastName: new RegExp(doctor, 'i') },
          { specialization: new RegExp(doctor, 'i') },
        ],
      }).select('_id');
      const doctorIds = doctors.map(d => d._id);
      if (doctorIds.length > 0) {
        filter.doctorId = { $in: doctorIds };
      } else {
        // No doctors found, return empty result
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }
    }
  }

  if (status) filter.status = status;

  // Handle date range
  if (startDate || endDate) {
    filter.appointmentDate = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.appointmentDate.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.appointmentDate.$lte = end;
    }
  } else if (date) {
    // Single date filter
    const dateObj = new Date(date);
    filter.appointmentDate = {
      $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
      $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
    };
  }

  // If search is provided, we need to find matching doctors/patients first
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');

    // Find matching doctors
    const matchingDoctors = await Doctor.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { specialization: searchRegex },
      ],
    }).select('_id');
    const doctorIds = matchingDoctors.map(d => d._id);

    // Find matching patients
    const matchingPatients = await Patient.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
      ],
    }).select('_id');
    const patientIds = matchingPatients.map(p => p._id);

    // Add to filter
    if (doctorIds.length > 0 || patientIds.length > 0) {
      const searchFilter = { $or: [] };
      if (doctorIds.length > 0) {
        searchFilter.$or.push({ doctorId: { $in: doctorIds } });
      }
      if (patientIds.length > 0) {
        searchFilter.$or.push({ patientId: { $in: patientIds } });
      }
      if (searchFilter.$or.length > 0) {
        // Combine with existing filter using $and
        filter = { $and: [filter, searchFilter] };
      } else {
        // No matches found, return empty
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }
    } else {
      // No matches found, return empty
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('patientId', 'firstName lastName phone email')
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  const paginatedTotal = total;

  return res.status(200).json({
    success: true,
    data: {
      items: appointments,
      pagination: {
        page,
        limit,
        total: paginatedTotal,
        totalPages: Math.ceil(paginatedTotal / limit) || 1,
      },
    },
  });
});

// GET /api/admin/appointments/:id
exports.getAppointmentById = asyncHandler(async (req, res) => {
  const { id: appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId)
    .populate('patientId', 'firstName lastName email phone profileImage')
    .populate('doctorId', 'firstName lastName specialization profileImage')
    .populate('consultationId')
    .lean();

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: appointment,
  });
});

// PATCH /api/admin/appointments/:id
exports.updateAppointment = asyncHandler(async (req, res) => {
  const { id: appointmentId } = req.params;
  const updateData = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  Object.assign(appointment, updateData);
  await appointment.save();

  // Emit real-time event
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    // Use the saved appointment object, no need for redundant DB lookups
    const socketData = appointment.toObject();
    io.to(`patient-${appointment.patientId}`).emit('appointment:updated', {
      appointment: socketData,
    });
    io.to(`doctor-${appointment.doctorId}`).emit('appointment:updated', {
      appointment: socketData,
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  return res.status(200).json({
    success: true,
    message: 'Appointment updated successfully',
    data: appointment,
  });
});

// DELETE /api/admin/appointments/:id
exports.cancelAppointment = asyncHandler(async (req, res) => {
  const { id: appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date();
  await appointment.save();

  // Cache invalidation removed (Redis removed)

  // Emit real-time event
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    io.to(`patient-${appointment.patientId}`).emit('appointment:cancelled', {
      appointmentId: appointment._id,
    });
    io.to(`doctor-${appointment.doctorId}`).emit('appointment:cancelled', {
      appointmentId: appointment._id,
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  return res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
  });
});

