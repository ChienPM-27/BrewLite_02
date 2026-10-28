'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore, UserRole } from '@/store/useAuthStore';
import { useHydrated } from '@/hooks/useHydrated';

export function useRequireAuth(
  allowedRoles?: UserRole | UserRole[] | string | string[],
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      const qs = searchParams?.toString();
      const currentUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/auth/login?next=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (allowedRoles) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const userRole = user?.role || 'CUSTOMER';
      if (!roles.includes(userRole)) {
        router.replace('/menu');
      }
    }
  }, [hydrated, token, user, allowedRoles, pathname, searchParams, router]);

  return { isAuthed: !!token, hydrated, user };
}
