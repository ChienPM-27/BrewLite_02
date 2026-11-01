'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCartStore } from '@/store/useCartStore';
import { getPayment, PaymentResponse } from '@/services/payment.service';
import { formatVND } from '@/lib/format-currency';

const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2500;

function VnpayReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txnRef = searchParams.get('vnp_TxnRef');

  const { isAuthed, hydrated } = useRequireAuth();
  const clearCart = useCartStore((state) => state.clearCart);

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!txnRef) {
      setError('Không tìm thấy mã tham chiếu giao dịch (vnp_TxnRef)');
      setLoading(false);
      return;
    }

    try {
      const data = await getPayment(txnRef);
      setPayment(data);
      setError(null);

      if (data.status === 'SUCCESS') {
        clearCart();
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tra cứu thông tin giao dịch');
    } finally {
      setLoading(false);
    }
  }, [txnRef, clearCart]);

  // Lần đầu tải trang
  useEffect(() => {
    if (hydrated && isAuthed) {
      fetchStatus();
    }
  }, [hydrated, isAuthed, fetchStatus]);

  // Polling nếu kết quả vẫn đang PENDING
  useEffect(() => {
    if (!hydrated || !isAuthed) return;
    if (!payment || payment.status !== 'PENDING') return;
    if (pollCount >= MAX_POLL_ATTEMPTS) return;

    const timer = setTimeout(() => {
      setPollCount((prev) => prev + 1);
      fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [hydrated, isAuthed, payment, pollCount, fetchStatus]);

  if (!hydrated || !isAuthed || (loading && !payment)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-3xl border border-border-warm bg-surface-milk p-8 shadow-card">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-4 text-base font-bold text-navy">
            Đang xác nhận kết quả thanh toán từ VNPay...
          </h2>
          <p className="mt-1 text-xs text-content-secondary">
            Vui lòng không tắt hoặc tải lại trang web
          </p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-3xl border border-danger/30 bg-danger-light p-8 shadow-card">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h2 className="mt-4 text-lg font-bold text-navy">
            Không tìm thấy thông tin giao dịch
          </h2>
          <p className="mt-1 text-xs text-danger">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchStatus();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 text-xs font-bold text-white shadow-cta hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Thử lại</span>
            </button>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-surface-milk px-5 py-2.5 text-xs font-bold text-navy hover:bg-surface-sand"
            >
              Danh sách đơn hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // TRẠNG THÁI 1: THÀNH CÔNG
  if (payment.status === 'SUCCESS') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-3xl border border-[#006337]/30 bg-[#f0faf4] p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-16 w-16 text-[#006337]" />
          <h1 className="mt-4 text-2xl font-black text-navy">
            Thanh toán thành công!
          </h1>
          <p className="mt-2 text-xs text-content-secondary">
            Giao dịch qua cổng VNPay đã được xác nhận an toàn. Đơn hàng của bạn đang được tiến hành xử lý.
          </p>

          <div className="mt-6 rounded-2xl border border-[#006337]/20 bg-white p-4 text-left text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-warm/50">
              <span className="text-content-secondary">Mã giao dịch VNPay:</span>
              <span className="font-mono font-bold text-navy">
                {payment.gatewayTransactionNo || payment.transactionRef || payment.id}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-warm/50">
              <span className="text-content-secondary">Số tiền thanh toán:</span>
              <span className="font-bold text-primary">
                {formatVND(Number(payment.amount))}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-content-secondary">Phương thức:</span>
              <span className="font-bold text-navy">Cổng VNPay</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/orders/${payment.orderId}?paid=1`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-xs font-bold text-white shadow-cta hover:bg-primary-hover active:scale-95"
            >
              <span>Xem chi tiết đơn hàng</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border-warm bg-white py-3 text-xs font-bold text-navy hover:bg-surface-sand"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Tiếp tục đặt hàng</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // TRẠNG THÁI 2: THẤT BẠI
  if (payment.status === 'FAILED') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-3xl border border-danger/30 bg-danger-light p-8 text-center shadow-card">
          <XCircle className="mx-auto h-16 w-16 text-danger" />
          <h1 className="mt-4 text-2xl font-black text-navy">
            Thanh toán chưa thành công
          </h1>
          <p className="mt-2 text-xs text-danger">
            {payment.failureReason ||
              'Giao dịch thanh toán qua cổng VNPay không hoàn tất hoặc đã bị hủy.'}
          </p>

          <div className="mt-6 rounded-2xl border border-danger/20 bg-white p-4 text-left text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-warm/50">
              <span className="text-content-secondary">Mã giao dịch:</span>
              <span className="font-mono font-bold text-navy">
                {payment.id}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-content-secondary">Số tiền:</span>
              <span className="font-bold text-primary">
                {formatVND(Number(payment.amount))}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/checkout/payment?orderId=${payment.orderId}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-danger py-3 text-xs font-bold text-white shadow-cta hover:opacity-90 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Thử thanh toán lại</span>
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border-warm bg-white py-3 text-xs font-bold text-navy hover:bg-surface-sand"
            >
              <span>Quay về giỏ hàng</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // TRẠNG THÁI 3: ĐANG CHỜ XỬ LÝ (PENDING)
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-8 text-center shadow-card">
        <Loader2 className="mx-auto h-16 w-16 animate-spin text-amber-600" />
        <h1 className="mt-4 text-2xl font-black text-navy">
          Đang chờ xác nhận từ VNPay
        </h1>
        <p className="mt-2 text-xs text-amber-800">
          Hệ thống đang chờ thông báo kết quả chính thức (IPN) từ cổng thanh toán VNPay.
          {pollCount < MAX_POLL_ATTEMPTS && (
            <span className="block mt-1 font-semibold">
              Đang tự động kiểm tra ({pollCount + 1}/{MAX_POLL_ATTEMPTS})...
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 py-3 text-xs font-bold text-white shadow-cta hover:bg-amber-700 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Kiểm tra lại ngay</span>
          </button>
          <Link
            href={`/orders/${payment.orderId}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border-warm bg-white py-3 text-xs font-bold text-navy hover:bg-surface-sand"
          >
            <span>Xem đơn hàng</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VnpayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="skeleton mx-auto h-72 w-full rounded-3xl" />
        </div>
      }
    >
      <VnpayReturnContent />
    </Suspense>
  );
}
