'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { formatVND } from '@/lib/format-currency';
import { ProductItem } from '@/types/product';

interface ProductCardProps {
  product: ProductItem;
  onQuickAdd: (product: ProductItem) => void;
}

/** Giá hiển thị "Giá từ" = giá gốc + phụ phí size nhỏ nhất. */
export function getStartingPrice(product: ProductItem): number {
  const minAdjustment = product.sizePrices.length
    ? Math.min(...product.sizePrices.map((sp) => sp.priceAdjustment))
    : 0;
  return product.basePrice + minAdjustment;
}

export default function ProductCard({ product, onQuickAdd }: ProductCardProps) {
  const soldOut = !product.isAvailable;
  const canQuickAdd = !soldOut && product.sizePrices.length > 0;
  const detailHref = `/products/${product.id}`;

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-3xl border border-border-subtle bg-surface-milk p-3 shadow-card transition-all duration-300 sm:p-4 ${
        soldOut ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-card-hover'
      }`}
    >
      <Link href={detailHref} className="block" aria-label={`Xem chi tiết ${product.name}`}>
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl bg-surface-sand">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            muted={soldOut}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {product.categoryName && (
            <span className="absolute left-2 top-2 rounded-full border border-border-warm/40 bg-surface-milk/90 px-2.5 py-0.5 text-[11px] font-bold text-navy shadow-card backdrop-blur-md">
              {product.categoryName}
            </span>
          )}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-sand/50 backdrop-blur-[2px]">
              <span className="rounded-full bg-outline px-4 py-1 text-[13px] font-semibold text-surface-milk shadow-card">
                Hết hàng
              </span>
            </div>
          )}
        </div>
        <h3 className="line-clamp-1 text-[17px] font-bold text-navy transition-colors group-hover:text-primary">
          {product.name}
        </h3>
      </Link>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          <span className="block text-[11px] font-semibold text-outline">Giá từ</span>
          <span
            className={`text-base font-bold ${
              soldOut ? 'text-content-secondary line-through' : 'text-primary'
            }`}
          >
            {formatVND(getStartingPrice(product))}
          </span>
        </div>
        {canQuickAdd ? (
          <button
            type="button"
            onClick={() => onQuickAdd(product)}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-surface-milk shadow-card transition-all hover:bg-primary-hover active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="cursor-not-allowed rounded-full bg-surface-high px-4 py-1.5 text-xs font-semibold text-outline">
            Tạm hết
          </span>
        )}
      </div>
    </article>
  );
}
