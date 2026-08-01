'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const knowledgeBases = [
    {
      id: 1,
      name: 'Market Competitor',
      details: '42 PDF Files • 128MB',
      icon: 'description',
      iconBg: '#a3edec',
      iconColor: '#005657',
      status: 'Created',
      type: 'External Docs',
      createdBy: 'Alex Smith',
      avatar: 'AS',
      avatarBg: '#96551a',
      lastModified: '2 hours ago'
    },
    {
      id: 2,
      name: 'Company Database',
      details: 'SQL Connector • 1.2M Rows',
      icon: 'table_chart',
      iconBg: '#ffdcc4',
      iconColor: '#793e01',
      status: 'Created',
      type: 'Dynamic Data',
      createdBy: 'Maria Wong',
      avatar: 'MW',
      avatarBg: '#1a7070',
      lastModified: 'Yesterday, 4:30 PM'
    },
    {
      id: 3,
      name: 'Product Roadmap 2024',
      details: 'Notion Sync • 12 Pages',
      icon: 'web',
      iconBg: '#dce9ff',
      iconColor: '#3f4948',
      status: 'Created',
      type: 'Cloud Integration',
      createdBy: 'Alex Smith',
      avatar: 'AS',
      avatarBg: '#96551a',
      lastModified: 'Oct 12, 2023'
    }
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}
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
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#005657', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined text-2xl">database</span>
          </div>
          <div>
            <h1
              className="font-bold leading-none"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '24px',
                fontWeight: '600',
                color: '#005657'
              }}
            >
              PersonaFlow
            </h1>
            <p
              className="mt-1"
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
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group"
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

          <Link
            href="/dashboard/personas"
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group"
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

          {/* Knowledge Base - Active */}
          <Link
            href="/dashboard/knowledge"
            className="flex items-center gap-3 px-3 py-3 rounded-lg font-bold transition-all duration-200"
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
              database
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
              Knowledge Base
            </span>
          </Link>
        </nav>

        <div
          className="mt-auto pt-6 px-2"
          style={{ borderTop: '1px solid #bec9c8' }}
        >
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 py-3 transition-colors"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = '#005657'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#3f4948'}
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
            className="flex items-center gap-3 py-3 transition-colors"
            style={{ color: '#3f4948' }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = '#005657'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#3f4948'}
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
        <button
          className="lg:hidden p-2"
          onClick={() => setSidebarOpen(true)}
          style={{ color: '#005657' }}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all active:scale-95"
            style={{
              border: '1px solid #6f7979',
              color: '#005657',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              lineHeight: '16px',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>Switch Persona</span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>

          <div
            className="w-8 h-8 rounded-full overflow-hidden"
            style={{
              backgroundColor: '#d3e4fe',
              border: '1px solid #bec9c8'
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
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
      <main className="pt-16 lg:mt-16 p-4 lg:p-10 min-h-screen lg:ml-64">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div>
            <h2
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: 'clamp(24px, 4vw, 32px)',
                lineHeight: 'clamp(32px, 4.5vw, 40px)',
                fontWeight: '600',
                letterSpacing: '-0.01em',
                color: '#0b1c30'
              }}
            >
              Knowledge Bases
            </h2>
            <p
              className="mt-1"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(14px, 1.5vw, 16px)',
                lineHeight: 'clamp(20px, 2vw, 24px)',
                color: '#3f4948'
              }}
            >
              Manage and organize the data sources that fuel your AI personas.
            </p>
          </div>

          <button
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-3 rounded-lg active:scale-95 transition-all"
            style={{
              backgroundColor: '#005657',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              lineHeight: '16px',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <span className="material-symbols-outlined">add</span>
            <span className="hidden sm:inline">Create Knowledge Base</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div
            className="md:col-span-8 p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between overflow-hidden relative group"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bec9c8'
            }}
          >
            <div className="relative z-10 mb-4 sm:mb-0">
              <span
                className="uppercase tracking-widest"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '12px',
                  lineHeight: '14px',
                  fontWeight: '500',
                  color: '#005657'
                }}
              >
                Active Storage
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 'clamp(36px, 6vw, 48px)',
                    lineHeight: 'clamp(44px, 7vw, 56px)',
                    fontWeight: '700',
                    letterSpacing: '-0.02em',
                    color: '#0b1c30'
                  }}
                >
                  12.4
                </span>
                <span
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 'clamp(20px, 3vw, 24px)',
                    lineHeight: 'clamp(28px, 3.5vw, 32px)',
                    fontWeight: '600',
                    color: '#3f4948'
                  }}
                >
                  GB
                </span>
              </div>
              <p
                className="mt-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#3f4948'
                }}
              >
                78% of your current plan capacity used
              </p>
            </div>

            {/* Chart */}
            <div className="w-full sm:w-48 h-24 relative z-10">
              <div className="flex items-end h-full gap-2 justify-center sm:justify-start">
                <div className="w-4 rounded-t-sm" style={{ backgroundColor: 'rgba(0, 86, 87, 0.2)', height: '40%' }}></div>
                <div className="w-4 rounded-t-sm" style={{ backgroundColor: 'rgba(0, 86, 87, 0.2)', height: '60%' }}></div>
                <div className="w-4 rounded-t-sm" style={{ backgroundColor: 'rgba(0, 86, 87, 0.4)', height: '55%' }}></div>
                <div className="w-4 rounded-t-sm" style={{ backgroundColor: 'rgba(0, 86, 87, 0.6)', height: '85%' }}></div>
                <div className="w-4 rounded-t-sm" style={{ backgroundColor: '#005657', height: '95%' }}></div>
                <div className="w-4 rounded-t-sm" style={{ backgroundColor: 'rgba(0, 86, 87, 0.4)', height: '70%' }}></div>
              </div>
            </div>

            <div
              className="absolute right-0 top-0 w-64 h-64 rounded-full -mr-20 -mt-20"
              style={{
                backgroundColor: 'rgba(0, 86, 87, 0.05)',
                filter: 'blur(80px)'
              }}
            ></div>
          </div>

          <div
            className="md:col-span-4 p-6 rounded-xl flex flex-col justify-center"
            style={{
              backgroundColor: '#1a7070',
              border: '1px solid #005657',
              color: '#ffffff'
            }}
          >
            <span
              className="uppercase tracking-widest"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '12px',
                lineHeight: '14px',
                fontWeight: '500',
                color: '#a4f1f0'
              }}
            >
              Total Bases
            </span>
            <span
              className="mt-2"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: 'clamp(36px, 6vw, 48px)',
                lineHeight: 'clamp(44px, 7vw, 56px)',
                fontWeight: '700',
                letterSpacing: '-0.02em'
              }}
            >
              24
            </span>
            <div
              className="mt-4 flex items-center gap-2"
              style={{
                color: '#a4f1f0',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
            >
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+3 this month</span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #bec9c8',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
          }}
        >
          {/* Table Header with Search */}
          <div
            className="px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ borderBottom: '1px solid #bec9c8' }}
          >
            <div className="relative flex-1 w-full max-w-md">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#3f4948' }}
              >
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: '#eff4ff',
                  border: '1px solid #6f7979',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#0b1c30'
                }}
                placeholder="Search knowledge bases..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = '#005657';
                  e.target.style.boxShadow = '0 0 0 1px #005657';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#6f7979';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#3f4948' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#3f4948' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </div>

          {/* Table - Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  style={{
                    backgroundColor: '#eff4ff',
                    borderBottom: '1px solid #bec9c8'
                  }}
                >
                  <th
                    className="px-6 py-4 uppercase tracking-wider"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: '#3f4948'
                    }}
                  >
                    Name
                  </th>
                  <th
                    className="px-6 py-4 uppercase tracking-wider"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: '#3f4948'
                    }}
                  >
                    Status
                  </th>
                  <th
                    className="px-6 py-4 uppercase tracking-wider"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: '#3f4948'
                    }}
                  >
                    Type
                  </th>
                  <th
                    className="px-6 py-4 uppercase tracking-wider"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: '#3f4948'
                    }}
                  >
                    Created By
                  </th>
                  <th
                    className="px-6 py-4 uppercase tracking-wider"
                    style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: '#3f4948'
                    }}
                  >
                    Last Modified
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {knowledgeBases.map((kb) => (
                  <tr
                    key={kb.id}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid #bec9c8' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff4ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: kb.iconBg,
                            color: kb.iconColor
                          }}
                        >
                          <span className="material-symbols-outlined">{kb.icon}</span>
                        </div>
                        <div>
                          <div
                            className="font-semibold"
                            style={{
                              fontFamily: 'Geist, sans-serif',
                              fontSize: '14px',
                              lineHeight: '16px',
                              fontWeight: '600',
                              letterSpacing: '0.02em',
                              color: '#0b1c30'
                            }}
                          >
                            {kb.name}
                          </div>
                          <div
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#3f4948'
                            }}
                          >
                            {kb.details}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full"
                        style={{
                          backgroundColor: '#a3edec',
                          color: '#005657',
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mr-2"
                          style={{ backgroundColor: '#005657' }}
                        ></span>
                        {kb.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#0b1c30'
                        }}
                      >
                        {kb.type}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: kb.avatarBg,
                            color: '#ffffff'
                          }}
                        >
                          {kb.avatar}
                        </div>
                        <span
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            lineHeight: '20px',
                            color: '#0b1c30'
                          }}
                        >
                          {kb.createdBy}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#3f4948'
                        }}
                      >
                        {kb.lastModified}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        className="opacity-0 group-hover:opacity-100 p-2 transition-all"
                        style={{ color: '#3f4948' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#005657'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#3f4948'}
                      >
                        <span className="material-symbols-outlined">settings</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y" style={{ borderColor: '#bec9c8' }}>
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: kb.iconBg,
                      color: kb.iconColor
                    }}
                  >
                    <span className="material-symbols-outlined">{kb.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold truncate"
                      style={{
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0b1c30'
                      }}
                    >
                      {kb.name}
                    </div>
                    <div
                      className="text-sm"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        color: '#3f4948'
                      }}
                    >
                      {kb.details}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: '#a3edec',
                      color: '#005657',
                      fontSize: '12px'
                    }}
                  >
                    {kb.status}
                  </span>
                  <span style={{ color: '#3f4948' }}>{kb.type}</span>
                  <span style={{ color: '#3f4948' }}>• {kb.lastModified}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div
            className="px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{
              backgroundColor: '#eff4ff',
              borderTop: '1px solid #bec9c8'
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#3f4948'
              }}
            >
              Showing 1 to 3 of 24 results
            </span>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  border: '1px solid #6f7979',
                  color: '#3f4948'
                }}
                disabled
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#dce9ff')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                className="p-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid #6f7979',
                  color: '#3f4948'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Featured Resources */}
        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div
            className="lg:col-span-2 p-6 lg:p-8 rounded-xl relative overflow-hidden group"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bec9c8'
            }}
          >
            <div className="relative z-10 max-w-md">
              <h3
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontWeight: '600',
                  color: '#005657'
                }}
              >
                Need more precision?
              </h3>
              <p
                className="mt-3"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#3f4948'
                }}
              >
                Learn how to fine-tune your knowledge bases with custom metadata and vector
                embeddings for higher response accuracy.
              </p>
              <Link
                className="inline-flex items-center gap-2 mt-6 font-bold hover:underline"
                href="#"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '600',
                  letterSpacing: '0.02em',
                  color: '#005657'
                }}
              >
                Read Documentation
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            <div
              className="absolute -right-12 -bottom-12 w-64 h-64 opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ color: '#005657' }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '12rem',
                  fontVariationSettings: "'FILL' 1"
                }}
              >
                auto_awesome
              </span>
            </div>
          </div>

          <div
            className="p-6 lg:p-8 rounded-xl flex flex-col justify-center items-center text-center"
            style={{
              backgroundColor: '#e5eeff',
              border: '1px solid #bec9c8'
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'rgba(0, 86, 87, 0.1)',
                color: '#005657'
              }}
            >
              <span className="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            <h4
              className="uppercase tracking-widest"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                color: '#0b1c30'
              }}
            >
              Quick Import
            </h4>
            <p
              className="mt-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#3f4948'
              }}
            >
              Drag and drop any file here to start a new knowledge base instantly.
            </p>
            <button
              className="mt-6 px-4 py-2 rounded-lg transition-all w-full"
              style={{
                border: '2px dashed rgba(0, 86, 87, 0.4)',
                color: '#005657',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                lineHeight: '16px',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 86, 87, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Select File
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
