// File -> pages of text. Supports PDF, DOCX, TXT, MD, CSV, JSON.
import path from 'node:path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

async function parsePdf(buffer) {
  const pages = [];
  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent({ normalizeWhitespace: true });
      let lastY, text = '';
      for (const item of content.items) {
        text += lastY === undefined || lastY === item.transform[5] ? item.str : `\n${item.str}`;
        lastY = item.transform[5];
      }
      pages.push({ page: pageData.pageIndex + 1, text });
      return text;
    },
  });
  pages.sort((a, b) => a.page - b.page);
  return pages;
}

export async function extractPages(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    const pages = await parsePdf(buffer);
    const chars = pages.reduce((n, p) => n + p.text.trim().length, 0);
    if (chars < 50) throw new Error('This PDF has no extractable text (likely scanned). Run OCR first, then upload.');
    return pages;
  }
  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer });
    return [{ page: null, text: value }];
  }
  if (['.txt', '.md', '.markdown', '.csv', '.json'].includes(ext)) {
    return [{ page: null, text: buffer.toString('utf8') }];
  }
  throw new Error(`Unsupported file type "${ext}". Use PDF, DOCX, TXT, MD or CSV.`);
}
