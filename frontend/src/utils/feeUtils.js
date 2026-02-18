/**
 * Calculates the final consultation fee based on original fees and discount amount.
 * @param {number|string} original - The base fee.
 * @param {number|string} discount - The discount amount.
 * @returns {number} The final calculated fee, minimum 0.
 */
export const calculateFinalFee = (original, discount) => {
    const originalNum = parseFloat(original) || 0;
    const discountNum = parseFloat(discount) || 0;
    return Math.max(0, originalNum - discountNum);
};

/**
 * Calculates the discount percentage.
 * @param {number|string} original - The base fee.
 * @param {number|string} discount - The discount amount.
 * @returns {number} Percentage rounded to nearest integer.
 */
export const calculateDiscountPercentage = (original, discount) => {
    const originalNum = parseFloat(original) || 0;
    const discountNum = parseFloat(discount) || 0;
    if (originalNum <= 0) return 0;
    return Math.round((discountNum / originalNum) * 100);
};

/**
 * Formats a price value for display.
 * Returns "Free" if price is 0, otherwise returns "₹X" format.
 * @param {number|string} price - The price value.
 * @param {boolean} includeSymbol - Whether to include the ₹ symbol (default: true).
 * @returns {string} Formatted price string.
 */
export const formatPrice = (price, includeSymbol = true) => {
    const priceNum = parseFloat(price) || 0;
    if (priceNum === 0) return 'Free';
    return includeSymbol ? `₹${priceNum}` : `${priceNum}`;
};

/**
 * Checks if a price represents a free consultation.
 * @param {number|string} price - The price value.
 * @returns {boolean} True if price is 0 or less.
 */
export const isFreeConsultation = (price) => {
    const priceNum = parseFloat(price) || 0;
    return priceNum <= 0;
};
