'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  CreditCard,
  RefreshCw,
  Sparkles,
  Star,
  XCircle,
} from 'lucide-react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  cancelOrder,
  getOrderById,
  OrderDetail,
  OrderStatus,
} from '@/services/order.service';
import { formatSurcharge, formatVND } from '@/lib/format-currency';

const POLL_INTERVAL_MS = 10_000;
const POLLING_STATUSES: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];

function formatOrderDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function OrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isPaidBanner = searchParams.get('paid') === '1';

  const { isAuthed, hydrated } = useRequireAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /** `silent`: lần polling nền — không hiện skeleton, lỗi tạm thời thì giữ dữ liệu cũ. */
  const loadOrder = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getOrderById(id);
        setOrder(data);
      } catch (err: any) {
        if (!silent) setError(err?.message || 'Không thể tải thông tin đơn hàng');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (hydrated && isAuthed) {
      loadOrder();
    }
  }, [hydrated, isAuthed, loadOrder]);

  // Đơn đang được quán xử lý: tự làm mới để khách thấy trạng thái đổi trong ≤10 giây.
  const shouldPoll = !!order && POLLING_STATUSES.includes(order.status);
  useEffect(() => {
    if (!shouldPoll) return;
    let polling = false;
    const timer = setInterval(async () => {
      // Bỏ qua khi tab đang ẩn hoặc lần trước chưa xong (mạng chậm).
      if (document.hidden || polling) return;
      polling = true;
      await loadOrder(true);
      polling = false;
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [shouldPoll, loadOrder]);

  const handleCancel = async () => {
    if (!order || isCancelling) return;
    setIsCancelling(true);
    setActionError(null);
    try {
      await cancelOrder(order.id);
      await loadOrder();
    } catch (err: any) {
      setActionError(err?.message || 'Không thể hủy đơn hàng');
      setIsCancelling(false);
    }
  };

  if (!hydrated || !isAuthed || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="skeleton mx-auto h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-3xl border border-danger/30 bg-danger-light p-8 shadow-card">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h2 className="mt-4 text-lg font-bold text-navy">Lỗi tìm đơn hàng</h2>
          <p className="mt-1 text-xs text-danger">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => loadOrder()}
              className="inline-flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 text-xs font-bold text-white shadow-cta hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Thử lại</span>
            </button>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-surface-milk px-5 py-2.5 text-xs font-bold text-navy hover:bg-surface-sand"
            >
              Quay lại danh sách đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isUnpaid =
    order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-content-secondary"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <Link href="/orders" className="transition-colors hover:text-primary">
          Lịch sử đơn hàng
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <span className="truncate text-navy font-bold" aria-current="page">
          Chi tiết đơn #{order.orderNumber}
        </span>
      </nav>

      {/* Banner chúc mừng thanh toán thành công */}
      {isPaidBanner && (
        <div className="mb-6 flex items-center gap-3.5 rounded-3xl border border-emerald-300 bg-[#E6FCF3] p-5 text-content-roast shadow-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-card">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-navy">
              Thanh toán thành công!
            </h2>
            <p className="mt-0.5 text-xs text-[#065F46]">
              Đơn hàng đã được chuyển thẳng tới quầy pha chế tự động. Bạn vui lòng tới nhận món sau 3-5 phút nhé!
            </p>
          </div>
        </div>
      )}

      {/* Thông báo lỗi thao tác */}
      {actionError && (
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
          <span className="font-semibold">{actionError}</span>
        </div>
      )}

      {/* Chi tiết đơn */}
      <div className="flex flex-col gap-6">
        {/* Header thông tin chung */}
        <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-warm pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-navy">
                  Đơn hàng #{order.orderNumber}
                </h1>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-xs text-content-secondary">
                Mã định danh hệ thống: {order.id}
              </p>
            </div>

            {/* Nút thanh toán hoặc hủy nếu chưa thanh toán */}
            {isUnpaid && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/checkout/payment?orderId=${order.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Thanh toán ngay</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-surface-milk px-4 py-2.5 text-xs font-bold text-danger hover:bg-danger-light active:scale-95 disabled:opacity-60"
                >
                  <span>{isCancelling ? 'Đang hủy...' : 'Hủy đơn'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 text-content-roast">
              <Clock className="h-4 w-4 text-content-secondary" />
              <span>Thời gian đặt:</span>
              <span className="font-bold text-navy">
                {formatOrderDate(order.createdAt)}
              </span>
            </div>
            {order.paidAt && (
              <div className="flex items-center gap-2 text-[#065F46]">
                <CheckCircle2 className="h-4 w-4 text-[#10D98A]" />
                <span>Thời gian thanh toán:</span>
                <span className="font-bold">
                  {formatOrderDate(order.paidAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bảng danh sách món */}
        <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
          <h2 className="mb-4 text-base font-extrabold text-navy">
            Danh sách món đã đặt
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-warm text-[11px] font-bold uppercase tracking-wider text-content-secondary">
                  <th className="pb-3">Sản phẩm</th>
                  <th className="pb-3 text-center">Kích cỡ</th>
                  <th className="pb-3 text-center">Số lượng</th>
                  <th className="pb-3 text-right">Đơn giá</th>
                  <th className="pb-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm/60">
                {order.items.map((item) => {
                  return (
                    <tr key={item.id} className="py-3">
                      <td className="py-3.5 pr-2">
                        <div className="font-bold text-navy">{item.name}</div>
                        {item.toppings && item.toppings.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-content-secondary">
                            {item.toppings.map((top) => (
                              <span
                                key={top.id}
                                className="rounded bg-surface-sand px-1.5 py-0.5 text-content-roast"
                              >
                                + {top.name} ({formatSurcharge(top.price)})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="rounded bg-secondary-container px-2 py-0.5 font-bold text-secondary">
                          {item.size}
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-bold text-navy">
                        × {item.quantity}
                      </td>
                      <td className="py-3.5 text-right font-medium text-content-roast">
                        {formatVND(item.unitPrice)}
                      </td>
                      <td className="py-3.5 text-right font-bold text-primary">
                        {formatVND(item.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tổng kết thanh toán */}
          <div className="mt-6 border-t border-border-warm pt-4">
            <dl className="flex flex-col gap-2.5 text-xs text-content-roast">
              <div className="flex justify-between">
                <dt>Tổng tiền hàng:</dt>
                <dd className="font-bold text-navy">{formatVND(order.totalAmount)}</dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-[#006337]">
                  <dt>Giảm giá khuyến mãi:</dt>
                  <dd className="font-bold">-{formatVND(order.discountAmount)}</dd>
                </div>
              )}
              <div className="my-1 h-px w-full bg-border-warm" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-sm font-extrabold text-navy">
                  Tổng thanh toán:
                </dt>
                <div className="flex items-center gap-3">
                  {order.pointsEarned !== undefined && order.pointsEarned > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-bold text-amber-900">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      +{order.pointsEarned} điểm tích lũy
                    </span>
                  )}
                  <dd className="text-xl font-extrabold text-primary">
                    {formatVND(order.finalAmount)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>

        {/* Lịch sử giao dịch thanh toán */}
        {order.payments && order.payments.length > 0 && (
          <div className="rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-card">
            <h2 className="mb-4 text-base font-extrabold text-navy">
              Lịch sử giao dịch thanh toán
            </h2>

            <div className="flex flex-col divide-y divide-border-warm">
              {order.payments.map((p) => {
                const isSuccess = p.status === 'SUCCESS';
                const methodLabel =
                  p.method === 'E_WALLET' ? 'Ví điện tử' : 'Thẻ ngân hàng';

                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy">{methodLabel}</span>
                        <span
                          className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${
                            isSuccess
                              ? 'border-emerald-300 bg-[#E6FCF3] text-[#065F46]'
                              : 'border-danger/30 bg-danger-light text-danger'
                          }`}
                        >
                          {isSuccess ? 'Thành công' : 'Thất bại'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-content-secondary">
                        Mã giao dịch: {p.transactionRef}
                      </p>
                    </div>

                    <div className="text-right text-content-secondary">
                      <span>{formatOrderDate(p.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-surface-milk px-5 py-2.5 text-xs font-bold text-navy shadow-card transition-colors hover:bg-surface-sand"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách đơn</span>
          </Link>

          <Link
            href="/menu"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
          >
            <Coffee className="h-4 w-4" />
            <span>Tiếp tục đặt món</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="skeleton mx-auto h-80 w-full rounded-3xl" />
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
