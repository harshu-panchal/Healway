const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay only if credentials are available
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } catch (error) {
    console.warn('⚠️  Razorpay initialization failed:', error.message);
  }
} else {
  console.warn('⚠️  Razorpay credentials not found. Payment features will be disabled.');
  console.warn('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to enable payments');
}

/**
 * Check if Razorpay is configured and available
 * @returns {Boolean} True if Razorpay is initialized
 */
const isRazorpayAvailable = () => {
  return razorpay !== null;
};

/**
 * Create a Razorpay order
 * @param {Number} amount - Amount in paise (e.g., 10000 for ₹100)
 * @param {String} currency - Currency code (default: INR)
 * @param {Object} notes - Additional notes/metadata
 * @returns {Promise<Object>} Razorpay order object
 */
const createOrder = async (amount, currency = 'INR', notes = {}) => {
  if (!isRazorpayAvailable()) {
    throw new Error('Payment service is not configured. Please set Razorpay credentials.');
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes,
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
};

/**
 * Verify Razorpay payment signature
 * @param {String} orderId - Razorpay order ID
 * @param {String} paymentId - Razorpay payment ID
 * @param {String} signature - Payment signature
 * @returns {Boolean} True if signature is valid
 */
const verifyPayment = (orderId, paymentId, signature) => {
  if (!isRazorpayAvailable()) {
    console.warn('Payment verification skipped: Razorpay not configured');
    return false;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

/**
 * Verify Razorpay webhook signature
 * @param {String} payload - Webhook payload
 * @param {String} signature - Webhook signature
 * @returns {Boolean} True if signature is valid
 */
const verifyWebhookSignature = (payload, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('Webhook verification skipped: RAZORPAY_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
};

/**
 * Get payment details by payment ID
 * @param {String} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
const getPaymentDetails = async (paymentId) => {
  if (!isRazorpayAvailable()) {
    throw new Error('Payment service is not configured. Please set Razorpay credentials.');
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount / 100, // Convert from paise to rupees
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        orderId: payment.order_id,
        createdAt: new Date(payment.created_at * 1000),
      },
    };
  } catch (error) {
    console.error('Get payment details error:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      paymentId,
    });
    
    // Provide more specific error messages
    if (error.statusCode === 400) {
      throw new Error('Invalid payment ID');
    } else if (error.statusCode === 401) {
      throw new Error('Razorpay authentication failed. Please check your API credentials.');
    } else if (error.statusCode === 500) {
      throw new Error('Razorpay server error. Please try again later or contact support.');
    } else {
      throw new Error(`Failed to fetch payment details: ${error.message || 'Unknown error'}`);
    }
  }
};

/**
 * Refund a payment
 * @param {String} paymentId - Razorpay payment ID
 * @param {Number} amount - Refund amount in rupees (optional, full refund if not provided)
 * @param {String} notes - Refund notes
 * @returns {Promise<Object>} Refund details
 */
const refundPayment = async (paymentId, amount = null, notes = {}) => {
  if (!isRazorpayAvailable()) {
    throw new Error('Payment service is not configured. Please set Razorpay credentials.');
  }

  try {
    const refundData = {
      notes,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundData);
    return {
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Convert from paise to rupees
        currency: refund.currency,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000),
      },
    };
  } catch (error) {
    console.error('Refund error:', error);
    throw new Error('Failed to process refund');
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  verifyWebhookSignature,
  getPaymentDetails,
  refundPayment,
  isRazorpayAvailable,
};

