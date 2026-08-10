'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { usePersonaStore } from '@/lib/stores/personaStore';
import type { Conversation } from '@/types/api';
import { DashboardChatContext } from './DashboardChatContext';
import { DashboardChatHistory } from './DashboardChatHistory';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { personas, fetchPersonas } = usePersonaStore();
  const {
    conversations,
    currentConversation,
    isLoading,
    fetchConversations,
    fetchConversationById,
    setCurrentConversation,
  } = useConversationStore();
  const isHome = pathname === '/dashboard';
  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId) ?? null;

  useEffect(() => {
    fetchPersonas().catch(console.error);
  }, [fetchPersonas]);

  const selectPersona = (personaId: string) => {
    setSelectedPersonaId(personaId);
    setCurrentConversation(null);
    fetchConversations(personaId || undefined).catch(console.error);
  };

  const startNewChat = () => {
    setCurrentConversation(null);
    setHistoryOpen(false);
  };

  const openHistory = () => {
    setHistoryOpen(true);
    fetchConversations(selectedPersonaId || undefined).catch(console.error);
  };

  const toggleHistory = () => {
    if (historyOpen) {
      setHistoryOpen(false);
    } else {
      openHistory();
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedPersonaId(conversation.persona_id);
    fetchConversationById(conversation.id).catch(console.error);
    setHistoryOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9ff' }}>
      <DashboardSidebar
        isOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        onLogout={logout}
      />
      <DashboardHeader
        user={user}
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        showChatActions={isHome}
        onOpenNavigation={() => setNavigationOpen(true)}
        onSelectPersona={selectPersona}
        onNewChat={startNewChat}
        onToggleHistory={toggleHistory}
      />
      {isHome && (
        <DashboardChatHistory
          isOpen={historyOpen}
          conversations={conversations}
          activeConversationId={currentConversation?.id}
          isLoading={isLoading}
          onClose={() => setHistoryOpen(false)}
          onSelect={selectConversation}
          onNewChat={startNewChat}
        />
      )}
      <DashboardChatContext.Provider
        value={{ selectedPersona, selectedPersonaId, selectPersona, startNewChat, openHistory }}
      >
        <div
          className={`min-h-screen pt-16 transition-[margin] duration-300 lg:ml-64 ${
            isHome && historyOpen ? 'lg:pl-80' : ''
          }`}
        >
          {children}
        </div>
      </DashboardChatContext.Provider>
    </div>
  );
}
