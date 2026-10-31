// ==========================================
// SẮP XẾP THAM SỐ
// ==========================================

export function sortObject(
  params: Record<string, string>,
): Record<string, string> {
  const sortedParams: Record<string, string> = {};

  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    sortedParams[key] = params[key];
  }

  return sortedParams;
}

// ==========================================
// MÃ HÓA GIÁ TRỊ VNPay
// ==========================================

export function encodeVnpayValue(value: string): string {
  return encodeURIComponent(value).replace(
    /%20/g,
    '+',
  );
}

// ==========================================
// CHUẨN HÓA ĐỊA CHỈ IP
// ==========================================

export function normalizeIpAddress(ip: string): string {
  let normalizedIp = ip.trim();

  if (normalizedIp.startsWith('::ffff:')) {
    normalizedIp = normalizedIp.substring(7);
  }

  if (normalizedIp === '::1') {
    normalizedIp = '127.0.0.1';
  }

  return normalizedIp;
}

// ==========================================
// LẤY THỜI GIAN VIỆT NAM
// Định dạng: yyyyMMddHHmmss
// ==========================================

export function getVietnamDateTime(
  date: Date = new Date(),
): string {
  const dateParts = new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    },
  ).formatToParts(date);

  const dateValues: Record<string, string> = {};

  for (const part of dateParts) {
    dateValues[part.type] = part.value;
  }

  return (
    dateValues.year +
    dateValues.month +
    dateValues.day +
    dateValues.hour +
    dateValues.minute +
    dateValues.second
  );
}