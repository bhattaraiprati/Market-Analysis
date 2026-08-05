'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePersonaStore } from '@/lib/stores/personaStore';

export default function DashboardPage() {
  const { user, organization } = useAuthStore();
  const { personas, fetchPersonas } = usePersonaStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch personas on load
    fetchPersonas().catch(console.error);

    // Simple animation on load for cards
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach((card, index) => {
      (card as HTMLElement).style.opacity = '0';
      (card as HTMLElement).style.transform = 'translateY(10px)';
      setTimeout(() => {
        (card as HTMLElement).style.transition = 'all 0.5s ease-out';
        (card as HTMLElement).style.opacity = '1';
        (card as HTMLElement).style.transform = 'translateY(0)';
      }, 100 * index);
    });
  }, [fetchPersonas]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { icon: 'architecture', title: 'Project Scoping', description: 'Outline key objectives' },
    { icon: 'group_add', title: 'Lead Gen', description: 'Compile potential leads' },
    { icon: 'query_stats', title: 'Data Review', description: 'Analyze sales data' },
    { icon: 'history_edu', title: 'Content Draft', description: 'Draft technical brief' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#f8f9ff', fontFamily: 'Inter, sans-serif' }}
    >
      <main className="min-h-screen relative flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 lg:px-10 py-6 lg:py-8">
          {/* Hero Greeting */}
          <div className="text-center mb-8 lg:mb-12 max-w-2xl">
            <h2
              className="mb-3 lg:mb-4"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: 'clamp(28px, 5vw, 48px)',
                lineHeight: 'clamp(36px, 5.5vw, 56px)',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                color: '#005657'
              }}
            >
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
            </h2>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(16px, 2vw, 18px)',
                lineHeight: 'clamp(24px, 2.5vw, 28px)',
                color: '#3f4948'
              }}
            >
              {organization?.name || 'Your organization'} • {personas.length} persona{personas.length !== 1 ? 's' : ''} active
            </p>
          </div>

          {/* Bento Quick Actions - Responsive Grid */}
          <div
            className="w-full max-w-6xl grid gap-4 md:gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
            }}
          >
            {/* Large Feature Card */}
            <div
              className="glass-card rounded-xl p-6 lg:p-8 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer group col-span-full md:col-span-2 lg:col-span-2 md:row-span-2"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                minHeight: '250px'
              }}
            >
              <div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 lg:mb-6"
                  style={{
                    backgroundColor: '#a3edec',
                    color: '#005657'
                  }}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    auto_awesome
                  </span>
                </div>
                <h3
                  className="mb-2 lg:mb-3"
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 'clamp(20px, 3vw, 24px)',
                    lineHeight: 'clamp(28px, 3.5vw, 32px)',
                    fontWeight: '600',
                    color: '#0b1c30'
                  }}
                >
                  Intelligence Summary
                </h3>
                <p
                  className="opacity-80"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 'clamp(14px, 1.5vw, 16px)',
                    lineHeight: 'clamp(20px, 2vw, 24px)',
                    color: '#3f4948'
                  }}
                >
                  I&apos;ve parsed the latest Q3 reports. You have 3 strategic opportunities waiting for
                  your review.
                </p>
              </div>
              <div
                className="flex items-center font-bold group-hover:gap-2 transition-all mt-4"
                style={{ color: '#005657' }}
              >
                <span>Read Summary</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </div>

            {/* Quick Actions */}
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-5 lg:p-6 transition-all cursor-pointer group"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  minHeight: '160px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 86, 87, 0.5)'}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.5)')
                }
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 lg:mb-4"
                  style={{
                    backgroundColor: '#e5eeff',
                    color: '#1a7070'
                  }}
                >
                  <span className="material-symbols-outlined">{action.icon}</span>
                </div>
                <h4
                  className="mb-1"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    lineHeight: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
                    color: '#0b1c30'
                  }}
                >
                  {action.title}
                </h4>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#3f4948'
                  }}
                >
                  {action.description}
                </p>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div className="h-20 lg:h-32 w-full"></div>
        </section>

        {/* Command Bar Footer - Responsive */}
        <footer className="sticky bottom-0 w-full flex justify-center pb-4 lg:pb-8 px-4 lg:px-10">
          <div
            className="w-full max-w-3xl rounded-full p-2 flex items-center gap-2 shadow-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(111, 121, 121, 0.2)'
            }}
          >
            <div className="pl-3 lg:pl-4 pr-2 flex items-center" style={{ color: '#3f4948' }}>
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 py-2 lg:py-3 px-2 outline-none text-sm lg:text-base"
              placeholder="Ask your co-pilot..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                fontFamily: 'Inter, sans-serif',
                color: '#0b1c30'
              }}
            />
            <div className="flex items-center gap-2 pr-2">
              <kbd
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded"
                style={{
                  backgroundColor: '#e5eeff',
                  border: '1px solid rgba(190, 201, 200, 0.3)',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '12px',
                  lineHeight: '14px',
                  color: '#3f4948'
                }}
              >
                <span className="material-symbols-outlined text-sm">keyboard_command_key</span>
                <span>K</span>
              </kbd>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: '#005657',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a7070'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#005657'}
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
