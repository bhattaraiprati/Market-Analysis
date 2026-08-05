'use client';

import { useState, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9ff' }}>
      <DashboardSidebar
        isOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        onLogout={logout}
      />
      <DashboardHeader user={user} onOpenNavigation={() => setNavigationOpen(true)} />
      <div className="min-h-screen pt-16 lg:ml-64">{children}</div>
    </div>
  );
}
