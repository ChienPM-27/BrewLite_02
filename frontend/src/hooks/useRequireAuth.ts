'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useHydrated } from '@/hooks/useHydrated';

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !token) {
      const qs = searchParams?.toString();
      const currentUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/auth/login?next=${encodeURIComponent(currentUrl)}`);
    }
  }, [hydrated, token, pathname, searchParams, router]);

  return { isAuthed: !!token, hydrated, user };
}
