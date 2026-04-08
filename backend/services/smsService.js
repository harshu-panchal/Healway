const axios = require('axios');

const formatPhoneNumber = (phone) => {
  if (!phone) return null;

  let cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  if (cleaned.startsWith('91') && cleaned.length >= 12) {
    return cleaned;
  }

  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  return cleaned || null;
};

const sendSmsRequest = async ({ apiUrl, params }) => {
  const response = await axios.get(apiUrl, {
    params,
    timeout: Number(process.env.SMS_INDIA_HUB_TIMEOUT_MS) || 10000,
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });

  const data = response.data;

  if (data && data.ErrorCode === '000') {
    console.log('SMS SENT SUCCESS:', data);
    return {
      success: true,
      provider: 'SMS_INDIA',
      data,
    };
  }

  throw new Error(`SMS India Hub error: ${JSON.stringify(data)}`);
};

const sendMobileOtp = async ({ phone, otp, role }) => {
  const smsProvider = (process.env.SMS_PROVIDER || 'SMS_INDIA').toUpperCase();
  const apiKey = process.env.SMS_INDIA_HUB_API_KEY;
  const username = process.env.SMS_INDIA_HUB_USERNAME;
  const password = process.env.SMS_INDIA_HUB_PASSWORD;
  const senderId = process.env.SMS_INDIA_HUB_SENDER_ID;

  if (smsProvider !== 'SMS_INDIA') {
    throw new Error(`Unsupported SMS provider: ${smsProvider}. Set SMS_PROVIDER=SMS_INDIA.`);
  }

  if (!senderId) {
    throw new Error('SMS_INDIA_HUB_SENDER_ID is not configured');
  }

  if (!apiKey && (!username || !password)) {
    throw new Error('SMS India Hub credentials are not configured');
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    throw new Error('Invalid phone number');
  }

  const apiUrl = process.env.SMS_INDIA_HUB_BASE_URL || 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
  const message = `Welcome to the HEALWAY powered by SMSINDIAHUB. Your OTP for registration is ${otp}`;

  if (apiKey) {
    const apiKeyParams = {
      APIKey: apiKey,
      msisdn: formattedPhone,
      sid: senderId,
      msg: message,
      fl: 0,
      gwid: 2,
    };

    console.log('Using API Key auth');
    console.log('[SMS India Hub] request params:', {
      ...apiKeyParams,
      APIKey: '[redacted]',
    });

    try {
      return await sendSmsRequest({ apiUrl, params: apiKeyParams });
    } catch (apiKeyError) {
      if (!username || !password) {
        throw apiKeyError;
      }

      console.warn('Fallback to username/password');
      const fallbackParams = {
        user: username,
        password,
        msisdn: formattedPhone,
        sid: senderId,
        msg: message,
        fl: 0,
        gwid: 2,
      };

      console.log('[SMS India Hub] request params:', {
        ...fallbackParams,
        password: '[redacted]',
      });

      return sendSmsRequest({ apiUrl, params: fallbackParams });
    }
  }

  if (!username || !password) {
    throw new Error('SMS India Hub API key is missing and username/password fallback is not configured');
  }

  console.log('Fallback to username/password');
  const fallbackParams = {
    user: username,
    password,
    msisdn: formattedPhone,
    sid: senderId,
    msg: message,
    fl: 0,
    gwid: 2,
  };

  console.log('[SMS India Hub] request params:', {
    ...fallbackParams,
    password: '[redacted]',
  });

  return sendSmsRequest({ apiUrl, params: fallbackParams });
};

module.exports = {
  sendMobileOtp,
  formatPhoneNumber,
};
