'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCartStore } from '@/store/useCartStore';
import { cancelOrder, getOrderById, OrderDetail } from '@/services/order.service';
import { createPayment, PaymentMethod } from '@/services/payment.service';
import { formatVND } from '@/lib/format-currency';
import { generateIdempotencyKey } from '@/lib/idempotency';
import MockGatewayModal from '@/components/checkout/MockGatewayModal';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const { isAuthed, hydrated } = useRequireAuth();
  const clearCart = useCartStore((state) => state.clearCart);
  const clearPendingOrder = useCartStore((state) => state.clearPendingOrder);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [method, setMethod] = useState<PaymentMethod>('E_WALLET');
  const [isDemoFail, setIsDemoFail] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);

  // Giữ idempotency key trong useRef cho cả lượt thanh toán
  const idempotencyKeyRef = useRef<string | null>(null);

  const handleSelectMethod = (newMethod: PaymentMethod) => {
    if (method !== newMethod) {
      setMethod(newMethod);
      idempotencyKeyRef.current = null;
    }
  };

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      router.replace('/cart');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getOrderById(orderId);
      if (data.status === 'PAID') {
        router.replace(`/orders/${orderId}`);
        return;
      }
      setOrder(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tìm thấy thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (hydrated && isAuthed) {
      loadOrder();
    }
  }, [hydrated, isAuthed, loadOrder]);

  if (!hydrated || !isAuthed || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="skeleton mx-auto h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-3xl border border-danger/30 bg-danger-light p-8 shadow-card">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h2 className="mt-4 text-lg font-bold text-navy">Lỗi tải đơn hàng</h2>
          <p className="mt-1 text-xs text-danger">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={loadOrder}
              className="inline-flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 text-xs font-bold text-white shadow-cta hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Thử lại</span>
            </button>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-surface-milk px-5 py-2.5 text-xs font-bold text-navy hover:bg-surface-sand"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePay = async (forceFail?: boolean) => {
    if (isPaying) return;
    setIsPaying(true);
    setPaymentError(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
    const idempotencyKey = idempotencyKeyRef.current;

    const shouldFail = forceFail !== undefined ? forceFail : isDemoFail;

    try {
      const res = await createPayment(
        { orderId: order.id, method },
        idempotencyKey,
        shouldFail,
      );

      if (res.status === 'SUCCESS') {
        setIsGatewayModalOpen(false);
        clearCart();
        router.replace(`/orders/${order.id}?paid=1`);
      } else {
        setIsGatewayModalOpen(false);
        // Server trả status FAILED -> tạo key MỚI cho lần thử tiếp theo
        idempotencyKeyRef.current = null;
        setPaymentError(
          res.failureReason ||
            'Thanh toán không thành công. Bạn có thể thử lại hoặc chọn hình thức khác.',
        );
      }
    } catch (err: any) {
      setIsGatewayModalOpen(false);
      // Lỗi mạng hoặc timeout -> giữ NGUYÊN key trong idempotencyKeyRef để bấm lại gửi cùng key
      setPaymentError(
        err?.message ||
          'Không thể xử lý giao dịch. Vui lòng thử lại với phương thức khác!',
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await cancelOrder(order.id);
      idempotencyKeyRef.current = null;
      clearPendingOrder();
      router.replace('/cart');
    } catch (err: any) {
      setPaymentError(err?.message || 'Không thể hủy đơn hàng');
      setIsCancelling(false);
    }
  };

  const payButtonText = isPaying
    ? 'Đang xử lý giao dịch...'
    : `Xác nhận thanh toán • ${formatVND(order.finalAmount)}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 lg:pb-12 lg:px-8">
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
          Thanh toán đơn {order.orderNumber}
        </span>
      </nav>

      <div className="flex flex-col gap-6">
        {/* Header thông tin đơn */}
        <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-warm pb-4">
            <div>
              <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[10px] font-bold text-secondary">
                Đơn hàng #{order.orderNumber}
              </span>
              <h1 className="mt-1 text-2xl font-extrabold text-navy">
                Cổng thanh toán BrewLite
              </h1>
            </div>
            <div className="text-right">
              <span className="block text-xs font-semibold text-content-secondary">
                Số tiền thanh toán
              </span>
              <span className="text-2xl font-extrabold text-primary">
                {formatVND(order.finalAmount)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
            <div>
              <span className="text-content-secondary">Tổng tiền hàng:</span>
              <p className="font-bold text-navy">{formatVND(order.totalAmount)}</p>
            </div>
            {order.discountAmount > 0 && (
              <div>
                <span className="text-content-secondary">Khuyến mãi khấu trừ:</span>
                <p className="font-bold text-[#006337]">
                  -{formatVND(order.discountAmount)}
                </p>
              </div>
            )}
            <div>
              <span className="text-content-secondary">Số lượng món:</span>
              <p className="font-bold text-navy">
                {order.items.reduce((s, i) => s + i.quantity, 0)} ly
              </p>
            </div>
          </div>
        </div>

        {/* Thông báo thanh toán thất bại */}
        {paymentError && (
          <div className="rounded-3xl border border-danger/30 bg-danger-light p-6 shadow-card">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 shrink-0 text-danger" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-danger">
                  Giao dịch chưa hoàn tất
                </h3>
                <p className="mt-1 text-xs text-danger">{paymentError}</p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsGatewayModalOpen(true)}
                    disabled={isPaying}
                    className="inline-flex items-center gap-1.5 rounded-full bg-danger px-4 py-2 text-xs font-bold text-white shadow-cta hover:opacity-90 active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Thử thanh toán lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-surface-milk px-4 py-2 text-xs font-bold text-danger hover:bg-danger-light active:scale-95 disabled:opacity-60"
                  >
                    <span>{isCancelling ? 'Đang hủy...' : 'Hủy đơn hàng này'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chọn phương thức thanh toán */}
        <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
          <h2 className="mb-4 text-base font-extrabold text-navy">
            Chọn phương thức thanh toán không tiền mặt
          </h2>

          {/* Segmented selector */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleSelectMethod('E_WALLET')}
              className={`flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all ${
                method === 'E_WALLET'
                  ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20 shadow-card'
                  : 'border-border-warm bg-surface-milk hover:border-primary/40'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  method === 'E_WALLET'
                    ? 'bg-primary text-white'
                    : 'bg-surface-sand text-navy'
                }`}
              >
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy">Ví điện tử</h3>
                <p className="text-[11px] text-content-secondary">
                  MoMo, ZaloPay, ShopeePay qua mã VietQR
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMethod('BANK_CARD')}
              className={`flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all ${
                method === 'BANK_CARD'
                  ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20 shadow-card'
                  : 'border-border-warm bg-surface-milk hover:border-primary/40'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  method === 'BANK_CARD'
                    ? 'bg-primary text-white'
                    : 'bg-surface-sand text-navy'
                }`}
              >
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy">Thẻ ATM / Thẻ quốc tế</h3>
                <p className="text-[11px] text-content-secondary">
                  Thẻ nội địa NAPAS, Visa, Mastercard
                </p>
              </div>
            </button>
          </div>

          {/* Demo Mode Toggle */}
          {isDemoMode && (
            <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-3.5">
              <label className="flex cursor-pointer items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-900">
                    Mô phỏng thanh toán thất bại (Demo Mode)
                  </span>
                  <p className="text-[11px] text-amber-700">
                    Gửi header X-Mock-Outcome: FAILED để kiểm thử quy trình xử lý lỗi cổng thanh toán.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isDemoFail}
                  onChange={(e) => setIsDemoFail(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-600"
                />
              </label>
            </div>
          )}

          {/* Nút thanh toán Desktop */}
          <div className="mt-6 hidden lg:block">
            <button
              type="button"
              onClick={() => setIsGatewayModalOpen(true)}
              disabled={isPaying}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>{payButtonText}</span>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-content-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-[#006337]" />
            <span>Mã hóa bảo mật chuẩn PCI-DSS & Ngân hàng Nhà nước</span>
          </div>
        </div>

        {/* Nút hủy đơn / quay lại */}
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay về giỏ hàng</span>
          </Link>

          <button
            type="button"
            onClick={handleCancelOrder}
            disabled={isCancelling}
            className="font-semibold text-danger hover:underline disabled:opacity-50"
          >
            {isCancelling ? 'Đang hủy đơn...' : 'Hủy đơn hàng này'}
          </button>
        </div>
      </div>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-warm bg-surface-milk/95 p-4 shadow-dock backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => setIsGatewayModalOpen(true)}
            disabled={isPaying}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{payButtonText}</span>
          </button>
        </div>
      </div>

      {/* Modal Cổng thanh toán Sandbox Mock Gateway */}
      <MockGatewayModal
        isOpen={isGatewayModalOpen}
        orderNumber={order.orderNumber}
        amount={order.finalAmount}
        method={method}
        isProcessing={isPaying}
        onClose={() => setIsGatewayModalOpen(false)}
        onConfirm={(forceFail) => handlePay(forceFail)}
      />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="skeleton mx-auto h-72 w-full rounded-3xl" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
