'use client';

import { Check, Lightbulb } from 'lucide-react';
import { formatSurcharge } from '@/lib/format-currency';
import { MAX_TOPPINGS } from '@/hooks/useProductDetail';
import { ProductTopping } from '@/types/product';

interface ToppingSelectorProps {
  toppings: ProductTopping[];
  selectedIds: string[];
  onToggle: (toppingId: string) => void;
  disabled?: boolean;
}

const TOPPING_DESCRIPTIONS: Record<string, string> = {
  'Trân châu trắng': 'Giòn dai sần sật',
  'Kem Cheese': 'Đậm đà ngậy thơm',
  'Kem Cheese béo': 'Đậm đà ngậy thơm',
  'Đào miếng': '2 miếng đào ngâm giòn',
  'Đào miếng giòn': '2 miếng đào ngâm giòn',
};

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
        <h2 className="text-base font-bold text-navy">Topping thêm</h2>
        <p className="rounded-2xl border border-border-warm bg-surface-milk p-3 text-sm text-content-secondary">
          Hiện tạm hết topping.
        </p>
      </section>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <div className="flex items-center justify-between gap-2">
        <legend className="text-base font-bold text-navy">
          Topping thêm (Tối đa {MAX_TOPPINGS})
        </legend>
        <span
          aria-live="polite"
          className="text-xs font-semibold text-content-secondary"
        >
          (Đã chọn {selectedIds.length}/{MAX_TOPPINGS} topping)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {toppings.map((topping) => {
          const checked = selectedIds.includes(topping.id);
          const blocked = !checked && reachedLimit;
          const description =
            (topping as any).description ||
            TOPPING_DESCRIPTIONS[topping.name] ||
            'Topping hảo hạng';

          return (
            <label
              key={topping.id}
              className={`flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-3.5 transition-all ${
                checked
                  ? 'border-primary bg-surface-milk shadow-card ring-2 ring-primary/20'
                  : 'border-border-warm bg-surface-milk hover:border-primary/40'
              } ${blocked ? 'cursor-not-allowed opacity-50 hover:bg-surface-milk' : ''}`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={blocked}
                  onChange={() => onToggle(topping.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    checked ? 'border-primary bg-primary text-white' : 'border-outline bg-surface-milk'
                  }`}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <div>
                  <h4 className="text-[13px] font-bold text-navy">{topping.name}</h4>
                  <p className="text-[11px] text-content-secondary">{description}</p>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-xs font-bold text-primary">
                  {formatSurcharge(topping.price)}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Mẹo nhỏ */}
      <div className="flex items-center gap-2 rounded-xl bg-[#FAF2E8]/60 px-3.5 py-2 text-xs text-content-roast">
        <Lightbulb className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span>
          <strong>Mẹo nhỏ:</strong> Kết hợp Kem Cheese với cà phê sữa đậm đà mang lại trải nghiệm béo ngậy cực đỉnh.
        </span>
      </div>
    </fieldset>
  );
}
