'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { MarkdownMessage } from '@/app/dashboard/components/MarkdownMessage';
import { researchApi } from '@/lib/api/research';
import { downloadResearchReportPdf } from '@/lib/pdf/researchReportPdf';
import type { JobStatus, ResearchJob, ResearchSource } from '@/types/api';

const STATUS_STYLE: Record<JobStatus, { label: string; background: string; color: string; icon: string }> = {
  PENDING: { label: 'Queued', background: '#f1f3f3', color: '#526160', icon: 'schedule' },
  IN_PROGRESS: { label: 'Researching', background: '#e3f3ff', color: '#005a82', icon: 'progress_activity' },
  COMPLETED: { label: 'Completed', background: '#dff5e8', color: '#17663a', icon: 'check_circle' },
  FAILED: { label: 'Failed', background: '#ffebee', color: '#93000a', icon: 'error' },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message[0] || fallback;
  return typeof message === 'string' ? message : fallback;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function downloadMarkdown(markdown: string, jobId: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `deep-research-${jobId.slice(0, 8)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ProgressTimeline({ job }: { job: ResearchJob }) {
  const progress = job.agent_orchestration_state ?? {};
  const currentAgent = progress.currentAgent;
  const steps = [
    { name: 'Searcher', description: 'Finding credible sources', complete: Boolean(progress.searcherCompleted) },
    { name: 'Analyst', description: 'Turning evidence into insights', complete: Boolean(progress.analystCompleted) },
    { name: 'Writer', description: 'Building the final report', complete: job.status === 'COMPLETED' },
  ];

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => {
        const active = job.status === 'IN_PROGRESS' && currentAgent === step.name;
        const complete = step.complete || job.status === 'COMPLETED';
        return (
          <li key={step.name} className="relative rounded-xl border p-4" style={{ borderColor: active ? '#1a7070' : '#dce5e4', backgroundColor: active ? '#eef9f8' : '#ffffff' }}>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: complete ? '#005657' : active ? '#a3edec' : '#edf1f1', color: complete ? '#ffffff' : '#354443' }}>
                {complete ? <span className="material-symbols-outlined text-base">check</span> : index + 1}
              </span>
              <span className="text-sm font-semibold text-[#0b1c30]">{step.name}</span>
              {active && <span className="material-symbols-outlined ml-auto animate-spin text-lg text-[#005657]">progress_activity</span>}
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6f7979]">{step.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function ResearchJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const loadSources = useCallback(async () => {
    try {
      const response = await researchApi.getSources(jobId);
      setSources(response.sources ?? []);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        console.error('Failed to load research sources:', error);
      }
    }
  }, [jobId]);

  const loadReport = useCallback(async () => {
    const markdown = await researchApi.downloadReport(jobId);
    setReportMarkdown(markdown);
    return markdown;
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const nextJob = await researchApi.getById(jobId);
        if (cancelled) return;
        setJob(nextJob);
        setPageError('');
        setNotFound(false);
        setIsInitialLoading(false);
        void loadSources();

        if (nextJob.status === 'COMPLETED') {
          const embeddedReport = nextJob.output_results?.report?.markdown;
          if (embeddedReport) setReportMarkdown(embeddedReport);
          try {
            await loadReport();
          } catch (error) {
            if (!cancelled && (!axios.isAxiosError(error) || error.response?.status !== 404)) {
              setPageError(getErrorMessage(error, 'The report could not be loaded.'));
            }
          }
        } else if (nextJob.status === 'PENDING' || nextJob.status === 'IN_PROGRESS') {
          timer = setTimeout(poll, 4000);
        }
      } catch (error) {
        if (cancelled) return;
        setIsInitialLoading(false);
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setNotFound(true);
          return;
        }
        setPageError(getErrorMessage(error, 'Connection interrupted. Retrying automatically…'));
        timer = setTimeout(poll, 7000);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, loadReport, loadSources]);

  const getReport = async () => {
    if (reportMarkdown) return reportMarkdown;
    const embeddedReport = job?.output_results?.report?.markdown;
    if (embeddedReport) {
      setReportMarkdown(embeddedReport);
      return embeddedReport;
    }
    return loadReport();
  };

  const handlePdfDownload = async () => {
    if (!job) return;
    setExportError('');
    setIsExporting(true);
    try {
      const markdown = await getReport();
      await downloadResearchReportPdf({
        markdown,
        title: job.output_results?.report?.title || job.input_parameters?.query || `${job.research_type} Research Report`,
        jobId: job.id,
        generatedAt: job.output_results?.report?.generatedAt || job.completed_at || undefined,
      });
    } catch (error) {
      setExportError(getErrorMessage(error, 'Unable to create the PDF. Please try again.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkdownDownload = async () => {
    setExportError('');
    try {
      downloadMarkdown(await getReport(), jobId);
    } catch (error) {
      setExportError(getErrorMessage(error, 'Unable to download the Markdown report.'));
    }
  };

  if (isInitialLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f8f9ff]">
        <div className="text-center text-[#526160]"><span className="material-symbols-outlined animate-spin text-4xl text-[#005657]">progress_activity</span><p className="mt-3 text-sm">Loading research project…</p></div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f8f9ff] px-4">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center" style={{ borderColor: '#dce5e4' }}>
          <span className="material-symbols-outlined text-5xl text-[#7b8887]">search_off</span>
          <h1 className="mt-4 text-2xl font-bold text-[#0b1c30]">Research job not found</h1>
          <p className="mt-2 text-sm leading-6 text-[#6f7979]">It may have been removed, or it is not available to your organization.</p>
          <Link href="/dashboard/research" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#005657] px-5 py-3 text-sm font-semibold text-white"><span className="material-symbols-outlined text-lg">arrow_back</span>Back to research</Link>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f8f9ff] px-4">
        <div className="max-w-md text-center"><p className="text-[#93000a]">{pageError || 'Unable to load this research job.'}</p><Link href="/dashboard/research" className="mt-4 inline-block font-semibold text-[#005657] underline">Back to research</Link></div>
      </main>
    );
  }

  const status = STATUS_STYLE[job.status];
  const progress = job.agent_orchestration_state ?? {};
  const question = job.input_parameters?.query || `${job.research_type.toLowerCase()} research using your organization context`;
  const isProcessing = job.status === 'PENDING' || job.status === 'IN_PROGRESS';

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f8f9ff] px-4 py-7 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/research" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#005657] hover:underline"><span className="material-symbols-outlined text-lg">arrow_back</span>All research</Link>

        <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7" style={{ borderColor: '#dce5e4' }}>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#006566]">{job.research_type} RESEARCH</span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: status.background, color: status.color }}>
                  <span className={`material-symbols-outlined text-base ${isProcessing ? 'animate-spin' : ''}`}>{status.icon}</span>{status.label}
                </span>
              </div>
              <h1 className="max-w-4xl text-xl font-bold leading-tight text-[#0b1c30] sm:text-xl" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>{question}</h1>
              <p className="mt-3 text-sm leading-6 text-[#526160]">{progress.currentStep || (job.status === 'COMPLETED' ? 'Your final report is ready.' : job.status === 'FAILED' ? 'Research stopped before the report was completed.' : 'Your research has been queued.')}</p>
            </div>
            {job.status === 'COMPLETED' && (
              <div className="flex flex-shrink-0 flex-wrap gap-2">
                {/* <button type="button" onClick={handleMarkdownDownload} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-[#005657]" style={{ borderColor: '#83b5b4' }}><span className="material-symbols-outlined text-lg">markdown</span>Markdown</button> */}
                <button type="button" onClick={handlePdfDownload} disabled={isExporting} className="inline-flex items-center gap-2 rounded-xl bg-[#005657] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><span className={`material-symbols-outlined text-lg ${isExporting ? 'animate-spin' : ''}`}>{isExporting ? 'progress_activity' : 'picture_as_pdf'}</span>{isExporting ? 'Creating PDF…' : 'Download PDF'}</button>
              </div>
            )}
          </div>

          <div className="mt-6 border-t pt-5" style={{ borderColor: '#edf1f1' }}>
            <ProgressTimeline job={job} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[#f4f8f8] p-3"><dt className="text-xs text-[#6f7979]">Sources found</dt><dd className="mt-1 text-xl font-bold text-[#0b1c30]">{progress.sourcesFound ?? sources.length}</dd></div>
            <div className="rounded-xl bg-[#f4f8f8] p-3"><dt className="text-xs text-[#6f7979]">Competitors</dt><dd className="mt-1 text-xl font-bold text-[#0b1c30]">{progress.competitorsIdentified ?? '—'}</dd></div>
            <div className="rounded-xl bg-[#f4f8f8] p-3"><dt className="text-xs text-[#6f7979]">Current agent</dt><dd className="mt-1 truncate text-sm font-bold text-[#0b1c30]">{progress.currentAgent ?? (job.status === 'PENDING' ? 'Waiting' : '—')}</dd></div>
            <div className="rounded-xl bg-[#f4f8f8] p-3"><dt className="text-xs text-[#6f7979]">Started</dt><dd className="mt-1 text-sm font-bold text-[#0b1c30]">{formatDate(job.created_at)}</dd></div>
          </dl>
        </header>

        {pageError && isProcessing && (
          <div role="status" className="mt-5 flex items-center gap-3 rounded-xl border border-[#ffd7a3] bg-[#fff5e8] p-4 text-sm text-[#784700]"><span className="material-symbols-outlined">wifi_off</span><span>{pageError}</span></div>
        )}

        {job.status === 'FAILED' && (
          <section className="mt-6 rounded-2xl border border-[#ffcdd2] bg-[#ffebee] p-6">
            <div className="flex items-start gap-3"><span className="material-symbols-outlined text-2xl text-[#93000a]">error</span><div><h2 className="font-semibold text-[#730006]">Research could not be completed</h2><p className="mt-1 text-sm leading-6 text-[#93000a]">{job.error_message || progress.error || 'The research workflow stopped unexpectedly.'}</p><Link href="/dashboard/research" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#93000a] px-4 py-2 text-sm font-semibold text-white"><span className="material-symbols-outlined text-lg">refresh</span>Start new research</Link></div></div>
          </section>
        )}

        {job.input_parameters?.instructions && (
          <section className="mt-6 rounded-2xl border bg-white p-5" style={{ borderColor: '#dce5e4' }}><h2 className="text-sm font-semibold uppercase tracking-wider text-[#005657]">Research instructions</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3f4948]">{job.input_parameters.instructions}</p></section>
        )}

        <section className="mt-7" aria-labelledby="sources-heading">
          <div className="mb-3 flex items-end justify-between"><div><h2 id="sources-heading" className="text-xl font-semibold text-[#0b1c30]">Evidence sources</h2><p className="mt-1 text-sm text-[#6f7979]">Sources collected by the Searcher agent</p></div><span className="text-sm font-semibold text-[#526160]">{sources.length}</span></div>
          {sources.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source) => {
                const href = safeExternalUrl(source.url);
                return (
                  <article key={source.id} className="rounded-xl border bg-white p-4" style={{ borderColor: '#dce5e4' }}>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined rounded-lg bg-[#eef7f7] p-2 text-xl text-[#005657]">language</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-[#1a7070]">{source.source_type || 'WEBSITE'}</span>{typeof source.credibility_score === 'number' && <span className="text-[11px] text-[#6f7979]">{Math.round(source.credibility_score * 100)}% credibility</span>}</div>
                        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#0b1c30]">{source.title || source.metadata?.competitorName || 'Research source'}</h3>
                        {source.content && <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#6f7979]">{source.content}</p>}
                        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-[#006566] hover:underline"><span className="truncate">Open source</span><span className="material-symbols-outlined text-sm">open_in_new</span></a> : <span className="mt-3 block text-xs text-[#889493]">Source link unavailable</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-[#6f7979]" style={{ borderColor: '#bec9c8' }}>{isProcessing ? 'Sources will appear as the Searcher agent collects them.' : 'No source records are available for this job.'}</div>
          )}
        </section>

        {job.status === 'COMPLETED' && (
          <section className="mt-8" aria-labelledby="report-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#006566]">Final deliverable</p><h2 id="report-heading" className="mt-1 text-2xl font-bold text-[#0b1c30]">{job.output_results?.report?.title || 'Research report'}</h2></div>{job.output_results?.report?.wordCount && <span className="text-sm text-[#6f7979]">{job.output_results.report.wordCount.toLocaleString()} words</span>}</div>
            {exportError && <div role="alert" className="mb-4 rounded-xl border border-[#ffcdd2] bg-[#ffebee] p-3 text-sm text-[#93000a]">{exportError}</div>}
            <article className="rounded-2xl border bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-9" style={{ borderColor: '#dce5e4' }}>
              {reportMarkdown ? <MarkdownMessage content={reportMarkdown} /> : <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6f7979]"><span className="material-symbols-outlined animate-spin text-[#005657]">progress_activity</span>Loading final report…</div>}
            </article>
          </section>
        )}
      </div>
    </main>
  );
}
