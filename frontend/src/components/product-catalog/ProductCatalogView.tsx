'use client';

import { useCallback, useState } from 'react';
import { Coffee, Flame, QrCode, RotateCw, Sparkles, Timer, Wallet } from 'lucide-react';
import CategoryTabs from './CategoryTabs';
import FloatingCartButton from './FloatingCartButton';
import ProductList from './ProductList';
import ProductSearchBar from './ProductSearchBar';
import ProductSkeleton from './ProductSkeleton';
import { EmptyMenuState, MenuErrorState, NoResultsState } from './ProductEmptyState';
import QuickCustomizeModal from './QuickCustomizeModal';
import Toast from '@/components/ui/Toast';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { useCartStore } from '@/store/useCartStore';
import { ProductItem } from '@/types/product';

type DemoState = 'default' | 'loading' | 'empty' | 'no-results' | 'error';

const HIGHLIGHTS = [
  {
    icon: Flame,
    title: 'Cà phê rang mộc',
    description: 'Tuyển chọn từ nông hộ Gia Lai & Cầu Đất, giữ trọn hương vị nguyên bản.',
  },
  {
    icon: Wallet,
    title: '100% Cashless',
    description: 'Chạm thanh toán tức thì qua MoMo, ZaloPay, VietQR không cần đợi tiền lẻ.',
  },
  {
    icon: Timer,
    title: 'Lấy ngay không đợi',
    description: 'Đơn hàng kích hoạt trực tiếp tới máy pha tự động ngay khi thanh toán xong.',
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

  const [demoState, setDemoState] = useState<DemoState>('default');
  const [customizeProduct, setCustomizeProduct] = useState<ProductItem | null>(null);
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const closeToast = useCallback(() => setToastProduct(null), []);

  /** Khi bấm dấu cộng trên card: mở modal tùy chọn Size & Topping để khách chọn */
  const handleQuickAdd = useCallback((product: ProductItem) => {
    setCustomizeProduct(product);
  }, []);

  const badgeCount = useCartStore((state) => state.badgeCount);

  // Determine current display based on demo state or real query
  const effectiveLoading = demoState === 'loading' || (demoState === 'default' && isLoading);
  const effectiveError = demoState === 'error' ? 'Lỗi kết nối máy chủ' : (demoState === 'default' ? error : null);
  const effectiveEmptyMenu = demoState === 'empty' || (demoState === 'default' && !isLoading && !error && allProductsCount === 0);
  const effectiveNoResults =
    demoState === 'no-results' ||
    (demoState === 'default' && !isLoading && !error && allProductsCount > 0 && products.length === 0);
  const effectiveShowList =
    demoState === 'default' && !isLoading && !error && products.length > 0;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Quầng sáng nền trang trí Warm Roasted Modern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-96 w-96 rounded-full bg-[#F5EBE1]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-12 h-80 w-80 rounded-full bg-[#FAF2E8]/60 blur-3xl"
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

        <QuickCustomizeModal
          product={customizeProduct}
          isOpen={customizeProduct !== null}
          onClose={() => setCustomizeProduct(null)}
          onAdded={(summary) => setToastProduct(summary)}
        />

        {/* Tiêu đề trang + Huy hiệu dịch vụ */}
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-secondary-container px-3.5 py-1 text-secondary">
              <Coffee className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-surface-milk px-3.5 py-1.5 text-xs font-semibold text-navy shadow-card">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Pha chế tại chỗ</span>
              <span className="text-content-secondary">3–5 phút</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-surface-milk px-3.5 py-1.5 text-xs font-semibold text-navy shadow-card">
              <QrCode className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>1-Chạm QR</span>
            </div>
          </div>
        </header>

        {/* Tìm kiếm & lọc danh mục */}
        <div className="mb-8 flex flex-col gap-4">
          <ProductSearchBar
            value={searchKeyword}
            onChange={setSearchKeyword}
            disabled={effectiveLoading || !!effectiveError}
          />
          <CategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            disabled={effectiveLoading || !!effectiveError}
          />
        </div>

        {/* Vùng nội dung theo trạng thái */}
        <section aria-label="Danh sách đồ uống">
          {effectiveLoading && <ProductSkeleton />}
          {effectiveError && <MenuErrorState onRetry={() => { setDemoState('default'); retry(); }} />}
          {effectiveEmptyMenu && <EmptyMenuState />}
          {effectiveNoResults && (
            <NoResultsState
              keyword={searchKeyword || 'Từ khóa mẫu'}
              category={selectedCategory}
              onReset={() => { setDemoState('default'); resetFilters(); }}
            />
          )}
          {effectiveShowList && (
            <ProductList products={products} onQuickAdd={handleQuickAdd} />
          )}
        </section>

        {/* HỆ THỐNG CHUYỂN ĐỔI TRẠNG THÁI (STATE PREVIEW) */}
        <section
          aria-label="Chuyển đổi trạng thái mô phỏng"
          className="mt-14 rounded-3xl border border-border-warm bg-[#FAF2E8]/60 p-5 shadow-card"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#78350F]">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Hệ thống chuyển đổi trạng thái (State Preview)</span>
              </div>
              <h3 className="mt-1 text-base font-extrabold text-navy">
                Kiểm tra trải nghiệm người dùng
              </h3>
              <p className="text-xs text-content-secondary">
                Nhấp để xem phản hồi của giao diện khi tải dữ liệu, không có kết quả tìm kiếm hoặc lỗi mạng.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'default', label: 'Mặc định' },
                { id: 'loading', label: '(a) Đang tải (Skeleton)' },
                { id: 'empty', label: '(b) Menu trống' },
                { id: 'no-results', label: '(c) Không kết quả' },
                { id: 'error', label: '(d) Lỗi tải dữ liệu' },
              ].map((btn) => {
                const active = demoState === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setDemoState(btn.id as DemoState)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                      active
                        ? 'bg-primary text-white shadow-card'
                        : 'bg-surface-milk text-content-roast hover:bg-surface-sand border border-border-warm'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Điểm nhấn dịch vụ 3 cột */}
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex items-start gap-3.5 rounded-3xl border border-border-warm/70 bg-surface-milk p-4 shadow-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-navy">{title}</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-content-secondary">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <FloatingCartButton />
    </div>
  );
}
