// frontend/src/services/payment.service.ts
import { fetchApi } from '@/lib/api-client';

export type PaymentMethod = 'E_WALLET' | 'BANK_CARD';
export type PaymentGateway = 'MOCK' | 'VNPAY';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface CreatePaymentDto {
  orderId: string;
  method: PaymentMethod;
  gateway?: PaymentGateway;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  gateway?: PaymentGateway;
  status: PaymentStatus;
  transactionRef: string;
  gatewayTransactionNo?: string | null;
  paymentUrl?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

export async function createPayment(
  dto: CreatePaymentDto,
  idempotencyKey: string,
  demoFail?: boolean,
): Promise<PaymentResponse> {
  const headers: Record<string, string> = {
    'Idempotency-Key': idempotencyKey,
  };

  if (demoFail) {
    headers['X-Mock-Outcome'] = 'FAILED';
  }

  return await fetchApi<PaymentResponse>('/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId: dto.orderId,
      method: dto.method,
      gateway: dto.gateway ?? 'MOCK',
    }),
  });
}

export async function getPayment(paymentId: string): Promise<PaymentResponse> {
  return await fetchApi<PaymentResponse>(`/payments/${paymentId}`);
}

export interface TunnelInfo {
  tunnelUrl: string | null;
  ipnUrl: string | null;
  sandbox: {
    merchantAdminUrl: string;
    email: string;
    password: string;
    tmnCode: string;
  };
  testCard: {
    bank: string;
    cardNumber: string;
    cardHolder: string;
    issueDate: string;
    otp: string;
  };
}

export async function getTunnelInfo(): Promise<TunnelInfo | null> {
  try {
    return await fetchApi<TunnelInfo>('/payments/vnpay/tunnel-info');
  } catch {
    return null;
  }
}
