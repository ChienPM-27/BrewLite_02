'use client';

import { formatSurcharge } from '@/lib/format-currency';
import { ProductSize, SizePrice } from '@/types/product';

interface SizeSelectorProps {
  sizePrices: SizePrice[];
  selected: ProductSize | null;
  onSelect: (size: ProductSize) => void;
  disabled?: boolean;
}

const SIZE_LABELS: Record<ProductSize, string> = {
  [ProductSize.S]: 'Nhỏ',
  [ProductSize.M]: 'Tiêu chuẩn',
  [ProductSize.L]: 'Lớn',
};

/** Chọn size S/M/L từ mảng sizePrices do API trả về. */
export default function SizeSelector({
  sizePrices,
  selected,
  onSelect,
  disabled = false,
}: SizeSelectorProps) {
  const selectedPrice = sizePrices.find((sp) => sp.size === selected);

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <div className="flex items-center justify-between gap-2">
        <legend className="flex items-center gap-2 text-base font-bold text-navy">
          <span>Chọn size</span>
          <span className="rounded-full bg-danger-light px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/30">
            Bắt buộc
          </span>
        </legend>
        {selectedPrice && (
          <span className="text-xs font-semibold text-content-secondary">
            (Đang chọn: Size {selectedPrice.size} ({formatSurcharge(selectedPrice.priceAdjustment)}))
          </span>
        )}
      </div>

      {sizePrices.length === 0 ? (
        <p className="rounded-2xl border border-warning/30 bg-warning-light p-3 text-sm text-warning-text">
          Sản phẩm chưa có size khả dụng.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Chọn size"
          className="grid grid-cols-3 gap-3"
        >
          {sizePrices.map((sp) => {
            const active = sp.size === selected;
            const label = SIZE_LABELS[sp.size];
            return (
              <button
                key={sp.size}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(sp.size)}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'border-primary bg-surface-milk text-primary shadow-card ring-2 ring-primary/20'
                    : 'border-border-warm bg-surface-milk hover:border-primary/50 text-content-roast'
                }`}
              >
                <span className="text-sm font-bold text-navy">
                  Size {sp.size} {label ? `(${label})` : ''}
                </span>
                <span className={`mt-0.5 text-xs ${active ? 'font-bold text-primary' : 'text-content-secondary'}`}>
                  {formatSurcharge(sp.priceAdjustment)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
