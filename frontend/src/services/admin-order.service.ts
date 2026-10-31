// frontend/src/services/admin-order.service.ts
import { fetchApi } from '@/lib/api-client';
import type { OrderStatus } from '@/services/order.service';

/** Các trạng thái admin xử lý được (đơn đã thanh toán). */
export type AdminOrderStatus = Extract<OrderStatus, 'PAID' | 'PREPARING' | 'READY'>;

export interface AdminOrderItem {
  productName: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  toppings: string[];
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  status: AdminOrderStatus;
  paidAt: string | null;
  customerName: string;
  items: AdminOrderItem[];
}

export interface AdvanceOrderResult {
  id: string;
  orderNumber: number;
  fromStatus: AdminOrderStatus;
  status: OrderStatus;
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  return await fetchApi<AdminOrder[]>('/admin/orders');
}

/** Server tự tính trạng thái kế tiếp; `expectedStatus` là trạng thái đang hiển thị trên card. */
export async function advanceAdminOrder(
  orderId: string,
  expectedStatus: AdminOrderStatus,
): Promise<AdvanceOrderResult> {
  return await fetchApi<AdvanceOrderResult>(
    `/admin/orders/${encodeURIComponent(orderId)}/advance`,
    {
      method: 'PATCH',
      body: JSON.stringify({ expectedStatus }),
    },
  );
}
