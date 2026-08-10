'use client';

import { createContext, useContext } from 'react';
import type { Persona } from '@/types/api';

type DashboardChatContextValue = {
  selectedPersona: Persona | null;
  selectedPersonaId: string;
  selectPersona: (personaId: string) => void;
  startNewChat: () => void;
  openHistory: () => void;
};

export const DashboardChatContext = createContext<DashboardChatContextValue | null>(null);

export function useDashboardChat() {
  const context = useContext(DashboardChatContext);
  if (!context) {
    throw new Error('useDashboardChat must be used inside DashboardShell');
  }
  return context;
}
