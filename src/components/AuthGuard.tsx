'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/profile';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

const PUBLIC_ROUTES = ['/login', '/signup'];

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isPublicRoute = useMemo(() => {
    return PUBLIC_ROUTES.includes(pathname);
  }, [pathname]);

  useEffect(() => {
    let isActive = true;

    async function checkAuth() {
      if (isPublicRoute) {
        if (isActive) setIsCheckingAuth(false);
        return;
      }

      const { data } = await getCurrentUser();
      if (!isActive) return;

      if (!data.user) {
        router.replace('/login');
        return;
      }

      setIsCheckingAuth(false);
    }

    setIsCheckingAuth(true);
    checkAuth();

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      if (isPublicRoute) return;

      if (!session?.user) {
        router.replace('/login');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [isPublicRoute, router]);

  if (isCheckingAuth && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
