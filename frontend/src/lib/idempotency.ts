/**
 * Tạo Idempotency-Key an toàn kể cả khi không ở trong Secure Context (HTTPS/localhost),
 * ví dụ khi truy cập qua mạng nội bộ http://<IP-LAN>:3000.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback nếu môi trường không cho phép gọi
    }
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
