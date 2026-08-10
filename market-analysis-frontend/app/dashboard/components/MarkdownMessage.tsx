'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function normalizeEncoding(value: string) {
  const replacements: Record<string, string> = {
    'â€”': '—',
    'â€“': '–',
    'â€‘': '‑',
    'â€œ': '“',
    'â€': '”',
    'â€™': '’',
    'â€˜': '‘',
    'â€¢': '•',
    'Â ': ' ',
  };

  return Object.entries(replacements).reduce(
    (content, [broken, corrected]) => content.replaceAll(broken, corrected),
    value
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-[15px] leading-7 text-[#243332]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-bold text-[#0b1c30] first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-7 text-xl font-semibold text-[#0b1c30] first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-semibold text-[#0b1c30] first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-[#0b1c30]">{children}</strong>,
          em: ({ children }) => <em className="text-[#3f4948]">{children}</em>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6 marker:text-[#1a7070]">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[#1a7070]">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-[#1a7070] bg-[#eef7f7] px-4 py-2 text-[#3f4948]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-0 border-t" style={{ borderColor: '#dce5e4' }} />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-[#006c6d] underline decoration-[#83c9c8] underline-offset-2 hover:text-[#004f50]">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-5 max-w-full overflow-x-auto rounded-xl border" style={{ borderColor: '#cbd8d7' }}>
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#e8f5f4] text-[#004f50]">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-[#dce5e4] bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="align-top even:bg-[#fbfdfd]">{children}</tr>,
          th: ({ children }) => <th className="border-r border-[#dce5e4] px-4 py-3 font-semibold last:border-r-0">{children}</th>,
          td: ({ children }) => <td className="border-r border-[#edf1f1] px-4 py-3 leading-6 last:border-r-0">{children}</td>,
          pre: ({ children }) => (
            <pre className="my-4 max-w-full overflow-x-auto rounded-xl bg-[#0b1c30] p-4 text-sm leading-6 text-[#e7f2f1]">
              {children}
            </pre>
          ),
          code: ({ className, children }) =>
            className ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="rounded bg-[#e8f0f0] px-1.5 py-0.5 font-mono text-[0.9em] text-[#005657]">
                {children}
              </code>
            ),
        }}
      >
        {normalizeEncoding(content)}
      </ReactMarkdown>
    </div>
  );
}
