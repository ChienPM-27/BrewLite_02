// frontend/src/services/order.service.ts
import { fetchApi } from '@/lib/api-client';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CreateOrderItemDto {
  productId: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  toppingIds?: string[];
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  promotionCode?: string;
}

export interface OrderItemDetail {
  id: string;
  productId: string;
  name: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  toppings: {
    id: string;
    toppingId: string;
    name: string;
    price: number;
  }[];
}

export interface PaymentItemDetail {
  id: string;
  method: 'E_WALLET' | 'BANK_CARD';
  status: 'SUCCESS' | 'FAILED';
  transactionRef: string;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  pointsEarned?: number;
  paidAt: string | null;
  createdAt: string;
  items: OrderItemDetail[];
  payments: PaymentItemDetail[];
}

export interface OrderSummaryItem {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  finalAmount: number;
  itemCount: number;
  createdAt: string;
}

export interface OrderHistoryResponse {
  items: OrderSummaryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export async function createOrder(dto: CreateOrderDto): Promise<OrderDetail> {
  const payload: CreateOrderDto = {
    items: dto.items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity,
      toppingIds: i.toppingIds && i.toppingIds.length > 0 ? i.toppingIds : undefined,
    })),
  };
  if (dto.promotionCode && dto.promotionCode.trim().length > 0) {
    payload.promotionCode = dto.promotionCode.trim().toUpperCase();
  }

  return await fetchApi<OrderDetail>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOrderById(orderId: string): Promise<OrderDetail> {
  return await fetchApi<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`);
}

export async function cancelOrder(orderId: string): Promise<{ id: string; orderNumber: number; status: OrderStatus }> {
  return await fetchApi<{ id: string; orderNumber: number; status: OrderStatus }>(
    `/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: 'POST',
    },
  );
}

export async function getOrderHistory(params?: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}): Promise<OrderHistoryResponse> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.status) search.set('status', params.status);

  const qs = search.toString();
  return await fetchApi<OrderHistoryResponse>(`/orders/me${qs ? `?${qs}` : ''}`);
}
