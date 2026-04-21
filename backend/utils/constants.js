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

const DOCTOR_ACCESS_MODES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  VISIBLE_UNBOOKABLE: 'visible_unbookable',
};

const OTP_CONFIG = {
  OTP_LENGTH: Number(process.env.OTP_LENGTH) || 4,
  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
  MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
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
  ...OTP_CONFIG,
  RESET_TOKEN_EXPIRY_MINUTES: Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) || 30,
};

module.exports = {
  ROLES,
  APPROVAL_STATUS,
  DOCTOR_ACCESS_MODES,
  WITHDRAWAL_STATUS,
  JOB_NAMES,
  OTP_CONFIG,
  PASSWORD_RESET_CONFIG,
};


