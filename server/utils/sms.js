function clean(value = '') {
  return String(value || '').trim();
}

export function normalizeBangladeshPhone(phone = '') {
  let number = clean(phone).replace(/[^0-9+]/g, '');
  if (number.startsWith('+')) number = number.slice(1);
  if (number.startsWith('00')) number = number.slice(2);
  if (number.startsWith('01') && number.length === 11) return `88${number}`;
  if (number.startsWith('1') && number.length === 10) return `880${number}`;
  return number;
}

function isSmsConfigured() {
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY && process.env.SMS_SENDER_ID);
}

function buildOtpMessage({ otp, accountType = 'account' }) {
  const appName = process.env.APP_NAME || 'Shoppy';
  return process.env.SMS_OTP_TEMPLATE
    ? process.env.SMS_OTP_TEMPLATE.replace(/{{otp}}/g, otp).replace(/{{appName}}/g, appName).replace(/{{accountType}}/g, accountType)
    : `Your ${appName} ${accountType} password change OTP is ${otp}. It will expire in 10 minutes.`;
}

function buildPayload({ to, message }) {
  const payload = new URLSearchParams();
  payload.set(process.env.SMS_API_KEY_PARAM || 'api_key', process.env.SMS_API_KEY || '');
  payload.set(process.env.SMS_TO_PARAM || 'number', normalizeBangladeshPhone(to));
  payload.set(process.env.SMS_SENDER_PARAM || 'senderid', process.env.SMS_SENDER_ID || '');
  payload.set(process.env.SMS_MESSAGE_PARAM || 'message', message);

  const typeParam = process.env.SMS_TYPE_PARAM || 'type';
  const typeValue = process.env.SMS_TYPE_VALUE || 'text';
  if (typeParam && typeValue) payload.set(typeParam, typeValue);

  const extraParams = clean(process.env.SMS_EXTRA_PARAMS);
  if (extraParams) {
    for (const pair of extraParams.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (key) payload.set(key, value);
    }
  }
  return payload;
}

function looksLikeSmsSuccess(status, bodyText) {
  const body = String(bodyText || '').toLowerCase();
  if (status < 200 || status >= 300) return false;
  if (!body) return true;
  return !['error', 'invalid', 'failed', 'fail', 'insufficient', 'unauthorized'].some((word) => body.includes(word));
}

export async function sendSms({ to, message }) {
  if (!isSmsConfigured()) {
    return { sent: false, reason: 'SMS is not configured' };
  }
  if (!to) return { sent: false, reason: 'Phone number is missing' };

  const normalizedTo = normalizeBangladeshPhone(to);
  const payload = buildPayload({ to: normalizedTo, message });
  const method = clean(process.env.SMS_API_METHOD || 'POST').toUpperCase();

  let response;
  if (method === 'GET') {
    const separator = process.env.SMS_API_URL.includes('?') ? '&' : '?';
    response = await fetch(`${process.env.SMS_API_URL}${separator}${payload.toString()}`);
  } else {
    response = await fetch(process.env.SMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
  }

  const text = await response.text();
  const sent = looksLikeSmsSuccess(response.status, text);
  if (!sent) console.error('[SMS OTP ERROR]', response.status, text);
  return { sent, status: response.status, response: text, to: normalizedTo };
}

export async function sendPasswordOtpSms({ to, otp, accountType }) {
  const message = buildOtpMessage({ otp, accountType });
  const result = await sendSms({ to, message });
  if (!result.sent) console.log(`[DEV SMS OTP] ${accountType} ${to || 'no-phone'}: ${otp}`);
  return result;
}
