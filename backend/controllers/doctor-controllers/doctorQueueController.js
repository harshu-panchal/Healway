const asyncHandler = require("../../middleware/asyncHandler");
const Appointment = require("../../models/Appointment");
const Doctor = require("../../models/Doctor");
const WalletTransaction = require("../../models/WalletTransaction");
const { getIO } = require("../../config/socket");
const { calculateProviderEarning } = require("../../utils/commissionConfig");

// GET /api/doctors/queue
exports.getQueue = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { date } = req.query;

  const sessionDate = date ? new Date(date) : new Date();
  sessionDate.setHours(0, 0, 0, 0);
  const sessionEndDate = new Date(sessionDate);
  sessionEndDate.setHours(23, 59, 59, 999);

  // Get all appointments for the doctor on this date
  const appointments = await Appointment.find({
    doctorId: id,
    appointmentDate: { $gte: sessionDate, $lt: sessionEndDate },
    status: {
      $in: [
        "scheduled",
        "confirmed",
        "waiting",
        "cancelled",
        "completed",
        "no-show",
      ],
    },
  })
    .populate("patientId", "firstName lastName phone profileImage")
    .sort({ appointmentDate: 1 });

  return res.status(200).json({
    success: true,
    data: {
      queue: appointments,
    },
  });
});

// PATCH /api/doctors/queue/:appointmentId/status
exports.updateQueueStatus = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { appointmentId } = req.params;
  const { status } = req.body; // 'completed', 'cancelled'

  if (!["confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Only 'confirmed', 'completed' or 'cancelled' are allowed.",
    });
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  const previousStatus = appointment.status;
  appointment.status = status;

  if (status === "confirmed" && previousStatus !== "confirmed") {
    // If it's a CALL/VIDEO appointment and doesn't have a token, assign one now
    const { normalizeConsultationMode, requiresToken, getNextTokenNumber, getSessionSlots, calculateExpectedTime } = require("../patient-controllers/patientAppointmentController");

    const normalizedMode = normalizeConsultationMode(appointment.consultationMode);
    if (requiresToken(normalizedMode) && !appointment.tokenNumber) {
      const tokenNumber = await getNextTokenNumber(
        appointment.doctorId,
        appointment.appointmentDate,
        normalizedMode
      );

      if (tokenNumber) {
        appointment.tokenNumber = tokenNumber;
        const doctor = await Doctor.findById(id);
        const slots = getSessionSlots(doctor, appointment.appointmentDate, normalizedMode);

        if (slots.length > 0) {
          appointment.expectedTime = calculateExpectedTime(
            appointment.appointmentDate,
            slots,
            tokenNumber,
            appointment.averageConsultationTime || 20
          );
        }
      }
    }
  }

  if (status === "completed" && previousStatus !== "completed") {
    // 1. Handle Consultation
    const Consultation = require("../../models/Consultation");
    let consultation = await Consultation.findOne({
      appointmentId: appointment._id,
    });

    if (!consultation) {
      consultation = await Consultation.create({
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: id,
        consultationDate: new Date(),
        status: "completed",
      });
      appointment.consultationId = consultation._id;
    } else {
      consultation.status = "completed";
      await consultation.save();
    }

    const totalAmount = appointment.paidAmount || appointment.fee || 0;

    if (totalAmount > 0) {
      const { earning, commission } = await calculateProviderEarning(totalAmount, 'doctor');
      const doctor = await Doctor.findById(id);
      if (doctor) {
        doctor.walletBalance = (doctor.walletBalance || 0) + earning;
        await doctor.save();

        // Create Wallet Transaction for Doctor Earning
        await WalletTransaction.create({
          userId: id,
          userType: 'doctor',
          type: 'earning',
          amount: earning,
          balance: doctor.walletBalance,
          status: 'completed',
          description: `Earnings for completed appointment ${appointment._id} (after platform fees)`,
          appointmentId: appointment._id,
          referenceId: appointment._id.toString(),
          metadata: {
            totalAmount,
            commission
          }
        });

        // Create Wallet Transaction for Platform Commission (Admin view)
        await WalletTransaction.create({
          userId: id, // Track which doctor generated this commission
          userType: 'admin',
          type: 'commission',
          amount: commission,
          balance: 0, // Admin balance not tracked per transaction here
          status: 'completed',
          description: `Platform fee for appointment ${appointment._id}`,
          appointmentId: appointment._id,
          referenceId: appointment._id.toString(),
          metadata: {
            totalAmount,
            doctorId: id
          }
        });

        console.log(`💰 Credited ₹${earning} to Doctor ${id} wallet. Platform fee: ₹${commission}. Total: ₹${totalAmount}`);
      }
    }
  }

  await appointment.save();

  // Cache invalidation removed (Redis removed)

  // Emit real-time events
  try {
    const io = getIO();
    io.to(`doctor-${id}`).emit("queue:updated", {
      appointmentId: appointment._id,
      status,
    });
    io.to(`patient-${appointment.patientId}`).emit(
      "appointment:status:updated",
      {
        appointmentId: appointment._id,
        status,
      }
    );
  } catch (error) {
    console.error("Socket.IO error:", error);
  }

  return res.status(200).json({
    success: true,
    message: `Appointment marked as ${status}`,
    data: appointment,
  });
});
// PATCH /api/doctors/queue/:appointmentId/pay
exports.markAsPaid = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.auth;
  const { appointmentId } = req.params;

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctorId,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  if (appointment.paymentStatus === "paid") {
    return res.status(400).json({
      success: false,
      message: "Appointment is already marked as paid",
    });
  }

  const remaining = appointment.remainingAmount || (appointment.fee - (appointment.paidAmount || 0));

  if (remaining <= 0) {
    appointment.paymentStatus = "paid";
    appointment.remainingAmount = 0;
    await appointment.save();
    return res.status(200).json({
      success: true,
      message: "Appointment is already paid",
      data: appointment
    });
  }

  // Update appointment payment info
  appointment.paidAmount = (appointment.paidAmount || 0) + remaining;
  appointment.remainingAmount = 0;
  appointment.paymentStatus = "paid";
  appointment.paymentMethod = "cash"; // Manual payment by doctor usually means cash
  appointment.paidAt = new Date();

  await appointment.save();

  // Credit doctor's wallet for the cash payment received (recording the earning after commission)
  const doctor = await Doctor.findById(doctorId);
  if (doctor) {
    const { earning, commission } = await calculateProviderEarning(remaining, 'doctor');
    doctor.walletBalance = (doctor.walletBalance || 0) + earning;
    await doctor.save();

    // Create Wallet Transaction for Doctor Earning
    await WalletTransaction.create({
      userId: doctorId,
      userType: 'doctor',
      type: 'earning',
      amount: earning,
      balance: doctor.walletBalance,
      status: 'completed',
      description: `Cash payment received for appointment ${appointment._id} (after platform fees)`,
      appointmentId: appointment._id,
      referenceId: appointment._id.toString(),
      metadata: { 
        paymentMethod: 'cash',
        totalAmount: remaining,
        commission
      }
    });

    // Create Wallet Transaction for Platform Commission (Admin view)
    await WalletTransaction.create({
      userId: doctorId,
      userType: 'admin',
      type: 'commission',
      amount: commission,
      balance: 0,
      status: 'completed',
      description: `Platform fee for cash appointment ${appointment._id}`,
      appointmentId: appointment._id,
      referenceId: appointment._id.toString(),
      metadata: { 
        totalAmount: remaining,
        doctorId: doctorId,
        paymentMethod: 'cash'
      }
    });

    console.log(`💰 Cash payment: ₹${remaining}. Credited ₹${earning} to Doctor ${doctorId}. Platform fee: ₹${commission}`);
  }

  // Emit socket event to patient so their UI updates
  try {
    const io = getIO();
    io.to(`patient-${appointment.patientId}`).emit("appointment:payment:updated", {
      appointmentId: appointment._id,
      paymentStatus: "paid",
      paidAmount: appointment.paidAmount
    });
  } catch (error) {
    console.error("Socket.IO error:", error);
  }

  return res.status(200).json({
    success: true,
    message: "Appointment marked as paid successfully",
    data: appointment,
  });
});
