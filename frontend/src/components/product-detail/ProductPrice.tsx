'use client';

import { Receipt, Star } from 'lucide-react';
import { formatSurcharge, formatVND } from '@/lib/format-currency';
import { ProductSize, ProductTopping } from '@/types/product';

interface ProductPriceProps {
  basePrice: number;
  productName?: string;
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
  productName = 'Sản phẩm',
  size,
  sizeAdjustment,
  toppings,
  toppingsTotal,
  unitPrice,
  quantity,
  totalPrice,
}: ProductPriceProps) {
  // Điểm tích lũy: mỗi 1.000đ được 1 điểm (hoặc giá trị / 1000)
  const earnedPoints = unitPrice !== null ? Math.floor(unitPrice / 1000) : 0;

  return (
    <section
      aria-label="Bảng kê giá ước tính"
      className="flex flex-col gap-2.5 rounded-2xl border border-border-warm bg-[#FAF2E8]/60 p-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold text-navy">
          <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Bảng kê chi tiết đơn giá ước tính:</span>
        </h2>
        {earnedPoints > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-surface-milk px-2.5 py-0.5 text-[11px] font-bold text-amber-600 shadow-card">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span>Tích lũy +{earnedPoints} BrewPoints</span>
          </span>
        )}
      </div>

      {unitPrice === null ? (
        <p role="alert" className="text-xs text-danger-text">
          Không thể tính giá do thiếu dữ liệu size. Vui lòng chọn size.
        </p>
      ) : (
        <dl className="flex flex-col gap-1.5 pt-1 text-xs text-content-roast">
          <div className="flex justify-between">
            <dt>Giá gốc ({productName} Size S):</dt>
            <dd className="font-bold text-navy">{formatVND(basePrice)}</dd>
          </div>
          {size && size !== ProductSize.S && (
            <div className="flex justify-between">
              <dt>Nâng cấp Size {size}:</dt>
              <dd className="font-bold text-navy">
                {formatSurcharge(sizeAdjustment ?? 0)}
              </dd>
            </div>
          )}
          {toppings.length > 0 && (
            <div className="flex justify-between gap-4">
              <dt>
                Topping ({toppings.map((t) => t.name).join(' + ')}):
              </dt>
              <dd className="shrink-0 font-bold text-navy">
                {formatSurcharge(toppingsTotal)}
              </dd>
            </div>
          )}
          <div className="my-1 h-px w-full bg-border-warm" />
          <div className="flex justify-between text-xs">
            <dt className="font-extrabold text-navy">Đơn giá 1 ly:</dt>
            <dd className="text-sm font-extrabold text-primary">{formatVND(unitPrice)}</dd>
          </div>
          {quantity > 1 && totalPrice !== null && (
            <div className="flex justify-between text-xs">
              <dt className="font-extrabold text-navy">Thành tiền (× {quantity}):</dt>
              <dd className="text-base font-extrabold text-primary">{formatVND(totalPrice)}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="pt-1 text-[11px] italic text-content-secondary">
        *Lưu ý: Đơn giá ước tính, giá cuối cùng và phí giao hàng (nếu có) sẽ được áp dụng chính xác ở bước thanh toán.
      </p>
    </section>
  );
}
