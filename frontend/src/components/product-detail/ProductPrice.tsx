'use client';

import { Receipt } from 'lucide-react';
import { formatSurcharge, formatVND } from '@/lib/format-currency';
import { ProductSize, ProductTopping } from '@/types/product';

interface ProductPriceProps {
  basePrice: number;
  size: ProductSize | null;
  sizeAdjustment: number | null;
  toppings: ProductTopping[];
  toppingsTotal: number;
  unitPrice: number | null;
  quantity: number;
  totalPrice: number | null;
}

/** Bảng kê giá ước tính, cập nhật tức thì khi đổi size / topping / số lượng. */
export default function ProductPrice({
  basePrice,
  size,
  sizeAdjustment,
  toppings,
  toppingsTotal,
  unitPrice,
  quantity,
  totalPrice,
}: ProductPriceProps) {
  return (
    <section
      aria-label="Bảng kê giá ước tính"
      className="flex flex-col gap-2 rounded-2xl border border-border-warm bg-[#FBF6F0] p-5 shadow-card"
    >
      <h2 className="flex items-center gap-2 text-[13px] font-bold text-[#5C3826]">
        <Receipt className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
        Bảng kê chi tiết đơn giá ước tính
      </h2>

      {unitPrice === null ? (
        <p role="alert" className="text-sm text-danger-text">
          Không thể tính giá do thiếu dữ liệu size. Vui lòng tải lại trang.
        </p>
      ) : (
        <dl className="flex flex-col gap-1 pt-1 text-xs text-content-roast">
          <div className="flex justify-between">
            <dt>Giá gốc:</dt>
            <dd className="font-semibold text-navy">{formatVND(basePrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Phụ phí Size {size}:</dt>
            <dd className="font-semibold text-navy">
              {formatSurcharge(sizeAdjustment ?? 0)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>
              Topping
              {toppings.length > 0 ? ` (${toppings.map((t) => t.name).join(' + ')})` : ''}:
            </dt>
            <dd className="shrink-0 font-semibold text-navy">
              {formatSurcharge(toppingsTotal)}
            </dd>
          </div>
          <div className="my-1 h-px w-full bg-border-warm" />
          <div className="flex justify-between text-[13px]">
            <dt className="font-bold text-[#5C3826]">Đơn giá 1 ly:</dt>
            <dd className="text-base font-extrabold text-primary">{formatVND(unitPrice)}</dd>
          </div>
          {quantity > 1 && totalPrice !== null && (
            <div className="flex justify-between text-[13px]">
              <dt className="font-bold text-[#5C3826]">Thành tiền (× {quantity}):</dt>
              <dd className="font-extrabold text-primary">{formatVND(totalPrice)}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="pt-1 text-xs italic text-content-secondary">
        * Giá ước tính, giá cuối cùng do hệ thống xác nhận chính thức khi tạo đơn.
      </p>
    </section>
  );
}
