'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth, isAuthenticated, organization, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isChecking || isLoading) return;

    const publicRoutes = ['/', '/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // If not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // If authenticated but no organization, redirect to organization registration
    // (except if already on that page)
    if (
      isAuthenticated &&
      !organization &&
      !pathname.startsWith('/register/organization') &&
      !['/login', '/register', '/'].includes(pathname)
    ) {
      router.replace('/register/organization');
      return;
    }

    // If authenticated with organization and trying to access organization registration
    if (isAuthenticated && organization && pathname === '/register/organization') {
      router.replace('/dashboard');
      return;
    }
  }, [isAuthenticated, organization, pathname, router, isChecking, isLoading]);

  // Show loading state while checking auth
  if (isChecking || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f8f9ff' }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-sm animate-pulse"
            style={{ backgroundColor: '#1a7070' }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{
                fontVariationSettings: "'FILL' 1",
                color: '#ffffff',
              }}
            >
              smart_toy
            </span>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              color: '#3f4948',
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
