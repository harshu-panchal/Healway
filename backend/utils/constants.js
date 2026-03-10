const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
};

const JOB_NAMES = {
  ETA_RECALCULATION: 'queue:eta:recalculate',
  AUTO_NOSHOW: 'queue:token:auto-noshow',
  NOTIFICATION_DISPATCH: 'notification:dispatch',
  PAYOUT_RECONCILIATION: 'payments:reconcile',
};

const PASSWORD_RESET_CONFIG = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: Number(process.env.PASSWORD_RESET_OTP_EXPIRY_MINUTES) || 10,
  MAX_ATTEMPTS: Number(process.env.PASSWORD_RESET_MAX_ATTEMPTS) || 5,
  RESET_TOKEN_EXPIRY_MINUTES: Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) || 30,
};

module.exports = {
  ROLES,
  APPROVAL_STATUS,
  WITHDRAWAL_STATUS,
  JOB_NAMES,
  PASSWORD_RESET_CONFIG,
};


