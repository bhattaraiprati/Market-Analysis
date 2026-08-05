'use client';

import Link from 'next/link';
import type { User } from '@/types/api';

type DashboardHeaderProps = {
  user: User | null;
  onOpenNavigation: () => void;
};

function getInitials(name?: string) {
  if (!name) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function DashboardHeader({ user, onOpenNavigation }: DashboardHeaderProps) {
  return (
    <header
      className="fixed right-0 top-0 z-40 flex h-16 w-full items-center justify-between px-4 lg:w-[calc(100%-16rem)] lg:justify-end lg:px-8"
      style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #bec9c8' }}
    >
      <button
        type="button"
        aria-label="Open navigation"
        className="p-2 lg:hidden"
        onClick={onOpenNavigation}
        style={{ color: '#005657' }}
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <Link
        href="/dashboard/profile"
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full"
        style={{
          backgroundColor: '#dce9ff',
          border: '1px solid #bec9c8',
          color: '#005657',
          fontWeight: '600',
          fontSize: '14px',
          backgroundImage: user?.profilePicture ? `url(${user.profilePicture})` : undefined,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
        title={user?.email || 'Profile'}
        aria-label="Open profile"
      >
        {!user?.profilePicture && getInitials(user?.name)}
      </Link>
    </header>
  );
}
