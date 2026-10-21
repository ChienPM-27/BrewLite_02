'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import ProductInfo, { ProductGallery } from './ProductInfo';
import ProductPrice from './ProductPrice';
import SizeSelector from './SizeSelector';
import ToppingSelector from './ToppingSelector';
import PreferenceSelector from './PreferenceSelector';
import PastryPairings from './PastryPairings';
import { ProductDetailErrorState, ProductDetailSkeleton } from './ProductDetailStates';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Toast from '@/components/ui/Toast';
import { useProductDetail } from '@/hooks/useProductDetail';
import { formatVND } from '@/lib/format-currency';
import { useCartStore } from '@/store/useCartStore';

type DemoDetailState = 'active' | 'sold-out' | 'loading' | 'error-500' | 'error-404';

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

  const [demoState, setDemoState] = useState<DemoDetailState>('active');
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

  const isSoldOut = demoState === 'sold-out' || (demoState === 'active' && !!product && !product.isAvailable);

  let ctaLabel = 'Thêm vào giỏ hàng';
  if (isSoldOut) ctaLabel = 'Sản phẩm không còn bán';
  else if (product && unitPrice === null) ctaLabel = 'Chưa thể thêm vào giỏ';
  else if (totalPrice !== null) ctaLabel = `Thêm vào giỏ hàng – ${formatVND(totalPrice)}`;

  const effectiveLoading = demoState === 'loading' || (demoState === 'active' && isLoading);
  const effectiveError =
    demoState === 'error-404'
      ? 'not-found'
      : demoState === 'error-500'
      ? 'network'
      : demoState === 'active'
      ? error
      : null;

  // Clone product with availability overridden by demo state
  const displayedProduct = product
    ? {
        ...product,
        isAvailable: demoState === 'sold-out' ? false : product.isAvailable,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 lg:px-8">
      <Toast
        open={toast !== null}
        title="Đã thêm vào giỏ hàng!"
        description={toast?.summary}
        actionHref="/cart"
        actionLabel={`Xem giỏ hàng (${toast?.count ?? 0} món)`}
        onClose={closeToast}
      />

      {/* THANH CHẾ ĐỘ MÔ PHỎNG TRẠNG THÁI (UX DEMO STATES) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-warm bg-[#FAF2E8]/70 px-4 py-2.5 text-xs text-navy shadow-card">
        <div className="flex items-center gap-2 font-bold text-[#78350F]">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>CHẾ ĐỘ MÔ PHỎNG TRẠNG THÁI (UX DEMO STATES):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'active', label: 'Sẵn sàng (Active)' },
            { id: 'sold-out', label: 'Hết hàng (Sold Out)' },
            { id: 'loading', label: 'Đang tải (Skeleton)' },
            { id: 'error-500', label: 'Lỗi kết nối (500)' },
            { id: 'error-404', label: 'Không tìm thấy (404)' },
          ].map((btn) => {
            const active = demoState === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDemoState(btn.id as DemoDetailState)}
                className={`rounded-full px-3 py-1 font-bold transition-all active:scale-95 ${
                  active
                    ? 'bg-primary text-white shadow-card'
                    : 'border border-border-warm bg-surface-milk text-content-roast hover:bg-surface-sand'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-content-secondary"
      >
        <Link href="/menu" className="transition-colors hover:text-primary">
          Thực đơn
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <Link href="/menu" className="transition-colors hover:text-primary">
          {displayedProduct?.categoryName || 'Cà phê'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <span className="truncate text-navy font-bold" aria-current="page">
          {displayedProduct?.name ?? 'Chi tiết sản phẩm'}
        </span>
      </nav>

      {effectiveLoading && <ProductDetailSkeleton />}

      {!effectiveLoading && effectiveError && (
        <ProductDetailErrorState
          error={effectiveError}
          onRetry={() => {
            setDemoState('active');
            retry();
          }}
        />
      )}

      {!effectiveLoading && !effectiveError && displayedProduct && (
        <>
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Cột trái: ảnh, thumbnails, hồ sơ rang */}
            <section className="lg:sticky lg:top-24 lg:col-span-5">
              <ProductGallery product={displayedProduct} />
            </section>

            {/* Cột phải: thông tin & tùy chỉnh */}
            <section className="flex flex-col gap-5 lg:col-span-7">
              <ProductInfo product={displayedProduct} />

              <div className="h-px w-full bg-border-warm" />

              <SizeSelector
                sizePrices={displayedProduct.sizePrices}
                selected={size}
                onSelect={setSize}
                disabled={isSoldOut}
              />

              <ToppingSelector
                toppings={displayedProduct.toppings}
                selectedIds={toppingIds}
                onToggle={toggleTopping}
                disabled={isSoldOut}
              />

              {/* Tùy chỉnh Độ ngọt & Lượng đá */}
              <PreferenceSelector disabled={isSoldOut} />

              {/* Bộ đếm số lượng & Nhắc đặt trước */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-warm bg-surface-milk p-4 shadow-card">
                <span className="text-base font-bold text-navy">Số lượng</span>
                <div className="flex items-center gap-4">
                  <QuantityStepper
                    quantity={quantity}
                    onChange={changeQuantity}
                    disabled={isSoldOut}
                  />
                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#006337]">
                    <Zap className="h-3.5 w-3.5 fill-[#006337]" aria-hidden="true" />
                    <span>Đặt trước 10 phút, không cần xếp hàng</span>
                  </div>
                </div>
              </div>

              {/* Bảng kê giá chi tiết & BrewPoints */}
              <ProductPrice
                basePrice={displayedProduct.basePrice}
                productName={displayedProduct.name}
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">
                    Tổng tiền tạm tính
                  </span>
                  <span className="text-xl font-extrabold text-primary" aria-live="polite">
                    {totalPrice !== null ? formatVND(totalPrice) : '—'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || isAdding || isSoldOut}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-bold text-surface-milk shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-outline disabled:shadow-none disabled:hover:bg-outline"
                >
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  <span>{ctaLabel}</span>
                </button>
              </div>
            </section>
          </div>

          {/* Gợi ý món ăn kèm hợp vị (Pastry cross-sell) */}
          <PastryPairings
            onAddPastry={(pastryName) => {
              setToast({
                summary: `${pastryName} × 1`,
                count: useCartStore.getState().badgeCount,
              });
            }}
          />
        </>
      )}
    </div>
  );
}
