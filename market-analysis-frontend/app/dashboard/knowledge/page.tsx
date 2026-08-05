'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKnowledgeBaseStore } from '@/lib/stores/knowledgeBaseStore';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const {
    knowledgeBases,
    fetchKnowledgeBases,
    deleteKB,
    isLoading,
    error,
    clearError,
  } = useKnowledgeBaseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<string>('ALL');

  useEffect(() => {
    fetchKnowledgeBases().catch(console.error);
  }, [fetchKnowledgeBases]);

  const handleDeleteKB = async (id: string) => {
    try {
      await deleteKB(id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete knowledge base:', err);
    }
  };

  const filteredKBs = knowledgeBases.filter((kb) => {
    const matchesSearch =
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterVisibility === 'ALL' || kb.visibility === filterVisibility;
    return matchesSearch && matchesFilter;
  });

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return { bg: '#e5eeff', text: '#1a7070' };
      case 'ORGANIZATION':
        return { bg: '#fff4e5', text: '#cc6600' };
      case 'PRIVATE':
        return { bg: '#f0f0f0', text: '#3f4948' };
      default:
        return { bg: '#f0f0f0', text: '#3f4948' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      if (hours < 1) return 'Just now';
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const totalFiles = knowledgeBases.reduce((acc, kb) => acc + (kb.total_documents || 0), 0);
  const totalChunks = knowledgeBases.reduce((acc, kb) => acc + (kb.total_chunks || 0), 0);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}
    >
      <main className="p-4 lg:p-10 min-h-screen">
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
            onClick={() => setShowCreateModal(true)}
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

        {/* Error Display */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: '#c00' }}>
                error
              </span>
              <span style={{ color: '#c00', fontFamily: 'Inter, sans-serif' }}>
                {error}
              </span>
            </div>
            <button onClick={clearError} style={{ color: '#c00' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

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
                Total Files
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
                  {totalFiles}
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
                  files
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
                {totalChunks} chunks processed across all knowledge bases
              </p>
            </div>

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
              {knowledgeBases.length}
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
              <span className="material-symbols-outlined text-sm">database</span>
              <span>Active knowledge bases</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #bec9c8'
          }}
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

          <div className="flex gap-2 flex-wrap">
            {['ALL', 'PRIVATE', 'ORGANIZATION', 'PUBLIC'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterVisibility(filter)}
                className="px-4 py-2 rounded-lg transition-all text-sm"
                style={{
                  backgroundColor:
                    filterVisibility === filter ? '#005657' : 'transparent',
                  color: filterVisibility === filter ? '#ffffff' : '#3f4948',
                  border: `1px solid ${filterVisibility === filter ? '#005657' : '#6f7979'}`,
                  fontFamily: 'Geist, sans-serif',
                  fontWeight: '500',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Bases Grid */}
        {isLoading && knowledgeBases.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-6 animate-pulse"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bec9c8',
                }}
              >
                <div
                  className="h-12 w-12 rounded-lg mb-4"
                  style={{ backgroundColor: '#e5eeff' }}
                ></div>
                <div
                  className="h-6 rounded mb-3"
                  style={{ backgroundColor: '#e5eeff', width: '70%' }}
                ></div>
                <div
                  className="h-4 rounded mb-2"
                  style={{ backgroundColor: '#e5eeff' }}
                ></div>
                <div
                  className="h-4 rounded"
                  style={{ backgroundColor: '#e5eeff', width: '60%' }}
                ></div>
              </div>
            ))}
          </div>
        ) : filteredKBs.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bec9c8',
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#e5eeff' }}
            >
              <span
                className="material-symbols-outlined text-4xl"
                style={{ color: '#1a7070' }}
              >
                database
              </span>
            </div>
            <h3
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '20px',
                fontWeight: '600',
                color: '#0b1c30',
                marginBottom: '8px',
              }}
            >
              No knowledge bases found
            </h3>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                color: '#3f4948',
              }}
            >
              {searchQuery || filterVisibility !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Create your first knowledge base to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKBs.map((kb) => {
              const visColors = getVisibilityColor(kb.visibility);
              return (
                <div
                  key={kb.id}
                  className="rounded-xl p-6 transition-all cursor-pointer group hover:shadow-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #bec9c8',
                  }}
                  onClick={() => router.push(`/dashboard/knowledge/${kb.id}`)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = '#005657')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = '#bec9c8')
                  }
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#a3edec' }}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ color: '#005657' }}
                      >
                        folder
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: visColors.bg,
                          color: visColors.text,
                        }}
                      >
                        {kb.visibility}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(kb.id);
                        }}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        style={{ color: '#c00' }}
                      >
                        <span className="material-symbols-outlined text-lg">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>

                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Hanken Grotesk, sans-serif',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#0b1c30',
                    }}
                  >
                    {kb.name}
                  </h3>

                  <p
                    className="mb-4 line-clamp-2"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#3f4948',
                    }}
                  >
                    {kb.description || 'No description provided'}
                  </p>

                  {kb.category && (
                    <p
                      className="mb-3 text-sm"
                      style={{
                        fontFamily: 'Geist, sans-serif',
                        color: '#1a7070',
                        fontWeight: '500',
                      }}
                    >
                      {kb.category}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div
                      className="flex items-center gap-1"
                      style={{ color: '#3f4948' }}
                    >
                      <span className="material-symbols-outlined text-base">
                        description
                      </span>
                      <span>{kb.total_documents || 0} files</span>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      style={{ color: '#3f4948' }}
                    >
                      <span className="material-symbols-outlined text-base">
                        data_object
                      </span>
                      <span>{kb.total_chunks || 0} chunks</span>
                    </div>
                  </div>

                  <div
                    className="mt-3 pt-3 text-xs"
                    style={{
                      borderTop: '1px solid #e5eeff',
                      color: '#3f4948',
                    }}
                  >
                    {formatDate(kb.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              Upload files to enhance your knowledge base instantly.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
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
              Create Knowledge Base
            </button>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateKBModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchKnowledgeBases();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bec9c8',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#fee' }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: '#c00' }}>
                  warning
                </span>
              </div>
              <h3
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#0b1c30',
                }}
              >
                Delete Knowledge Base?
              </h3>
            </div>
            <p
              className="mb-6"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                color: '#3f4948',
              }}
            >
              This will permanently delete the knowledge base and all its files. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#e5eeff',
                  color: '#3f4948',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteKB(deleteConfirm)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#c00',
                  color: '#ffffff',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#a00')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c00')}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateKBModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { createKB, isLoading } = useKnowledgeBaseStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: '',
    visibility: 'PRIVATE' as 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createKB({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
        visibility: formData.visibility,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create knowledge base:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #bec9c8',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3
            style={{
              fontFamily: 'Hanken Grotesk, sans-serif',
              fontSize: '24px',
              fontWeight: '600',
              color: '#005657',
            }}
          >
            Create Knowledge Base
          </h3>
          <button onClick={onClose} style={{ color: '#3f4948' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0b1c30',
              }}
            >
              Name *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={255}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border outline-none focus:border-[#005657]"
              style={{
                backgroundColor: '#f8f9ff',
                border: '1px solid #bec9c8',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              }}
              placeholder="Enter knowledge base name"
            />
          </div>

          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0b1c30',
              }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-lg border outline-none focus:border-[#005657] resize-none"
              style={{
                backgroundColor: '#f8f9ff',
                border: '1px solid #bec9c8',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              }}
              placeholder="Describe this knowledge base"
            />
          </div>

          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0b1c30',
              }}
            >
              Category
            </label>
            <input
              type="text"
              maxLength={100}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border outline-none focus:border-[#005657]"
              style={{
                backgroundColor: '#f8f9ff',
                border: '1px solid #bec9c8',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              }}
              placeholder="e.g., Research, Documentation, Marketing"
            />
          </div>

          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0b1c30',
              }}
            >
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border outline-none focus:border-[#005657]"
              style={{
                backgroundColor: '#f8f9ff',
                border: '1px solid #bec9c8',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
              }}
              placeholder="Comma-separated tags (e.g., tech, finance, Q1)"
            />
          </div>

          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#0b1c30',
              }}
            >
              Visibility *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['PRIVATE', 'ORGANIZATION', 'PUBLIC'] as const).map((vis) => (
                <button
                  key={vis}
                  type="button"
                  onClick={() => setFormData({ ...formData, visibility: vis })}
                  className="px-4 py-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: formData.visibility === vis ? '#005657' : '#f8f9ff',
                    color: formData.visibility === vis ? '#ffffff' : '#3f4948',
                    border: `1px solid ${formData.visibility === vis ? '#005657' : '#bec9c8'}`,
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {vis}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: '#e5eeff',
                color: '#3f4948',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name}
              className="flex-1 px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: '#005657',
                color: '#ffffff',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#1a7070')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005657')}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
