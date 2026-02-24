export function downloadSimplePdf(filename: string, title: string, lines: string[]) {
  const escapeText = (text: string) =>
    text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const contentLines = [title, ...lines].map(line => `(${escapeText(line)}) Tj`).join('\nT*\n');
  const contentStream = `BT\n/F1 12 Tf\n16 TL\n50 790 Td\n${contentLines}\nET`;

  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj');
  objects.push(`4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`);
  objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([new TextEncoder().encode(pdf)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface DownloadTablePdfOptions {
  filename: string;
  title: string;
  subtitleLines?: string[];
  headers: string[];
  rows: string[][];
}

function buildPdf(contentStream: string, mediaBox: [number, number, number, number]) {
  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [${mediaBox.join(' ')}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj`,
  );
  objects.push(`4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`);
  objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

function escapeText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function truncateForCell(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 1)}.`;
}

export function downloadTablePdf({
  filename,
  title,
  subtitleLines = [],
  headers,
  rows,
}: DownloadTablePdfOptions) {
  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const margin = 32;
  const rowHeight = 20;
  const titleY = pageHeight - 36;
  const tableTopY = pageHeight - 110;
  const footerReserve = 28;

  const usableWidth = pageWidth - margin * 2;
  const firstColWidth = Math.min(260, Math.max(180, usableWidth * 0.35));
  const remainingCols = Math.max(headers.length - 1, 1);
  const otherColWidth = (usableWidth - firstColWidth) / remainingCols;
  const colWidths = headers.map((_, i) => (i === 0 ? firstColWidth : otherColWidth));
  const maxRowsThatFit = Math.floor((tableTopY - margin - footerReserve) / rowHeight) - 1; // minus header
  const visibleRows = rows.slice(0, Math.max(0, maxRowsThatFit));

  const commands: string[] = [];
  commands.push('0 G');
  commands.push('0.8 w');

  // Title
  commands.push(`BT /F1 16 Tf ${margin} ${titleY} Td (${escapeText(title)}) Tj ET`);
  subtitleLines.forEach((line, i) => {
    commands.push(`BT /F1 11 Tf ${margin} ${titleY - 20 - (i * 14)} Td (${escapeText(line)}) Tj ET`);
  });

  const totalRows = visibleRows.length + 1; // + header row
  const tableBottomY = tableTopY - (totalRows * rowHeight);

  // Horizontal lines
  for (let i = 0; i <= totalRows; i++) {
    const y = tableTopY - (i * rowHeight);
    commands.push(`${margin} ${y} m ${pageWidth - margin} ${y} l S`);
  }

  // Vertical lines
  let x = margin;
  commands.push(`${x} ${tableTopY} m ${x} ${tableBottomY} l S`);
  colWidths.forEach((w) => {
    x += w;
    commands.push(`${x} ${tableTopY} m ${x} ${tableBottomY} l S`);
  });

  // Header text
  let headerX = margin;
  headers.forEach((h, i) => {
    const maxChars = Math.max(4, Math.floor((colWidths[i] - 8) / 5.5));
    const text = truncateForCell(h, maxChars);
    commands.push(`BT /F1 10 Tf ${headerX + 4} ${tableTopY - 14} Td (${escapeText(text)}) Tj ET`);
    headerX += colWidths[i];
  });

  // Cell text
  visibleRows.forEach((row, rowIndex) => {
    let cellX = margin;
    row.forEach((cell, colIndex) => {
      const maxChars = Math.max(2, Math.floor((colWidths[colIndex] - 8) / 5.5));
      const text = truncateForCell(cell, maxChars);
      const y = tableTopY - ((rowIndex + 1) * rowHeight) - 14;
      commands.push(`BT /F1 10 Tf ${cellX + 4} ${y} Td (${escapeText(text)}) Tj ET`);
      cellX += colWidths[colIndex];
    });
  });

  if (rows.length > visibleRows.length) {
    const omitted = rows.length - visibleRows.length;
    commands.push(`BT /F1 9 Tf ${margin} ${margin - 6} Td (${escapeText(`Note: ${omitted} more row(s) omitted due to page size.`)}) Tj ET`);
  }

  const contentStream = commands.join('\n');
  const pdf = buildPdf(contentStream, [0, 0, pageWidth, pageHeight]);

  const blob = new Blob([new TextEncoder().encode(pdf)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
