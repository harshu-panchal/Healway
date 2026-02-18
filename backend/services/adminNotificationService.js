const Admin = require('../models/Admin');
const { 
  sendAdminPendingApprovalEmail,
  sendAdminWithdrawalRequestEmail,
  sendAdminPatientRequestEmail,
} = require('./emailService');

const parseEmails = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item);

const unique = (arr) => [...new Set(arr)];

const notifyAdminsOfPendingSignup = async ({ role, entity }) => {
  const fallback = parseEmails(process.env.ADMIN_NOTIFICATION_EMAILS);

  let recipients = [];

  let admins = [];

  try {
    const adminRecords = await Admin.find({ isActive: true, email: { $exists: true, $ne: '' } }).select('email');
    recipients = adminRecords.map((admin) => admin.email);
  } catch (error) {
    console.error('Failed to fetch admin emails for notification', error);
  }

  try {
    admins = await Admin.find({ isActive: true }).select('email name');
  } catch (error) {
    console.error('Failed to fetch admin emails for notification', error);
  }

  recipients = unique([...recipients, ...fallback]);

  if (!recipients.length) {
    console.warn('No admin notification recipients configured. Skipping admin notification email.');
    return;
  }

  await Promise.all(
    recipients.map((email) =>
      sendAdminPendingApprovalEmail({
        email,
        role,
        entity,
      }).catch((error) => console.error(`Failed to send admin pending approval email to ${email}`, error))
    )
  );
};

const notifyAdminsOfWithdrawalRequest = async ({ withdrawal, provider, providerType }) => {
  const fallback = parseEmails(process.env.ADMIN_NOTIFICATION_EMAILS);

  let recipients = [];
  let admins = [];

  try {
    const adminRecords = await Admin.find({ isActive: true, email: { $exists: true, $ne: '' } }).select('email');
    recipients = adminRecords.map((admin) => admin.email);
  } catch (error) {
    console.error('Failed to fetch admin emails for withdrawal notification', error);
  }

  try {
    admins = await Admin.find({ isActive: true }).select('email name');
  } catch (error) {
    console.error('Failed to fetch admin records for withdrawal notification', error);
  }

  recipients = unique([...recipients, ...fallback]);

  if (!recipients.length && !admins.length) {
    console.warn('No admin notification recipients configured. Skipping withdrawal notification email.');
    return;
  }

  // Send emails to all active admins
  await Promise.all(
    admins.map((admin) =>
      sendAdminWithdrawalRequestEmail({
        admin,
        withdrawal,
        provider,
        providerType,
      }).catch((error) => console.error(`Failed to send withdrawal notification email to ${admin.email}`, error))
    )
  );

  // Also send to fallback emails if they're not in the admin list
  const adminEmails = new Set(admins.map(a => a.email));
  const fallbackOnly = fallback.filter(email => !adminEmails.has(email));
  
  if (fallbackOnly.length > 0) {
    // For fallback emails, create a minimal admin object
    await Promise.all(
      fallbackOnly.map((email) =>
        sendAdminWithdrawalRequestEmail({
          admin: { email, name: 'Admin' },
          withdrawal,
          provider,
          providerType,
        }).catch((error) => console.error(`Failed to send withdrawal notification email to ${email}`, error))
      )
    );
  }
};

const notifyAdminsOfPatientRequest = async ({ request, patient }) => {
  const fallback = parseEmails(process.env.ADMIN_NOTIFICATION_EMAILS);

  let recipients = [];
  let admins = [];

  try {
    const adminRecords = await Admin.find({ isActive: true, email: { $exists: true, $ne: '' } }).select('email');
    recipients = adminRecords.map((admin) => admin.email);
  } catch (error) {
    console.error('Failed to fetch admin emails for patient request notification', error);
  }

  try {
    admins = await Admin.find({ isActive: true }).select('email name');
  } catch (error) {
    console.error('Failed to fetch admin records for patient request notification', error);
  }

  recipients = unique([...recipients, ...fallback]);

  if (!recipients.length && !admins.length) {
    console.warn('No admin notification recipients configured. Skipping patient request notification email.');
    return;
  }

  // Send emails to all active admins
  await Promise.all(
    admins.map((admin) =>
      sendAdminPatientRequestEmail({
        admin,
        request,
        patient,
      }).catch((error) => console.error(`Failed to send patient request notification email to ${admin.email}`, error))
    )
  );

  // Also send to fallback emails if they're not in the admin list
  const adminEmails = new Set(admins.map(a => a.email));
  const fallbackOnly = fallback.filter(email => !adminEmails.has(email));
  
  if (fallbackOnly.length > 0) {
    // For fallback emails, create a minimal admin object
    await Promise.all(
      fallbackOnly.map((email) =>
        sendAdminPatientRequestEmail({
          admin: { email, name: 'Admin' },
          request,
          patient,
        }).catch((error) => console.error(`Failed to send patient request notification email to ${email}`, error))
      )
    );
  }
};

module.exports = {
  notifyAdminsOfPendingSignup,
  notifyAdminsOfWithdrawalRequest,
  notifyAdminsOfPatientRequest,
};
