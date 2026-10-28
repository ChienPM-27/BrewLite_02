'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, ArrowLeft, Construction } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';

function AdminContent() {
  const { isAuthed, hydrated, user } = useRequireAuth(['ADMIN']);

  if (!hydrated || !isAuthed || user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="skeleton mx-auto h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="rounded-3xl border border-border-warm bg-surface-milk p-8 shadow-card">
        {/* Header Icon & Title */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy">
            Trang quản trị — đang phát triển
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            Khu vực quản lý hệ thống dành riêng cho tài khoản Quản trị viên (ADMIN)
          </p>
        </div>

        {/* User Info Card */}
        <div className="mb-6 rounded-2xl border border-border-warm bg-surface-sand p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-content-roast">
            Thông tin phiên đăng nhập
          </h2>
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center gap-3 text-navy">
              <Mail className="h-4 w-4 shrink-0 text-content-secondary" />
              <span className="font-semibold">Email:</span>
              <span className="font-mono text-primary font-bold">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-navy">
              <ShieldCheck className="h-4 w-4 shrink-0 text-content-secondary" />
              <span className="font-semibold">Vai trò (Role):</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Notice of Stage 2 Development */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary-container/40 p-4 text-xs text-secondary">
          <Construction className="h-5 w-5 shrink-0 text-secondary" />
          <div>
            <p className="font-bold">Tính năng Giai đoạn 2</p>
            <p className="mt-0.5 text-content-secondary">
              Các tính năng quản lý sản phẩm, tồn kho nguyên liệu và phân quyền chuyên sâu sẽ được tích hợp tại đây trong Giai đoạn 2 (CR-LAN-ADMIN, CR-CHIEN-ADMIN, CR-HAI-STAFF).
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Link
            href="/menu"
            className="flex items-center gap-2 rounded-full border border-border-warm bg-surface-sand px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-surface-milk active:scale-95 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại trang Thực đơn</span>
          </Link>
        </div>
      </div>
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
