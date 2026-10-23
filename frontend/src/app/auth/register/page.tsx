'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AlertCircle, Coffee, KeyRound, Mail, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { registerApi } from '@/services/auth.service';
import { ApiError } from '@/lib/api-client';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/menu';

  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Nếu đã đăng nhập, chuyển hướng ngay về /menu hoặc next hợp lệ
  useEffect(() => {
    if (token) {
      router.replace(next);
    }
  }, [token, router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerApi({
        email: trimmedEmail,
        password,
        fullName: fullName.trim() || undefined,
      });

      login(res.accessToken, res.user);
      router.replace(next);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setErrorMessage('Email đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
        } else if (err.statusCode === 400) {
          setErrorMessage(err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.');
        } else {
          setErrorMessage(err.message || 'Đăng ký không thành công. Vui lòng thử lại!');
        }
      } else {
        setErrorMessage(err?.message || 'Không thể kết nối tới máy chủ. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-3xl border border-border-warm bg-surface-milk p-8 shadow-card">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
            <Coffee className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy">Tạo tài khoản mới</h1>
          <p className="mt-1 text-xs text-content-secondary">
            Tham gia BrewLite để nhận ưu đãi thành viên và tích điểm đổi quà
          </p>
        </div>

        {/* Báo lỗi */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Form đăng ký */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-xs font-bold text-navy">
              Họ và tên <span className="text-content-secondary font-normal">(tùy chọn)</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary" />
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full rounded-full border border-border-warm bg-surface-sand pl-11 pr-4 py-3 text-sm font-medium text-navy placeholder:text-content-secondary outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-xs font-bold text-navy">
              Email <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary" />
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-full border border-border-warm bg-surface-sand pl-11 pr-4 py-3 text-sm font-medium text-navy placeholder:text-content-secondary outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-xs font-bold text-navy">
              Mật khẩu <span className="text-danger">*</span>{' '}
              <span className="text-content-secondary font-normal">(tối thiểu 6 ký tự)</span>
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary" />
              <input
                id="register-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-full border border-border-warm bg-surface-sand pl-11 pr-4 py-3 text-sm font-medium text-navy placeholder:text-content-secondary outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-xs font-bold text-navy">
              Xác nhận mật khẩu <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary" />
              <input
                id="register-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-full border border-border-warm bg-surface-sand pl-11 pr-4 py-3 text-sm font-medium text-navy placeholder:text-content-secondary outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        {/* Chuyển sang đăng nhập */}
        <div className="mt-6 text-center text-xs text-content-roast">
          Đã có tài khoản?{' '}
          <Link
            href={`/auth/login${next !== '/menu' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-bold text-primary hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="skeleton mx-auto h-80 w-full rounded-3xl" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
