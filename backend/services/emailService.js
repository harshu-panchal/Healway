const nodemailer = require('nodemailer');
const { APPROVAL_STATUS, OTP_CONFIG } = require('../utils/constants');

let cachedTransporter;

const ensureTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials are not fully configured. Emails will not be sent.');
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return cachedTransporter;
};

const sendEmail = async ({ to, subject, text, html }, retries = 3) => {
  const transporter = ensureTransporter();

  if (!transporter) {
    console.warn(`Skipping email to ${to}: transporter not configured.`);
    return null;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      const isRateLimitError =
        error.message?.includes('Too many login attempts') ||
        error.message?.includes('454') ||
        error.responseCode === 454 ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET';

      if (isRateLimitError && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(
          `Email rate limited (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === retries || !isRateLimitError) {
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
        if (isRateLimitError && isTestEnv) {
          console.warn(
            `Failed to send email to ${to}: Rate limit exceeded. Email functionality working but Gmail is rate limiting.`
          );
        } else {
          console.error(
            `Failed to send email to ${to}: ${error.message || error}`
          );
        }
      }
    }
  }

  return null;
};

const formatRoleName = (role) => role.charAt(0).toUpperCase() + role.slice(1);

const sendRoleApprovalEmail = async ({ role, email, status, reason, adminName, doctorName, specialization, approvedAt }) => {
  const readableRole = formatRoleName(role);

  if (status === APPROVAL_STATUS.APPROVED) {
    if (role === 'doctor' && doctorName) {
      const adminNameText = adminName ? ` by ${adminName}` : '';
      const approvedDateText = approvedAt
        ? new Date(approvedAt).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        : new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      const specializationText = specialization ? ` (${specialization})` : '';

      const text = `Hello Dr. ${doctorName},\n\nYour registration with Healway has been approved${adminNameText}.\n\nAccount Details:\n- Name: Dr. ${doctorName}${specializationText}\n- Approval Date: ${approvedDateText}\n- Approved By: ${adminName || 'Admin'}\n\nYou can now sign in using your credentials and start providing services to patients.\n\nThank you,\nTeam Healway`;

      const html = `<p>Hello Dr. ${doctorName},</p><p>Your registration with <strong>Healway</strong> has been approved${adminNameText ? ` by <strong>${adminName}</strong>` : ''}.</p><ul><li><strong>Name:</strong> Dr. ${doctorName}${specializationText}</li><li><strong>Approval Date:</strong> ${approvedDateText}</li><li><strong>Approved By:</strong> ${adminName || 'Admin'}</li></ul><p>You can now sign in using your credentials and start providing services to patients.</p><p>Thank you,<br/>Team Healway</p>`;

      return sendEmail({
        to: email,
        subject: `Doctor account approved${adminNameText} | Healway`,
        text,
        html,
      });
    }

    return sendEmail({
      to: email,
      subject: `${readableRole} account approved | Healway`,
      text: `Hello ${readableRole},\n\nYour registration with Healway has been approved. You can now sign in using your credentials.\n\nThank you,\nTeam Healway`,
      html: `<p>Hello ${readableRole},</p><p>Your registration with <strong>Healway</strong> has been approved. You can now sign in using your credentials.</p><p>Thank you,<br/>Team Healway</p>`,
    });
  }

  if (status === APPROVAL_STATUS.REJECTED) {
    return sendEmail({
      to: email,
      subject: `${readableRole} account update | Healway`,
      text: `Hello ${readableRole},\n\nYour registration could not be approved at this time.${reason ? ` Reason: ${reason}.` : ''}\nPlease contact support if you need more information.\n\nRegards,\nTeam Healway`,
      html: `<p>Hello ${readableRole},</p><p>Your registration could not be approved at this time.${reason ? ` Reason: <strong>${reason}</strong>.` : ''
        }</p><p>Please contact support if you need more information.</p><p>Regards,<br/>Team Healway</p>`,
    });
  }

  return null;
};

const sendSignupAcknowledgementEmail = async ({ role, email, name }) => {
  const readableRole = formatRoleName(role);

  return sendEmail({
    to: email,
    subject: `${readableRole} signup received | Healway`,
    text: `Hello ${name || readableRole},\n\nWe have received your registration for Healway as a ${readableRole}. Our admin team will review your details and notify you once approved.\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${name || readableRole},</p><p>We have received your registration for <strong>Healway</strong> as a ${readableRole}. Our admin team will review your details and notify you once approved.</p><p>Thank you,<br/>Team Healway</p>`,
  });
};

const sendAdminPendingApprovalEmail = async ({ email, role, entity }) => {
  const readableRole = formatRoleName(role);
  const name = entity?.firstName
    ? `${entity.firstName} ${entity.lastName || ''}`.trim()
    : entity?.name || 'New applicant';

  const details = [
    entity?.email && `Email: ${entity.email}`,
    entity?.phone && `Phone: ${entity.phone}`,
    entity?.licenseNumber && `License: ${entity.licenseNumber}`,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `Hello Admin,

A new ${readableRole} registration requires approval.

Name: ${name}
${details ? `${details}
` : ''}
Please review and take action in the admin panel.

Thank you,
Healway Platform`;

  const html = `<p>Hello Admin,</p><p>A new <strong>${readableRole}</strong> registration requires approval.</p><ul>${name ? `<li><strong>Name:</strong> ${name}</li>` : ''
    }${entity?.email ? `<li><strong>Email:</strong> ${entity.email}</li>` : ''
    }${entity?.phone ? `<li><strong>Phone:</strong> ${entity.phone}</li>` : ''
    }${entity?.licenseNumber ? `<li><strong>License:</strong> ${entity.licenseNumber}</li>` : ''
    }</ul><p>Please review and take action in the admin panel.</p><p>Thank you,<br/>Healway Platform</p>`;

  return sendEmail({
    to: email,
    subject: `New ${readableRole} registration pending approval`,
    text,
    html,
  });
};

const sendPasswordResetOtpEmail = async ({ role, email, otp }) => {
  const readableRole = formatRoleName(role);

  return sendEmail({
    to: email,
    subject: `Password reset OTP for ${readableRole} account | Healway`,
    text: `Hello ${readableRole},\n\nUse the following OTP to reset your Healway password: ${otp}.\nThis OTP will expire in ${OTP_CONFIG.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please contact support immediately.\n\nThank you,\nTeam Healway`,
    html: `<p>Hello ${readableRole},</p><p>Use the following OTP to reset your <strong>Healway</strong> password: <strong>${otp}</strong>.</p><p>This OTP will expire in ${OTP_CONFIG.OTP_EXPIRY_MINUTES
      } minutes.</p><p>If you did not request this, please contact support immediately.</p><p>Thank you,<br/>Team Healway</p>`,
  });
};

const sendAppointmentReminderEmail = async ({ patientEmail, patientName, doctorName, appointmentDate, appointmentTime, hoursBefore = 24 }) => {
  if (!patientEmail) {
    return null;
  }

  const timeText = hoursBefore === 24 ? 'tomorrow' : hoursBefore === 2 ? 'in 2 hours' : `in ${hoursBefore} hours`;
  const formattedDate = appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : '';
  const formattedTime = appointmentTime || (appointmentDate ? new Date(appointmentDate).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) : '');

  const subject = `Appointment Reminder - ${doctorName || 'Doctor'} | Healway`;
  const text = `Hello ${patientName || 'Patient'},

This is a reminder that you have an appointment ${timeText}:

Doctor: ${doctorName || 'Doctor'}
Date: ${formattedDate}
Time: ${formattedTime}

Please make sure to arrive on time. If you need to reschedule or cancel, please contact us as soon as possible.

Thank you,
Team Healway`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50;">Appointment Reminder</h2>
      <p>Hello ${patientName || 'Patient'},</p>
      <p>This is a reminder that you have an appointment <strong>${timeText}</strong>:</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Doctor:</strong> ${doctorName || 'Doctor'}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
      </div>
      <p>Please make sure to arrive on time. If you need to reschedule or cancel, please contact us as soon as possible.</p>
      <p>Thank you,<br/>Team Healway</p>
    </div>
  `;

  return sendEmail({
    to: patientEmail,
    subject,
    text,
    html,
  });
};

const sendPrescriptionEmail = async ({ patientEmail, patientName, doctorName, prescriptionId, pdfPath, prescriptionDate }, retries = 3) => {
  if (!patientEmail) {
    return null;
  }

  const transporter = ensureTransporter();

  if (!transporter) {
    console.warn(`Skipping prescription email to ${patientEmail}: transporter not configured.`);
    return null;
  }

  const subject = `Your Prescription from ${doctorName || 'Doctor'} | Healway`;
  const text = `Hello ${patientName || 'Patient'},

Your prescription has been prepared by ${doctorName || 'Doctor'}.

Prescription ID: ${prescriptionId}
Date: ${prescriptionDate ? new Date(prescriptionDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}

Please find your prescription attached to this email.

If you have any questions, please contact your doctor.

Thank you,
Team Healway`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2c3e50;">Your Prescription</h2>
      <p>Hello ${patientName || 'Patient'},</p>
      <p>Your prescription has been prepared by <strong>${doctorName || 'Doctor'}</strong>.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Prescription ID:</strong> ${prescriptionId}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${prescriptionDate ? new Date(prescriptionDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
      </div>
      <p>Please find your prescription attached to this email.</p>
      <p>If you have any questions, please contact your doctor.</p>
      <p>Thank you,<br/>Team Healway</p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: patientEmail,
    subject,
    text,
    html,
  };

  // Attach PDF if URL is available (Cloudinary URL or any http URL)
  if (pdfPath && (pdfPath.startsWith('http://') || pdfPath.startsWith('https://'))) {
    mailOptions.attachments = [
      {
        filename: `prescription-${prescriptionId}.pdf`,
        href: pdfPath,
        contentType: 'application/pdf',
      },
    ];
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      const isRateLimitError =
        error.message?.includes('Too many login attempts') ||
        error.message?.includes('454') ||
        error.responseCode === 454 ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET';

      if (isRateLimitError && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(
          `Prescription email rate limited (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === retries || !isRateLimitError) {
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
        if (isRateLimitError && isTestEnv) {
          console.warn(
            `Failed to send prescription email to ${patientEmail}: Rate limit exceeded.`
          );
        } else {
          console.error(
            `Failed to send prescription email to ${patientEmail}: ${error.message || error}`
          );
        }
      }
    }
  }

  return null;
};

const sendAdminWithdrawalRequestEmail = async ({ admin, withdrawal, provider, providerType }) => {
  if (!admin?.email) return null;

  let providerName = provider?.firstName ? `Dr. ${provider.firstName} ${provider.lastName || ''}`.trim() : 'Doctor';
  const providerTypeLabel = 'Doctor';
  const withdrawalAmount = withdrawal?.amount || 0;
  const withdrawalId = withdrawal?._id || withdrawal?.id;
  const payoutMethodType = withdrawal?.payoutMethod?.type || 'N/A';
  const payoutMethodDetails = withdrawal?.payoutMethod?.details || {};

  let payoutDetailsText = '';
  if (payoutMethodType === 'bank_transfer') {
    payoutDetailsText = `\nAccount Number: ${payoutMethodDetails.accountNumber || 'N/A'}\nIFSC Code: ${payoutMethodDetails.ifscCode || 'N/A'}\nBank Name: ${payoutMethodDetails.bankName || 'N/A'}\nAccount Holder: ${payoutMethodDetails.accountHolderName || 'N/A'}`;
  } else if (payoutMethodType === 'upi') {
    payoutDetailsText = `\nUPI ID: ${payoutMethodDetails.upiId || 'N/A'}`;
  } else if (payoutMethodType === 'paytm') {
    payoutDetailsText = `\nPaytm Number: ${payoutMethodDetails.paytmNumber || 'N/A'}`;
  }

  const providerEmail = provider?.email || 'N/A';
  const providerPhone = provider?.phone || 'N/A';

  const text = `Hello ${admin.name || 'Admin'},

A new withdrawal request has been submitted:

Provider Type: ${providerTypeLabel}
Provider Name: ${providerName}
Provider Email: ${providerEmail}
Provider Phone: ${providerPhone}
Withdrawal Amount: ₹${withdrawalAmount}
Payment Method: ${payoutMethodType}${payoutDetailsText}
Withdrawal ID: ${withdrawalId}
Request Date: ${withdrawal?.createdAt ? new Date(withdrawal.createdAt).toLocaleString('en-IN') : 'N/A'}

Please review and process this withdrawal request in the admin panel.

Thank you,
Healway Platform`;

  const html = `<p>Hello ${admin.name || 'Admin'},</p>
<p>A new <strong>withdrawal request</strong> has been submitted:</p>
<ul>
  <li><strong>Provider Type:</strong> ${providerTypeLabel}</li>
  <li><strong>Provider Name:</strong> ${providerName}</li>
  <li><strong>Provider Email:</strong> ${providerEmail}</li>
  <li><strong>Provider Phone:</strong> ${providerPhone}</li>
  <li><strong>Withdrawal Amount:</strong> ₹${withdrawalAmount}</li>
  <li><strong>Payment Method:</strong> ${payoutMethodType}</li>
  ${payoutMethodType === 'bank_transfer' ? `<li><strong>Account Number:</strong> ${payoutMethodDetails.accountNumber || 'N/A'}</li><li><strong>IFSC Code:</strong> ${payoutMethodDetails.ifscCode || 'N/A'}</li><li><strong>Bank Name:</strong> ${payoutMethodDetails.bankName || 'N/A'}</li><li><strong>Account Holder:</strong> ${payoutMethodDetails.accountHolderName || 'N/A'}</li>` : ''}
  ${payoutMethodType === 'upi' ? `<li><strong>UPI ID:</strong> ${payoutMethodDetails.upiId || 'N/A'}</li>` : ''}
  ${payoutMethodType === 'paytm' ? `<li><strong>Paytm Number:</strong> ${payoutMethodDetails.paytmNumber || 'N/A'}</li>` : ''}
  <li><strong>Withdrawal ID:</strong> ${withdrawalId}</li>
  <li><strong>Request Date:</strong> ${withdrawal?.createdAt ? new Date(withdrawal.createdAt).toLocaleString('en-IN') : 'N/A'}</li>
</ul>
<p>Please review and process this withdrawal request in the admin panel.</p>
<p>Thank you,<br/>Healway Platform</p>`;

  return sendEmail({
    to: admin.email,
    subject: `Withdrawal Request - ${providerTypeLabel} ${providerName} | ₹${withdrawalAmount} | Healway`,
    text,
    html,
  });
};

const sendAdminPatientRequestEmail = async ({ admin, request, patient }) => {
  if (!admin?.email) return null;

  const patientName = patient?.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : 'Patient';
  const patientEmail = patient?.email || 'N/A';
  const patientPhone = patient?.phone || request?.patientPhone || 'N/A';
  const requestTypeLabel = 'Request';
  const requestId = request?._id || request?.id;
  const patientAddress = request?.patientAddress || patient?.address || {};
  const addressText = patientAddress ?
    `${patientAddress.line1 || ''}${patientAddress.line2 ? `, ${patientAddress.line2}` : ''}${patientAddress.city ? `, ${patientAddress.city}` : ''}${patientAddress.state ? `, ${patientAddress.state}` : ''}${patientAddress.postalCode ? ` - ${patientAddress.postalCode}` : ''}`.replace(/^,\s*|,\s*$/g, '') || 'N/A' : 'N/A';

  const text = `Hello ${admin.name || 'Admin'},

A new patient request has been submitted:

Patient Name: ${patientName}
Patient Email: ${patientEmail}
Patient Phone: ${patientPhone}
Request Type: ${requestTypeLabel}
Patient Address: ${addressText}
Request ID: ${requestId}
Request Date: ${request?.createdAt ? new Date(request.createdAt).toLocaleString('en-IN') : 'N/A'}

Please review and respond to this request in the admin panel.

Thank you,
Healway Platform`;

  const html = `<p>Hello ${admin.name || 'Admin'},</p>
<p>A new <strong>patient request</strong> has been submitted:</p>
<ul>
  <li><strong>Patient Name:</strong> ${patientName}</li>
  <li><strong>Patient Email:</strong> ${patientEmail}</li>
  <li><strong>Patient Phone:</strong> ${patientPhone}</li>
  <li><strong>Request Type:</strong> ${requestTypeLabel}</li>
  <li><strong>Patient Address:</strong> ${addressText}</li>
  <li><strong>Request ID:</strong> ${requestId}</li>
  <li><strong>Request Date:</strong> ${request?.createdAt ? new Date(request.createdAt).toLocaleString('en-IN') : 'N/A'}</li>
</ul>
<p>Please review and respond to this request in the admin panel.</p>
<p>Thank you,<br/>Healway Platform</p>`;

  return sendEmail({
    to: admin.email,
    subject: `New Patient Request from ${patientName} | Healway`,
    text,
    html,
  });
};

module.exports = {
  sendEmail,
  sendRoleApprovalEmail,
  sendSignupAcknowledgementEmail,
  sendAdminPendingApprovalEmail,
  sendPasswordResetOtpEmail,
  sendAppointmentReminderEmail,
  sendPrescriptionEmail,
  sendAdminWithdrawalRequestEmail,
  sendAdminPatientRequestEmail,
};
