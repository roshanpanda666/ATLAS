import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function generatePdfFile({
  title,
  content,
}: {
  title: string;
  content: string;
}): Promise<{ downloadUrl: string; filename: string }> {
  const sanitizeWinAnsi = (text: string) => {
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2026]/g, '...')
      .replace(/[\u00A0\u200B\u202F\uFEFF]/g, ' ')
      .replace(/[^\x00-\xFF]/g, '');
  };

  title = sanitizeWinAnsi(title);
  content = sanitizeWinAnsi(content);

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28; // A4 dimensions in points
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 45;

  let pageNumber = 1;
  let page: PDFPage = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < bottomMargin) {
      // Draw page number on current page
      page.drawText(`Page ${pageNumber}`, {
        x: pageWidth / 2 - 16,
        y: 22,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });

      page = doc.addPage([pageWidth, pageHeight]);
      pageNumber++;
      y = pageHeight - margin;
    }
  }

  // ── Header Banner ──
  page.drawRectangle({
    x: margin,
    y: y - 38,
    width: contentWidth,
    height: 44,
    color: rgb(0.04, 0.08, 0.05),
  });

  // Neon Green accent strip
  page.drawRectangle({
    x: margin,
    y: y - 40,
    width: contentWidth,
    height: 2.5,
    color: rgb(0, 0.95, 0.5),
  });

  const displayTitle = title.length > 55 ? title.slice(0, 52) + '…' : title;
  page.drawText(displayTitle, {
    x: margin + 14,
    y: y - 26,
    size: 15,
    font: fontBold,
    color: rgb(0, 0.95, 0.5),
  });
  y -= 64;

  // Metadata sub-header
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  page.drawText(`ATLAS Synthesis Report • Generated: ${dateStr}`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.45),
  });
  y -= 26;

  const rawLines = content.split('\n');
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Empty lines
    if (!trimmed) {
      y -= 8;
      i++;
      continue;
    }

    // 2. Fenced Code Blocks (```)
    if (trimmed.startsWith('```')) {
      i++; // Skip opening fence
      const codeLines: string[] = [];
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++; // Skip closing fence

      const blockHeight = Math.min(codeLines.length * 13 + 16, 400);
      ensureSpace(blockHeight + 10);

      // Code background container
      page.drawRectangle({
        x: margin,
        y: y - blockHeight,
        width: contentWidth,
        height: blockHeight,
        color: rgb(0.05, 0.07, 0.06),
        borderColor: rgb(0, 0.75, 0.4),
        borderWidth: 0.6,
      });

      let codeY = y - 13;
      for (const cl of codeLines) {
        if (codeY - 13 < y - blockHeight) break;
        page.drawText(cl.slice(0, 78), {
          x: margin + 10,
          y: codeY,
          size: 8,
          font: fontMono,
          color: rgb(0.35, 0.95, 0.55),
        });
        codeY -= 13;
      }
      y -= blockHeight + 12;
      continue;
    }

    // 3. GFM Markdown Tables (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      // Parse table cells and filter out delimiter row (e.g. |---|---|)
      const allRows = tableLines.map((tl) =>
        tl.split('|').slice(1, -1).map((c) => c.trim())
      );
      const dataRows = allRows.filter((row) => !row.every((c) => /^:?-+:?$/.test(c)));

      if (dataRows.length > 0) {
        const numCols = Math.max(...dataRows.map((r) => r.length));
        const colWidth = contentWidth / numCols;
        const rowHeight = 18;
        const headerHeight = 22;
        const tableHeight = headerHeight + (dataRows.length - 1) * rowHeight;

        ensureSpace(tableHeight + 14);

        let tableY = y;

        dataRows.forEach((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          const currentH = isHeader ? headerHeight : rowHeight;

          // Row background fill
          if (isHeader) {
            page.drawRectangle({
              x: margin,
              y: tableY - currentH,
              width: contentWidth,
              height: currentH,
              color: rgb(0.06, 0.12, 0.08),
            });
          } else if (rowIndex % 2 === 1) {
            page.drawRectangle({
              x: margin,
              y: tableY - currentH,
              width: contentWidth,
              height: currentH,
              color: rgb(0.96, 0.98, 0.96),
            });
          }

          // Draw cells
          row.forEach((cellText, colIndex) => {
            const cellX = margin + colIndex * colWidth;

            // Border
            page.drawRectangle({
              x: cellX,
              y: tableY - currentH,
              width: colWidth,
              height: currentH,
              borderColor: rgb(0.7, 0.82, 0.74),
              borderWidth: 0.5,
              color: undefined,
            });

            // Clean cell text
            const cleanCell = cellText.replace(/\*\*/g, '').replace(/`/g, '');
            const truncated = cleanCell.slice(0, Math.floor(colWidth / 6.5));

            page.drawText(truncated, {
              x: cellX + 6,
              y: tableY - (isHeader ? 14 : 12),
              size: isHeader ? 8.5 : 8,
              font: isHeader ? fontBold : fontRegular,
              color: isHeader ? rgb(0, 0.95, 0.5) : rgb(0.15, 0.18, 0.15),
            });
          });

          tableY -= currentH;
        });

        y = tableY - 14;
      }
      continue;
    }

    // 4. Horizontal Dividers (--- or ***)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      ensureSpace(16);
      page.drawLine({
        start: { x: margin, y: y - 6 },
        end: { x: margin + contentWidth, y: y - 6 },
        thickness: 0.8,
        color: rgb(0, 0.8, 0.4),
      });
      y -= 16;
      i++;
      continue;
    }

    // 5. Headings (H1, H2, H3)
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const isH1 = trimmed.startsWith('# ');
      const isH2 = trimmed.startsWith('## ');
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      const fontSize = isH1 ? 15 : isH2 ? 12.5 : 11;
      const needHeight = isH1 ? 34 : isH2 ? 26 : 22;

      ensureSpace(needHeight);

      page.drawText(headingText, {
        x: margin,
        y: y - (isH1 ? 16 : isH2 ? 13 : 11),
        size: fontSize,
        font: fontBold,
        color: isH1 ? rgb(0.04, 0.15, 0.08) : isH2 ? rgb(0.06, 0.25, 0.14) : rgb(0.08, 0.4, 0.22),
      });

      if (isH1) {
        page.drawLine({
          start: { x: margin, y: y - 20 },
          end: { x: margin + contentWidth, y: y - 20 },
          thickness: 1,
          color: rgb(0, 0.8, 0.4),
        });
      }

      y -= needHeight;
      i++;
      continue;
    }

    // 6. Blockquotes (> Quote)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '');
      ensureSpace(22);

      page.drawRectangle({
        x: margin,
        y: y - 18,
        width: 3,
        height: 18,
        color: rgb(0, 0.8, 0.4),
      });

      page.drawText(quoteText.slice(0, 85), {
        x: margin + 12,
        y: y - 13,
        size: 9,
        font: fontItalic,
        color: rgb(0.3, 0.35, 0.3),
      });

      y -= 22;
      i++;
      continue;
    }

    // 7. Regular Paragraphs & Lists (with Word Wrapping & Formatting)
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const isNumbered = /^\d+\.\s/.test(trimmed);
    const indent = isBullet || isNumbered ? 14 : 0;
    const prefix = isBullet ? '• ' : '';

    const cleanLine = trimmed
      .replace(/^[-*]\s+/, prefix)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');

    const fontSize = 9.2;
    const lineHeight = 13.5;
    const availableWidth = contentWidth - indent;
    const words = cleanLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, fontSize);

      if (width > availableWidth && currentLine) {
        ensureSpace(lineHeight);
        page.drawText(currentLine, {
          x: margin + indent,
          y,
          size: fontSize,
          font: isBullet || isNumbered ? fontRegular : fontRegular,
          color: rgb(0.15, 0.18, 0.15),
        });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      ensureSpace(lineHeight);
      page.drawText(currentLine, {
        x: margin + indent,
        y,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.15, 0.18, 0.15),
      });
      y -= lineHeight;
    }

    y -= 3; // gap between paragraphs
    i++;
  }

  // Draw footer page number on the final page
  page.drawText(`Page ${pageNumber}`, {
    x: pageWidth / 2 - 16,
    y: 22,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await doc.save();

  // Save to public/downloads directory
  const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'report';
  const filename = `${safeTitle}-${Date.now()}.pdf`;
  const filePath = path.join(downloadsDir, filename);

  fs.writeFileSync(filePath, pdfBytes);

  return {
    downloadUrl: `/downloads/${filename}`,
    filename,
  };
}
