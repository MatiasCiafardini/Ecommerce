type PdfFontName = 'Helvetica' | 'Helvetica-Bold';

type DrawTextOptions = {
  x: number;
  y: number;
  text: string;
  size?: number;
  font?: PdfFontName;
};

type DrawWrappedTextOptions = {
  x: number;
  y: number;
  text: string;
  maxWidth: number;
  size?: number;
  lineHeight?: number;
  font?: PdfFontName;
};

type DrawRectOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  lineWidth?: number;
};

type DrawLineOptions = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineWidth?: number;
};

const FONT_KEYS: Record<PdfFontName, string> = {
  Helvetica: 'F1',
  'Helvetica-Bold': 'F2',
};

const DEFAULT_PAGE_WIDTH = 595;
const DEFAULT_PAGE_HEIGHT = 842;

const sanitizePdfText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value: string) =>
  sanitizePdfText(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');

const approximateTextWidth = (value: string, fontSize: number) =>
  sanitizePdfText(value).length * fontSize * 0.54;

export class SimplePdfDocument {
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly pages: string[][] = [];
  private currentPageIndex = -1;

  constructor(pageWidth = DEFAULT_PAGE_WIDTH, pageHeight = DEFAULT_PAGE_HEIGHT) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.addPage();
  }

  addPage() {
    this.pages.push([]);
    this.currentPageIndex = this.pages.length - 1;
  }

  getPageWidth() {
    return this.pageWidth;
  }

  getPageHeight() {
    return this.pageHeight;
  }

  drawText(options: DrawTextOptions) {
    const text = escapePdfText(options.text);

    if (!text) {
      return;
    }

    const size = options.size ?? 12;
    const font = options.font ?? 'Helvetica';
    const fontKey = FONT_KEYS[font];

    this.currentPage().push(
      'BT',
      `/${fontKey} ${size} Tf`,
      `1 0 0 1 ${options.x.toFixed(2)} ${options.y.toFixed(2)} Tm`,
      `(${text}) Tj`,
      'ET',
    );
  }

  drawWrappedText(options: DrawWrappedTextOptions) {
    const size = options.size ?? 12;
    const lineHeight = options.lineHeight ?? size * 1.35;
    const font = options.font ?? 'Helvetica';
    const paragraphs = options.text
      .split(/\r?\n/)
      .map((line) => sanitizePdfText(line))
      .filter((line, index, array) => line.length > 0 || index < array.length - 1);

    let cursorY = options.y;

    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (!paragraph) {
        cursorY -= lineHeight;
        return;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;

        if (
          currentLine &&
          approximateTextWidth(candidate, size) > options.maxWidth
        ) {
          this.drawText({
            x: options.x,
            y: cursorY,
            text: currentLine,
            size,
            font,
          });
          cursorY -= lineHeight;
          currentLine = word;
          return;
        }

        currentLine = candidate;
      });

      if (currentLine) {
        this.drawText({
          x: options.x,
          y: cursorY,
          text: currentLine,
          size,
          font,
        });
        cursorY -= lineHeight;
      }

      if (paragraphIndex < paragraphs.length - 1) {
        cursorY -= lineHeight * 0.3;
      }
    });

    return cursorY;
  }

  drawRect(options: DrawRectOptions) {
    const lineWidth = options.lineWidth ?? 1;
    this.currentPage().push(
      `${lineWidth.toFixed(2)} w`,
      `${options.x.toFixed(2)} ${options.y.toFixed(2)} ${options.width.toFixed(2)} ${options.height.toFixed(2)} re S`,
    );
  }

  drawLine(options: DrawLineOptions) {
    const lineWidth = options.lineWidth ?? 1;
    this.currentPage().push(
      `${lineWidth.toFixed(2)} w`,
      `${options.x1.toFixed(2)} ${options.y1.toFixed(2)} m ${options.x2.toFixed(2)} ${options.y2.toFixed(2)} l S`,
    );
  }

  save() {
    const pageContents = this.pages.map((commands) => commands.join('\n'));
    const objects: string[] = [];

    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

    const firstPageObjectNumber = 3;
    const fontHelveticaObjectNumber = firstPageObjectNumber + this.pages.length;
    const fontHelveticaBoldObjectNumber = fontHelveticaObjectNumber + 1;
    const firstContentObjectNumber = fontHelveticaBoldObjectNumber + 1;
    const pageRefs = this.pages
      .map((_, index) => `${firstPageObjectNumber + index} 0 R`)
      .join(' ');

    objects.push(
      `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${this.pages.length} >>\nendobj`,
    );

    this.pages.forEach((_, index) => {
      const pageObjectNumber = firstPageObjectNumber + index;
      const contentObjectNumber = firstContentObjectNumber + index;
      objects.push(
        `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${fontHelveticaObjectNumber} 0 R /F2 ${fontHelveticaBoldObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj`,
      );
    });

    objects.push(
      `${fontHelveticaObjectNumber} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
    );
    objects.push(
      `${fontHelveticaBoldObjectNumber} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`,
    );

    pageContents.forEach((content, index) => {
      const contentBuffer = Buffer.from(content, 'ascii');
      objects.push(
        `${firstContentObjectNumber + index} 0 obj\n<< /Length ${contentBuffer.length} >>\nstream\n${content}\nendstream\nendobj`,
      );
    });

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object) => {
      offsets.push(Buffer.byteLength(pdf, 'ascii'));
      pdf += `${object}\n`;
    });

    const xrefStart = Buffer.byteLength(pdf, 'ascii');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(pdf, 'ascii');
  }

  private currentPage() {
    return this.pages[this.currentPageIndex];
  }
}
