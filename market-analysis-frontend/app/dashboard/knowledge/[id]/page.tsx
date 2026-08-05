'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useKnowledgeBaseStore } from '@/lib/stores/knowledgeBaseStore';
import type { KnowledgeBase } from '@/types/api';

type KnowledgeBaseStatistics = {
  total_files?: number;
  total_chunks?: number;
  total_size_bytes?: number | string;
  files_by_status?: {
    COMPLETED?: number;
    completed?: number;
  };
};

export default function KnowledgeBaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const kbId = params?.id as string;

  const {
    currentKB,
    fetchKBById,
    deleteKB,
    uploadFile,
    deleteFile,
    getStatistics,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    clearError,
  } = useKnowledgeBaseStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<KnowledgeBaseStatistics | null>(null);

  const loadStatistics = useCallback(async () => {
    if (kbId) {
      try {
        const stats = await getStatistics(kbId);
        setStatistics(stats);
      } catch (err) {
        console.error('Failed to load statistics:', err);
      }
    }
  }, [getStatistics, kbId]);

  useEffect(() => {
    if (kbId) {
      fetchKBById(kbId).catch(console.error);
      getStatistics(kbId).then(setStatistics).catch((err) => {
        console.error('Failed to load statistics:', err);
      });
    }
  }, [kbId, fetchKBById, getStatistics]);

  const handleDeleteKB = async () => {
    try {
      await deleteKB(kbId);
      router.push('/dashboard/knowledge');
    } catch (err) {
      console.error('Failed to delete knowledge base:', err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(kbId, fileId);
      setDeleteFileId(null);
      loadStatistics();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      alert('Please select a valid file (PDF, DOC, DOCX, or TXT)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('The file exceeds the 50MB size limit');
      return;
    }

    try {
      await uploadFile(kbId, file);
      setShowUploadModal(false);
      loadStatistics();
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.replace(/^\./, '').toUpperCase()) {
      case 'PDF':
        return 'picture_as_pdf';
      case 'DOCX':
        return 'description';
      case 'TXT':
        return 'text_snippet';
      default:
        return 'insert_drive_file';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return { bg: '#e5f6e5', text: '#006600' };
      case 'PROCESSING':
        return { bg: '#fff4e5', text: '#cc6600' };
      case 'PENDING':
        return { bg: '#e5eeff', text: '#1a7070' };
      case 'FAILED':
        return { bg: '#fee', text: '#c00' };
      default:
        return { bg: '#f0f0f0', text: '#3f4948' };
    }
  };

  const formatFileSize = (value: number | string | null | undefined) => {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const detailStatistics = currentKB
    ? {
        total_files: currentKB.total_documents ?? currentKB.files?.length ?? 0,
        total_chunks: currentKB.total_chunks ?? 0,
        total_size_bytes:
          currentKB.files?.reduce((total, file) => total + (Number(file.file_size_bytes) || 0), 0) ?? 0,
        completed_files:
          currentKB.files?.filter((file) => file.processing_status === 'completed').length ?? 0,
      }
    : null;

  const displayedStatistics = detailStatistics
    ? {
        total_files: statistics?.total_files ?? detailStatistics.total_files,
        total_chunks: statistics?.total_chunks ?? detailStatistics.total_chunks,
        total_size_bytes: statistics?.total_size_bytes ?? detailStatistics.total_size_bytes,
        completed_files:
          statistics?.files_by_status?.COMPLETED ??
          statistics?.files_by_status?.completed ??
          detailStatistics.completed_files,
      }
    : null;

  if (isLoading && !currentKB) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-pulse"
            style={{ backgroundColor: '#e5eeff' }}
          >
            <span className="material-symbols-outlined text-4xl" style={{ color: '#005657' }}>
              database
            </span>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#3f4948' }}>Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  if (!currentKB) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center">
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#c00', fontSize: '18px' }}>Knowledge base not found</p>
          <Link
            href="/dashboard/knowledge"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-lg"
            style={{ backgroundColor: '#005657', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Back to Knowledge Bases</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      <main className="p-4 lg:p-10 min-h-screen">
        {/* Back Button & Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/knowledge"
            className="inline-flex items-center gap-2 mb-4 transition-colors"
            style={{ color: '#3f4948', fontFamily: 'Geist, sans-serif', fontSize: '14px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#005657')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3f4948')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Back to Knowledge Bases</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h2
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  lineHeight: 'clamp(32px, 4.5vw, 40px)',
                  fontWeight: '600',
                  letterSpacing: '-0.01em',
                  color: '#0b1c30',
                }}
              >
                {currentKB.name}
              </h2>
              {currentKB.description && (
                <p
                  className="mt-2"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    lineHeight: '24px',
                    color: '#3f4948',
                  }}
                >
                  {currentKB.description}
                </p>
              )}
              {currentKB.category && (
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: '#e5eeff',
                      color: '#1a7070',
                      fontFamily: 'Geist, sans-serif',
                      fontWeight: '500',
                    }}
                  >
                    {currentKB.category}
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: '#f0f0f0',
                      color: '#3f4948',
                      fontFamily: 'Geist, sans-serif',
                      fontWeight: '500',
                    }}
                  >
                    {currentKB.visibility}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: '#e5eeff',
                  color: '#005657',
                  border: '1px solid #bec9c8',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dce9ff')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5eeff')}
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: '#fee',
                  color: '#c00',
                  border: '1px solid #fcc',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdd')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fee')}
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
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
              <span style={{ color: '#c00', fontFamily: 'Inter, sans-serif' }}>{error}</span>
            </div>
            <button onClick={clearError} style={{ color: '#c00' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Statistics */}
        {displayedStatistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bec9c8',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined" style={{ color: '#1a7070' }}>
                  description
                </span>
                <span
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    color: '#3f4948',
                    fontWeight: '500',
                  }}
                >
                  Total Files
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0b1c30',
                }}
              >
                {displayedStatistics.total_files}
              </p>
            </div>

            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bec9c8',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined" style={{ color: '#1a7070' }}>
                  data_object
                </span>
                <span
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    color: '#3f4948',
                    fontWeight: '500',
                  }}
                >
                  Total Chunks
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0b1c30',
                }}
              >
                {displayedStatistics.total_chunks}
              </p>
            </div>

            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bec9c8',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined" style={{ color: '#1a7070' }}>
                  storage
                </span>
                <span
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    color: '#3f4948',
                    fontWeight: '500',
                  }}
                >
                  Total Size
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0b1c30',
                }}
              >
                {formatFileSize(displayedStatistics.total_size_bytes)}
              </p>
            </div>

            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#1a7070',
                border: '1px solid #005657',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined" style={{ color: '#a4f1f0' }}>
                  check_circle
                </span>
                <span
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    color: '#a4f1f0',
                    fontWeight: '500',
                  }}
                >
                  Completed
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                {displayedStatistics.completed_files}
              </p>
            </div>
          </div>
        )}

        {/* Files Section */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #bec9c8',
          }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid #bec9c8' }}
          >
            <h3
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '20px',
                fontWeight: '600',
                color: '#0b1c30',
              }}
            >
              Files ({currentKB.files?.length || 0})
            </h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#005657',
                color: '#ffffff',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1a7070')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005657')}
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Upload Files</span>
            </button>
          </div>

          {currentKB.files && currentKB.files.length > 0 ? (
            <div className="divide-y" style={{ borderColor: '#bec9c8' }}>
              {currentKB.files.map((file) => {
                const statusColors = getStatusColor(file.processing_status);
                return (
                  <div key={file.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#e5eeff' }}
                        >
                          <span className="material-symbols-outlined" style={{ color: '#1a7070' }}>
                            {getFileIcon(file.file_type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-semibold truncate"
                            style={{
                              fontFamily: 'Geist, sans-serif',
                              fontSize: '16px',
                              color: '#0b1c30',
                            }}
                          >
                            {file.original_filename}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                            <span style={{ color: '#3f4948' }}>
                              {formatFileSize(file.file_size_bytes)}
                            </span>
                            <span style={{ color: '#3f4948' }}>
                              {file.chunk_count} chunks
                            </span>
                            <span
                              className="px-3 py-1 rounded-full text-xs"
                              style={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                fontWeight: '500',
                              }}
                            >
                              {file.processing_status.toUpperCase()}
                            </span>
                            <span style={{ color: '#3f4948' }}>
                              {formatDate(file.uploaded_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteFileId(file.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#c00' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#e5eeff' }}
              >
                <span className="material-symbols-outlined text-4xl" style={{ color: '#1a7070' }}>
                  cloud_upload
                </span>
              </div>
              <h4
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#0b1c30',
                  marginBottom: '8px',
                }}
              >
                No files uploaded yet
              </h4>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#3f4948',
                }}
              >
                Upload PDF, DOCX, or TXT files to build your knowledge base
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && currentKB && (
        <EditKBModal
          kb={currentKB}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchKBById(kbId);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadFilesModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Delete KB Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Knowledge Base?"
          message="This will permanently delete the knowledge base and all its files. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteKB}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}

      {/* Delete File Confirmation */}
      {deleteFileId && (
        <ConfirmDialog
          title="Delete File?"
          message="This will permanently delete this file and all its chunks. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => handleDeleteFile(deleteFileId)}
          onCancel={() => setDeleteFileId(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// Edit Modal Component
function EditKBModal({
  kb,
  onClose,
  onSuccess,
}: {
  kb: KnowledgeBase;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { updateKB, isLoading } = useKnowledgeBaseStore();
  const [formData, setFormData] = useState({
    name: kb.name,
    description: kb.description || '',
    category: kb.category || '',
    tags: kb.tags?.join(', ') || '',
    visibility: kb.visibility as 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateKB(kb.id, {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()) : undefined,
        visibility: formData.visibility,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to update knowledge base:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
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
            Edit Knowledge Base
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
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Upload File Modal Component
function UploadFilesModal({
  onClose,
  onUpload,
  isUploading,
  uploadProgress,
}: {
  onClose: () => void;
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 max-w-lg w-full"
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
            Upload File
          </h3>
          <button onClick={onClose} disabled={isUploading} style={{ color: '#3f4948' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center"
            style={{ borderColor: '#bec9c8' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#e5eeff' }}
            >
              <span className="material-symbols-outlined text-4xl" style={{ color: '#1a7070' }}>
                cloud_upload
              </span>
            </div>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                color: '#3f4948',
                marginBottom: '8px',
              }}
            >
              Click to select a file
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: '#6f7979',
              }}
            >
              Supported: PDF, DOC, DOCX, TXT (Max 50MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFile && (
            <div>
              <p
                className="mb-2"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#0b1c30',
                }}
              >
                Selected File
              </p>
              <div
                className="max-h-40 overflow-y-auto rounded-lg p-3"
                style={{ backgroundColor: '#f8f9ff' }}
              >
                  <div className="flex items-center justify-between py-2">
                    <span
                      className="truncate"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        color: '#0b1c30',
                      }}
                    >
                      {selectedFile.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        color: '#6f7979',
                      }}
                    >
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: '#3f4948',
                  }}
                >
                  Uploading...
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: '#005657',
                    fontWeight: '600',
                  }}
                >
                  {uploadProgress}%
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: '#e5eeff' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    backgroundColor: '#005657',
                    width: `${uploadProgress}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
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
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: '#005657',
                color: '#ffffff',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confirm Dialog Component
function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'default',
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
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
            style={{ backgroundColor: variant === 'danger' ? '#fee' : '#e5eeff' }}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ color: variant === 'danger' ? '#c00' : '#1a7070' }}
            >
              {variant === 'danger' ? 'warning' : 'help'}
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
            {title}
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
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: '#e5eeff',
              color: '#3f4948',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: variant === 'danger' ? '#c00' : '#005657',
              color: '#ffffff',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = variant === 'danger' ? '#a00' : '#1a7070')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = variant === 'danger' ? '#c00' : '#005657')
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
