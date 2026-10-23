'use client';

import Link from 'next/link';
import { RotateCw, SearchX, TriangleAlert, UtensilsCrossed } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';
import { ProductDetailError } from '@/hooks/useProductDetail';

/** Khung xương loading của trang chi tiết. */
export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Đang tải chi tiết sản phẩm">
      <div className="skeleton mb-6 h-5 w-56 rounded-full" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="skeleton aspect-square w-full rounded-[2rem]" />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div className="skeleton h-10 w-3/4 rounded-2xl" />
          <div className="skeleton h-6 w-1/3 rounded-full" />
          <div className="skeleton h-16 w-full rounded-2xl" />
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

const primaryButton =
  'inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[13px] font-semibold text-surface-milk shadow-card transition-all hover:bg-primary-hover active:scale-95';
const secondaryButton =
  'inline-flex items-center gap-2 rounded-full border border-border-warm bg-primary-light px-6 py-2.5 text-[13px] font-semibold text-navy transition-all hover:bg-border-warm';

interface ProductDetailErrorStateProps {
  error: ProductDetailError;
  onRetry: () => void;
}

/** 404 / ID sai định dạng (400) / lỗi mạng hoặc 5xx. */
export function ProductDetailErrorState({ error, onRetry }: ProductDetailErrorStateProps) {
  if (error === 'not-found') {
    return (
      <StatePanel
        badge="Lỗi 404"
        icon={<SearchX className="h-10 w-10" aria-hidden="true" />}
        title="Không tìm thấy sản phẩm"
        description="Món bạn đang tìm có thể đã đổi tên, tạm gỡ khỏi thực đơn hoặc đường dẫn không còn tồn tại."
        actions={
          <Link href="/menu" className={primaryButton}>
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            Quay lại thực đơn
          </Link>
        }
      />
    );
  }

  if (error === 'invalid-id') {
    return (
      <StatePanel
        badge="Lỗi 400"
        icon={<SearchX className="h-10 w-10" aria-hidden="true" />}
        title="Không thể mở sản phẩm"
        description="Đường dẫn sản phẩm không hợp lệ. Vui lòng chọn món từ thực đơn."
        actions={
          <Link href="/menu" className={primaryButton}>
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            Quay lại thực đơn
          </Link>
        }
      />
    );
  }

  return (
    <StatePanel
      tone="danger"
      badge="Gián đoạn kết nối"
      icon={<TriangleAlert className="h-10 w-10" aria-hidden="true" />}
      title="Không thể tải sản phẩm"
      description="Đã xảy ra lỗi khi lấy thông tin món từ máy chủ. Vui lòng kiểm tra lại kết nối mạng và thử lại."
      actions={
        <>
          <button type="button" onClick={onRetry} className={primaryButton}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Thử lại
          </button>
          <Link href="/menu" className={secondaryButton}>
            Về thực đơn
          </Link>
        </>
      }
    />
  );
}
