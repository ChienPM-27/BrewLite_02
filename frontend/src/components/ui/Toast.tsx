'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

interface ToastProps {
  open: boolean;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onClose: () => void;
  /** Tự đóng sau bao nhiêu ms (mặc định 4000). */
  duration?: number;
}

/** Thông báo nổi góc phải: "Đã thêm vào giỏ hàng!" */
export default function Toast({
  open,
  title,
  description,
  actionHref,
  actionLabel,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-28 z-[60] flex max-w-[calc(100vw-2rem)] animate-toast-in items-center gap-3 rounded-2xl border border-primary/30 bg-navy px-5 py-3 text-surface-milk shadow-dock"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-botanical text-success-light">
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-tight">{title}</p>
        {description && (
          <p className="truncate text-xs text-primary-light/90">{description}</p>
        )}
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="ml-2 hidden shrink-0 items-center gap-1 text-[13px] font-semibold text-[#EABDA0] hover:underline sm:flex"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="shrink-0 text-surface-milk/60 transition-colors hover:text-surface-milk"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
