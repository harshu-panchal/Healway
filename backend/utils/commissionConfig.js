const AdminSettings = require('../models/AdminSettings');

const DEFAULT_DOCTOR_COMMISSION_RATE = 0.1; // 10% as decimal

/**
 * Get commission rate for a provider type from AdminSettings.
 * Falls back to a safe default (10%) if settings are missing or invalid.
 * @param {string} providerType - 'doctor'
 * @returns {Promise<number>} Commission rate as decimal (e.g., 0.1 = 10%)
 */
const getCommissionRate = async (providerType) => {
  try {
    switch (providerType) {
      case 'doctor': {
        const rate = await AdminSettings.getDoctorCommissionRate();
        return typeof rate === 'number' && Number.isFinite(rate)
          ? rate
          : DEFAULT_DOCTOR_COMMISSION_RATE;
      }

      default:
        return DEFAULT_DOCTOR_COMMISSION_RATE;
    }
  } catch (error) {
    console.error('Error loading commission rate from AdminSettings, using default 10%:', error);
    return DEFAULT_DOCTOR_COMMISSION_RATE;
  }
};

/**
 * Calculate provider earning after commission
 * @param {number} totalAmount - Total amount
 * @param {string} providerType - 'doctor'
 * @returns {Promise<object>} { earning, commission, commissionRate }
 */
const calculateProviderEarning = async (totalAmount, providerType) => {
  const commissionRate = await getCommissionRate(providerType);
  const commission = totalAmount * commissionRate;
  const earning = totalAmount - commission;

  return {
    earning,
    commission,
    commissionRate,
  };
};

module.exports = {
  getCommissionRate,
  calculateProviderEarning,
};

