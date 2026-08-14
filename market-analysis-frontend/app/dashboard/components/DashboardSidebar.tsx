'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type DashboardSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const navigationItems = [
  { href: '/dashboard', label: 'Home', icon: 'home', exact: true },
  { href: '/dashboard/dashboards', label: 'Dashboard', icon: 'Dashboard', exact: true },
  { href: '/dashboard/personas', label: 'Personas', icon: 'people' },
  { href: '/dashboard/knowledge', label: 'Knowledge Base', icon: 'database' },
];

export function DashboardSidebar({ isOpen, onClose, onLogout }: DashboardSidebarProps) {
  const pathname = usePathname();
  const isProfileActive = pathname.startsWith('/dashboard/profile');

  const logout = () => {
    onLogout();
    onClose();
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col px-4 py-6 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#f8f9ff', borderRight: '1px solid #bec9c8' }}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className="absolute right-4 top-4 p-2 lg:hidden"
          onClick={onClose}
          style={{ color: '#3f4948' }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-10 flex items-center gap-3 px-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: '#005657', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined text-2xl">database</span>
          </div>
          <div>
            <div
              className="font-semibold leading-none"
              style={{ fontFamily: 'Hanken Grotesk, sans-serif', fontSize: '24px', color: '#005657' }}
            >
              PersonaFlow
            </div>
            <p className="mt-1 text-xs font-medium" style={{ color: '#3f4948' }}>
              AI Knowledge Hub
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Dashboard navigation">
          {navigationItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors"
                style={{
                  color: isActive ? '#005657' : '#3f4948',
                  borderLeft: isActive ? '4px solid #005657' : '4px solid transparent',
                  backgroundColor: isActive ? 'rgba(163, 237, 236, 0.3)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t px-2 pt-6" style={{ borderColor: '#bec9c8' }}>
          <Link
            href="/dashboard/profile"
            onClick={onClose}
            aria-current={isProfileActive ? 'page' : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:text-[#005657]"
            style={{
              color: isProfileActive ? '#005657' : '#3f4948',
              backgroundColor: isProfileActive ? 'rgba(163, 237, 236, 0.3)' : 'transparent',
              fontWeight: isProfileActive ? '600' : '500',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: isProfileActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              account_circle
            </span>
            Profile
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-medium transition-colors hover:text-[#005657]"
            style={{ color: '#3f4948' }}
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
