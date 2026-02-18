const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');
const {
  sendEmail,
  sendRoleApprovalEmail,
  sendSignupAcknowledgementEmail,
  sendPasswordResetOtpEmail,
  sendAppointmentReminderEmail,
  sendPrescriptionEmail,
} = require('./emailService');
const AdminSettings = require('../models/AdminSettings');
const { sendNotificationToUser } = require('../utils/pushNotificationHelper');

/**
 * Send email notification for any notification
 */
const sendNotificationEmail = async ({ userId, userType, title, message, user = null }) => {
  if (!(await isEmailNotificationsEnabled())) return null;

  try {
    let userEmail = null;
    let userName = 'User';

    // If user object is provided, use it
    if (user && user.email) {
      userEmail = user.email;
      userName = user.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : 'User';
    } else {
      // Otherwise, fetch user based on userType
      let UserModel;
      switch (userType) {
        case 'patient':
          UserModel = require('../models/Patient');
          break;
        case 'doctor':
          UserModel = require('../models/Doctor');
          break;
        case 'admin':
          UserModel = require('../models/Admin');
          break;
        default:
          return null;
      }

      const userData = await UserModel.findById(userId).select('email firstName lastName');
      if (!userData || !userData.email) return null;

      userEmail = userData.email;
      userName = userData.firstName
        ? `${userData.firstName} ${userData.lastName || ''}`.trim()
        : 'User';
    }

    if (!userEmail) return null;

    // Send email with notification content
    return sendEmail({
      to: userEmail,
      subject: `${title} | Healway`,
      text: `Hello ${userName},\n\n${message}\n\nThank you,\nTeam Healway`,
      html: `<p>Hello ${userName},</p><p>${message}</p><p>Thank you,<br/>Team Healway</p>`,
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
    return null;
  }
};

/**
 * Create and send notification
 */
const createNotification = async ({
  userId,
  userType,
  type,
  title,
  message,
  data = {},
  priority = 'medium',
  actionUrl = null,
  icon = null,
  emitSocket = true,
  sendEmail = true,
  user = null,
}) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      userId,
      userType,
      type,
      title,
      message,
      data,
      priority,
      actionUrl,
      icon,
    });

    // Send email notification if enabled
    if (sendEmail) {
      sendNotificationEmail({ userId, userType, title, message, user })
        .catch((error) => console.error('Error sending notification email:', error));
    }

    // Emit Socket.IO event if enabled
    if (emitSocket) {
      try {
        const io = getIO();
        io.to(`${userType}-${userId}`).emit('notification:new', {
          notification: notification.toObject(),
        });
      } catch (error) {
        console.error('Socket.IO error in createNotification:', error);
      }
    }

    // Send FCM push notification (fire-and-forget, non-blocking)
    sendNotificationToUser(userId, userType, {
      title,
      body: message,
      data: {
        type,
        notificationId: notification._id.toString(),
        ...(actionUrl && { link: actionUrl }),
        ...Object.fromEntries(
          Object.entries(data || {}).map(([k, v]) => [k, String(v)])
        ),
      },
      icon,
    }).catch((err) => console.error('Push notification error (non-critical):', err));

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Helper function to format appointment date
 */
const formatAppointmentDate = (date) => {
  if (!date) return 'N/A';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Helper function to extract appointment date from appointment object
 */
const getAppointmentDate = (appointment) => {
  if (appointment.appointmentDate) {
    return appointment.appointmentDate;
  }
  if (appointment.sessionId && appointment.sessionId.date) {
    return appointment.sessionId.date;
  }
  return null;
};

/**
 * Create notification for appointment events
 */
const createAppointmentNotification = async ({ userId, userType, appointment, eventType, doctor, patient, sendEmail = true }) => {
  let title, message, actionUrl;

  switch (eventType) {
    case 'created':
      if (userType === 'doctor') {
        const appointmentDate = getAppointmentDate(appointment);
        const formattedDate = formatAppointmentDate(appointmentDate);

        title = 'New Appointment Booking';
        if (patient) {
          const patientName = `${patient.firstName} ${patient.lastName || ''}`.trim();
          message = `New appointment booked by ${patientName} for ${formattedDate}${appointment.tokenNumber ? ` (Token: ${appointment.tokenNumber})` : ''}`;
        } else {
          message = `New appointment booked for ${formattedDate}`;
        }
        actionUrl = '/doctor/patients';
      } else {
        title = 'New Appointment';
        message = patient
          ? `Appointment booked with ${patient.firstName} ${patient.lastName || ''}`
          : 'New appointment has been booked';
        actionUrl = '/patient/appointments';
      }
      break;
    case 'cancelled':
      if (userType === 'doctor') {
        return null;
      }
      title = 'Appointment Cancelled';
      message = doctor
        ? `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName || ''} has been cancelled`
        : 'Appointment has been cancelled';
      actionUrl = '/patient/appointments';
      break;
    case 'rescheduled':
      if (userType === 'doctor') {
        const appointmentDate = getAppointmentDate(appointment);
        const formattedNewDate = formatAppointmentDate(appointmentDate);

        title = 'Appointment Rescheduled';
        if (patient) {
          const patientName = `${patient.firstName} ${patient.lastName || ''}`.trim();

          let formattedOldDate = null;
          if (appointment.rescheduleReason) {
            const reasonMatch = appointment.rescheduleReason.match(/Rescheduled from (.+?) to/);
            if (reasonMatch && reasonMatch[1]) {
              try {
                const oldDateStr = reasonMatch[1].trim();
                const oldDateObj = new Date(oldDateStr);
                if (!isNaN(oldDateObj.getTime())) {
                  formattedOldDate = formatAppointmentDate(oldDateObj);
                }
              } catch (error) {
                console.error('Error parsing old date from rescheduleReason:', error);
              }
            }
          }

          if (formattedOldDate) {
            message = `Appointment rescheduled by ${patientName} from ${formattedOldDate} to ${formattedNewDate}`;
          } else {
            message = `Appointment rescheduled by ${patientName} for ${formattedNewDate}`;
          }
        } else {
          message = `Appointment rescheduled for ${formattedNewDate}`;
        }
        actionUrl = '/doctor/patients';
      } else {
        title = 'Appointment Rescheduled';
        message = doctor
          ? `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName || ''} has been rescheduled`
          : 'Appointment has been rescheduled';
        actionUrl = '/patient/appointments';
      }
      break;
    case 'payment_confirmed':
      if (userType === 'doctor') {
        return null;
      }
      title = 'Payment Confirmed';
      message = `Payment of ₹${appointment.fee || 0} confirmed for your appointment`;
      actionUrl = '/patient/appointments';
      break;
    case 'token_called':
      if (userType === 'doctor') {
        return null;
      }
      title = 'Your Turn';
      message = `Token ${appointment.tokenNumber} has been called. Please proceed to consultation room.`;
      actionUrl = '/patient/appointments';
      break;
    case 'token_recalled':
      if (userType === 'doctor') {
        return null;
      }
      title = 'Token Recalled';
      message = `Your token ${appointment.tokenNumber} has been recalled. Please wait for your turn.`;
      actionUrl = '/patient/appointments';
      break;
    case 'completed':
      if (userType === 'doctor') {
        return null;
      }
      title = 'Consultation Completed';
      message = doctor
        ? `Your consultation with Dr. ${doctor.firstName} ${doctor.lastName || ''} has been completed`
        : 'Consultation has been completed';
      actionUrl = '/patient/appointments';
      break;
    default:
      if (userType === 'doctor') {
        return null;
      }
      title = 'Appointment Update';
      message = 'Your appointment has been updated';
      actionUrl = '/patient/appointments';
  }

  let user = null;
  if (sendEmail) {
    if (userType === 'patient') {
      if (patient) {
        user = patient;
      } else {
        try {
          const Patient = require('../models/Patient');
          user = await Patient.findById(userId).select('email firstName lastName');
        } catch (error) {
          console.error('Error fetching patient for email:', error);
        }
      }
    } else if (userType === 'doctor') {
      if (doctor) {
        user = doctor;
      } else {
        try {
          const Doctor = require('../models/Doctor');
          user = await Doctor.findById(userId).select('email firstName lastName');
        } catch (error) {
          console.error('Error fetching doctor for email:', error);
        }
      }
    }
  }

  const appointmentDate = getAppointmentDate(appointment);
  const notificationData = {
    appointmentId: appointment._id || appointment.id,
    eventType,
    tokenNumber: appointment.tokenNumber,
  };

  if (userType === 'doctor' && (eventType === 'created' || eventType === 'rescheduled')) {
    notificationData.appointmentDate = appointmentDate;
    notificationData.formattedDate = formatAppointmentDate(appointmentDate);
    if (eventType === 'rescheduled' && appointment.rescheduleReason) {
      notificationData.rescheduleReason = appointment.rescheduleReason;
      const reasonMatch = appointment.rescheduleReason.match(/Rescheduled from (.+?) to/);
      if (reasonMatch && reasonMatch[1]) {
        try {
          const oldDateObj = new Date(reasonMatch[1].trim());
          if (!isNaN(oldDateObj.getTime())) {
            notificationData.oldAppointmentDate = oldDateObj;
            notificationData.formattedOldDate = formatAppointmentDate(oldDateObj);
          }
        } catch (error) {
          // Ignore
        }
      }
    }
  }

  return createNotification({
    userId,
    userType,
    type: 'appointment',
    title,
    message,
    data: notificationData,
    priority: eventType === 'token_called' ? 'urgent' : 'medium',
    actionUrl,
    icon: 'appointment',
    sendEmail,
    user,
  });
};

/**
 * Create notification for prescription events
 */
const createPrescriptionNotification = async ({ userId, userType, prescription, doctor, patient }) => {
  const title = 'New Prescription';
  const doctorName = doctor
    ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`.trim()
    : 'Doctor';
  const message = userType === 'patient'
    ? `Prescription received from ${doctorName}`
    : `Prescription created for ${patient.firstName} ${patient.lastName || ''}`;

  let user = null;
  if (userType === 'patient' && patient) {
    user = patient;
  }

  return createNotification({
    userId,
    userType,
    type: 'prescription',
    title,
    message,
    data: {
      prescriptionId: prescription._id || prescription.id,
      consultationId: prescription.consultationId,
      doctorName,
    },
    priority: 'high',
    actionUrl: userType === 'patient' ? '/patient/prescriptions' : '/doctor/consultations',
    icon: 'prescription',
    sendEmail: userType === 'patient',
    user,
  });
};

/**
 * Create notification for wallet events
 */
const createWalletNotification = async ({ userId, userType, amount, eventType, withdrawal = null, sendEmail = false }) => {
  let title, message, priority, actionUrl;

  switch (eventType) {
    case 'credited':
      title = 'Wallet Credited';
      message = `₹${amount} has been credited to your wallet`;
      priority = 'high';
      actionUrl = '/doctor/wallet';
      break;
    case 'payment_received':
      title = 'Payment Received';
      message = `₹${amount} has been credited to your wallet from patient payment`;
      priority = 'high';
      actionUrl = '/doctor/wallet';
      break;
    case 'withdrawal_requested':
      title = 'Withdrawal Requested';
      message = `Withdrawal request of ₹${amount} has been submitted`;
      priority = 'medium';
      actionUrl = '/doctor/wallet';
      break;
    case 'withdrawal_approved':
      title = 'Withdrawal Approved';
      const adminNameApproved = withdrawal?.adminName || 'Admin';
      const withdrawalIdApproved = withdrawal?._id || withdrawal?.id || 'N/A';
      let approvedMessage = `Your withdrawal request of ₹${amount} has been approved by ${adminNameApproved}`;
      if (withdrawal?.adminNote) {
        approvedMessage += `. Admin Note: ${withdrawal.adminNote}`;
      }
      approvedMessage += `. Withdrawal ID: ${withdrawalIdApproved}`;
      message = approvedMessage;
      priority = 'high';
      actionUrl = '/doctor/wallet';
      break;
    case 'withdrawal_paid':
      title = 'Payment Processed';
      const adminNamePaid = withdrawal?.adminName || 'Admin';
      const withdrawalIdPaid = withdrawal?._id || withdrawal?.id || 'N/A';
      const payoutMethod = withdrawal?.payoutMethod?.type || withdrawal?.payoutMethod || 'N/A';
      let paidMessage = `Your withdrawal request of ₹${amount} has been processed and payment has been sent by ${adminNamePaid}`;
      if (withdrawal?.payoutReference) {
        paidMessage += `. Payout Reference: ${withdrawal.payoutReference}`;
      }
      paidMessage += `. Payment Method: ${payoutMethod}`;
      paidMessage += `. Withdrawal ID: ${withdrawalIdPaid}`;
      message = paidMessage;
      priority = 'high';
      actionUrl = '/doctor/wallet';
      break;
    case 'withdrawal_rejected':
      title = 'Withdrawal Rejected';
      const adminNameRejected = withdrawal?.adminName || 'admin';
      message = `Your withdrawal request of ₹${amount} has been rejected by ${adminNameRejected}${withdrawal?.rejectionReason ? `. Reason: ${withdrawal.rejectionReason}` : ''}`;
      priority = 'high';
      actionUrl = '/doctor/wallet';
      break;
    default:
      title = 'Wallet Update';
      message = 'Your wallet has been updated';
      priority = 'medium';
      actionUrl = '/doctor/wallet';
  }

  const walletNotificationData = {
    amount,
    eventType,
    withdrawalId: withdrawal?._id || withdrawal?.id,
  };

  if (withdrawal) {
    if (withdrawal.payoutReference) walletNotificationData.payoutReference = withdrawal.payoutReference;
    if (withdrawal.rejectionReason) walletNotificationData.rejectionReason = withdrawal.rejectionReason;
    if (withdrawal.adminName) walletNotificationData.adminName = withdrawal.adminName;
    if (withdrawal.adminNote) walletNotificationData.adminNote = withdrawal.adminNote;
    if (withdrawal.payoutMethod) walletNotificationData.payoutMethod = withdrawal.payoutMethod;
    if (eventType === 'withdrawal_paid' && withdrawal.processedAt) walletNotificationData.processedAt = withdrawal.processedAt;
  }

  return createNotification({
    userId,
    userType,
    type: 'wallet',
    title,
    message,
    data: walletNotificationData,
    priority,
    actionUrl,
    icon: 'wallet',
    sendEmail,
  });
};

/**
 * Create notification for admin events
 */
const createAdminNotification = async ({ userId, userType, eventType, data, actionUrl: customActionUrl }) => {
  let title, message, actionUrl, priority = 'medium';

  switch (eventType) {
    case 'payment_received':
      title = 'Payment Received';
      message = `Payment of ₹${data.amount || 0} received from patient`;
      actionUrl = customActionUrl || '/admin/wallet';
      priority = 'high';
      break;
    case 'withdrawal_requested':
      const providerName = data.providerName || 'Provider';
      const providerTypeLabel = 'Doctor';
      const payoutMethodType = data.payoutMethod?.type || data.payoutMethod || 'N/A';
      title = 'Withdrawal Request';
      message = `New withdrawal request of ₹${data.amount || 0} from ${providerTypeLabel} ${providerName} via ${payoutMethodType}`;
      actionUrl = customActionUrl || '/admin/wallet';
      priority = 'high';
      break;
    default:
      title = 'System Update';
      message = 'System update received';
      actionUrl = customActionUrl || '/admin/dashboard';
  }

  return createNotification({
    userId,
    userType,
    type: eventType === 'payment_received' || eventType === 'withdrawal_requested' ? 'wallet' : 'system',
    title,
    message,
    data,
    priority,
    actionUrl,
    icon: 'system',
  });
};

/**
 * Create notification for session/queue events
 */
const createSessionNotification = async ({ userId, userType, session, eventType }) => {
  let title, message, actionUrl;

  switch (eventType) {
    case 'started':
      title = 'Session Started';
      message = 'Your session has started';
      actionUrl = '/doctor/patients';
      break;
    case 'paused':
      title = 'Session Paused';
      message = 'Your session has been paused';
      actionUrl = '/doctor/patients';
      break;
    case 'resumed':
      title = 'Session Resumed';
      message = 'Your session has been resumed';
      actionUrl = '/doctor/patients';
      break;
    case 'cancelled':
      title = 'Session Cancelled';
      message = 'Your session has been cancelled';
      actionUrl = '/doctor/patients';
      break;
    case 'queue_updated':
      title = 'Queue Updated';
      message = 'Patient queue has been updated';
      actionUrl = '/doctor/patients';
      break;
    default:
      title = 'Session Update';
      message = 'Your session has been updated';
      actionUrl = '/doctor/patients';
  }

  return createNotification({
    userId,
    userType,
    type: 'session',
    title,
    message,
    data: {
      sessionId: session._id || session.id,
      eventType,
    },
    priority: 'medium',
    actionUrl,
    icon: 'session',
  });
};

/**
 * Check if email notifications are enabled globally
 */
const isEmailNotificationsEnabled = async () => {
  try {
    const settings = await AdminSettings.findOne();
    return settings?.emailNotifications !== false;
  } catch (error) {
    console.error('Error checking email notification settings:', error);
    return true;
  }
};

/**
 * Send appointment confirmation email to patient
 */
const sendAppointmentConfirmationEmail = async ({ patient, doctor, appointment }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!patient?.email) return null;

  const appointmentDate = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '';
  const appointmentTime = appointment.time || '';

  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`.trim()
    : 'Patient';
  const doctorName = doctor.firstName
    ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`.trim()
    : 'Doctor';

  return sendEmail({
    to: patient.email,
    subject: `Appointment Confirmed - ${doctorName} | Healway`,
    text: `Hello ${patientName},\n\nYour appointment has been confirmed:\n\nDoctor: ${doctorName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nToken Number: ${appointment.tokenNumber || 'N/A'}\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${patientName},</p><p>Your appointment has been confirmed:</p><ul><li><strong>Doctor:</strong> ${doctorName}</li><li><strong>Date:</strong> ${appointmentDate}</li><li><strong>Time:</strong> ${appointmentTime}</li><li><strong>Token Number:</strong> ${appointment.tokenNumber || 'N/A'}</li></ul><p>Thank you,<br/>Team Healway</p>`,
  });
};

/**
 * Send appointment notification to doctor
 */
const sendDoctorAppointmentNotification = async ({ doctor, patient, appointment, eventType = 'created' }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!doctor?.email) return null;

  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`.trim()
    : 'Patient';

  const appointmentDate = appointment.appointmentDate || appointment.sessionId?.date;
  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '';

  if (eventType === 'rescheduled' && appointment.rescheduleReason) {
    let oldDateText = '';
    const reasonMatch = appointment.rescheduleReason.match(/Rescheduled from (.+?) to/);
    if (reasonMatch && reasonMatch[1]) {
      try {
        const oldDateObj = new Date(reasonMatch[1].trim());
        if (!isNaN(oldDateObj.getTime())) {
          oldDateText = oldDateObj.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      } catch (error) {
        // Ignore
      }
    }

    if (oldDateText) {
      return sendEmail({
        to: doctor.email,
        subject: `Appointment Rescheduled - ${patientName} | Healway`,
        text: `Hello Dr. ${doctor.firstName || 'Doctor'},\n\nAn appointment has been rescheduled:\n\nPatient: ${patientName}\nPrevious Date: ${oldDateText}\nNew Date: ${formattedDate}\nToken Number: ${appointment.tokenNumber || 'N/A'}\n\nThank you,\nTeam Healway`,
        html: `<p>Hello Dr. ${doctor.firstName || 'Doctor'},</p><p>An appointment has been rescheduled:</p><ul><li><strong>Patient:</strong> ${patientName}</li><li><strong>Previous Date:</strong> ${oldDateText}</li><li><strong>New Date:</strong> ${formattedDate}</li><li><strong>Token Number:</strong> ${appointment.tokenNumber || 'N/A'}</li></ul><p>Thank you,<br/>Team Healway</p>`,
      });
    }
  }

  return sendEmail({
    to: doctor.email,
    subject: `New Appointment - ${patientName} | Healway`,
    text: `Hello Dr. ${doctor.firstName || 'Doctor'},\n\nYou have a new appointment:\n\nPatient: ${patientName}\nDate: ${formattedDate}\nToken Number: ${appointment.tokenNumber || 'N/A'}\n\nThank you,\nTeam Healway`,
    html: `<p>Hello Dr. ${doctor.firstName || 'Doctor'},</p><p>You have a new appointment:</p><ul><li><strong>Patient:</strong> ${patientName}</li><li><strong>Date:</strong> ${formattedDate}</li><li><strong>Token Number:</strong> ${appointment.tokenNumber || 'N/A'}</li></ul><p>Thank you,<br/>Team Healway</p>`,
  });
};

/**
 * Send appointment cancellation email
 */
const sendAppointmentCancellationEmail = async ({ patient, doctor, appointment }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!patient?.email) return null;

  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`.trim()
    : 'Patient';
  const doctorName = doctor.firstName
    ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`.trim()
    : 'Doctor';

  const reason = appointment.cancellationReason || 'Session cancelled by doctor';
  const rescheduleMessage = 'You can reschedule your appointment from the app.';

  return sendEmail({
    to: patient.email,
    subject: `Appointment Cancelled - ${doctorName} | Healway`,
    text: `Hello ${patientName},\n\nYour appointment with ${doctorName} has been cancelled.\n\nReason: ${reason}\n\n${rescheduleMessage}\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${patientName},</p><p>Your appointment with <strong>${doctorName}</strong> has been cancelled.</p><p><strong>Reason:</strong> ${reason}</p><p>${rescheduleMessage}</p><p>Thank you,<br/>Team Healway</p>`,
  });
};

/**
 * Send payment confirmation email
 */
const sendPaymentConfirmationEmail = async ({ patient, amount, appointmentId, transaction }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!patient?.email) return null;

  let paymentAmount = amount;
  let referenceId = appointmentId || 'N/A';

  if (transaction) {
    if (!paymentAmount && transaction.amount) paymentAmount = transaction.amount;
    if (transaction.referenceId) referenceId = transaction.referenceId;
    else if (transaction._id) referenceId = transaction._id.toString();
  }

  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`.trim()
    : 'Patient';

  return sendEmail({
    to: patient.email,
    subject: `Payment Confirmed - ₹${paymentAmount} | Healway`,
    text: `Hello ${patientName},\n\nYour payment of ₹${paymentAmount} has been confirmed.\n\nReference ID: ${referenceId}\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${patientName},</p><p>Your payment of <strong>₹${paymentAmount}</strong> has been confirmed.</p><p><strong>Reference ID:</strong> ${referenceId}</p><p>Thank you,<br/>Team Healway</p>`,
  });
};

/**
 * Send support ticket notification email to user
 */
const sendSupportTicketNotification = async ({ user, ticket, userType, isResponse = false }) => {
  if (!(await isEmailNotificationsEnabled())) return null;

  let userEmail = '';
  let userName = '';

  if (userType === 'patient') {
    userEmail = user?.email || '';
    userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient';
  } else if (userType === 'doctor') {
    userEmail = user?.email || '';
    userName = user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}`.trim() : 'Doctor';
  }

  if (!userEmail) return null;

  const ticketSubject = ticket.subject || 'Support Request';
  const adminNote = ticket.adminNote || '';
  const latestResponse = ticket.responses && ticket.responses.length > 0
    ? ticket.responses[ticket.responses.length - 1]
    : null;

  if (isResponse && latestResponse) {
    const responseText = adminNote
      ? `Admin Response:\n${latestResponse.message}\n\nAdmin Note:\n${adminNote}`
      : `Admin Response:\n${latestResponse.message}`;
    const responseHtml = adminNote
      ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;"><p><strong>Admin Response:</strong></p><p>${latestResponse.message}</p></div><div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0;"><p><strong>Admin Note:</strong></p><p>${adminNote}</p></div>`
      : `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;"><p><strong>Admin Response:</strong></p><p>${latestResponse.message}</p></div>`;

    return sendEmail({
      to: userEmail,
      subject: `Response to Your Support Ticket - ${ticketSubject} | Healway`,
      text: `Hello ${userName},\n\nAdmin has responded to your support ticket:\n\nSubject: ${ticketSubject}\n\n${responseText}\n\nYou can view the full conversation in the app.\n\nThank you,\nTeam Healway`,
      html: `<p>Hello ${userName},</p><p>Admin has responded to your support ticket:</p><p><strong>Subject:</strong> ${ticketSubject}</p>${responseHtml}<p>You can view the full conversation in the app.</p><p>Thank you,<br/>Team Healway</p>`,
    });
  } else {
    const statusLabel = ticket.status === 'resolved' ? 'Resolved'
      : ticket.status === 'closed' ? 'Closed'
        : ticket.status === 'in_progress' ? 'In Progress'
          : 'Open';

    const noteText = adminNote ? `\n\nAdmin Note:\n${adminNote}` : '';
    const noteHtml = adminNote
      ? `<div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0;"><p><strong>Admin Note:</strong></p><p>${adminNote}</p></div>`
      : '';

    if (adminNote) {
      return sendEmail({
        to: userEmail,
        subject: `Support Ticket ${statusLabel} - ${ticketSubject} | Healway`,
        text: `Hello ${userName},\n\nYour support ticket status has been updated:\n\nSubject: ${ticketSubject}\nStatus: ${statusLabel}${noteText}\n\nTicket ID: ${ticket._id || ticket.id}\n\nThank you,\nTeam Healway`,
        html: `<p>Hello ${userName},</p><p>Your support ticket status has been updated:</p><ul><li><strong>Subject:</strong> ${ticketSubject}</li><li><strong>Status:</strong> ${statusLabel}</li><li><strong>Ticket ID:</strong> ${ticket._id || ticket.id}</li></ul>${noteHtml}<p>Thank you,<br/>Team Healway</p>`,
      });
    } else {
      return sendEmail({
        to: userEmail,
        subject: `Support Ticket Created - ${ticketSubject} | Healway`,
        text: `Hello ${userName},\n\nYour support ticket has been created successfully:\n\nSubject: ${ticketSubject}\nMessage: ${ticket.message || ''}\n\nTicket ID: ${ticket._id || ticket.id}\nStatus: ${ticket.status || 'Open'}\n\nWe'll get back to you soon.\n\nThank you,\nTeam Healway`,
        html: `<p>Hello ${userName},</p><p>Your support ticket has been created successfully:</p><ul><li><strong>Subject:</strong> ${ticketSubject}</li><li><strong>Message:</strong> ${ticket.message || ''}</li><li><strong>Ticket ID:</strong> ${ticket._id || ticket.id}</li><li><strong>Status:</strong> ${ticket.status || 'Open'}</li></ul><p>We'll get back to you soon.</p><p>Thank you,<br/>Team Healway</p>`,
      });
    }
  }
};

/**
 * Send withdrawal request confirmation email to provider
 */
const sendWithdrawalRequestNotification = async ({ provider, withdrawal, providerType }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!provider?.email) return null;

  let providerName = provider.firstName ? `Dr. ${provider.firstName} ${provider.lastName || ''}`.trim() : 'Doctor';

  const withdrawalAmount = withdrawal.amount || 0;
  const withdrawalId = withdrawal._id || withdrawal.id;
  const payoutMethodType = withdrawal.payoutMethod?.type || 'N/A';

  return sendEmail({
    to: provider.email,
    subject: `Withdrawal Request Submitted - ₹${withdrawalAmount} | Healway`,
    text: `Hello ${providerName},\n\nYour withdrawal request has been submitted successfully.\n\nWithdrawal Details:\n- Amount: ₹${withdrawalAmount}\n- Withdrawal ID: ${withdrawalId}\n- Payment Method: ${payoutMethodType}\n- Status: Pending\n\nYour request is under review. You will be notified once it's processed.\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${providerName},</p><p>Your withdrawal request has been submitted successfully.</p><ul><li><strong>Amount:</strong> ₹${withdrawalAmount}</li><li><strong>Withdrawal ID:</strong> ${withdrawalId}</li><li><strong>Payment Method:</strong> ${payoutMethodType}</li><li><strong>Status:</strong> Pending</li></ul><p>Your request is under review. You will be notified once it's processed.</p><p>Thank you,<br/>Team Healway</p>`,
  });
};

/**
 * Send withdrawal status update email to provider
 */
const sendWithdrawalStatusUpdateEmail = async ({ provider, withdrawal, providerType }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!provider?.email) return null;

  let providerName = provider.firstName ? `Dr. ${provider.firstName} ${provider.lastName || ''}`.trim() : 'Doctor';

  const withdrawalAmount = withdrawal.amount || 0;
  const withdrawalStatus = withdrawal.status || 'pending';
  const payoutReference = withdrawal.payoutReference || '';
  const rejectionReason = withdrawal.rejectionReason || '';
  const payoutMethod = withdrawal.payoutMethod || {};
  const payoutMethodType = payoutMethod.type || payoutMethod || 'N/A';
  const payoutMethodDetails = payoutMethod.details || {};

  let subject = '';
  let message = '';
  let htmlMessage = '';

  const adminName = withdrawal?.adminName || 'Admin';
  const adminNote = withdrawal?.adminNote || '';
  const withdrawalId = withdrawal._id || withdrawal.id || 'N/A';

  switch (withdrawalStatus) {
    case 'approved':
      subject = `Withdrawal Request Approved - ₹${withdrawalAmount} | Healway`;
      message = `Hello ${providerName},\n\nYour withdrawal request has been approved by ${adminName}.\n\nWithdrawal Details:\n- Amount: ₹${withdrawalAmount}\n- Withdrawal ID: ${withdrawalId}\n- Status: Approved${adminNote ? `\n- Admin Note: ${adminNote}` : ''}\n\nPayment will be processed shortly.\n\nThank you,\nTeam Healway`;
      htmlMessage = `<p>Hello ${providerName},</p><p>Your withdrawal request has been approved by <strong>${adminName}</strong>.</p><ul><li><strong>Amount:</strong> ₹${withdrawalAmount}</li><li><strong>Withdrawal ID:</strong> ${withdrawalId}</li><li><strong>Status:</strong> Approved</li>${adminNote ? `<li><strong>Admin Note:</strong> ${adminNote}</li>` : ''}</ul><p>Payment will be processed shortly.</p><p>Thank you,<br/>Team Healway</p>`;
      break;
    case 'paid':
      subject = `Withdrawal Payment Processed - ₹${withdrawalAmount} | Healway`;
      message = `Hello ${providerName},\n\nYour withdrawal request has been processed and payment has been sent by ${adminName}.\n\nPayment Details:\n- Amount: ₹${withdrawalAmount}\n- Withdrawal ID: ${withdrawalId}${payoutReference ? `\n- Payout Reference: ${payoutReference}` : ''}\n- Payment Method: ${payoutMethodType}\n- Status: Paid\n\nThank you,\nTeam Healway`;
      htmlMessage = `<p>Hello ${providerName},</p><p>Your withdrawal request has been processed and payment has been sent by <strong>${adminName}</strong>.</p><ul><li><strong>Amount:</strong> ₹${withdrawalAmount}</li><li><strong>Withdrawal ID:</strong> ${withdrawalId}</li>${payoutReference ? `<li><strong>Payout Reference:</strong> ${payoutReference}</li>` : ''}<li><strong>Payment Method:</strong> ${payoutMethodType}</li><li><strong>Status:</strong> Paid</li></ul><p>Thank you,<br/>Team Healway</p>`;
      break;
    case 'rejected':
      subject = `Withdrawal Request Rejected - ₹${withdrawalAmount} | Healway`;
      message = `Hello ${providerName},\n\nYour withdrawal request has been rejected by ${adminName}.\n\nWithdrawal Details:\n- Amount: ₹${withdrawalAmount}\n- Withdrawal ID: ${withdrawalId}${rejectionReason ? `\n- Reason: ${rejectionReason}` : ''}\n- Status: Rejected\n\nThank you,\nTeam Healway`;
      htmlMessage = `<p>Hello ${providerName},</p><p>Your withdrawal request has been rejected by <strong>${adminName}</strong>.</p><ul><li><strong>Amount:</strong> ₹${withdrawalAmount}</li><li><strong>Withdrawal ID:</strong> ${withdrawalId}</li>${rejectionReason ? `<li><strong>Reason:</strong> ${rejectionReason}</li>` : ''}<li><strong>Status:</strong> Rejected</li></ul><p>Thank you,<br/>Team Healway</p>`;
      break;
    default:
      subject = `Withdrawal Status Update - ₹${withdrawalAmount} | Healway`;
      message = `Hello ${providerName},\n\nYour withdrawal request status has been updated.\n\nWithdrawal Details:\n- Amount: ₹${withdrawalAmount}\n- Withdrawal ID: ${withdrawalId}\n- Status: ${withdrawalStatus}\n\nThank you,\nTeam Healway`;
      htmlMessage = `<p>Hello ${providerName},</p><p>Your withdrawal request status has been updated.</p><ul><li><strong>Amount:</strong> ₹${withdrawalAmount}</li><li><strong>Withdrawal ID:</strong> ${withdrawalId}</li><li><strong>Status:</strong> ${withdrawalStatus}</li></ul><p>Thank you,<br/>Team Healway</p>`;
  }

  return sendEmail({
    to: provider.email,
    subject,
    text: message,
    html: htmlMessage,
  });
};

/**
 * Send support ticket notification email to admin
 */
const sendAdminSupportTicketNotification = async ({ admin, ticket, user, userType }) => {
  if (!(await isEmailNotificationsEnabled())) return null;
  if (!admin?.email) return null;

  let userName = '';
  if (userType === 'patient') {
    userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient';
  } else if (userType === 'doctor') {
    userName = user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}`.trim() : 'Doctor';
  }

  const ticketSubject = ticket.subject || 'Support Request';

  return sendEmail({
    to: admin.email,
    subject: `New Support Ticket from ${userName} | Healway`,
    text: `Hello ${admin.name || 'Admin'},\n\nA new support ticket has been created:\n\nUser: ${userName} (${userType})\nSubject: ${ticketSubject}\nMessage: ${ticket.message || ''}\n\nTicket ID: ${ticket._id || ticket.id}\nPriority: ${ticket.priority || 'Medium'}\n\nPlease review and respond in the admin panel.\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${admin.name || 'Admin'},</p><p>A new support ticket has been created:</p><ul><li><strong>User:</strong> ${userName} (${userType})</li><li><strong>Subject:</strong> ${ticketSubject}</li><li><strong>Message:</strong> ${ticket.message || ''}</li><li><strong>Ticket ID:</strong> ${ticket._id || ticket.id}</li><li><strong>Priority:</strong> ${ticket.priority || 'Medium'}</li></ul><p>Please review and respond in the admin panel.</p><p>Thank you,<br/>Team Healway</p>`,
  });
};

/**
 * Create admin notification for support ticket
 */
const createAdminSupportTicketNotification = async ({ adminId, ticket, user, userType }) => {
  let userName = '';
  let userTypeLabel = '';

  if (userType === 'patient') {
    userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient';
    userTypeLabel = 'Patient';
  } else if (userType === 'doctor') {
    userName = user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}`.trim() : 'Doctor';
    userTypeLabel = 'Doctor';
  }

  const ticketSubject = ticket.subject || 'Support Request';
  const title = 'New Support Ticket';
  const message = `New support ticket from ${userTypeLabel} ${userName}: ${ticketSubject}`;

  return createNotification({
    userId: adminId,
    userType: 'admin',
    type: 'support',
    title,
    message,
    data: {
      ticketId: ticket._id || ticket.id,
      userId: user?._id || user?.id,
      userType,
      userName,
      userTypeLabel,
      subject: ticketSubject,
      priority: ticket.priority || 'medium',
      message: ticket.message || '',
    },
    priority: ticket.priority === 'high' || ticket.priority === 'urgent' ? 'high' : 'medium',
    actionUrl: `/admin/support/${ticket._id || ticket.id}`,
    icon: 'support',
    sendEmail: false,
    emitSocket: true,
  });
};

/**
 * Create support ticket notification (in-app)
 */
const createSupportTicketNotification = async ({ userId, userType, ticket, eventType }) => {
  let title, message, actionUrl;

  const ticketSubject = ticket.subject || 'Support Request';
  const modulePath = userType === 'patient' ? 'patient' : 'doctor';
  const adminNote = ticket.adminNote || '';

  switch (eventType) {
    case 'created':
      title = 'Support Ticket Created';
      message = `Your support ticket "${ticketSubject}" has been created successfully.`;
      actionUrl = `/${modulePath}/support`;
      break;
    case 'responded':
      title = 'Response Received';
      message = adminNote
        ? `Admin has responded to your support ticket "${ticketSubject}". Note: ${adminNote}`
        : `Admin has responded to your support ticket "${ticketSubject}".`;
      actionUrl = `/${modulePath}/support`;
      break;
    case 'status_updated':
      const statusLabel = ticket.status === 'resolved' ? 'Resolved'
        : ticket.status === 'closed' ? 'Closed'
          : ticket.status === 'in_progress' ? 'In Progress'
            : 'Updated';
      title = `Ticket ${statusLabel}`;
      message = adminNote
        ? `Your support ticket "${ticketSubject}" has been ${statusLabel.toLowerCase()}. Admin Note: ${adminNote}`
        : `Your support ticket "${ticketSubject}" has been ${statusLabel.toLowerCase()}.`;
      actionUrl = `/${modulePath}/support`;
      break;
    default:
      title = 'Support Ticket Update';
      message = adminNote
        ? `Your support ticket "${ticketSubject}" has been updated. Admin Note: ${adminNote}`
        : `Your support ticket "${ticketSubject}" has been updated.`;
      actionUrl = `/${modulePath}/support`;
  }

  return createNotification({
    userId,
    userType,
    type: 'support',
    title,
    message,
    data: {
      ticketId: ticket._id || ticket.id,
      ticketSubject,
      eventType,
    },
    priority: ticket.priority === 'urgent' ? 'urgent' : ticket.priority === 'high' ? 'high' : 'medium',
    actionUrl,
    icon: 'support',
  });
};

module.exports = {
  createNotification,
  createAppointmentNotification,
  createPrescriptionNotification,
  createWalletNotification,
  createAdminNotification,
  createSessionNotification,
  sendNotificationEmail,
  sendAppointmentConfirmationEmail,
  sendDoctorAppointmentNotification,
  sendAppointmentCancellationEmail,
  sendPaymentConfirmationEmail,
  sendWithdrawalRequestNotification,
  sendWithdrawalStatusUpdateEmail,
  sendEmail,
  sendRoleApprovalEmail,
  sendSignupAcknowledgementEmail,
  sendPasswordResetOtpEmail,
  sendAppointmentReminderEmail,
  sendPrescriptionEmail,
  sendSupportTicketNotification,
  sendAdminSupportTicketNotification,
  createSupportTicketNotification,
  createAdminSupportTicketNotification,
};
