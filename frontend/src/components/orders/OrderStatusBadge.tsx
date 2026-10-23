import React from 'react';
import { OrderStatus } from '@/services/order.service';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Chờ thanh toán',
    className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  PAID: {
    label: 'Đã thanh toán',
    className: 'bg-[#E6FCF3] text-[#065F46] border-[#A7F3D0]',
  },
  PREPARING: {
    label: 'Đang pha chế',
    className: 'bg-[#EDD8C7] text-[#7D562D] border-[#DEBEA6]',
  },
  READY: {
    label: 'Sẵn sàng nhận',
    className: 'bg-[#E6FCF3] text-[#065F46] border-[#10D98A] font-bold',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    className: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
  },
  PAYMENT_FAILED: {
    label: 'Thanh toán thất bại',
    className: 'bg-[#FDF2F0] text-[#991B1B] border-[#FECACA]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-[#F3EDE4] text-[#7C6E65] border-[#E8DED2]',
  },
};

export default function OrderStatusBadge({
  status,
  className = '',
}: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-surface-sand text-content-secondary border-border-warm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
