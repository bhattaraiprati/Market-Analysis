type TextStyle = 'normal' | 'bold' | 'italic';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const TOP_MARGIN = 22;
const BOTTOM_MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function cleanMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/[*_~`]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .trim();
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'deep-research-report';
}

export async function downloadResearchReportPdf({
  markdown,
  title,
  jobId,
  generatedAt,
}: {
  markdown: string;
  title: string;
  jobId: string;
  generatedAt?: string;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = TOP_MARGIN;

  const addPageIfNeeded = (height: number) => {
    if (y + height <= PAGE_HEIGHT - BOTTOM_MARGIN) return;
    doc.addPage();
    y = TOP_MARGIN;
  };

  const addText = (
    text: string,
    options: { size?: number; style?: TextStyle; indent?: number; gapAfter?: number; color?: [number, number, number] } = {}
  ) => {
    const size = options.size ?? 10.5;
    const indent = options.indent ?? 0;
    const lineHeight = size * 0.45;
    const cleaned = cleanMarkdown(text);
    if (!cleaned) {
      y += options.gapAfter ?? 2;
      return;
    }

    doc.setFont('helvetica', options.style ?? 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? [31, 45, 45]));
    const lines = doc.splitTextToSize(cleaned, CONTENT_WIDTH - indent) as string[];
    for (const line of lines) {
      addPageIfNeeded(lineHeight);
      doc.text(line, MARGIN_X + indent, y);
      y += lineHeight;
    }
    y += options.gapAfter ?? 2.5;
  };

  doc.setFillColor(0, 86, 87);
  doc.rect(0, 0, PAGE_WIDTH, 7, 'F');
  addText(title, { size: 22, style: 'bold', gapAfter: 3, color: [0, 86, 87] });
  addText('AI-generated deep research report', { size: 10, color: [79, 94, 93], gapAfter: 1 });
  addText(
    `Generated ${generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}  |  Job ${jobId}`,
    { size: 8.5, color: [105, 121, 120], gapAfter: 7 }
  );
  doc.setDrawColor(205, 220, 219);
  doc.line(MARGIN_X, y - 3, PAGE_WIDTH - MARGIN_X, y - 3);

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let inCodeBlock = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    addText(paragraph.join(' '));
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith('```')) {
      flushParagraph();
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      addText(line || ' ', { size: 8.5, indent: 4, color: [50, 63, 76], gapAfter: 0.7 });
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      addText(heading[2], {
        size: level === 1 ? 18 : level === 2 ? 15 : level === 3 ? 12.5 : 11,
        style: 'bold',
        color: level <= 2 ? [0, 86, 87] : [18, 47, 58],
        gapAfter: level <= 2 ? 4 : 2.5,
      });
      continue;
    }

    const listItem = line.match(/^\s*(?:[-*+]|(\d+)\.)\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      addText(`${listItem[1] ? `${listItem[1]}.` : '-'} ${listItem[2]}`, { indent: 5, gapAfter: 1.5 });
      continue;
    }

    if (/^\s*>/.test(line)) {
      flushParagraph();
      addText(line.replace(/^\s*>\s?/, ''), { style: 'italic', indent: 5, color: [63, 73, 72] });
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|?\s*:?-+:?/.test(line)) continue;
      flushParagraph();
      const cells = line.split('|').map((cell) => cleanMarkdown(cell)).filter(Boolean);
      addText(cells.join('  |  '), { size: 9, indent: 3, gapAfter: 1.2 });
      continue;
    }

    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph();
      addPageIfNeeded(5);
      doc.setDrawColor(205, 220, 219);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 5;
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(115, 128, 127);
    doc.text(`Deep Research  |  ${page} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
  }

  doc.setProperties({ title, subject: 'AI-generated deep research report' });
  doc.save(`${safeFileName(title)}-${jobId.slice(0, 8)}.pdf`);
}
