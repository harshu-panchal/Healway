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

// Commission rates for different provider roles (converts percentage from .env to decimal)
const DOCTOR_COMMISSION_RATE = Number(process.env.DOCTOR_COMMISSION_RATE || 10) / 100;


// Legacy: Keep COMMISSION_RATE for backward compatibility (defaults to doctor rate)
const COMMISSION_RATE = DOCTOR_COMMISSION_RATE;

// Helper function to get commission rate by provider role
const getCommissionRateByRole = (providerRole) => {
  switch (providerRole) {
    case ROLES.DOCTOR:
      return DOCTOR_COMMISSION_RATE;
    default:
      return COMMISSION_RATE; // Default to doctor rate
  }
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
  COMMISSION_RATE, // Legacy: kept for backward compatibility
  DOCTOR_COMMISSION_RATE,
  getCommissionRateByRole,
  JOB_NAMES,
  PASSWORD_RESET_CONFIG,
};


