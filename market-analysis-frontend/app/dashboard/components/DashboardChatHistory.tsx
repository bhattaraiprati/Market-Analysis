'use client';

import type { Conversation } from '@/types/api';

type DashboardChatHistoryProps = {
  isOpen: boolean;
  conversations: Conversation[];
  activeConversationId?: string;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
};

function formatConversationDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function DashboardChatHistory({
  isOpen,
  conversations,
  activeConversationId,
  isLoading,
  onClose,
  onSelect,
  onNewChat,
}: DashboardChatHistoryProps) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close chat history"
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Chat history"
        className={`fixed bottom-0 left-0 top-16 z-30 flex w-80 flex-col border-r bg-white shadow-xl transition-transform duration-300 lg:left-64 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-[calc(100%+16rem)]'
        }`}
        style={{ borderColor: '#bec9c8' }}
      >
        <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: '#e2e8e7' }}>
          <div>
            <h2 className="font-semibold" style={{ color: '#0b1c30' }}>Chat history</h2>
            <p className="text-xs" style={{ color: '#6f7979' }}>Your private conversations</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat history" className="rounded-lg p-2 hover:bg-gray-100">
            <span className="material-symbols-outlined" style={{ color: '#3f4948' }}>close</span>
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
            style={{ backgroundColor: '#005657', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined text-lg">add_comment</span>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {isLoading && conversations.length === 0 ? (
            <div className="flex justify-center py-10">
              <span className="material-symbols-outlined animate-spin" style={{ color: '#1a7070' }}>progress_activity</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="material-symbols-outlined mb-2 text-3xl" style={{ color: '#6f7979' }}>forum</span>
              <p className="text-sm" style={{ color: '#6f7979' }}>No conversations yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => onSelect(conversation)}
                    className="w-full rounded-lg px-3 py-3 text-left transition-colors"
                    style={{
                      backgroundColor: isActive ? '#e8f5f4' : 'transparent',
                      color: isActive ? '#005657' : '#0b1c30',
                    }}
                  >
                    <span className="block truncate text-sm font-medium">{conversation.title}</span>
                    <span className="mt-1 flex items-center justify-between text-xs" style={{ color: '#6f7979' }}>
                      <span>{conversation.total_messages ?? 0} messages</span>
                      <span>{formatConversationDate(conversation.last_message_at || conversation.created_at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
