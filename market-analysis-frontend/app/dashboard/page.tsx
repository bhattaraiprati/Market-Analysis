'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useDashboardChat } from './components/DashboardChatContext';
import { MarkdownMessage } from './components/MarkdownMessage';

const starterPrompts = [
  { icon: 'query_stats', title: 'Analyze competitors', prompt: 'Analyze our current competitors and summarize their strengths.' },
  { icon: 'architecture', title: 'Plan a project', prompt: 'Help me scope a new project with objectives, risks, and milestones.' },
  { icon: 'group_add', title: 'Find opportunities', prompt: 'Identify the strongest growth opportunities for our organization.' },
  { icon: 'history_edu', title: 'Draft a brief', prompt: 'Draft a concise strategic brief using the available knowledge.' },
];

export default function DashboardPage() {
  const { user, organization } = useAuthStore();
  const { selectedPersona } = useDashboardChat();
  const {
    currentConversation,
    isLoading,
    isSending,
    error,
    startConversation,
    sendMessage,
    fetchConversationById,
    fetchConversations,
    clearError,
  } = useConversationStore();
  const [content, setContent] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submissionLockRef = useRef(false);
  const hasPendingResponse = Boolean(
    currentConversation?.messages.some(
      (message) =>
        message.role === 'assistant' && ['pending', 'processing'].includes(message.status)
    )
  );
  const isAwaitingResponse = isSending || hasPendingResponse;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (!currentConversation || !hasPendingResponse) return;

    const refreshTimer = window.setTimeout(() => {
      fetchConversationById(currentConversation.id).catch(console.error);
    }, 2500);
    return () => window.clearTimeout(refreshTimer);
  }, [currentConversation, fetchConversationById, hasPendingResponse]);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent || isAwaitingResponse || submissionLockRef.current) return;
    if (!selectedPersona) {
      setSelectionError('Choose a persona from the header before starting a chat.');
      return;
    }

    submissionLockRef.current = true;
    setSelectionError('');
    clearError();
    setContent('');
    try {
      if (currentConversation) {
        await sendMessage(currentConversation.id, trimmedContent);
      } else {
        await startConversation(selectedPersona.id, trimmedContent);
        await fetchConversations(selectedPersona.id);
      }
    } catch (submitError) {
      setContent(trimmedContent);
      console.error('Failed to send message:', submitError);
    } finally {
      submissionLockRef.current = false;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col" style={{ backgroundColor: '#f8f9ff' }}>
      {currentConversation ? (
        <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 border-b pb-4" style={{ borderColor: '#dce5e4' }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#1a7070' }}>
              {selectedPersona?.name || currentConversation.persona?.name || 'Persona'}
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl" style={{ color: '#0b1c30' }}>
              {currentConversation.title}
            </h1>
          </div>

          <div className="flex-1 space-y-6 pb-8">
            {isLoading && currentConversation.messages.length === 0 ? (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-3xl" style={{ color: '#1a7070' }}>progress_activity</span>
              </div>
            ) : (
              currentConversation.messages.map((message) => {
                const isUser = message.role === 'user';
                const isPending = message.role === 'assistant' && ['pending', 'processing'].includes(message.status);
                return (
                  <article key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#dff3f2', color: '#005657' }}>
                        <span className="material-symbols-outlined text-xl">smart_toy</span>
                      </div>
                    )}
                    <div
                      className={`${isUser ? 'max-w-[85%] whitespace-pre-wrap' : 'min-w-0 max-w-full sm:max-w-[92%]'} rounded-2xl px-4 py-3 text-sm leading-6 sm:text-base`}
                      style={{
                        backgroundColor: isUser ? '#005657' : '#ffffff',
                        color: isUser ? '#ffffff' : '#0b1c30',
                        border: isUser ? 'none' : '1px solid #dce5e4',
                      }}
                    >
                      {isPending ? (
                        <span className="flex items-center gap-2" style={{ color: '#6f7979' }}>
                          <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                          {selectedPersona?.name || 'Persona'} is thinking…
                        </span>
                      ) : isUser ? message.content : <MarkdownMessage content={message.content} />}
                    </div>
                  </article>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>
      ) : (
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
          <div className="mb-10 max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: '#dff3f2', color: '#005657' }}>
              <span className="material-symbols-outlined text-4xl">auto_awesome</span>
            </div>
            <h1 className="mb-3 text-3xl font-bold sm:text-5xl" style={{ fontFamily: 'Hanken Grotesk, sans-serif', color: '#005657' }}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-base sm:text-lg" style={{ color: '#3f4948' }}>
              {selectedPersona
                ? `Chat with ${selectedPersona.name} using your organization’s connected knowledge.`
                : `Choose a persona in the header to start a private conversation for ${organization?.name || 'your organization'}.`}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {starterPrompts.map((starter) => (
              <button
                key={starter.title}
                type="button"
                disabled={isAwaitingResponse}
                onClick={() => setContent(starter.prompt)}
                className="flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:border-[#1a7070] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: '#dce5e4' }}
              >
                <span className="material-symbols-outlined rounded-lg p-2" style={{ backgroundColor: '#eef7f7', color: '#1a7070' }}>{starter.icon}</span>
                <span>
                  <span className="block text-sm font-semibold" style={{ color: '#0b1c30' }}>{starter.title}</span>
                  <span className="mt-1 block text-xs leading-5" style={{ color: '#6f7979' }}>{starter.prompt}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="sticky bottom-0 z-10 w-full px-4 pb-5 pt-3" style={{ background: 'linear-gradient(transparent, #f8f9ff 30%)' }}>
        <form onSubmit={submitMessage} className="mx-auto max-w-3xl">
          {(selectionError || error) && (
            <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: '#ffebee', color: '#93000a' }}>
              <span>{selectionError || error}</span>
              <button type="button" onClick={() => { setSelectionError(''); clearError(); }} aria-label="Dismiss error">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-lg" style={{ borderColor: '#bec9c8' }}>
            <textarea
              rows={1}
              disabled={isAwaitingResponse}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={isAwaitingResponse
                ? 'Please wait for the response to finish…'
                : selectedPersona
                  ? `Message ${selectedPersona.name}…`
                  : 'Choose a persona to begin…'}
              aria-busy={isAwaitingResponse}
              className="max-h-36 min-h-11 flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              style={{ color: '#0b1c30' }}
            />
            <button
              type="submit"
              disabled={!content.trim() || isAwaitingResponse}
              aria-label={isAwaitingResponse ? 'Waiting for response' : 'Send message'}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: '#005657', color: '#ffffff' }}
            >
              <span className={`material-symbols-outlined ${isAwaitingResponse ? 'animate-spin' : ''}`}>
                {isAwaitingResponse ? 'progress_activity' : 'arrow_upward'}
              </span>
            </button>
          </div>
          <p className="mt-2 text-center text-xs" style={{ color: '#6f7979' }}>
            {isAwaitingResponse
              ? 'Please wait for the full response before sending another prompt.'
              : currentConversation
                ? 'Enter to send · Shift + Enter for a new line'
                : 'A conversation is created only after you send your first message.'}
          </p>
        </form>
      </footer>
    </main>
  );
}
