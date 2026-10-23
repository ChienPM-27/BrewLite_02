import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { assertTransition } from './order-state';

describe('Order State Machine Transition Table', () => {
  const allStatuses = Object.values(OrderStatus);
  const validTransitions = new Set([
    'PENDING->PAID',
    'PENDING->PAYMENT_FAILED',
    'PENDING->CANCELLED',
    'PAID->PREPARING',
    'PAID->CANCELLED',
    'PREPARING->READY',
    'READY->COMPLETED',
    'PAYMENT_FAILED->PENDING',
    'PAYMENT_FAILED->CANCELLED',
  ]);

  const allPairs: Array<[OrderStatus, OrderStatus, boolean]> = [];
  for (const from of allStatuses) {
    for (const to of allStatuses) {
      allPairs.push([from, to, validTransitions.has(`${from}->${to}`)]);
    }
  }

  it.each(allPairs)('%s -> %s (valid: %s)', (from, to, isValid) => {
    if (isValid) {
      expect(() => assertTransition(from, to)).not.toThrow();
    } else {
      expect(() => assertTransition(from, to)).toThrow(ConflictException);
    }
  });
});
