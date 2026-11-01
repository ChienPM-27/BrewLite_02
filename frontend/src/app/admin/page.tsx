'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ClipboardList,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ApiError } from '@/lib/api-client';
import {
  AdminOrder,
  AdminOrderStatus,
  advanceAdminOrder,
  getAdminOrders,
} from '@/services/admin-order.service';

const POLL_INTERVAL_MS = 10_000;

const TABS: { status: AdminOrderStatus; label: string; action: string }[] = [
  { status: 'PAID', label: 'Chờ pha', action: 'Bắt đầu pha' },
  { status: 'PREPARING', label: 'Đang pha', action: 'Pha xong' },
  { status: 'READY', label: 'Chờ giao', action: 'Đã giao khách' },
];

function formatTimeAgo(dateStr: string | null, now: number): string {
  if (!dateStr) return '';
  const minutes = Math.floor((now - new Date(dateStr).getTime()) / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  return `${hours} giờ ${minutes % 60} phút trước`;
}

function OrderCardSkeleton() {
  return <div className="skeleton h-40 w-full rounded-3xl" />;
}

interface OrderCardProps {
  order: AdminOrder;
  actionLabel: string;
  now: number;
  busy: boolean;
  onAdvance: (order: AdminOrder) => void;
}

function OrderCard({ order, actionLabel, now, busy, onAdvance }: OrderCardProps) {
  return (
    <article className="rounded-3xl border border-border-warm bg-surface-milk p-4 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-navy">#{order.orderNumber}</h2>
          <p className="truncate text-sm font-semibold text-content-roast">
            {order.customerName}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-sand px-2.5 py-1 text-[11px] font-bold text-content-secondary">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatTimeAgo(order.paidAt, now)}
        </span>
      </header>

      <ul className="mt-3 flex flex-col divide-y divide-border-warm/60 border-t border-border-warm/60">
        {order.items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 py-2 text-sm">
            <span className="shrink-0 rounded bg-secondary-container px-1.5 py-0.5 text-xs font-bold text-secondary">
              {item.size}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-navy">{item.productName}</p>
              {item.toppings.length > 0 && (
                <p className="mt-0.5 text-xs text-content-secondary">
                  + {item.toppings.join(', ')}
                </p>
              )}
            </div>
            <span className="shrink-0 font-extrabold text-primary">× {item.quantity}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onAdvance(order)}
        disabled={busy}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        <span>{busy ? 'Đang cập nhật...' : actionLabel}</span>
      </button>
    </article>
  );
}

function AdminContent() {
  const { isAuthed, hydrated, user } = useRequireAuth(['ADMIN']);
  const isAdmin = hydrated && isAuthed && user?.role === 'ADMIN';

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'info' | 'danger'; text: string } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<AdminOrderStatus>('PAID');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());

  // Ref chặn bấm đúp trước khi React kịp render lại nút bị khóa.
  const busyRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(0);
  // Chỉ áp dụng phản hồi của lần tải mới nhất (tránh phản hồi cũ ghi đè).
  const requestSeqRef = useRef(0);
  const hasDataRef = useRef(false);

  /** `background`: lần polling định kỳ — bỏ qua nếu đang có lần tải khác. */
  const loadOrders = useCallback(async (background = false) => {
    if (background && inFlightRef.current > 0) return;
    const seq = ++requestSeqRef.current;
    inFlightRef.current += 1;
    setRefreshing(true);
    try {
      const data = await getAdminOrders();
      if (seq !== requestSeqRef.current) return;
      setOrders(data);
      setError(null);
      hasDataRef.current = true;
    } catch (err: any) {
      if (seq !== requestSeqRef.current) return;
      // Đã có dữ liệu thì giữ nguyên danh sách, chỉ báo lỗi nhẹ.
      const message = err?.message || 'Không thể tải danh sách đơn hàng';
      if (hasDataRef.current) {
        setNotice({ tone: 'danger', text: message });
      } else {
        setError(message);
      }
    } finally {
      inFlightRef.current -= 1;
      setNow(Date.now());
      setLoading(false);
      if (inFlightRef.current === 0) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadOrders();
    const timer = setInterval(() => {
      if (!document.hidden) loadOrders(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAdmin, loadOrders]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleAdvance = async (order: AdminOrder) => {
    if (busyRef.current.has(order.id)) return;
    busyRef.current.add(order.id);
    setBusyIds(new Set(busyRef.current));
    setNotice(null);
    try {
      await advanceAdminOrder(order.id, order.status);
      await loadOrders();
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setNotice({ tone: 'info', text: 'Đơn đã được cập nhật, đang tải lại' });
        await loadOrders();
      } else {
        setNotice({
          tone: 'danger',
          text: err?.message || 'Không thể cập nhật đơn hàng',
        });
      }
    } finally {
      busyRef.current.delete(order.id);
      setBusyIds(new Set(busyRef.current));
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="skeleton mx-auto h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const currentTab = TABS.find((t) => t.status === activeTab) ?? TABS[0];
  const visibleOrders = orders.filter((o) => o.status === activeTab);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-navy">Xử lý đơn hàng</h1>
          <p className="text-xs text-content-secondary">Tự làm mới mỗi 10 giây</p>
        </div>
        <button
          type="button"
          onClick={() => loadOrders()}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-warm bg-surface-milk px-4 py-2 text-xs font-bold text-navy shadow-card transition-colors hover:bg-surface-sand disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Làm mới</span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Trạng thái đơn"
        className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-border-warm bg-surface-sand p-1"
      >
        {TABS.map((tab) => {
          const count = orders.filter((o) => o.status === tab.status).length;
          const selected = tab.status === activeTab;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.status)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-bold transition-colors ${
                selected
                  ? 'bg-primary text-white shadow-cta'
                  : 'text-content-roast hover:bg-surface-milk'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  selected ? 'bg-white/25' : 'bg-surface-milk'
                }`}
              >
                {loading ? '–' : count}
              </span>
            </button>
          );
        })}
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 flex items-start gap-2 rounded-2xl border p-3 text-xs font-semibold ${
            notice.tone === 'danger'
              ? 'border-danger/30 bg-danger-light text-danger'
              : 'border-secondary/30 bg-secondary-container/40 text-secondary'
          }`}
        >
          {notice.tone === 'danger' ? (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ) : error ? (
        <StatePanel
          tone="danger"
          icon={<WifiOff className="h-9 w-9" aria-hidden="true" />}
          title="Không tải được danh sách đơn"
          description={error}
          actions={
            <button
              type="button"
              onClick={() => loadOrders()}
              className="inline-flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 text-xs font-bold text-white shadow-cta hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Thử lại</span>
            </button>
          }
        />
      ) : visibleOrders.length === 0 ? (
        <StatePanel
          icon={<ClipboardList className="h-9 w-9" aria-hidden="true" />}
          title="Chưa có đơn cần xử lý"
          description={`Không có đơn nào ở mục "${currentTab.label}".`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              actionLabel={currentTab.action}
              now={now}
              busy={busyIds.has(order.id)}
              onAdvance={handleAdvance}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="skeleton mx-auto h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
