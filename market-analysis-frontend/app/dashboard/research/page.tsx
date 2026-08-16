'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useResearchStore } from '@/lib/stores/researchStore';
import type { JobStatus, ResearchJob, ResearchType, StartResearchDto } from '@/types/api';

const RESEARCH_TYPES: Array<{ value: ResearchType; label: string; description: string; icon: string }> = [
  { value: 'COMPREHENSIVE', label: 'Comprehensive', description: 'Market, customer, competitors, and strategy', icon: 'hub' },
  { value: 'MARKET', label: 'Market', description: 'Landscape, trends, risks, and opportunities', icon: 'monitoring' },
  { value: 'COMPETITOR', label: 'Competitor', description: 'Positioning, pricing, strengths, and gaps', icon: 'query_stats' },
  { value: 'CUSTOMER', label: 'Customer', description: 'Segments, needs, behavior, and pain points', icon: 'groups' },
];

const STATUS_STYLE: Record<JobStatus, { label: string; background: string; color: string }> = {
  PENDING: { label: 'Queued', background: '#f1f3f3', color: '#526160' },
  IN_PROGRESS: { label: 'In progress', background: '#e3f3ff', color: '#005a82' },
  COMPLETED: { label: 'Completed', background: '#dff5e8', color: '#17663a' },
  FAILED: { label: 'Failed', background: '#ffebee', color: '#93000a' },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message[0] || fallback;
  return typeof message === 'string' ? message : fallback;
}

function JobCard({ job }: { job: ResearchJob }) {
  const status = STATUS_STYLE[job.status];
  const progress = job.agent_orchestration_state ?? {};
  const question = job.input_parameters?.query || `${job.research_type.toLowerCase()} research using organization context`;

  return (
    <Link
      href={`/dashboard/research/${job.id}`}
      className="group block rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#83b5b4] hover:shadow-md"
      style={{ borderColor: '#dce5e4' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#006566]">
              {job.research_type.replace('_', ' ')}
            </span>
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: status.background, color: status.color }}>
              {status.label}
            </span>
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-[#0b1c30] sm:text-lg">{question}</h3>
          <p className="mt-2 text-sm text-[#6f7979]">
            {progress.currentStep || (job.status === 'COMPLETED' ? 'Report ready to review and download' : 'Waiting for research progress')}
          </p>
        </div>
        <span className="material-symbols-outlined text-[#6f7979] transition group-hover:translate-x-1 group-hover:text-[#005657]">arrow_forward</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-xs text-[#6f7979]" style={{ borderColor: '#edf1f1' }}>
        <span>{formatDate(job.created_at)}</span>
        {typeof progress.sourcesFound === 'number' && <span>{progress.sourcesFound} sources</span>}
        {progress.currentAgent && <span>Agent: {progress.currentAgent}</span>}
      </div>
    </Link>
  );
}

export default function ResearchPage() {
  const router = useRouter();
  const { jobs, fetchJobs, startResearch, isLoading, error, clearError } = useResearchStore();
  const [researchType, setResearchType] = useState<ResearchType>('COMPREHENSIVE');
  const [query, setQuery] = useState('');
  const [instructions, setInstructions] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [geography, setGeography] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchJobs().catch(() => undefined);
  }, [fetchJobs]);

  const selectedType = useMemo(
    () => RESEARCH_TYPES.find((type) => type.value === researchType)!,
    [researchType]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery && trimmedQuery.length < 3) {
      setFormError('The research question must contain at least 3 characters.');
      return;
    }

    clearError();
    setFormError('');
    setIsSubmitting(true);
    const areas = focusAreas.split(',').map((area) => area.trim()).filter(Boolean);
    const parameters: Record<string, unknown> = {};
    if (areas.length) parameters.focusAreas = areas;
    if (geography.trim()) parameters.geography = geography.trim();
    if (timeHorizon.trim()) parameters.timeHorizon = timeHorizon.trim();

    const payload: StartResearchDto = {
      researchType,
      ...(trimmedQuery ? { query: trimmedQuery } : {}),
      ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      ...(Object.keys(parameters).length ? { parameters } : {}),
    };

    try {
      const job = await startResearch(payload);
      router.push(`/dashboard/research/${job.id}`);
    } catch (submitError) {
      if (axios.isAxiosError(submitError) && submitError.response?.status === 400) {
        setFormError('Deep research requires an organization. Create or finish your organization setup, then try again.');
      } else {
        setFormError(getErrorMessage(submitError, 'Unable to start deep research. Please try again.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f8f9ff] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#dff3f2] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#005657]">
            <span className="material-symbols-outlined text-base">travel_explore</span>
            Multi-agent research
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30] sm:text-4xl" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Deep Research
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#526160]">
            Ask a strategic question and let specialized AI agents find sources, analyze the evidence, and build a decision-ready report.
          </p>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7" style={{ borderColor: '#dce5e4' }}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#0b1c30]">Start a new research project</h2>
              <p className="mt-1 text-sm text-[#6f7979]">Research normally takes 5–10 minutes. You can leave this page while it runs.</p>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-[#243332]">Research type</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {RESEARCH_TYPES.map((type) => {
                  const selected = researchType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setResearchType(type.value)}
                      className="flex items-start gap-3 rounded-xl border p-3.5 text-left transition"
                      style={{ borderColor: selected ? '#005657' : '#dce5e4', backgroundColor: selected ? '#eef9f8' : '#ffffff' }}
                    >
                      <span className="material-symbols-outlined text-xl" style={{ color: selected ? '#005657' : '#657574' }}>{type.icon}</span>
                      <span>
                        <span className="block text-sm font-semibold text-[#0b1c30]">{type.label}</span>
                        <span className="mt-0.5 block text-xs leading-4 text-[#6f7979]">{type.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-[#243332]">Research question <span className="font-normal text-[#6f7979]">(optional)</span></span>
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="How is the digital wallet market in Nepal changing, and where are the strongest growth opportunities?"
                className="form-input-glow mt-2 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-[#0b1c30] placeholder:text-[#889493]"
                style={{ borderColor: '#bec9c8' }}
              />
              <span className="mt-1 block text-right text-xs text-[#7b8887]">{query.length}/2,000</span>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-[#243332]">Instructions <span className="font-normal text-[#6f7979]">(optional)</span></span>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                maxLength={4000}
                rows={3}
                placeholder="Prioritize recent evidence, compare pricing, and end with an actionable 90-day plan."
                className="form-input-glow mt-2 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-[#0b1c30] placeholder:text-[#889493]"
                style={{ borderColor: '#bec9c8' }}
              />
            </label>

            <div className="mt-5 rounded-xl border bg-[#fbfdfd] p-4" style={{ borderColor: '#e2e9e8' }}>
              <p className="mb-3 text-sm font-semibold text-[#243332]">Optional research filters</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-medium text-[#526160]">Focus areas (comma-separated)</span>
                  <input value={focusAreas} onChange={(event) => setFocusAreas(event.target.value)} placeholder="market size, pricing, regulation" className="form-input-glow mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-[#0b1c30]" style={{ borderColor: '#cbd8d7' }} />
                </label>
                <label>
                  <span className="text-xs font-medium text-[#526160]">Geography</span>
                  <input value={geography} onChange={(event) => setGeography(event.target.value)} placeholder="e.g. Nepal" className="form-input-glow mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-[#0b1c30]" style={{ borderColor: '#cbd8d7' }} />
                </label>
                <label>
                  <span className="text-xs font-medium text-[#526160]">Time horizon</span>
                  <input value={timeHorizon} onChange={(event) => setTimeHorizon(event.target.value)} placeholder="e.g. Last 12 months" className="form-input-glow mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-[#0b1c30]" style={{ borderColor: '#cbd8d7' }} />
                </label>
              </div>
            </div>

            {(formError || error) && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-[#ffcdd2] bg-[#ffebee] p-3.5 text-sm text-[#93000a]">
                <span className="material-symbols-outlined text-xl">error</span>
                <div className="flex-1">
                  <p>{formError || error}</p>
                  {(formError || error)?.toLowerCase().includes('organization') && (
                    <Link href="/register/organization" className="mt-1 inline-block font-semibold underline">Open organization setup</Link>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#005657] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-xl ${isSubmitting ? 'animate-spin' : ''}`}>{isSubmitting ? 'progress_activity' : 'rocket_launch'}</span>
              {isSubmitting ? 'Starting research…' : `Start ${selectedType.label} Research`}
            </button>
          </form>

          <section aria-labelledby="recent-research-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 id="recent-research-heading" className="text-xl font-semibold text-[#0b1c30]">Recent research</h2>
                <p className="mt-1 text-sm text-[#6f7979]">Your organization’s latest jobs</p>
              </div>
              <button type="button" onClick={() => fetchJobs().catch(() => undefined)} disabled={isLoading} aria-label="Refresh recent research" className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-[#005657] disabled:opacity-50" style={{ borderColor: '#d3dfde' }}>
                <span className={`material-symbols-outlined text-xl ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>

            <div className="space-y-3">
              {isLoading && jobs.length === 0 ? (
                Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border bg-white" style={{ borderColor: '#e2e9e8' }} />)
              ) : jobs.length ? (
                jobs.map((job) => <JobCard key={job.id} job={job} />)
              ) : (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center" style={{ borderColor: '#bec9c8' }}>
                  <span className="material-symbols-outlined text-4xl text-[#7b8887]">science</span>
                  <h3 className="mt-3 font-semibold text-[#243332]">No research jobs yet</h3>
                  <p className="mt-1 text-sm leading-6 text-[#6f7979]">Your first {selectedType.label.toLowerCase()} report will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
