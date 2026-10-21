'use client';

import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { formatVND } from '@/lib/format-currency';
import { MOCK_PASTRIES } from '@/data/mock-products';
import { useCartStore } from '@/store/useCartStore';
import { ProductSize } from '@/types/product';

interface PastryPairingsProps {
  onAddPastry?: (name: string) => void;
}

export default function PastryPairings({ onAddPastry }: PastryPairingsProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddPastry = (pastry: typeof MOCK_PASTRIES[0]) => {
    addItem({
      productId: pastry.id,
      name: pastry.name,
      imageUrl: pastry.imageUrl,
      size: ProductSize.S,
      toppingIds: [],
      quantity: 1,
      estimatedUnitPrice: pastry.price,
      currency: 'VND',
    });
    onAddPastry?.(pastry.name);
  };

  return (
    <section aria-label="Gợi ý món ăn kèm hợp vị" className="mt-14">
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-navy lg:text-2xl">
            Gợi ý món ăn kèm hợp vị
          </h2>
          <p className="mt-0.5 text-xs text-content-secondary">
            Thưởng thức cùng bánh nướng mới trong ngày để trọn vẹn hương vị buổi sáng.
          </p>
        </div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:underline"
        >
          <span>Xem tất cả pastry</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_PASTRIES.map((pastry) => (
          <article
            key={pastry.id}
            className="group flex flex-col justify-between rounded-3xl border border-border-warm bg-surface-milk p-3 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
          >
            <div>
              <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl bg-surface-sand">
                <ProductImage
                  src={pastry.imageUrl}
                  alt={pastry.name}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 rounded-full border border-border-warm/60 bg-surface-milk/95 px-2.5 py-0.5 text-[10px] font-bold text-navy shadow-card backdrop-blur-md">
                  {pastry.tag}
                </span>
              </div>
              <h3 className="line-clamp-1 text-sm font-bold text-navy transition-colors group-hover:text-primary">
                {pastry.name}
              </h3>
              <p className="mt-0.5 text-xs font-extrabold text-primary">
                {formatVND(pastry.price)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAddPastry(pastry)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border-warm bg-surface-milk py-2 text-xs font-bold text-content-roast transition-all hover:border-primary hover:bg-primary-light hover:text-primary active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              <span>Thêm kèm</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
