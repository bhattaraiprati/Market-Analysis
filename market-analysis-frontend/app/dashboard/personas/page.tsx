'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock8, Pencil } from 'lucide-react';

export default function PersonasPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Last Updated');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const personas = [
    {
      id: 1,
      name: 'Marketing Persona',
      description: 'Focused on marketing automation and technical copywriting for SaaS products.',
      icon: 'person_apron',
      color: '#005657',
      bgColor: 'rgba(0, 86, 87, 0.1)',
      tags: ['Marketing', 'SaaS'],
      tagColor: 'rgba(163, 237, 236, 0.3)',
      updated: '2h ago'
    },
    {
      id: 2,
      name: 'Data Scientist',
      description: 'Analyzing complex datasets and generating visual reports from raw CSV logs.',
      icon: 'analytics',
      color: '#793e01',
      bgColor: 'rgba(255, 183, 128, 0.3)',
      tags: ['Analytics', 'Python'],
      tagColor: 'rgba(255, 183, 128, 0.2)',
      updated: '1d ago'
    },
    {
      id: 3,
      name: 'Customer Success',
      description: 'Patient and helpful persona designed to handle onboarding queries.',
      icon: 'support_agent',
      color: '#1c6d6d',
      bgColor: 'rgba(163, 237, 236, 0.4)',
      tags: ['Support', 'Empathetic'],
      tagColor: 'rgba(163, 237, 236, 0.3)',
      updated: '3d ago'
    },
    {
      id: 4,
      name: 'Senior Architect',
      description: 'Provides high-level system design patterns and code review feedback.',
      icon: 'terminal',
      color: '#005657',
      bgColor: 'rgba(0, 86, 87, 0.1)',
      tags: ['Code', 'System Design'],
      tagColor: 'rgba(163, 237, 236, 0.3)',
      updated: '5d ago'
    }
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
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#1a7070' }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: "'FILL' 1",
                color: '#a4f1f0'
              }}
            >
              smart_toy
            </span>
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

        <nav className="flex-1 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dce9ff';
              const icon = e.currentTarget.querySelector('.material-symbols-outlined') as HTMLElement;
              if (icon) icon.style.color = '#005657';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              const icon = e.currentTarget.querySelector('.material-symbols-outlined') as HTMLElement;
              if (icon) icon.style.color = '#3f4948';
            }}
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

          {/* Personas - Active */}
          <Link
            href="/dashboard/personas"
            className="relative flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200"
            style={{
              color: '#005657',
              borderLeft: '4px solid #005657',
              backgroundColor: 'rgba(163, 237, 236, 0.3)'
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
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

          <Link
            href="/dashboard/knowledge"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dce9ff';
              const icon = e.currentTarget.querySelector('.material-symbols-outlined') as HTMLElement;
              if (icon) icon.style.color = '#005657';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              const icon = e.currentTarget.querySelector('.material-symbols-outlined') as HTMLElement;
              if (icon) icon.style.color = '#3f4948';
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
          className="mt-auto space-y-2 pt-6"
          style={{ borderTop: '1px solid #bec9c8' }}
        >
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ color: '#ba1a1a' }}>
              logout
            </span>
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
        className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 flex justify-between items-center px-4 lg:px-8 z-40"
        style={{
          backgroundColor: '#f8f9ff',
          borderBottom: '1px solid #bec9c8'
        }}
      >
        <div className="flex items-center gap-4">
          {/* Hamburger Menu for Mobile */}
          <button
            className="lg:hidden p-2"
            onClick={() => setSidebarOpen(true)}
            style={{ color: '#005657' }}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <span
            className="font-semibold"
            style={{
              fontFamily: 'Hanken Grotesk, sans-serif',
              fontSize: 'clamp(18px, 3vw, 24px)',
              lineHeight: '32px',
              fontWeight: '600',
              color: '#0b1c30'
            }}
          >
            Personas
          </span>
          <div
            className="hidden md:block h-4 w-px"
            style={{ backgroundColor: '#bec9c8' }}
          ></div>
          <span
            className="hidden md:inline text-sm"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#3f4948'
            }}
          >
            Manage your AI identities
          </span>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-2 font-bold transition-opacity"
            style={{
              color: '#005657',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              lineHeight: '16px',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Switch Persona
            <span className="material-symbols-outlined">expand_more</span>
          </button>
          <div
            className="w-8 h-8 rounded-full overflow-hidden"
            style={{ border: '1px solid #6f7979' }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundColor: '#dce9ff',
                color: '#005657',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              AH
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 lg:pt-24 pb-12 px-4 lg:px-10 min-h-screen lg:ml-64">
        {/* Toolbar: Search & Actions */}
        <section className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
          <div className="relative w-full max-w-lg group">
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#6f7979' }}
            >
              search
            </span>
            <input
              className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bec9c8',
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                lineHeight: '24px',
                color: '#0b1c30'
              }}
              placeholder="Search personas by name, role or expertise..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 0 2px rgba(0, 86, 87, 0.2)';
                e.target.style.borderColor = '#005657';
                const icon = e.target.previousElementSibling as HTMLElement;
                if (icon) icon.style.color = '#005657';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = '#bec9c8';
                const icon = e.target.previousElementSibling as HTMLElement;
                if (icon) icon.style.color = '#6f7979';
              }}
            />
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div
              className="flex items-center gap-2 rounded-xl px-3 lg:px-4 py-3 transition-colors cursor-pointer group"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bec9c8'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6f7979'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#bec9c8'}
            >
              <span className="material-symbols-outlined" style={{ color: '#6f7979' }}>
                sort
              </span>
              <select
                className="bg-transparent border-none focus:ring-0 cursor-pointer p-0 text-sm"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  color: '#0b1c30'
                }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option>Last Updated</option>
                <option>Name (A-Z)</option>
                <option>Creation Date</option>
                <option>Most Active</option>
              </select>
            </div>

            <button
              className="px-4 lg:px-6 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all"
              style={{
                backgroundColor: '#1a7070',
                color: '#ffffff',
                boxShadow: '0 4px 6px rgba(0, 86, 87, 0.1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span className="material-symbols-outlined">add</span>
              <span className="hidden sm:inline">Create New</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </section>

        {/* Persona Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Persona Card */}
          <button
            className="group flex flex-col items-center justify-center p-8 rounded-2xl transition-all duration-300"
            style={{
              backgroundColor: '#eff4ff',
              border: '2px dashed #bec9c8',
              minHeight: '340px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 86, 87, 0.5)';
              e.currentTarget.style.backgroundColor = '#dce9ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#bec9c8';
              e.currentTarget.style.backgroundColor = '#eff4ff';
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
              style={{
                backgroundColor: '#d3e4fe',
                color: '#005657'
              }}
            >
              <span className="material-symbols-outlined text-4xl">add_circle</span>
            </div>
            <span
              className="group-hover:text-primary transition-colors"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '24px',
                lineHeight: '32px',
                fontWeight: '600',
                color: '#3f4948'
              }}
            >
              New Persona
            </span>
            <p
              className="text-center mt-3 max-w-[200px]"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6f7979'
              }}
            >
              Define a new AI identity with specific knowledge and tone.
            </p>
          </button>

          {/* Persona Cards */}
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="group relative rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bec9c8',
                background: `linear-gradient(135deg, ${persona.bgColor.replace('0.1', '0.05')} 0%, rgba(255, 255, 255, 0) 100%)`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 86, 87, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: persona.bgColor,
                      color: persona.color
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {persona.icon}
                    </span>
                  </div>
                  <button
                    className="p-2 rounded-full transition-colors"
                    style={{ color: '#6f7979' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>

                <h3
                  className="mb-1"
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: '24px',
                    lineHeight: '32px',
                    fontWeight: '600',
                    color: '#0b1c30'
                  }}
                >
                  {persona.name}
                </h3>

                <p
                  className="mb-4 line-clamp-2"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#3f4948'
                  }}
                >
                  {persona.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {persona.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: persona.tagColor,
                        color: persona.color,
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '12px',
                        lineHeight: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div
                  className="flex items-center justify-between pt-4 mt-auto"
                  style={{ borderTop: '1px solid #bec9c8' }}
                >
                  <span
                    className="flex items-center gap-1"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '12px',
                      lineHeight: '14px',
                      fontWeight: '500',
                      color: '#6f7979'
                    }}
                  >
                    <Clock8 size={14} />
                    Updated {persona.updated}
                  </span>
                  <button
                    className="font-bold flex items-center gap-1 hover:underline"
                    style={{
                      color: '#005657',
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '700',
                      letterSpacing: '0.02em'
                    }}
                  >
                    Edit
                    {/* <span className="material-symbols-outlined text-[10px]">edit</span> */}
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pro Tip Banner */}
        <section
          className="mt-16 p-6 lg:p-10 rounded-3xl relative overflow-hidden"
          style={{
            backgroundColor: '#1a7070',
            color: '#ffffff'
          }}
        >
          {/* Background Decoration */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              filter: 'blur(80px)'
            }}
          ></div>
          <div
            className="absolute bottom-0 left-0 w-96 h-96 rounded-full translate-y-1/2 -translate-x-1/2"
            style={{
              backgroundColor: 'rgba(163, 237, 236, 0.1)',
              filter: 'blur(80px)'
            }}
          ></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10">
            <div className="max-w-xl">
              <span
                className="inline-block px-3 py-1 rounded-full mb-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '500',
                  letterSpacing: '0.02em'
                }}
              >
                Pro Tip
              </span>
              <h2
                className="mb-4"
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  lineHeight: 'clamp(32px, 4.5vw, 40px)',
                  fontWeight: '600',
                  letterSpacing: '-0.01em'
                }}
              >
                Boost Persona Accuracy with Knowledge Injection
              </h2>
              <p
                className="mb-8 opacity-90"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  lineHeight: '24px'
                }}
              >
                Connect your Notion, Google Drive, or local PDF files to give your personas deep,
                context-aware intelligence tailored to your specific workflows.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  className="px-6 lg:px-8 py-3 rounded-xl font-bold active:scale-95 transition-all"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#005657',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  Connect Knowledge Base
                </button>
                <button
                  className="font-bold px-6 py-3 rounded-xl transition-all"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Learn More
                </button>
              </div>
            </div>

            <div className="hidden lg:block w-72 h-72 relative">
              <div
                className="w-full h-full rounded-[2.5rem] flex items-center justify-center relative"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              >
                <span className="material-symbols-outlined opacity-40" style={{ fontSize: '8rem' }}>
                  hub
                </span>
                <div
                  className="absolute -top-4 -left-4 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: '#a3edec',
                    color: '#005657',
                    animation: 'bounce 3s infinite'
                  }}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    description
                  </span>
                </div>
                <div
                  className="absolute -bottom-4 -right-4 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: '#ffb780',
                    color: '#793e01',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    folder_shared
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
