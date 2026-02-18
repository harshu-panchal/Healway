/**
 * Commission Configuration Utility
 * Reads commission rates from environment variables with defaults
 */

/**
 * Get commission rate for a provider type
 * @param {string} providerType - 'doctor'
 * @returns {number} Commission rate as decimal (e.g., 0.1 = 10% calculated from 10/100)
 */
const getCommissionRate = (providerType) => {
  let rate;
  switch (providerType) {
    case 'doctor':
      // Treat the value as percentage (e.g., 10 for 10%)
      rate = parseFloat(process.env.DOCTOR_COMMISSION_RATE) || 10;
      break;

    default:
      rate = 10; // Default 10%
  }
  return rate / 100;
};

/**
 * Calculate provider earning after commission
 * @param {number} totalAmount - Total amount
 * @param {string} providerType - 'doctor'
 * @returns {object} { earning, commission }
 */
const calculateProviderEarning = (totalAmount, providerType) => {
  const commissionRate = getCommissionRate(providerType);
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

