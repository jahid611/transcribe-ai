'use client';
import { FileText, FileDown, FileType, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import type { Summary } from '@transcribe-ai/shared';

interface Props {
  summary: Summary;
  transcript: string;
  canExportPdf: boolean;
  canExportDocx: boolean;
}

export function ExportButtons({ summary, transcript, canExportPdf, canExportDocx }: Props) {
  function exportTxt() {
    const text = buildPlainText(summary, transcript);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, slugify(summary.title) + '.txt');
  }

  function exportMd() {
    const md = buildMarkdown(summary, transcript);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, slugify(summary.title) + '.md');
  }

  function exportPdf() {
    if (!canExportPdf) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const width = 595 - margin * 2;
    let y = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    y = wrap(doc, summary.title, margin, y, width, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    y = wrap(doc, summary.tldr, margin, y + 8, width, 14);

    y = section(doc, 'Points clés', summary.key_points, margin, y + 12, width);
    y = section(
      doc,
      'Décisions',
      summary.decisions.map((d) => d.owner ? `${d.decision} — ${d.owner}` : d.decision),
      margin,
      y + 12,
      width,
    );
    y = section(
      doc,
      'Actions',
      summary.actions.map((a) =>
        [a.action, a.owner ? `(${a.owner})` : null, a.due ? `dû ${a.due}` : null]
          .filter(Boolean)
          .join(' '),
      ),
      margin,
      y + 12,
      width,
    );

    if (summary.participants.length) {
      y = section(doc, 'Participants', summary.participants, margin, y + 12, width);
    }
    if (summary.topics.length) {
      y = section(doc, 'Topics', summary.topics, margin, y + 12, width);
    }

    doc.save(slugify(summary.title) + '.pdf');
  }

  async function exportDocx() {
    if (!canExportDocx) return;
    const children: Paragraph[] = [
      new Paragraph({ text: summary.title, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: summary.tldr, italics: true })] }),
      heading('Points clés'),
      ...summary.key_points.map((p) => bullet(p)),
      heading('Décisions'),
      ...summary.decisions.map((d) => bullet(d.owner ? `${d.decision} — ${d.owner}` : d.decision)),
      heading('Actions'),
      ...summary.actions.map((a) =>
        bullet(
          [a.action, a.owner ? `(${a.owner})` : null, a.due ? `dû ${a.due}` : null]
            .filter(Boolean)
            .join(' '),
        ),
      ),
    ];
    if (summary.participants.length) {
      children.push(heading('Participants'), ...summary.participants.map(bullet));
    }
    if (summary.topics.length) {
      children.push(heading('Topics'), ...summary.topics.map(bullet));
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, slugify(summary.title) + '.docx');
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportTxt}>
        <FileText className="h-4 w-4" /> TXT
      </Button>
      <Button variant="outline" size="sm" onClick={exportMd}>
        <FileText className="h-4 w-4" /> Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportPdf}
        disabled={!canExportPdf}
        title={canExportPdf ? 'Exporter en PDF' : 'PDF réservé au tier Pro'}
      >
        {canExportPdf ? <FileDown className="h-4 w-4" /> : <Lock className="h-4 w-4" />} PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportDocx}
        disabled={!canExportDocx}
        title={canExportDocx ? 'Exporter en DOCX' : 'DOCX réservé au tier Pro'}
      >
        {canExportDocx ? <FileType className="h-4 w-4" /> : <Lock className="h-4 w-4" />} DOCX
      </Button>
    </div>
  );
}

function heading(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}

function bullet(text: string): Paragraph {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'summary';
}

function wrap(doc: jsPDF, text: string, x: number, y: number, width: number, lh: number): number {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lh;
}

function section(
  doc: jsPDF,
  title: string,
  items: string[],
  x: number,
  y: number,
  width: number,
): number {
  if (!items.length) return y;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x, y);
  y += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  for (const it of items) {
    y = wrap(doc, '• ' + it, x, y, width, 14) + 2;
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
  }
  return y;
}

function buildPlainText(summary: Summary, transcript: string): string {
  return [
    summary.title,
    '='.repeat(summary.title.length),
    '',
    summary.tldr,
    '',
    '## Points clés',
    ...summary.key_points.map((p) => '- ' + p),
    '',
    '## Décisions',
    ...summary.decisions.map((d) => '- ' + (d.owner ? `${d.decision} — ${d.owner}` : d.decision)),
    '',
    '## Actions',
    ...summary.actions.map((a) =>
      '- ' +
      [a.action, a.owner ? `(${a.owner})` : null, a.due ? `dû ${a.due}` : null]
        .filter(Boolean)
        .join(' '),
    ),
    '',
    '## Participants',
    ...summary.participants.map((p) => '- ' + p),
    '',
    '## Transcript brut',
    transcript,
  ].join('\n');
}

function buildMarkdown(summary: Summary, transcript: string): string {
  return [
    `# ${summary.title}`,
    '',
    `> ${summary.tldr}`,
    '',
    '## Points clés',
    ...summary.key_points.map((p) => `- ${p}`),
    '',
    '## Décisions',
    ...summary.decisions.map((d) => `- **${d.decision}**${d.owner ? ` — _${d.owner}_` : ''}`),
    '',
    '## Actions',
    ...summary.actions.map(
      (a) =>
        `- [ ] ${a.action}` +
        (a.owner ? ` _(${a.owner})_` : '') +
        (a.due ? ` — dû ${a.due}` : ''),
    ),
    '',
    `## Participants`,
    summary.participants.map((p) => `- ${p}`).join('\n'),
    '',
    `## Topics`,
    summary.topics.map((t) => `\`${t}\``).join(' '),
    '',
    '---',
    '## Transcript brut',
    '',
    transcript,
  ].join('\n');
}
