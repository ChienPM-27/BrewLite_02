'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Coffee,
  CreditCard,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { computeCartSignature, useCartStore } from '@/store/useCartStore';
import { cancelOrder, createOrder } from '@/services/order.service';
import { formatVND } from '@/lib/format-currency';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthed, hydrated } = useRequireAuth();

  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const badgeCount = useCartStore((state) => state.badgeCount);
  const pendingOrderId = useCartStore((state) => state.pendingOrderId);
  const pendingCartSignature = useCartStore((state) => state.pendingCartSignature);
  const setPendingOrder = useCartStore((state) => state.setPendingOrder);

  const initialPromo = searchParams.get('promo') || '';
  const [promoCode, setPromoCode] = useState(initialPromo);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Kiểm tra giỏ hàng trống
  useEffect(() => {
    if (hydrated && isAuthed) {
      if (items.length === 0) {
        if (pendingOrderId) {
          router.replace(`/checkout/payment?orderId=${pendingOrderId}`);
        } else {
          router.replace('/cart');
        }
      }
    }
  }, [hydrated, isAuthed, items.length, pendingOrderId, router]);

  if (!hydrated || !isAuthed) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="skeleton mx-auto h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const handleCreateOrder = async () => {
    if (isSubmitting || items.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const currentSignature = computeCartSignature(items, promoCode);

    // Nếu đã có pendingOrderId và giỏ hàng không thay đổi -> Tái sử dụng đơn hàng cũ
    if (pendingOrderId && pendingCartSignature === currentSignature) {
      router.push(`/checkout/payment?orderId=${pendingOrderId}`);
      return;
    }

    try {
      // Nếu có pendingOrderId cũ nhưng giỏ đã đổi -> Hủy đơn cũ trước
      if (pendingOrderId) {
        try {
          await cancelOrder(pendingOrderId);
        } catch {
          // Nuốt lỗi 404/409 nếu đơn cũ đã bị hủy hoặc chuyển trạng thái
        }
      }

      // Tạo đơn hàng mới
      const order = await createOrder({
        items: items.map((i) => ({
          productId: i.productId,
          size: i.size,
          quantity: i.quantity,
          toppingIds: i.toppingIds.length > 0 ? i.toppingIds : undefined,
        })),
        promotionCode: promoCode.trim() || undefined,
      });

      setPendingOrder(order.id, currentSignature);
      router.push(`/checkout/payment?orderId=${order.id}`);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại giỏ hàng!',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-content-secondary"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <Link href="/cart" className="transition-colors hover:text-primary">
          Giỏ hàng
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <span className="truncate text-navy font-bold" aria-current="page">
          Xác nhận đơn hàng
        </span>
      </nav>

      <h1 className="mb-6 text-2xl font-extrabold text-navy lg:text-3xl">
        Xác nhận đặt hàng
      </h1>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-light p-4 text-xs text-danger shadow-card">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
          <div>
            <h3 className="font-bold">Không thể đặt hàng</h3>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Cột trái: Chi tiết món & Ưu đãi */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
            <h2 className="mb-4 text-lg font-extrabold text-navy">
              Món trong đơn ({badgeCount} món)
            </h2>

            <ul className="flex flex-col divide-y divide-border-warm">
              {items.map((item) => {
                const itemTotal = item.estimatedUnitPrice * item.quantity;
                const toppingsLabel =
                  item.toppingNames && item.toppingNames.length > 0
                    ? item.toppingNames.join(', ')
                    : '';

                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-sand">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-navy">{item.name}</h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-content-secondary">
                          <span className="rounded bg-secondary-container px-1.5 py-0.2 font-bold text-secondary">
                            Size {item.size}
                          </span>
                          <span>× {item.quantity}</span>
                          {toppingsLabel && (
                            <span className="text-content-roast">
                              + {toppingsLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-navy">
                        {formatVND(itemTotal)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Ô nhập mã ưu đãi */}
          <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-base font-extrabold text-navy">
                Mã ưu đãi (Khuyến mãi)
              </h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Nhập mã ưu đãi (VD: BREWLITE)"
                className="w-full rounded-full border border-border-warm bg-surface-sand px-4 py-2.5 text-xs font-medium text-navy placeholder:text-content-secondary outline-none focus:border-primary"
              />
            </div>
            <p className="mt-2 text-[11px] text-content-secondary">
              Mã giảm giá sẽ được máy chủ áp dụng và khấu trừ trực tiếp khi tạo đơn.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Chỉnh sửa giỏ hàng</span>
          </Link>
        </div>

        {/* Cột phải: Tổng thanh toán & Nút tiến hành */}
        <div className="lg:sticky lg:top-24 lg:col-span-4">
          <div className="flex flex-col gap-4 rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
            <h2 className="text-lg font-extrabold text-navy">
              Tóm tắt thanh toán
            </h2>

            <dl className="flex flex-col gap-2.5 text-xs text-content-roast">
              <div className="flex justify-between">
                <dt>Tạm tính giỏ hàng:</dt>
                <dd className="font-bold text-navy">{formatVND(totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Phương thức nhận:</dt>
                <dd className="font-bold text-navy">Lấy tại quầy (Miễn phí)</dd>
              </div>
              <div className="my-1 h-px w-full bg-border-warm" />
              <div className="flex items-baseline justify-between">
                <dt className="text-sm font-extrabold text-navy">Tạm tính:</dt>
                <dd className="text-xl font-extrabold text-primary">
                  {formatVND(totalAmount)}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={isSubmitting || items.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? 'Đang tạo đơn hàng...'
                  : 'Đặt hàng (Chuyển sang thanh toán)'}
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-content-secondary">
              <ShieldCheck className="h-3.5 w-3.5 text-[#006337]" />
              <span>Giao dịch an toàn & mã hóa 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="skeleton mx-auto h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
