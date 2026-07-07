'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const PUBLIC_ROUTES = ['/login', '/signup'];

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isPublicRoute = useMemo(() => {
    return PUBLIC_ROUTES.includes(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isPublicRoute) {
      setIsCheckingAuth(false);
      return;
    }

    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [isPublicRoute, isLoading, user, router]);

  if ((isCheckingAuth || isLoading) && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
