'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AlertCircle, Coffee, KeyRound, Mail, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { loginApi } from '@/services/auth.service';
import { ApiError } from '@/lib/api-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/menu';

  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Nếu đã đăng nhập, chuyển hướng ngay về /menu
  useEffect(() => {
    if (token) {
      router.replace(next.startsWith('/') ? next : '/menu');
    }
  }, [token, router, next]);

  const handleFillDemo = () => {
    setEmail('demo@brewlite.test');
    setPassword('Demo@12345');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginApi({ email, password });
      login(res.accessToken, res.user);
      router.replace(next.startsWith('/') ? next : '/menu');
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setErrorMessage('Email hoặc mật khẩu không chính xác');
      } else {
        setErrorMessage(err?.message || 'Không thể đăng nhập. Vui lòng kiểm tra lại kết nối!');
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
          <h1 className="text-2xl font-extrabold text-navy">Chào mừng trở lại</h1>
          <p className="mt-1 text-xs text-content-secondary">
            Đăng nhập để đặt cà phê nhanh và tích lũy điểm BrewPoints
          </p>
        </div>

        {/* Nút demo điền nhanh */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleFillDemo}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border-warm bg-secondary-container/50 px-4 py-2.5 text-xs font-bold text-secondary transition-colors hover:bg-secondary-container"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Điền tài khoản Demo (demo@brewlite.test)</span>
          </button>
        </div>

        {/* Báo lỗi */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-navy">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary" />
              <input
                id="login-email"
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
            <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold text-navy">
              Mật khẩu
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-full border border-border-warm bg-surface-sand pl-11 pr-4 py-3 text-sm font-medium text-navy placeholder:text-content-secondary outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Chuyển sang đăng ký */}
        <div className="mt-6 text-center text-xs text-content-roast">
          Chưa có tài khoản?{' '}
          <Link
            href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-bold text-primary hover:underline"
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="skeleton mx-auto h-80 w-full rounded-3xl" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
