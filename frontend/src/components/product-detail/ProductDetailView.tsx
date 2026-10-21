'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import ProductInfo, { ProductGallery } from './ProductInfo';
import ProductPrice from './ProductPrice';
import SizeSelector from './SizeSelector';
import ToppingSelector from './ToppingSelector';
import { ProductDetailErrorState, ProductDetailSkeleton } from './ProductDetailStates';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Toast from '@/components/ui/Toast';
import { useProductDetail } from '@/hooks/useProductDetail';
import { formatVND } from '@/lib/format-currency';
import { useCartStore } from '@/store/useCartStore';

interface ProductDetailViewProps {
  id: string;
}

export default function ProductDetailView({ id }: ProductDetailViewProps) {
  const {
    product,
    isLoading,
    error,
    retry,
    size,
    setSize,
    selectedSizePrice,
    toppingIds,
    selectedToppings,
    toppingsTotal,
    toggleTopping,
    quantity,
    changeQuantity,
    unitPrice,
    totalPrice,
    canAddToCart,
  } = useProductDetail(id);

  const addItem = useCartStore((state) => state.addItem);
  const [toast, setToast] = useState<{ summary: string; count: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const addingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(
    () => () => {
      if (addingTimer.current) clearTimeout(addingTimer.current);
    },
    [],
  );

  const handleAddToCart = () => {
    // Chặn bấm lặp và chặn thêm khi dữ liệu không hợp lệ (UC-PROD-04: E1, E2, E3, E6)
    if (!product || !canAddToCart || size === null || unitPrice === null || isAdding) return;

    setIsAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppingIds,
      quantity,
      estimatedUnitPrice: unitPrice,
      currency: product.currency,
    });

    const toppingLabel =
      selectedToppings.length > 0 ? `, ${selectedToppings.length} topping` : '';
    setToast({
      summary: `${product.name} (Size ${size}${toppingLabel}) × ${quantity}`,
      count: useCartStore.getState().badgeCount,
    });
    addingTimer.current = setTimeout(() => setIsAdding(false), 700);
  };

  const soldOut = !!product && !product.isAvailable;

  let ctaLabel = 'Thêm vào giỏ hàng';
  if (soldOut) ctaLabel = 'Sản phẩm không còn bán';
  else if (product && unitPrice === null) ctaLabel = 'Chưa thể thêm vào giỏ';
  else if (totalPrice !== null) ctaLabel = `Thêm vào giỏ hàng – ${formatVND(totalPrice)}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
      <Toast
        open={toast !== null}
        title="Đã thêm vào giỏ hàng!"
        description={toast?.summary}
        actionHref="/cart"
        actionLabel={`Xem giỏ hàng (${toast?.count ?? 0} món)`}
        onClose={closeToast}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-[13px] font-semibold text-content-secondary"
      >
        <Link href="/menu" className="transition-colors hover:text-primary">
          Thực đơn
        </Link>
        <ChevronRight className="h-4 w-4 text-border-warm" aria-hidden="true" />
        <span className="truncate text-navy" aria-current="page">
          {product?.name ?? 'Chi tiết sản phẩm'}
        </span>
      </nav>

      {isLoading && <ProductDetailSkeleton />}

      {!isLoading && error && <ProductDetailErrorState error={error} onRetry={retry} />}

      {!isLoading && !error && product && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Cột trái: ảnh */}
          <section className="lg:sticky lg:top-28 lg:col-span-5">
            <ProductGallery product={product} />
          </section>

          {/* Cột phải: thông tin & tùy chỉnh */}
          <section className="flex flex-col gap-6 lg:col-span-7">
            <ProductInfo product={product} />

            <div className="h-px w-full bg-border-warm" />

            <SizeSelector
              sizePrices={product.sizePrices}
              selected={size}
              onSelect={setSize}
              disabled={soldOut}
            />

            <ToppingSelector
              toppings={product.toppings}
              selectedIds={toppingIds}
              onToggle={toggleTopping}
              disabled={soldOut}
            />

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-warm bg-surface-milk p-4 shadow-card">
              <span className="text-lg font-bold text-navy">Số lượng</span>
              <QuantityStepper
                quantity={quantity}
                onChange={changeQuantity}
                disabled={soldOut}
              />
            </div>

            <ProductPrice
              basePrice={product.basePrice}
              size={size}
              sizeAdjustment={selectedSizePrice?.priceAdjustment ?? null}
              toppings={selectedToppings}
              toppingsTotal={toppingsTotal}
              unitPrice={unitPrice}
              quantity={quantity}
              totalPrice={totalPrice}
            />

            {/* Thanh hành động dính đáy */}
            <div className="sticky bottom-4 z-40 flex items-center gap-4 rounded-2xl border border-border-warm bg-surface-milk/95 p-4 shadow-dock backdrop-blur-xl">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-content-secondary">
                  Tổng tiền tạm tính
                </span>
                <span className="text-xl font-extrabold text-primary" aria-live="polite">
                  {totalPrice !== null ? formatVND(totalPrice) : '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAddToCart || isAdding}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-bold text-surface-milk shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-outline disabled:shadow-none disabled:hover:bg-outline"
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span>{ctaLabel}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
