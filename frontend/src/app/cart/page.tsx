'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Coffee,
  CreditCard,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Toast from '@/components/ui/Toast';
import EditCartItemModal from '@/components/cart/EditCartItemModal';
import { CartItem, useCartStore } from '@/store/useCartStore';
import { useHydrated } from '@/hooks/useHydrated';
import { formatVND } from '@/lib/format-currency';

export default function CartPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const badgeCount = useCartStore((state) => state.badgeCount);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [promoCode, setPromoCode] = useState('');
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [cartToast, setCartToast] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="skeleton mx-auto h-40 w-full max-w-md rounded-3xl" />
      </div>
    );
  }

  const handleCheckout = () => {
    if (items.length === 0) return;
    const promo = promoCode.trim();
    router.push(promo ? `/checkout?promo=${encodeURIComponent(promo)}` : '/checkout');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
      <Toast
        open={cartToast !== null}
        title="Giỏ hàng đã cập nhật!"
        description={cartToast ?? undefined}
        onClose={() => setCartToast(null)}
      />

      <EditCartItemModal
        item={editingItem}
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSaved={(msg) => setCartToast(msg)}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-content-secondary"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <Link href="/menu" className="transition-colors hover:text-primary">
          Thực đơn
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <span className="truncate text-navy font-bold" aria-current="page">
          Giỏ hàng của bạn ({badgeCount} món)
        </span>
      </nav>

      {/* Giỏ hàng trống */}
      {items.length === 0 && (
        <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-border-warm bg-surface-milk p-12 text-center shadow-card">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-container text-primary">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-navy">
            Giỏ hàng của bạn đang trống
          </h2>
          <p className="mt-1 max-w-sm text-sm text-content-secondary">
            Bạn chưa chọn món nào. Hãy ghé qua thực đơn để khám phá các dòng cà phê rang mộc và trà tươi mát nhé!
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
          >
            <Coffee className="h-4 w-4" />
            <span>Khám phá thực đơn ngay</span>
          </Link>
        </div>
      )}

      {/* Nội dung giỏ hàng khi có món */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Cột trái: Danh sách món trong giỏ */}
          <div className="flex flex-col gap-4 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <h1 className="text-xl font-extrabold text-navy lg:text-2xl">
                Món đã chọn ({badgeCount})
              </h1>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-danger hover:underline"
              >
                Xóa tất cả
              </button>
            </div>

            <ul className="flex flex-col gap-3">
              {items.map((item) => {
                const itemTotal = item.estimatedUnitPrice * item.quantity;
                const toppingsLabel =
                  item.toppingNames && item.toppingNames.length > 0
                    ? item.toppingNames.join(', ')
                    : '';

                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border-warm bg-surface-milk p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-sand">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <Link
                          href={`/products/${item.productId}`}
                          className="text-base font-bold text-navy hover:text-primary transition-colors"
                        >
                          {item.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-content-secondary">
                          <span className="rounded-md bg-secondary-container px-2 py-0.5 font-bold text-secondary">
                            Size {item.size}
                          </span>
                          {toppingsLabel && (
                            <span className="text-content-roast">
                              + {toppingsLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-sm font-extrabold text-primary">
                            {formatVND(item.estimatedUnitPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-border-warm bg-surface-sand/80 px-2.5 py-0.5 text-[11px] font-bold text-content-roast transition-colors hover:border-primary hover:bg-primary-light hover:text-primary active:scale-95"
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            <span>Đổi Size / Topping</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border-warm/60 pt-2 sm:border-0 sm:pt-0">
                      <QuantityStepper
                        quantity={item.quantity}
                        onChange={(newQty) => updateQuantity(item.id, newQty)}
                      />
                      <div className="text-right min-w-[70px]">
                        <span className="block text-sm font-extrabold text-navy">
                          {formatVND(itemTotal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          aria-label={`Sửa ${item.name}`}
                          className="rounded-full p-2 text-content-secondary transition-colors hover:bg-secondary-container hover:text-secondary"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Xóa ${item.name}`}
                          className="rounded-full p-2 text-content-secondary transition-colors hover:bg-danger-light hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex items-center justify-between">
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Tiếp tục thêm món khác</span>
              </Link>
            </div>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng & Thanh toán */}
          <div className="lg:sticky lg:top-24 lg:col-span-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
              <h2 className="text-lg font-extrabold text-navy">
                Tóm tắt đơn hàng
              </h2>

              {/* Nhập mã giảm giá */}
              <div>
                <label htmlFor="cart-promo-code" className="mb-1.5 block text-xs font-bold text-navy">
                  Mã ưu đãi
                </label>
                <input
                  id="cart-promo-code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Nhập mã ưu đãi (VD: BREWLITE)"
                  className="w-full rounded-full border border-border-warm bg-surface-sand px-4 py-2 text-xs font-medium text-navy placeholder:text-content-secondary outline-none focus:border-primary"
                />
                <p className="mt-1 text-[11px] text-content-secondary">
                  Mã giảm giá sẽ được áp dụng và xác thực tại bước đặt hàng.
                </p>
              </div>

              <div className="h-px w-full bg-border-warm" />

              {/* Bảng kê tổng tiền */}
              <dl className="flex flex-col gap-2 text-xs text-content-roast">
                <div className="flex justify-between">
                  <dt>Tạm tính:</dt>
                  <dd className="font-bold text-navy">{formatVND(totalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Phương thức nhận:</dt>
                  <dd className="font-bold text-navy">Lấy tại quầy (Miễn phí)</dd>
                </div>
                <div className="my-1 h-px w-full bg-border-warm" />
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm font-extrabold text-navy">Tổng cộng:</dt>
                  <dd className="text-xl font-extrabold text-primary">
                    {formatVND(totalAmount)}
                  </dd>
                </div>
              </dl>

              {/* Nút thanh toán */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                <span>Tiến hành thanh toán</span>
              </button>

              {/* Phương thức thanh toán cashless */}
              <div className="pt-2 text-center">
                <span className="text-[11px] font-semibold text-content-secondary">
                  Thanh toán 100% không tiền mặt
                </span>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="rounded-lg bg-surface-sand px-2.5 py-1 text-[10px] font-bold text-navy">
                    Ví điện tử
                  </span>
                  <span className="rounded-lg bg-surface-sand px-2.5 py-1 text-[10px] font-bold text-navy">
                    Thẻ ngân hàng
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-content-secondary">
                <ShieldCheck className="h-3.5 w-3.5 text-[#006337]" />
                <span>Bảo mật giao dịch tiêu chuẩn ngân hàng</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
