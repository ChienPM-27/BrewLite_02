'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useHydrated } from '@/hooks/useHydrated';
import { formatVND } from '@/lib/format-currency';

/** Nút giỏ hàng nổi ở góc dưới phải; chỉ hiện khi giỏ có món. */
export default function FloatingCartButton() {
  const hydrated = useHydrated();
  const badgeCount = useCartStore((state) => state.badgeCount);
  const totalAmount = useCartStore((state) => state.totalAmount);

  if (!hydrated || badgeCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-40 sm:right-8">
      <Link
        href="/cart"
        className="group flex items-center gap-3 rounded-full bg-primary px-5 py-2.5 text-surface-milk shadow-dock transition-all hover:bg-primary-hover active:scale-95"
      >
        <span className="relative">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary-container px-1 text-[10px] font-bold text-secondary">
            {badgeCount}
          </span>
        </span>
        <span className="flex flex-col text-left">
          <span className="text-[11px] font-semibold leading-none text-primary-light/90">
            Giỏ hàng của bạn
          </span>
          <span className="text-sm font-bold leading-tight">
            {badgeCount} món · {formatVND(totalAmount)}
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
