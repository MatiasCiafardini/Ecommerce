import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { runtimeConfig } from '../../../config/runtime-config';
import { Code128BarcodeService } from '../barcode/code128-barcode.service';
import type { LabelOptionsDto } from '../dto/generate-labels.dto';
import type { LabelTemplate } from '../templates/label-templates';

export type PrintableLabel = {
  productName: string;
  variantName: string;
  sku: string;
  price: string;
  storeName: string;
  logoUrl?: string | null;
};

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type EmbeddedLogo = {
  image: PDFImage;
  width: number;
  height: number;
};

const mmToPt = (value: number) => value * 2.8346456693;

@Injectable()
export class LabelPdfRenderer {
  constructor(private readonly barcode: Code128BarcodeService) {}

  async render(labels: PrintableLabel[], template: LabelTemplate, options: Required<LabelOptionsDto>) {
    const pageWidth = mmToPt(template.page.widthMm);
    const pageHeight = mmToPt(template.page.heightMm);
    const labelWidth = mmToPt(template.label.widthMm);
    const labelHeight = mmToPt(template.label.heightMm);
    const padding = mmToPt(template.label.paddingMm);
    const marginLeft = mmToPt(template.margins.leftMm);
    const marginTop = mmToPt(template.margins.topMm);
    const columnSpacing = mmToPt(template.grid.columnSpacingMm);
    const rowSpacing = mmToPt(template.grid.rowSpacingMm);
    const labelsPerPage = template.grid.columns * template.grid.rows;
    const pdf = await PDFDocument.create();
    const fonts: PdfFonts = {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    };
    const logoCache = new Map<string, EmbeddedLogo | null>();
    let page = pdf.addPage([pageWidth, pageHeight]);

    for (const [index, label] of labels.entries()) {
      if (index > 0 && index % labelsPerPage === 0) {
        page = pdf.addPage([pageWidth, pageHeight]);
      }

      const pageIndex = index % labelsPerPage;
      const column = pageIndex % template.grid.columns;
      const row = Math.floor(pageIndex / template.grid.columns);
      const x = marginLeft + column * (labelWidth + columnSpacing);
      const topY = pageHeight - marginTop - row * (labelHeight + rowSpacing);
      const y = topY - labelHeight;
      const innerX = x + padding;
      const innerWidth = labelWidth - padding * 2;
      const skuSize = this.fontSize(template, 4.2);
      const skuLineHeight = options.showSku ? skuSize + 1.5 : 0;
      const barcodeHeight = this.barcodeHeight(template, labelHeight);
      const skuY = y + padding;
      const barcodeY = skuY + skuLineHeight + 1;
      const contentBottom = barcodeY + barcodeHeight + 2;
      let cursorY = topY - padding - this.fontSize(template, 4.6);

      page.drawRectangle({
        x,
        y,
        width: labelWidth,
        height: labelHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.25,
      });

      if (options.showLogo) {
        const logo = await this.resolveLogo(pdf, label.logoUrl, logoCache);

        if (logo) {
          const maxLogoHeight = Math.min(mmToPt(4.2), labelHeight * 0.18);
          const maxLogoWidth = innerWidth * 0.62;
          const ratio = logo.width / logo.height;
          const logoWidth = Math.min(maxLogoWidth, maxLogoHeight * ratio);
          const logoHeight = logoWidth / ratio;

          if (cursorY - logoHeight >= contentBottom) {
            page.drawImage(logo.image, {
              x: innerX,
              y: cursorY - logoHeight + this.fontSize(template, 4.6),
              width: logoWidth,
              height: logoHeight,
            });
            cursorY -= logoHeight + 2;
          }
        } else {
          const size = this.fontSize(template, 5.4);
          if (this.hasRoom(cursorY, size, contentBottom)) {
            this.drawText(page, fonts, {
              x: innerX,
              y: cursorY,
              text: this.fitText(label.storeName.toUpperCase(), innerWidth, size),
              size,
              bold: true,
            });
            cursorY -= this.lineStep(template, 5);
          }
        }
      }

      if (options.showStoreName) {
        const size = this.fontSize(template, 4.8);
        if (this.hasRoom(cursorY, size, contentBottom)) {
          this.drawText(page, fonts, {
            x: innerX,
            y: cursorY,
            text: this.fitText(label.storeName, innerWidth, size),
            size,
            bold: true,
          });
          cursorY -= this.lineStep(template, 4.4);
        }
      }

      if (options.showProductName) {
        const size = this.fontSize(template, 4.6);
        if (this.hasRoom(cursorY, size, contentBottom)) {
          this.drawText(page, fonts, {
            x: innerX,
            y: cursorY,
            text: this.fitText(label.productName, innerWidth, size),
            size,
            bold: true,
          });
          cursorY -= this.lineStep(template, 4.2);
        }
      }

      if (options.showVariantName && label.variantName) {
        const size = this.fontSize(template, 4.4);
        if (this.hasRoom(cursorY, size, contentBottom)) {
          this.drawText(page, fonts, {
            x: innerX,
            y: cursorY,
            text: this.fitText(label.variantName, innerWidth, size),
            size,
          });
          cursorY -= this.lineStep(template, 4);
        }
      }

      if (options.showPrice) {
        const size = this.fontSize(template, 4.8);
        if (this.hasRoom(cursorY, size, contentBottom)) {
          this.drawText(page, fonts, {
            x: innerX,
            y: cursorY,
            text: label.price,
            size,
            bold: true,
          });
        }
      }

      this.drawBarcode(page, label.sku, innerX, barcodeY, innerWidth, barcodeHeight);

      if (options.showSku) {
        this.drawText(page, fonts, {
          x: innerX,
          y: skuY,
          text: this.fitText(label.sku, innerWidth, skuSize),
          size: skuSize,
        });
      }
    }

    return Buffer.from(await pdf.save());
  }

  private drawText(
    page: PDFPage,
    fonts: PdfFonts,
    params: { x: number; y: number; text: string; size: number; bold?: boolean },
  ) {
    page.drawText(params.text, {
      x: params.x,
      y: params.y,
      size: params.size,
      font: params.bold ? fonts.bold : fonts.regular,
      color: rgb(0, 0, 0),
    });
  }

  private drawBarcode(page: PDFPage, sku: string, x: number, y: number, width: number, height: number) {
    const vector = this.barcode.toVector(sku);
    if (!vector.width || !vector.height) return;

    const scaleX = width / vector.width;
    const scaleY = height / vector.height;

    vector.bars.forEach((bar) => {
      page.drawRectangle({
        x: x + bar.x * scaleX,
        y: y + (vector.height - bar.y - bar.height) * scaleY,
        width: Math.max(0.35, bar.width * scaleX),
        height: Math.max(0.35, bar.height * scaleY),
        color: rgb(0, 0, 0),
      });
    });
  }

  private async resolveLogo(
    pdf: PDFDocument,
    logoUrl: string | null | undefined,
    cache: Map<string, EmbeddedLogo | null>,
  ) {
    const key = logoUrl?.trim();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key) ?? null;

    const logo = await this.embedLogo(pdf, key);
    cache.set(key, logo);
    return logo;
  }

  private async embedLogo(pdf: PDFDocument, logoUrl: string): Promise<EmbeddedLogo | null> {
    const bytes = await this.loadLogoBytes(logoUrl);
    if (!bytes) return null;

    const extension = this.logoExtension(logoUrl);
    try {
      const image =
        extension === '.jpg' || extension === '.jpeg'
          ? await pdf.embedJpg(bytes)
          : extension === '.png'
            ? await pdf.embedPng(bytes)
            : null;

      return image ? { image, width: image.width, height: image.height } : null;
    } catch {
      return null;
    }
  }

  private async loadLogoBytes(logoUrl: string): Promise<Buffer | null> {
    if (/^https?:\/\//i.test(logoUrl)) {
      return this.fetchLogoBytes(logoUrl);
    }

    if (logoUrl.startsWith('/uploads/')) {
      return this.fetchLogoBytes(`${runtimeConfig.appUrl.replace(/\/$/, '')}${logoUrl}`);
    }

    const relativePath = logoUrl.replace(/^\/+/, '').replace(/\?.*$/, '');
    const candidates = [
      join(process.cwd(), 'public', relativePath),
      join(process.cwd(), '..', 'ecommerce-storefront', 'public', relativePath),
      join(process.cwd(), '..', 'ecommerce-admin', 'public', relativePath),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return readFile(candidate);
      }
    }

    return null;
  }

  private async fetchLogoBytes(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 4000 });
      return Buffer.from(response.data);
    } catch {
      return null;
    }
  }

  private logoExtension(logoUrl: string) {
    const pathname = logoUrl.startsWith('http')
      ? new URL(logoUrl).pathname
      : logoUrl.replace(/\?.*$/, '');

    return extname(pathname).toLowerCase();
  }

  private fontSize(template: LabelTemplate, base: number) {
    return template.key.startsWith('THERMAL') ? base + 1.4 : base;
  }

  private lineStep(template: LabelTemplate, base: number) {
    return this.fontSize(template, base) + 1.2;
  }

  private barcodeHeight(template: LabelTemplate, labelHeight: number) {
    if (template.key.startsWith('THERMAL')) {
      return Math.min(Math.max(mmToPt(9), labelHeight * 0.28), labelHeight * 0.34);
    }

    return Math.min(Math.max(mmToPt(4.8), labelHeight * 0.2), labelHeight * 0.24);
  }

  private hasRoom(cursorY: number, fontSize: number, contentBottom: number) {
    return cursorY - fontSize >= contentBottom;
  }

  private fitText(value: string, maxWidth: number, fontSize: number) {
    const text = value.trim();
    const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * 0.55)));
    return text.length > maxChars ? `${text.slice(0, Math.max(3, maxChars - 1))}.` : text;
  }
}
