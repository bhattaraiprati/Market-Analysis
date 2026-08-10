'use client';

import Link from 'next/link';
import type { Persona, User } from '@/types/api';

type DashboardHeaderProps = {
  user: User | null;
  personas: Persona[];
  selectedPersonaId: string;
  showChatActions: boolean;
  onOpenNavigation: () => void;
  onSelectPersona: (personaId: string) => void;
  onNewChat: () => void;
  onToggleHistory: () => void;
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

export function DashboardHeader({
  user,
  personas,
  selectedPersonaId,
  showChatActions,
  onOpenNavigation,
  onSelectPersona,
  onNewChat,
  onToggleHistory,
}: DashboardHeaderProps) {
  return (
    <header
      className="fixed right-0 top-0 z-40 flex h-16 w-full items-center justify-between gap-3 px-4 lg:w-[calc(100%-16rem)] lg:px-8"
      style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #bec9c8' }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          className="p-2 lg:hidden"
          onClick={onOpenNavigation}
          style={{ color: '#005657' }}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {showChatActions && (
          <>
            <button type="button" onClick={onNewChat} aria-label="Start a new chat" title="New chat" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white hover:bg-[#e8f5f4]" style={{ borderColor: '#bec9c8', color: '#005657' }}>
              <span className="material-symbols-outlined">add_comment</span>
            </button>
            <button type="button" onClick={onToggleHistory} aria-label="Toggle chat history" title="Chat history" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white hover:bg-[#e8f5f4]" style={{ borderColor: '#bec9c8', color: '#005657' }}>
              <span className="material-symbols-outlined">history</span>
            </button>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <label className="relative min-w-0">
          <span className="sr-only">Choose persona</span>
          <select
            value={selectedPersonaId}
            onChange={(event) => onSelectPersona(event.target.value)}
            className="h-10 max-w-32 appearance-none truncate rounded-lg border bg-white py-2 pl-9 pr-8 text-sm font-medium outline-none focus:border-[#1a7070] sm:max-w-64"
            style={{ borderColor: '#bec9c8', color: selectedPersonaId ? '#0b1c30' : '#6f7979' }}
          >
            <option value="">Choose a persona</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>{persona.name}</option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-2 text-xl" style={{ color: '#1a7070' }}>
            smart_toy
          </span>
          <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-xl" style={{ color: '#6f7979' }}>
            expand_more
          </span>
        </label>

        <Link
          href="/dashboard/profile"
          className="hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full sm:flex"
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
      </div>
    </header>
  );
}
