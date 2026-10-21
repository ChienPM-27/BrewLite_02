'use client';

import { formatSurcharge } from '@/lib/format-currency';
import { ProductSize, SizePrice } from '@/types/product';

interface SizeSelectorProps {
  sizePrices: SizePrice[];
  selected: ProductSize | null;
  onSelect: (size: ProductSize) => void;
  disabled?: boolean;
}

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
        <legend className="flex items-center gap-2 text-lg font-bold text-navy">
          Chọn size
          <span className="rounded border border-danger/30 bg-danger-light px-1.5 py-0.5 text-[11px] font-semibold text-danger">
            Bắt buộc
          </span>
        </legend>
        {selectedPrice && (
          <span className="text-xs font-medium text-content-secondary">
            Đang chọn: Size {selectedPrice.size} ({formatSurcharge(selectedPrice.priceAdjustment)})
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
          className="grid gap-2 rounded-2xl border border-border-warm bg-primary-light p-1"
          style={{ gridTemplateColumns: `repeat(${sizePrices.length}, minmax(0, 1fr))` }}
        >
          {sizePrices.map((sp) => {
            const active = sp.size === selected;
            return (
              <button
                key={sp.size}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(sp.size)}
                className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 text-[13px] transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'bg-surface-milk text-primary shadow-card-hover ring-1 ring-primary'
                    : 'text-content-secondary hover:text-navy'
                }`}
              >
                <span className="font-bold">Size {sp.size}</span>
                <span className={`text-xs ${active ? 'font-bold' : 'opacity-75'}`}>
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
