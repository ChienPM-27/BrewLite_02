'use client';

import { Minus, Plus } from 'lucide-react';
import { MAX_QUANTITY, MIN_QUANTITY } from '@/hooks/useProductDetail';

interface QuantityStepperProps {
  quantity: number;
  onChange: (newQuantity: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

/** Bộ tăng/giảm số lượng dạng pill (1..99, Quyết định D5). */
export default function QuantityStepper({
  quantity,
  onChange,
  disabled = false,
  min = MIN_QUANTITY,
  max = MAX_QUANTITY,
}: QuantityStepperProps) {
  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-full bg-surface-milk text-navy transition-all hover:bg-border-warm disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center gap-1 rounded-full border border-border-warm bg-primary-light p-1">
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={disabled || quantity <= min}
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className={buttonClass}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        aria-label={`Số lượng: ${quantity}`}
        className="w-12 select-none text-center text-base font-bold text-navy"
      >
        {quantity}
      </output>
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        className={buttonClass}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
