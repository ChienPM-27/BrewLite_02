'use client';

import { useCallback, useState } from 'react';
import { Coffee, SlidersHorizontal, Star, Wallet } from 'lucide-react';
import CategoryTabs from './CategoryTabs';
import FloatingCartButton from './FloatingCartButton';
import ProductList from './ProductList';
import ProductSearchBar from './ProductSearchBar';
import ProductSkeleton from './ProductSkeleton';
import { EmptyMenuState, MenuErrorState, NoResultsState } from './ProductEmptyState';
import Toast from '@/components/ui/Toast';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { useCartStore } from '@/store/useCartStore';
import { ProductItem } from '@/types/product';

const HIGHLIGHTS = [
  {
    icon: Wallet,
    title: 'Thanh toán không tiền mặt',
    description: 'Thanh toán nhanh bằng ví điện tử hoặc thẻ ngân hàng.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Tùy chỉnh theo ý bạn',
    description: 'Chọn size S/M/L và tối đa 3 topping cho mỗi ly.',
  },
  {
    icon: Star,
    title: 'Tích điểm mỗi đơn',
    description: 'Mỗi 1.000đ thanh toán thành công được cộng 1 điểm thưởng.',
  },
];

export default function ProductCatalogView() {
  const {
    products,
    allProductsCount,
    isLoading,
    error,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchKeyword,
    setSearchKeyword,
    resetFilters,
    retry,
  } = useProductCatalog();

  const addItem = useCartStore((state) => state.addItem);
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const closeToast = useCallback(() => setToastProduct(null), []);

  /** Thêm nhanh: size nhỏ nhất, không topping. Muốn tùy chỉnh thì vào trang chi tiết. */
  const handleQuickAdd = useCallback(
    (product: ProductItem) => {
      const defaultSize = product.sizePrices[0];
      if (!defaultSize) return;
      addItem({
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        size: defaultSize.size,
        toppingIds: [],
        quantity: 1,
        estimatedUnitPrice: product.basePrice + defaultSize.priceAdjustment,
        currency: 'VND',
      });
      setToastProduct(`${product.name} (Size ${defaultSize.size})`);
    },
    [addItem],
  );

  const showContent = !isLoading && !error;
  const badgeCount = useCartStore((state) => state.badgeCount);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Quầng sáng nền trang trí */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-96 w-96 rounded-full bg-primary-light/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-12 h-80 w-80 rounded-full bg-secondary-container/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 lg:px-8">
        <Toast
          open={toastProduct !== null}
          title="Đã thêm vào giỏ hàng!"
          description={toastProduct ?? undefined}
          actionHref="/cart"
          actionLabel={`Xem giỏ hàng (${badgeCount} món)`}
          onClose={closeToast}
        />

        {/* Tiêu đề trang */}
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-secondary-container px-3 py-0.5 text-secondary">
              <Coffee className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Artisanal Craft &amp; Swift Tap
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-navy lg:text-[40px] lg:leading-[48px]">
              Thực đơn
            </h1>
            <p className="mt-1 text-base text-content-secondary">
              Đồ uống tươi mới, pha chế thủ công mỗi ngày.
            </p>
          </div>
          {showContent && allProductsCount > 0 && (
            <p className="text-sm font-semibold text-content-roast" aria-live="polite">
              {products.length}/{allProductsCount} món
            </p>
          )}
        </header>

        {/* Tìm kiếm & lọc danh mục */}
        <div className="mb-8 flex flex-col gap-4">
          <ProductSearchBar
            value={searchKeyword}
            onChange={setSearchKeyword}
            disabled={isLoading || !!error}
          />
          <CategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            disabled={isLoading || !!error}
          />
        </div>

        {/* Vùng nội dung theo trạng thái */}
        <section aria-label="Danh sách đồ uống">
          {isLoading && <ProductSkeleton />}
          {error && <MenuErrorState onRetry={retry} />}
          {showContent && allProductsCount === 0 && <EmptyMenuState />}
          {showContent && allProductsCount > 0 && products.length === 0 && (
            <NoResultsState
              keyword={searchKeyword}
              category={selectedCategory}
              onReset={resetFilters}
            />
          )}
          {showContent && products.length > 0 && (
            <ProductList products={products} onQuickAdd={handleQuickAdd} />
          )}
        </section>

        {/* Điểm nhấn dịch vụ */}
        <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-3xl border border-border-warm/70 bg-surface-milk p-4 shadow-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
                <p className="mt-0.5 text-xs text-content-secondary">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <FloatingCartButton />
    </div>
  );
}
