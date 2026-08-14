import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

export interface UploadedPdfDocument {
  publicId: string;
  secureUrl: string;
  filename: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
  bytes: number;
  pages: number;
}

@Injectable()
export class PdfDocumentService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async createAndUpload(
    formattedText: string,
    options: {
      organizationId: string;
      knowledgeBaseId: string;
      filename: string;
      tags?: string[];
    },
  ): Promise<UploadedPdfDocument> {
    if (!formattedText.trim()) throw new Error('PDF text cannot be empty');

    const filename = this.ensurePdfFilename(options.filename);
    const buffer = this.createPdfBuffer(formattedText);
    const publicId = `${Date.now()}_${filename}`;
    const uploaded = await this.cloudinaryService.uploadBuffer(buffer, {
      folder: this.cloudinaryService.getKnowledgeBaseFolder(
        options.organizationId,
        options.knowledgeBaseId,
      ),
      resourceType: 'raw',
      publicId,
      originalFilename: filename,
      tags: [
        options.organizationId,
        options.knowledgeBaseId,
        'knowledge-base',
        'generated-pdf',
        ...(options.tags ?? []),
      ],
    });

    return {
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      filename,
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      bytes: uploaded.bytes ?? buffer.length,
      pages: this.paginate(formattedText).length,
    };
  }

  private createPdfBuffer(text: string): Buffer {
    const pages = this.paginate(text);
    const objects: string[] = [];
    const pageIds = pages.map((_, index) => 4 + index * 2);
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    pages.forEach((lines, index) => {
      const pageId = pageIds[index];
      const contentId = pageId + 1;
      const commands = [
        'BT',
        '/F1 10 Tf',
        '50 790 Td',
        '14 TL',
        ...lines.flatMap((line, lineIndex) => [
          lineIndex === 0 ? '' : 'T*',
          `(${this.escapePdfText(line)}) Tj`,
        ]),
        'ET',
      ]
        .filter(Boolean)
        .join('\n');
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
      objects[contentId] =
        `<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`;
    });

    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    const objectCount = objects.length - 1;
    for (let id = 1; id <= objectCount; id += 1) {
      offsets[id] = Buffer.byteLength(pdf, 'latin1');
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= objectCount; id += 1) {
      pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'latin1');
  }

  private paginate(text: string): string[][] {
    const lines: string[] = [];
    for (const rawLine of text.replace(/\r/g, '').split('\n')) {
      const normalized = this.toPdfSafeText(rawLine);
      if (!normalized) {
        lines.push('');
        continue;
      }
      let remaining = normalized;
      while (remaining.length > 95) {
        const candidate = remaining.slice(0, 95);
        const splitAt = Math.max(candidate.lastIndexOf(' '), 40);
        lines.push(remaining.slice(0, splitAt).trimEnd());
        remaining = remaining.slice(splitAt).trimStart();
      }
      lines.push(remaining);
    }

    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += 50) {
      pages.push(lines.slice(index, index + 50));
    }
    return pages.length ? pages : [['']];
  }

  private toPdfSafeText(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^\x20-\x7E]/g, '?')
      .trimEnd();
  }

  private escapePdfText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private ensurePdfFilename(filename: string): string {
    const safe =
      filename
        .replace(/\.pdf$/i, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'document';
    return `${safe}.pdf`;
  }
}
