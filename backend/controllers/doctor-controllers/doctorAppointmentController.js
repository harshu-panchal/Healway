const asyncHandler = require('../../middleware/asyncHandler');
const Appointment = require('../../models/Appointment');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const { getIO } = require('../../config/socket');
const {
  sendAppointmentCancellationEmail,
  createAppointmentNotification,
} = require('../../services/notificationService');

// PATCH /api/doctors/appointments/:id
exports.updateAppointment = asyncHandler(async (req, res) => {
  const { id: appointmentId } = req.params;
  const { id: doctorId } = req.auth;
  const updateData = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  // Verify appointment belongs to this doctor
  if (appointment.doctorId.toString() !== doctorId) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this appointment',
    });
  }

  // Check if appointment is being cancelled
  const isCancelling = updateData.status === 'cancelled' && appointment.status !== 'cancelled';
  const wasCompleted = appointment.status === 'completed';

  // Prevent cancelling already completed appointments
  if (isCancelling && wasCompleted) {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel a completed appointment',
    });
  }

  // Update appointment
  Object.assign(appointment, updateData);

  // If cancelling, set cancellation details
  if (isCancelling) {
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = updateData.cancelReason || updateData.cancellationReason || 'Cancelled by doctor';
    appointment.cancelledBy = 'doctor';

    // Refund patient's paid amount to their wallet
    const paidAmount = appointment.paidAmount || 0;
    if (paidAmount > 0) {
      const patient = await Patient.findById(appointment.patientId);
      if (patient) {
        // Credit the patient's wallet
        patient.walletBalance = (patient.walletBalance || 0) + paidAmount;
        await patient.save();

        // Create wallet transaction record for patient
        const WalletTransaction = require('../../models/WalletTransaction');
        await WalletTransaction.create({
          userId: appointment.patientId,
          userType: 'patient',
          type: 'refund',
          amount: paidAmount,
          balance: patient.walletBalance,
          status: 'completed',
          description: `Refund for appointment cancelled by doctor`,
          referenceId: appointment._id.toString(),
          appointmentId: appointment._id,
          metadata: {
            doctorId: doctorId,
            appointmentDate: appointment.appointmentDate,
            consultationMode: appointment.consultationMode,
            cancellationReason: appointment.cancellationReason,
          },
        });

        // Store refund info in appointment and reset payment status
        appointment.refundAmount = paidAmount;
        appointment.refundStatus = 'completed';
        appointment.refundedAt = new Date();
        appointment.paidAmount = 0;
        appointment.remainingAmount = appointment.fee; // Reset remaining to full fee since payment was refunded
        appointment.paymentStatus = 'refunded';

        console.log(`💰 Refunded ₹${paidAmount} to patient ${patient._id} wallet for cancelled appointment ${appointment._id}`);
      }
    }
  }

  await appointment.save();

  // Cache invalidation removed (Redis removed)

  // Handle cancellation notifications and events
  if (isCancelling) {
    // Get patient and doctor data
    const patient = await Patient.findById(appointment.patientId);
    const doctor = await Doctor.findById(doctorId);

    // Emit real-time event to patient
    try {
      const io = getIO();
      io.to(`patient-${appointment.patientId}`).emit('appointment:cancelled', {
        appointmentId: appointment._id,
        reason: appointment.cancellationReason,
        cancelledBy: 'doctor',
        refundAmount: appointment.refundAmount || 0,
        refundStatus: appointment.refundStatus || null,
        walletCredited: (appointment.refundAmount || 0) > 0,
      });
      io.to(`doctor-${doctorId}`).emit('appointment:cancelled', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      console.error('Socket.IO error:', error);
    }

    // Send email notification to patient
    try {
      const populatedAppointment = await Appointment.findById(appointment._id)
        .populate('patientId', 'firstName lastName email')
        .populate('doctorId', 'firstName lastName specialization');

      await sendAppointmentCancellationEmail({
        patient,
        doctor,
        appointment: populatedAppointment,
        cancelledBy: 'doctor',
        reason: appointment.cancellationReason,
      }).catch((error) => console.error('Error sending appointment cancellation email:', error));
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }

    // Create in-app notifications
    try {
      const populatedAppointment = await Appointment.findById(appointment._id)
        .populate('patientId', 'firstName lastName')
        .populate('doctorId', 'firstName lastName specialization profileImage');

      // Notify patient about cancellation
      await createAppointmentNotification({
        userId: appointment.patientId,
        userType: 'patient',
        appointment: populatedAppointment,
        eventType: 'cancelled',
        doctor,
      }).catch((error) => console.error('Error creating patient cancellation notification:', error));

      // Notify doctor (for their own records)
      await createAppointmentNotification({
        userId: doctorId,
        userType: 'doctor',
        appointment: populatedAppointment,
        eventType: 'cancelled',
        patient,
      }).catch((error) => console.error('Error creating doctor cancellation notification:', error));
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  } else {
    // For non-cancellation updates, emit regular update event
    try {
      const io = getIO();
      io.to(`patient-${appointment.patientId}`).emit('appointment:updated', {
        appointment: await Appointment.findById(appointment._id)
          .populate('patientId', 'firstName lastName phone')
          .populate('doctorId', 'firstName lastName specialization'),
      });
      io.to(`doctor-${appointment.doctorId}`).emit('appointment:updated', {
        appointment: await Appointment.findById(appointment._id)
          .populate('patientId', 'firstName lastName phone')
          .populate('doctorId', 'firstName lastName specialization'),
      });
    } catch (error) {
      console.error('Socket.IO error:', error);
    }
  }

  return res.status(200).json({
    success: true,
    message: isCancelling ? 'Appointment cancelled successfully. Patient has been notified.' : 'Appointment updated successfully',
    data: await Appointment.findById(appointment._id)
      .populate('patientId', 'firstName lastName phone profileImage')
      .populate('doctorId', 'firstName lastName specialization'),
  });
});

