'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  CreditCard,
  Eye,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getOrderHistory, OrderStatus, OrderSummaryItem } from '@/services/order.service';
import { formatVND } from '@/lib/format-currency';

type TabKey = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ thanh toán' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

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

function OrdersContent() {
  const { isAuthed, hydrated } = useRequireAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OrderSummaryItem[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isProcessing = activeTab === 'PROCESSING';
      const statusParam: OrderStatus | undefined =
        activeTab === 'PENDING'
          ? 'PENDING'
          : activeTab === 'COMPLETED'
            ? 'COMPLETED'
            : activeTab === 'CANCELLED'
              ? 'CANCELLED'
              : undefined;

      const res = await getOrderHistory({
        page,
        limit: isProcessing ? 50 : 10,
        status: statusParam,
      });

      let orderList = res.items;
      if (isProcessing) {
        orderList = orderList.filter((item) =>
          ['PAID', 'PREPARING', 'READY'].includes(item.status),
        );
      }

      setItems(orderList);
      setHasNextPage(isProcessing ? false : res.pagination.hasNextPage);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lịch sử đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    if (hydrated && isAuthed) {
      fetchOrders();
    }
  }, [hydrated, isAuthed, fetchOrders]);

  const handleTabChange = (newTab: TabKey) => {
    setActiveTab(newTab);
    setPage(1);
  };

  if (!hydrated || !isAuthed) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="skeleton mx-auto h-80 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-content-secondary"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-border-warm" aria-hidden="true" />
        <span className="truncate text-navy font-bold" aria-current="page">
          Lịch sử đơn hàng
        </span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy lg:text-3xl">
            Đơn hàng của bạn
          </h1>
          <p className="mt-1 text-xs text-content-secondary">
            Theo dõi tiến độ pha chế và lịch sử các món đã đặt tại BrewLite
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-surface-milk px-3.5 py-1.5 text-xs font-bold text-navy shadow-card transition-colors hover:bg-surface-sand"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Tabs lọc trạng thái */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto border-b border-border-warm/80 pb-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                active
                  ? 'bg-primary text-white shadow-card'
                  : 'bg-surface-milk text-content-roast hover:bg-surface-sand border border-border-warm'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-4 py-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-28 w-full rounded-3xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="my-8 rounded-3xl border border-danger/30 bg-danger-light p-8 text-center">
          <p className="text-sm font-bold text-danger">{error}</p>
          <button
            type="button"
            onClick={fetchOrders}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 text-xs font-bold text-white shadow-cta hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Trạng thái rỗng */}
      {!loading && !error && items.length === 0 && (
        <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-border-warm bg-surface-milk p-12 text-center shadow-card">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-container text-primary">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-navy">
            Chưa có đơn hàng nào
          </h2>
          <p className="mt-1 max-w-sm text-xs text-content-secondary">
            {activeTab === 'ALL'
              ? 'Bạn chưa đặt ly cà phê nào. Hãy khám phá thực đơn thơm nồng của BrewLite ngay hôm nay nhé!'
              : 'Không có đơn hàng nào khớp với bộ lọc trạng thái này.'}
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-xs font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
          >
            <Coffee className="h-4 w-4" />
            <span>Khám phá thực đơn</span>
          </Link>
        </div>
      )}

      {/* Danh sách đơn hàng */}
      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-4">
          {items.map((order) => {
            const isUnpaid =
              order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';

            return (
              <div
                key={order.id}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-border-warm bg-surface-milk p-5 shadow-card transition-all hover:border-primary/40 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-extrabold text-navy">
                      #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-content-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatOrderDate(order.createdAt)}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-content-roast">
                      {order.itemCount} món
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-warm pt-3 sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="block text-[11px] text-content-secondary">
                      Tổng tiền
                    </span>
                    <span className="text-lg font-extrabold text-primary">
                      {formatVND(order.finalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUnpaid && (
                      <Link
                        href={`/checkout/payment?orderId=${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Thanh toán ngay</span>
                      </Link>
                    )}

                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-surface-sand/80 px-4 py-2 text-xs font-bold text-navy transition-colors hover:border-primary hover:text-primary active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem chi tiết</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Phân trang */}
          <div className="mt-4 flex items-center justify-between border-t border-border-warm pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-full border border-border-warm bg-surface-milk px-4 py-2 text-xs font-bold text-navy transition-colors hover:bg-surface-sand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trang trước</span>
            </button>

            <span className="text-xs font-bold text-content-secondary">
              Trang {page}
            </span>

            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-full border border-border-warm bg-surface-milk px-4 py-2 text-xs font-bold text-navy transition-colors hover:bg-surface-sand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Trang sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <div className="skeleton mx-auto h-80 w-full rounded-3xl" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
