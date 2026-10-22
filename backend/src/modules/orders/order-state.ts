import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  CANCELLED: [],
};

export function assertTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): void {
  const allowedStatuses = ALLOWED_TRANSITIONS[fromStatus];

  if (!allowedStatuses?.includes(toStatus)) {
    throw new ConflictException(
      `Invalid order status transition: ${fromStatus} -> ${toStatus}`,
    );
  }
}

export { ALLOWED_TRANSITIONS };
