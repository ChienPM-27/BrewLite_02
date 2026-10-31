import { IsIn } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export const ADVANCEABLE_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
] as const;

export type AdvanceableStatus = (typeof ADVANCEABLE_STATUSES)[number];

export class AdvanceOrderDto {
  /** Trạng thái admin đang nhìn thấy trên màn hình — chống bấm trùng / 2 admin cùng bấm. */
  @IsIn(ADVANCEABLE_STATUSES)
  expectedStatus!: AdvanceableStatus;
}
