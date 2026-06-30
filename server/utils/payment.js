const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

export function isCashOnDeliveryPayment(paymentMethod, paymentDetails = {}) {
  const method = normalize(paymentMethod || paymentDetails?.paymentMethod || paymentDetails?.method);
  const type = normalize(paymentDetails?.paymentType || paymentDetails?.payment_type || paymentDetails?.type);
  return ['cod', 'cash', 'cash_on_delivery'].includes(method) || ['cod', 'cash', 'cash_on_delivery'].includes(type);
}

export function isAutoPaidPayment(paymentMethod, paymentDetails = {}) {
  if (isCashOnDeliveryPayment(paymentMethod, paymentDetails)) return false;
  const method = normalize(paymentMethod || paymentDetails?.paymentMethod || paymentDetails?.method);
  const type = normalize(paymentDetails?.paymentType || paymentDetails?.payment_type || paymentDetails?.type);
  const bankName = normalize(paymentDetails?.bankName || paymentDetails?.bank_name);
  const cardType = normalize(paymentDetails?.cardType || paymentDetails?.card_type);
  const paidMethods = new Set([
    'bkash', 'b_kash', 'nagad', 'nogod', 'rocket', 'upay',
    'card', 'bank', 'bank_card', 'debit_card', 'credit_card',
    'mobile_banking', 'prepaid', 'online', 'sslcommerz', 'bank_transfer'
  ]);
  return [method, type, bankName, cardType].some((v) => paidMethods.has(v));
}

export function resolvePaymentStatus({ paymentMethod, paymentDetails = {}, status, currentPaymentStatus = 'pending' } = {}) {
  if (isAutoPaidPayment(paymentMethod, paymentDetails)) return 'paid';
  if (isCashOnDeliveryPayment(paymentMethod, paymentDetails) && status === 'delivered') return 'paid';
  return currentPaymentStatus || 'pending';
}
