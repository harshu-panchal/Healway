// SMS Service for sending OTP
// Supports multiple SMS providers: MSG91, Twilio, TextLocal, AWS SNS

const axios = require('axios');
const https = require('https');
const querystring = require('querystring');

const LOGIN_OTP_EXPIRY_MINUTES = Number(process.env.LOGIN_OTP_EXPIRY_MINUTES) || 10;

// SMS Provider Configuration
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'MSG91'; // MSG91, TWILIO, TEXTLOCAL, AWS_SNS, NONE

const formatRoleName = (role) => {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

// Format phone number for India (add +91 if not present)
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If it doesn't start with country code, add +91 for India
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // If it already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  return cleaned;
};

// Send OTP via MSG91
const sendViaMSG91 = async ({ phone, otp, role }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'HEALWY';
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  const route = process.env.MSG91_ROUTE || '4'; // 4 for transactional SMS

  if (!authKey) {
    throw new Error('MSG91_AUTH_KEY is not configured');
  }

  const formattedPhone = formatPhoneNumber(phone);
  const roleName = formatRoleName(role);
  const message = `Your Healway ${roleName} login OTP is: ${otp}. Valid for ${LOGIN_OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`;

  // MSG91 OTP API (using template)
  if (templateId) {
    const url = 'https://control.msg91.com/api/v5/otp';
    const payload = {
      template_id: templateId,
      mobile: formattedPhone.replace('+', ''),
      otp: otp,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': authKey,
        },
      });

      if (response.data && response.data.type === 'success') {
        return { success: true, provider: 'MSG91', message: 'OTP sent successfully' };
      }
      throw new Error(response.data.message || 'Failed to send OTP via MSG91');
    } catch (error) {
      console.error('MSG91 OTP API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // MSG91 Send SMS API (fallback if template not configured)
  const url = 'https://control.msg91.com/api/sendhttp.php';
  const params = new URLSearchParams({
    authkey: authKey,
    mobiles: formattedPhone.replace('+', ''),
    message: message,
    sender: senderId,
    route: route,
    country: '91',
  });

  try {
    const response = await axios.get(`${url}?${params.toString()}`);
    const responseText = response.data.toString().trim();

    // MSG91 returns numeric response codes or alphanumeric request IDs
    const isNumericSuccess = responseText && !isNaN(responseText) && parseInt(responseText) > 0;
    const isAlphanumericSuccess = responseText && responseText.length > 10; // Request IDs are usually long hex strings

    if (isNumericSuccess || isAlphanumericSuccess) {
      return { success: true, provider: 'MSG91', message: 'OTP sent successfully', requestId: responseText };
    }
    throw new Error(`MSG91 API Error: ${responseText}`);
  } catch (error) {
    console.error('MSG91 Send SMS Error:', error.message);
    throw error;
  }
};

// Send OTP via Twilio
const sendViaTwilio = async ({ phone, otp, role }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials are not configured');
  }

  // Check if twilio package is installed
  let twilio;
  try {
    twilio = require('twilio');
  } catch (error) {
    throw new Error('Twilio package is not installed. Run: npm install twilio');
  }

  const formattedPhone = formatPhoneNumber(phone);
  const roleName = formatRoleName(role);
  const message = `Your Healway ${roleName} login OTP is: ${otp}. Valid for ${LOGIN_OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`;

  const client = twilio(accountSid, authToken);

  try {
    const result = await client.messages.create({
      body: message,
      to: formattedPhone,
      from: fromNumber,
    });

    return {
      success: true,
      provider: 'Twilio',
      message: 'OTP sent successfully',
      sid: result.sid
    };
  } catch (error) {
    console.error('Twilio Error:', error.message);
    throw error;
  }
};

// Send OTP via TextLocal
const sendViaTextLocal = async ({ phone, otp, role }) => {
  const apiKey = process.env.TEXTLOCAL_API_KEY;
  const senderId = process.env.TEXTLOCAL_SENDER_ID || 'HEALWY';

  if (!apiKey) {
    throw new Error('TEXTLOCAL_API_KEY is not configured');
  }

  const formattedPhone = formatPhoneNumber(phone);
  const roleName = formatRoleName(role);
  const message = `Your Healway ${roleName} login OTP is: ${otp}. Valid for ${LOGIN_OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`;

  const url = 'https://api.textlocal.in/send/';
  const data = querystring.stringify({
    apikey: apiKey,
    numbers: formattedPhone.replace('+', ''),
    message: message,
    sender: senderId,
  });

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data && response.data.status === 'success') {
      return { success: true, provider: 'TextLocal', message: 'OTP sent successfully' };
    }
    throw new Error(response.data.errors?.[0]?.message || 'Failed to send OTP via TextLocal');
  } catch (error) {
    console.error('TextLocal Error:', error.response?.data || error.message);
    throw error;
  }
};

// Send OTP via AWS SNS
const sendViaAWSSNS = async ({ phone, otp, role }) => {
  // Check if aws-sdk package is installed
  let AWS;
  try {
    AWS = require('aws-sdk');
  } catch (error) {
    throw new Error('AWS SDK is not installed. Run: npm install aws-sdk');
  }

  const sns = new AWS.SNS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const formattedPhone = formatPhoneNumber(phone);
  const roleName = formatRoleName(role);
  const message = `Your Healway ${roleName} login OTP is: ${otp}. Valid for ${LOGIN_OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`;

  try {
    const result = await sns.publish({
      Message: message,
      PhoneNumber: formattedPhone,
    }).promise();

    return {
      success: true,
      provider: 'AWS SNS',
      message: 'OTP sent successfully',
      messageId: result.MessageId
    };
  } catch (error) {
    console.error('AWS SNS Error:', error.message);
    throw error;
  }
};

// Main function to send OTP
const sendMobileOtp = async ({ phone, otp, role }) => {
  const roleName = formatRoleName(role);
  const message = `Your Healway ${roleName} login OTP is: ${otp}. Valid for ${LOGIN_OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`;

  // Log OTP in development/test mode
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log(`\n========== SMS OTP ==========`);
    console.log(`Phone: ${phone}`);
    console.log(`OTP: ${otp}`);
    console.log(`Role: ${roleName}`);
    console.log(`Message: ${message}`);
    console.log(`Provider: ${SMS_PROVIDER}`);
    console.log(`=============================\n`);
  }

  // If SMS_PROVIDER is set to NONE, just log and return success (for testing)
  if (SMS_PROVIDER === 'NONE') {
    console.log(`[SMS OTP - TEST MODE] OTP would be sent to ${phone}: ${otp}`);
    return {
      success: true,
      provider: 'NONE (Test Mode)',
      message: 'OTP logged (test mode)',
    };
  }

  try {
    let result;

    switch (SMS_PROVIDER.toUpperCase()) {
      case 'MSG91':
        result = await sendViaMSG91({ phone, otp, role });
        break;
      case 'TWILIO':
        result = await sendViaTwilio({ phone, otp, role });
        break;
      case 'TEXTLOCAL':
        result = await sendViaTextLocal({ phone, otp, role });
        break;
      case 'AWS_SNS':
        result = await sendViaAWSSNS({ phone, otp, role });
        break;
      default:
        console.warn(`Unknown SMS provider: ${SMS_PROVIDER}. Logging OTP only.`);
        console.log(`[SMS OTP] Phone: ${phone}, OTP: ${otp}, Message: ${message}`);
        result = {
          success: true,
          provider: 'LOG_ONLY',
          message: 'OTP logged (provider not configured)',
        };
    }

    return result;
  } catch (error) {
    // Log error but don't fail completely - OTP is still generated and stored
    console.error(`[SMS Error] Failed to send OTP via ${SMS_PROVIDER}:`, error.message);

    // In development, still return success to allow testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.warn('[SMS Warning] OTP not sent via SMS provider, but continuing in development mode');
      return {
        success: true,
        provider: SMS_PROVIDER,
        message: 'OTP logged (SMS provider error in dev mode)',
        error: error.message,
      };
    }

    // In production, throw error so it can be handled upstream
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

module.exports = {
  sendMobileOtp,
  formatPhoneNumber,
};

