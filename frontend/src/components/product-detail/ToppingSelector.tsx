'use client';

import { Check } from 'lucide-react';
import { formatSurcharge } from '@/lib/format-currency';
import { MAX_TOPPINGS } from '@/hooks/useProductDetail';
import { ProductTopping } from '@/types/product';

interface ToppingSelectorProps {
  toppings: ProductTopping[];
  selectedIds: string[];
  onToggle: (toppingId: string) => void;
  disabled?: boolean;
}

/** Chọn / bỏ topping (checkbox), tối đa 3 loại, không chọn trùng. */
export default function ToppingSelector({
  toppings,
  selectedIds,
  onToggle,
  disabled = false,
}: ToppingSelectorProps) {
  const reachedLimit = selectedIds.length >= MAX_TOPPINGS;

  // Tất cả topping đều hết hàng -> thông báo thay vì để trống
  if (toppings.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-navy">Topping thêm</h2>
        <p className="rounded-2xl border border-border-warm bg-surface-milk p-3 text-sm text-content-secondary">
          Hiện tạm hết topping.
        </p>
      </section>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <div className="flex items-center justify-between gap-2">
        <legend className="text-lg font-bold text-navy">
          Topping thêm (Tối đa {MAX_TOPPINGS})
        </legend>
        <span
          aria-live="polite"
          className="rounded-full border border-border-warm bg-primary-light px-3 py-0.5 text-[11px] font-bold text-primary"
        >
          Đã chọn {selectedIds.length}/{MAX_TOPPINGS} topping
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {toppings.map((topping) => {
          const checked = selectedIds.includes(topping.id);
          const blocked = !checked && reachedLimit;
          return (
            <label
              key={topping.id}
              className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border-2 p-4 transition-all sm:flex-col ${
                checked
                  ? 'border-primary bg-surface-milk shadow-card'
                  : 'border-border-warm bg-surface-milk hover:bg-primary-light'
              } ${blocked ? 'cursor-not-allowed opacity-50 hover:bg-surface-milk' : ''}`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={blocked}
                  onChange={() => onToggle(topping.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
                    checked ? 'border-primary bg-primary text-surface-milk' : 'border-outline bg-surface-milk'
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-semibold text-navy">{topping.name}</span>
              </span>
              <span className="text-[13px] font-bold text-primary">
                {formatSurcharge(topping.price)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
