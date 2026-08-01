'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
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
  }, []);

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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ transition: 'opacity 0.3s' }}
        ></div>
      )}

      {/* Side Navigation */}
      <aside
        className={`fixed left-0 top-0 h-full flex flex-col py-6 px-4 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{
          width: '16rem',
          backgroundColor: '#f8f9ff',
          borderRight: '1px solid #bec9c8'
        }}
      >
        {/* Close button for mobile */}
        <button
          className="lg:hidden absolute top-4 right-4 p-2"
          onClick={() => setSidebarOpen(false)}
          style={{ color: '#3f4948' }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-10 px-2 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#005657', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined">hub</span>
          </div>
          <div>
            <h1
              className="font-bold"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '24px',
                lineHeight: '32px',
                fontWeight: '600',
                color: '#005657'
              }}
            >
              PersonaFlow
            </h1>
            <p
              className="opacity-70"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '12px',
                lineHeight: '14px',
                fontWeight: '500',
                color: '#3f4948'
              }}
            >
              AI Knowledge Hub
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {/* Home Tab: Active */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-3 font-bold transition-all duration-200"
            style={{
              color: '#005657',
              borderLeft: '4px solid #005657',
              backgroundColor: 'rgba(163, 237, 236, 0.3)'
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">home</span>
            <span
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
            >
              Home
            </span>
          </Link>

          {/* Personas Tab */}
          <Link
            href="/dashboard/personas"
            className="flex items-center gap-3 px-3 py-3 transition-colors group"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#005657';
              e.currentTarget.style.backgroundColor = '#dce9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#3f4948';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined">smart_toy</span>
            <span
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
            >
              Personas
            </span>
          </Link>

          {/* Knowledge Base Tab */}
          <Link
            href="/dashboard/knowledge"
            className="flex items-center gap-3 px-3 py-3 transition-colors group"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#005657';
              e.currentTarget.style.backgroundColor = '#dce9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#3f4948';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined">database</span>
            <span
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
            >
              Knowledge Base
            </span>
          </Link>
        </nav>

        <div
          className="mt-auto space-y-1 pt-6"
          style={{ borderTop: '1px solid #bec9c8' }}
        >
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-3 transition-colors group"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#005657';
              e.currentTarget.style.backgroundColor = '#dce9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#3f4948';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined">account_circle</span>
            <span
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
            >
              Profile
            </span>
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-3 transition-colors group"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#005657';
              e.currentTarget.style.backgroundColor = '#dce9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#3f4948';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
            >
              Logout
            </span>
          </Link>
        </div>
      </aside>

      {/* Top App Bar */}
      <header
        className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 flex justify-between lg:justify-end items-center px-4 lg:px-8 z-40"
        style={{
          backgroundColor: '#f8f9ff',
          borderBottom: '1px solid #bec9c8'
        }}
      >
        {/* Hamburger Menu for Mobile */}
        <button
          className="lg:hidden p-2"
          onClick={() => setSidebarOpen(true)}
          style={{ color: '#005657' }}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="flex items-center gap-3 lg:gap-6">
          <button
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full active:scale-95 transition-all"
            style={{
              backgroundColor: '#1a7070',
              color: '#a4f1f0',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              lineHeight: '16px',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <span className="hidden sm:inline">Switch Persona</span>
            <span className="sm:hidden">Persona</span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>

          <div
            className="w-10 h-10 rounded-full overflow-hidden"
            style={{
              backgroundColor: '#e5eeff',
              border: '1px solid #bec9c8'
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundColor: '#dce9ff',
                color: '#005657',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              AH
            </div>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="pt-16 min-h-screen relative flex flex-col lg:ml-64">
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
              Good afternoon, Alex!
            </h2>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(16px, 2vw, 18px)',
                lineHeight: 'clamp(24px, 2.5vw, 28px)',
                color: '#3f4948'
              }}
            >
              Your business analyst persona is active. What can I help you synthesize today?
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
                  I've parsed the latest Q3 reports. You have 3 strategic opportunities waiting for
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
