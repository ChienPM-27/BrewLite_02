// frontend/src/services/payment.service.ts
import { fetchApi } from '@/lib/api-client';

export type PaymentMethod = 'E_WALLET' | 'BANK_CARD';
export type PaymentStatus = 'SUCCESS' | 'FAILED';

export interface CreatePaymentDto {
  orderId: string;
  method: PaymentMethod;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef: string;
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
    }),
  });
}
