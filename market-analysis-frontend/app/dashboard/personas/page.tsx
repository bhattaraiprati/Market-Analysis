'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/lib/stores/personaStore';
import { useKnowledgeBaseStore } from '@/lib/stores/knowledgeBaseStore';
import { CreatePersonaDto, Persona, PersonaRole } from '@/types/api';
import { Plus, Search, Trash2, X } from 'lucide-react';

export default function PersonasPage() {
  const {
    personas,
    isLoading,
    error,
    fetchPersonas,
    fetchPersonaById,
    createPersona,
    updatePersona,
    deletePersona,
    assignKnowledgeBase,
    removeKnowledgeBase,
    clearError,
  } = usePersonaStore();

  const { knowledgeBases, fetchKnowledgeBases } = useKnowledgeBaseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [originalKnowledgeBaseIds, setOriginalKnowledgeBaseIds] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreatePersonaDto>({
    name: '',
    description: '',
    primary_focus_role: 'GENERAL_ASSISTANT',
    knowledge_base_ids: [],
    web_search_enabled: true,
    external_data_sources_enabled: false,
    avatar_url: '',
    system_prompt: '',
  });

  useEffect(() => {
    fetchPersonas();
    fetchKnowledgeBases();
  }, [fetchPersonas, fetchKnowledgeBases]);

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreatePersonaDto = {
        ...formData,
        description: formData.description?.trim() || undefined,
        avatar_url: formData.avatar_url?.trim() || undefined,
        system_prompt: formData.system_prompt?.trim() || undefined,
      };

      if (editingPersonaId) {
        const { knowledge_base_ids: selectedIds = [], ...personaFields } = payload;
        await updatePersona(editingPersonaId, personaFields);

        const knowledgeBasesToAdd = selectedIds.filter(
          (id) => !originalKnowledgeBaseIds.includes(id)
        );
        const knowledgeBasesToRemove = originalKnowledgeBaseIds.filter(
          (id) => !selectedIds.includes(id)
        );

        await Promise.all([
          ...knowledgeBasesToAdd.map((id) => assignKnowledgeBase(editingPersonaId, id)),
          ...knowledgeBasesToRemove.map((id) => removeKnowledgeBase(editingPersonaId, id)),
        ]);
        await fetchPersonas();
      } else {
        await createPersona(payload);
      }

      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create persona:', err);
    }
  };

  const handleDeletePersona = async () => {
    if (!selectedPersonaId) return;
    try {
      await deletePersona(selectedPersonaId);
      setShowDeleteModal(false);
      setSelectedPersonaId(null);
    } catch (err) {
      console.error('Failed to delete persona:', err);
    }
  };

  const resetForm = () => {
    setEditingPersonaId(null);
    setOriginalKnowledgeBaseIds([]);
    setFormData({
      name: '',
      description: '',
      primary_focus_role: 'GENERAL_ASSISTANT',
      knowledge_base_ids: [],
      web_search_enabled: true,
      external_data_sources_enabled: false,
      avatar_url: '',
      system_prompt: '',
    });
  };

  const populateEditForm = (persona: Persona) => {
    const knowledgeBaseIds = persona.knowledge_bases?.map((knowledgeBase) => knowledgeBase.id) ?? [];
    setEditingPersonaId(persona.id);
    setOriginalKnowledgeBaseIds(knowledgeBaseIds);
    setFormData({
      name: persona.name,
      description: persona.description ?? '',
      primary_focus_role: persona.primary_focus_role,
      knowledge_base_ids: knowledgeBaseIds,
      web_search_enabled: persona.web_search_enabled,
      external_data_sources_enabled: persona.external_data_sources_enabled,
      avatar_url: persona.avatar_url ?? '',
      system_prompt: persona.system_prompt ?? '',
    });
    setShowCreateModal(true);
  };

  const handleEditPersona = async (persona: Persona) => {
    clearError();
    try {
      const detailedPersona = await fetchPersonaById(persona.id);
      populateEditForm(detailedPersona);
    } catch (err) {
      console.error('Failed to load persona:', err);
    }
  };

  const toggleKnowledgeBase = (knowledgeBaseId: string) => {
    setFormData((current) => {
      const selectedIds = current.knowledge_base_ids ?? [];
      const isSelected = selectedIds.includes(knowledgeBaseId);

      return {
        ...current,
        knowledge_base_ids: isSelected
          ? selectedIds.filter((id) => id !== knowledgeBaseId)
          : [...selectedIds, knowledgeBaseId],
      };
    });
  };

  const selectedKnowledgeBaseIds = formData.knowledge_base_ids ?? [];
  const availableKnowledgeBases = knowledgeBases.filter(
    (knowledgeBase) => !selectedKnowledgeBaseIds.includes(knowledgeBase.id)
  );
  const selectedKnowledgeBases = knowledgeBases.filter((knowledgeBase) =>
    selectedKnowledgeBaseIds.includes(knowledgeBase.id)
  );

  const filteredPersonas = personas.filter((persona) =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role: PersonaRole): string => {
    const labels: Record<PersonaRole, string> = {
      COMPETITIVE_ANALYST: 'Competitive Analyst',
      MARKET_RESEARCHER: 'Market Researcher',
      CUSTOMER_SUCCESS_EXPERT: 'Customer Success',
      BUSINESS_STRATEGIST: 'Business Strategist',
      GENERAL_ASSISTANT: 'General Assistant',
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9ff', fontFamily: 'Inter, sans-serif' }}>
      <main className="min-h-screen">
        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#005657',
                }}
              >
                AI Personas Management
              </h1>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#3f4948' }}>
                {filteredPersonas.length} persona{filteredPersonas.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all shadow-sm"
              style={{
                backgroundColor: '#1a7070',
                color: '#ffffff',
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Plus size={18} />
              Create Persona
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#6f7979' }}
              />
              <input
                type="text"
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  border: '1px solid #bec9c8',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  color: '#0b1c30',
                  backgroundColor: '#ffffff',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1a7070';
                  e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#bec9c8';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg flex items-start justify-between gap-3"
              style={{
                backgroundColor: '#ffdad6',
                border: '1px solid #ba1a1a',
              }}
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '20px' }}>
                  error
                </span>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#93000a',
                  }}
                >
                  {error}
                </p>
              </div>
              <button onClick={clearError} style={{ color: '#ba1a1a' }}>
                <X size={20} />
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && personas.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
                  style={{ borderColor: '#1a7070', borderTopColor: 'transparent' }}
                ></div>
                <p style={{ fontFamily: 'Inter, sans-serif', color: '#3f4948' }}>Loading personas...</p>
              </div>
            </div>
          ) : filteredPersonas.length === 0 ? (
            <div className="text-center py-20">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(26, 112, 112, 0.1)' }}
              >
                <span className="material-symbols-outlined text-5xl" style={{ color: '#1a7070' }}>
                  smart_toy
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
                {searchQuery ? 'No personas found' : 'No personas yet'}
              </h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#3f4948' }}>
                {searchQuery ? 'Try adjusting your search' : 'Create your first AI persona to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPersonas.map((persona) => (
                <div
                  key={persona.id}
                  className="bg-white rounded-xl p-6 transition-all cursor-pointer hover:shadow-lg"
                  style={{
                    border: '1px solid #bec9c8',
                  }}
                  onClick={() => handleEditPersona(persona)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: 'rgba(26, 112, 112, 0.1)',
                        color: '#005657',
                      }}
                    >
                      <span className="material-symbols-outlined text-2xl">smart_toy</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPersonaId(persona.id);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#6f7979' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffebee';
                        e.currentTarget.style.color = '#ba1a1a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#6f7979';
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
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
                    {persona.name}
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
                    {persona.description || 'No description'}
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: 'rgba(163, 237, 236, 0.3)',
                        color: '#005657',
                        fontFamily: 'Geist, sans-serif',
                        fontWeight: '500',
                      }}
                    >
                      {getRoleLabel(persona.primary_focus_role)}
                    </span>

                    {persona.web_search_enabled && (
                      <span className="material-symbols-outlined text-sm" style={{ color: '#1a7070' }} title="Web search enabled">
                        public
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Persona Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ border: '1px solid #bec9c8' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#0b1c30',
                }}
              >
                {editingPersonaId ? 'Edit Persona' : 'Create New Persona'}
              </h2>
              <button onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }} style={{ color: '#6f7979' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSavePersona} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#0b1c30',
                  }}
                >
                  Persona Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-2 px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    border: '1px solid #bec9c8',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                  }}
                  placeholder="e.g., Marketing Expert"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a7070';
                    e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#bec9c8';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
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
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-2 px-4 py-3 rounded-lg outline-none transition-all resize-none"
                  style={{
                    border: '1px solid #bec9c8',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    minHeight: '100px',
                  }}
                  placeholder="Describe the persona's role and expertise..."
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a7070';
                    e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#bec9c8';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#0b1c30',
                  }}
                >
                  Primary Role *
                </label>
                <select
                  id="role"
                  required
                  value={formData.primary_focus_role}
                  onChange={(e) => setFormData({ ...formData, primary_focus_role: e.target.value as PersonaRole })}
                  className="w-full mt-2 px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    border: '1px solid #bec9c8',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a7070';
                    e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#bec9c8';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="GENERAL_ASSISTANT">General Assistant</option>
                  <option value="COMPETITIVE_ANALYST">Competitive Analyst</option>
                  <option value="MARKET_RESEARCHER">Market Researcher</option>
                  <option value="CUSTOMER_SUCCESS_EXPERT">Customer Success Expert</option>
                  <option value="BUSINESS_STRATEGIST">Business Strategist</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="avatar_url"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#0b1c30',
                  }}
                >
                  Avatar URL
                </label>
                <input
                  id="avatar_url"
                  type="url"
                  value={formData.avatar_url ?? ''}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full mt-2 px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    border: '1px solid #bec9c8',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                  }}
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              <div>
                <label
                  htmlFor="system_prompt"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#0b1c30',
                  }}
                >
                  System Prompt
                </label>
                <textarea
                  id="system_prompt"
                  value={formData.system_prompt ?? ''}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  className="w-full mt-2 px-4 py-3 rounded-lg outline-none transition-all resize-y"
                  style={{
                    border: '1px solid #bec9c8',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    minHeight: '110px',
                  }}
                  placeholder="Define how this persona should behave and respond..."
                />
              </div>

              <fieldset>
                <div className="flex items-end justify-between gap-4 mb-2">
                  <div>
                    <legend
                      style={{
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#0b1c30',
                      }}
                    >
                      Knowledge Bases
                    </legend>
                    <p className="mt-1 text-xs" style={{ color: '#6f7979' }}>
                      Choose one or more knowledge bases for this persona.
                    </p>
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#1a7070' }}>
                    {selectedKnowledgeBases.length} selected
                  </span>
                </div>

                <div
                  className="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-lg"
                  style={{ border: '1px solid #bec9c8' }}
                >
                  <div className="md:border-r" style={{ borderColor: '#bec9c8' }}>
                    <div
                      className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: '#f8f9ff', color: '#3f4948' }}
                    >
                      <span>Available knowledge bases</span>
                      <span>Files</span>
                    </div>
                    <div className="h-52 overflow-y-auto">
                      {availableKnowledgeBases.length > 0 ? (
                        availableKnowledgeBases.map((knowledgeBase) => (
                          <button
                            key={knowledgeBase.id}
                            type="button"
                            onClick={() => toggleKnowledgeBase(knowledgeBase.id)}
                            className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-[#eef7f7] focus:bg-[#eef7f7] focus:outline-none"
                            style={{ borderColor: '#e2e8e7' }}
                            aria-label={`Add ${knowledgeBase.name}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium" style={{ color: '#0b1c30' }}>
                                {knowledgeBase.name}
                              </span>
                              <span className="block truncate text-xs" style={{ color: '#6f7979' }}>
                                {knowledgeBase.category || 'Uncategorized'}
                              </span>
                            </span>
                            <span className="flex items-center gap-2 text-xs" style={{ color: '#3f4948' }}>
                              {knowledgeBase.total_documents ?? knowledgeBase.file_count ?? 0}
                              <Plus size={16} style={{ color: '#1a7070' }} />
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm" style={{ color: '#6f7979' }}>
                          {knowledgeBases.length === 0
                            ? 'No knowledge bases are available.'
                            : 'All knowledge bases are selected.'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: '#eef7f7', color: '#1a7070' }}
                    >
                      <span>Selected</span>
                      <span>Remove</span>
                    </div>
                    <div className="h-52 overflow-y-auto">
                      {selectedKnowledgeBases.length > 0 ? (
                        selectedKnowledgeBases.map((knowledgeBase) => (
                          <button
                            key={knowledgeBase.id}
                            type="button"
                            onClick={() => toggleKnowledgeBase(knowledgeBase.id)}
                            className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-[#fff4f4] focus:bg-[#fff4f4] focus:outline-none"
                            style={{ borderColor: '#e2e8e7' }}
                            aria-label={`Remove ${knowledgeBase.name}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium" style={{ color: '#0b1c30' }}>
                                {knowledgeBase.name}
                              </span>
                              <span className="block truncate text-xs" style={{ color: '#6f7979' }}>
                                {knowledgeBase.category || 'Uncategorized'}
                              </span>
                            </span>
                            <X size={16} style={{ color: '#ba1a1a' }} />
                          </button>
                        ))
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm" style={{ color: '#6f7979' }}>
                          Click a knowledge base on the left to select it.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.web_search_enabled}
                    onChange={(e) => setFormData({ ...formData, web_search_enabled: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#1a7070' }}
                  />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#0b1c30' }}>
                    Enable Web Search
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.external_data_sources_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, external_data_sources_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#1a7070' }}
                  />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#0b1c30' }}>
                    External Data Sources
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t" style={{ borderColor: '#bec9c8' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2.5 rounded-lg transition-colors"
                  style={{
                    border: '1px solid #bec9c8',
                    color: '#3f4948',
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-lg transition-all shadow-sm"
                  style={{
                    backgroundColor: isLoading ? '#6f7979' : '#1a7070',
                    color: '#ffffff',
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  {isLoading
                    ? editingPersonaId
                      ? 'Saving...'
                      : 'Creating...'
                    : editingPersonaId
                      ? 'Save Changes'
                      : 'Create Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl"
            style={{ border: '1px solid #bec9c8' }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#ffebee' }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: '#ba1a1a' }}>
                  warning
                </span>
              </div>
              <div>
                <h3
                  className="mb-2"
                  style={{
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#0b1c30',
                  }}
                >
                  Delete Persona
                </h3>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#3f4948' }}>
                  Are you sure you want to delete this persona? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPersonaId(null);
                }}
                className="px-6 py-2.5 rounded-lg transition-colors"
                style={{
                  border: '1px solid #bec9c8',
                  color: '#3f4948',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9ff')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePersona}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-lg transition-all shadow-sm"
                style={{
                  backgroundColor: isLoading ? '#6f7979' : '#ba1a1a',
                  color: '#ffffff',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
