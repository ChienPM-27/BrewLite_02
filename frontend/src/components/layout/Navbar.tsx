'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, LogOut, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useHydrated } from '@/hooks/useHydrated';

const BASE_NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/menu', label: 'Thực đơn' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const badgeCount = useCartStore((state) => state.badgeCount);
  const cartCount = hydrated ? badgeCount : 0;

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isLoggedIn = hydrated && !!user;
  const displayName = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Tài khoản';

  const navLinks = [
    ...BASE_NAV_LINKS,
    ...(isLoggedIn ? [{ href: '/orders', label: 'Đơn hàng của tôi' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border-warm/60 bg-surface-milk/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:h-20 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2" aria-label="BrewLite - Trang chủ">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-surface-milk shadow-card">
              <Coffee className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-navy transition-colors group-hover:text-primary">
              BrewLite
            </span>
            <span className="hidden rounded-full border border-border-warm bg-primary-light px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary sm:inline">
              Urban Café
            </span>
          </Link>

          <nav
            aria-label="Điều hướng chính"
            className="hidden items-center gap-1 rounded-full border border-border-warm/60 bg-primary-light/80 p-1 lg:flex"
          >
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-surface-milk shadow-card'
                      : 'rounded-full px-4 py-2 text-[13px] font-semibold text-content-roast transition-all hover:bg-surface-milk hover:text-navy'
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            aria-label={`Giỏ hàng, ${cartCount} món`}
            className="flex items-center gap-2 rounded-full bg-primary py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-surface-milk shadow-card transition-all hover:bg-primary-hover active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="hidden md:inline">Giỏ hàng</span>
            <span className="rounded-full bg-surface-milk px-2.5 py-0.5 text-xs font-bold text-primary">
              {cartCount} món
            </span>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/orders"
                title={user?.email}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-warm bg-surface-sand/80 px-3 py-1.5 text-xs font-bold text-navy transition-colors hover:border-primary hover:text-primary"
              >
                <User className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[120px] truncate sm:max-w-[160px]">{displayName}</span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                title="Đăng xuất"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-content-secondary transition-colors hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex rounded-full border border-border-warm bg-surface-sand/80 px-3.5 py-1.5 text-[13px] font-semibold text-content-roast transition-colors hover:border-primary hover:text-primary"
            >
              Đăng nhập / Đăng ký
            </Link>
          )}
        </div>
      </div>

      {/* Điều hướng rút gọn cho màn hình nhỏ */}
      <nav
        aria-label="Điều hướng chính (di động)"
        className="no-scrollbar flex items-center gap-2 overflow-x-auto border-t border-border-subtle px-4 py-2 lg:hidden"
      >
        {navLinks.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-surface-milk'
                  : 'shrink-0 rounded-full border border-border-warm bg-surface-milk px-4 py-1.5 text-xs font-semibold text-content-roast'
              }
            >
              {link.label}
            </Link>
          );
        })}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-full border border-border-warm bg-surface-milk px-3 py-1.5 text-xs font-semibold text-content-secondary hover:text-danger"
          >
            Đăng xuất
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="shrink-0 rounded-full border border-border-warm bg-surface-milk px-3 py-1.5 text-xs font-semibold text-primary"
          >
            Đăng nhập
          </Link>
        )}
      </nav>
    </header>
  );
}
