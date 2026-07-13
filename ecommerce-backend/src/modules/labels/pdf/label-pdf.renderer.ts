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
  normalPrice: string;
  transferPrice: string | null;
  storeName: string;
  storeAddress?: string | null;
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

      if (template.layout === 'product_cut_price') {
        await this.drawProductCutPriceLabel(
          page,
          fonts,
          label,
          template,
          options,
          {
            x,
            y,
            width: labelWidth,
            height: labelHeight,
            padding,
          },
          pdf,
          logoCache,
        );
        continue;
      }

      if (template.layout === 'compact_cut_price') {
        this.drawCompactCutPriceLabel(page, fonts, label, template, options, {
          x,
          y,
          width: labelWidth,
          height: labelHeight,
          padding,
        });
        continue;
      }

      if (template.layout === 'shipping') {
        this.drawShippingLabel(page, fonts, label, template, options, {
          x,
          y,
          width: labelWidth,
          height: labelHeight,
          padding,
        });
        continue;
      }

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

        if (label.storeAddress) {
          const addressSize = this.fontSize(template, 3.8);
          if (this.hasRoom(cursorY, addressSize, contentBottom)) {
            this.drawText(page, fonts, {
              x: innerX,
              y: cursorY,
              text: this.fitText(label.storeAddress, innerWidth, addressSize),
              size: addressSize,
            });
            cursorY -= this.lineStep(template, 3.5);
          }
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
        for (const line of this.resolvePriceLines(label, options)) {
          if (this.hasRoom(cursorY, size, contentBottom)) {
            this.drawText(page, fonts, {
              x: innerX,
              y: cursorY,
              text: this.fitText([line.caption, line.value].filter(Boolean).join(' '), innerWidth, size),
              size,
              bold: true,
            });
            cursorY -= this.lineStep(template, 4.6);
          }
        }
      }

      this.drawBarcode(page, label.sku, innerX, barcodeY, innerWidth, barcodeHeight, template);

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

  private drawBarcode(
    page: PDFPage,
    sku: string,
    x: number,
    y: number,
    width: number,
    height: number,
    template: LabelTemplate,
  ) {
    const vector = this.barcode.toVector(sku);
    if (!vector.width || !vector.height) return;

    const scaleX = width / vector.width;
    const scaleY = height / vector.height;
    const barWidthRatio = this.barWidthRatio(template);

    vector.bars.forEach((bar) => {
      const scaledWidth = bar.width * scaleX;
      const adjustedWidth = Math.max(0.18, scaledWidth * barWidthRatio);
      page.drawRectangle({
        x: x + bar.x * scaleX + (scaledWidth - adjustedWidth) / 2,
        y: y + (vector.height - bar.y - bar.height) * scaleY,
        width: adjustedWidth,
        height: Math.max(0.35, bar.height * scaleY),
        color: rgb(0, 0, 0),
      });
    });
  }

  private async drawProductCutPriceLabel(
    page: PDFPage,
    fonts: PdfFonts,
    label: PrintableLabel,
    template: LabelTemplate,
    options: Required<LabelOptionsDto>,
    box: { x: number; y: number; width: number; height: number; padding: number },
    pdf: PDFDocument,
    logoCache: Map<string, EmbeddedLogo | null>,
  ) {
    if (template.key === 'TROJANI_44X55') {
      await this.drawBottomPriceLabel(page, fonts, label, template, options, box, pdf, logoCache);
      return;
    }

    const priceWidth = options.priceMode === 'none' ? 0 : mmToPt(this.cutPriceWidthMm(template));
    const dividerX = box.x + box.width - priceWidth;
    const contentX = box.x + box.padding;
    const contentWidth = box.width - priceWidth - box.padding * 2 - mmToPt(1);
    const barcodeHeight = mmToPt(this.cutPriceBarcodeHeightMm(template, false));
    const barcodeY = box.y + box.padding + (options.showSku ? mmToPt(3.1) : 0);
    const titleSize = this.fontSize(template, 5.2);
    const metaSize = this.fontSize(template, 4.2);
    const strongText = this.usesStrongCutPriceText(template);
    let cursorY = box.y + box.height - box.padding - titleSize;

    if (options.priceMode !== 'none') {
      this.drawCutLine(page, dividerX, box.y, box.height);
      this.drawPriceBlock(page, fonts, label, options, {
        x: dividerX + mmToPt(1),
        y: box.y + box.padding,
        width: priceWidth - mmToPt(2),
        height: box.height - box.padding * 2,
        compact: false,
        template,
      });
    }

    if (options.showStoreName && label.storeName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.storeName.toUpperCase(), contentWidth, metaSize),
        size: metaSize,
        bold: true,
      });
      cursorY -= metaSize + 2;

      if (label.storeAddress) {
        const addressSize = this.fontSize(template, 3.5);
        this.drawText(page, fonts, {
          x: contentX,
          y: cursorY,
          text: this.fitText(label.storeAddress, contentWidth, addressSize),
          size: addressSize,
        });
        cursorY -= addressSize + 1.6;
      }
    }

    if (options.showProductName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.productName, contentWidth, titleSize),
        size: titleSize,
        bold: true,
      });
      cursorY -= titleSize + this.productVariantGap(template);
    }

    if (options.showVariantName && label.variantName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.variantName, contentWidth, metaSize),
        size: metaSize,
        bold: strongText,
      });
    }

    this.drawBarcode(page, label.sku, contentX, barcodeY, contentWidth, barcodeHeight, template);

    if (options.showSku) {
      this.drawText(page, fonts, {
        x: contentX,
        y: box.y + box.padding,
        text: this.fitText(label.sku, contentWidth, metaSize),
        size: metaSize,
        bold: strongText,
      });
    }
  }

  private async drawBottomPriceLabel(
    page: PDFPage,
    fonts: PdfFonts,
    label: PrintableLabel,
    template: LabelTemplate,
    options: Required<LabelOptionsDto>,
    box: { x: number; y: number; width: number; height: number; padding: number },
    pdf: PDFDocument,
    logoCache: Map<string, EmbeddedLogo | null>,
  ) {
    const contentX = box.x + box.padding;
    const contentWidth = box.width - box.padding * 2;
    const priceLines = this.resolvePriceLines(label, options);
    const priceBandHeight = priceLines.length > 0 ? mmToPt(10.6) : 0;
    const dividerY = box.y + box.padding + priceBandHeight;
    const titleSize = this.fontSize(template, 5.2);
    const metaSize = this.fontSize(template, 4.2);
    const barcodeHeight = mmToPt(this.cutPriceBarcodeHeightMm(template, false));
    const skuY = dividerY + mmToPt(1.6);
    const barcodeY = skuY + (options.showSku ? metaSize + mmToPt(0.8) : 0);
    let cursorY = box.y + box.height - box.padding - titleSize;

    if (priceLines.length > 0) {
      page.drawLine({
        start: { x: box.x + box.padding, y: dividerY },
        end: { x: box.x + box.width - box.padding, y: dividerY },
        thickness: 0.45,
        color: rgb(0, 0, 0),
        dashArray: [2, 2],
      });
      this.drawBottomPriceBlock(page, fonts, priceLines, template, {
        x: contentX,
        y: box.y + box.padding * 0.65,
        width: contentWidth,
        height: priceBandHeight - box.padding * 0.2,
      });
    }

    if (options.showLogo) {
      const logo = await this.resolveLogo(pdf, label.logoUrl, logoCache);
      const maxLogoHeight = mmToPt(5.2);
      const maxLogoWidth = Math.min(contentWidth * 0.42, mmToPt(18));

      if (logo) {
        const ratio = logo.width / logo.height;
        const logoWidth = Math.min(maxLogoWidth, maxLogoHeight * ratio);
        const logoHeight = logoWidth / ratio;

        page.drawImage(logo.image, {
          x: contentX + (contentWidth - logoWidth) / 2,
          y: cursorY - logoHeight + titleSize,
          width: logoWidth,
          height: logoHeight,
        });
        cursorY -= logoHeight + mmToPt(1.2);
      } else if (label.storeName) {
        this.drawCenteredText(
          page,
          fonts,
          label.storeName.toUpperCase(),
          contentX,
          cursorY,
          contentWidth,
          metaSize,
          true,
        );
        cursorY -= metaSize + 2;
      }
    } else if (options.showStoreName && label.storeName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.storeName.toUpperCase(), contentWidth, metaSize),
        size: metaSize,
        bold: true,
      });
      cursorY -= metaSize + 2;
    }

    if (options.showProductName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.productName, contentWidth, titleSize),
        size: titleSize,
        bold: true,
      });
      cursorY -= titleSize + this.productVariantGap(template);
    }

    if (options.showVariantName && label.variantName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.variantName, contentWidth, metaSize),
        size: metaSize,
        bold: true,
      });
    }

    this.drawBarcode(page, label.sku, contentX, barcodeY, contentWidth, barcodeHeight, template);

    if (options.showSku) {
      this.drawText(page, fonts, {
        x: contentX,
        y: skuY,
        text: this.fitText(label.sku, contentWidth, metaSize),
        size: metaSize,
        bold: true,
      });
    }
  }

  private drawBottomPriceBlock(
    page: PDFPage,
    fonts: PdfFonts,
    priceLines: { caption: string; value: string }[],
    template: LabelTemplate,
    box: { x: number; y: number; width: number; height: number },
  ) {
    const scale = this.readabilityScale(template);
    const labelSize = 4.2 * scale;
    const priceSize = 7.4 * scale;
    const columns = Math.max(1, priceLines.length);
    const columnWidth = box.width / columns;
    const topY = box.y + box.height - labelSize;

    priceLines.forEach((line, index) => {
      const x = box.x + index * columnWidth;
      const width = columnWidth - (index < columns - 1 ? mmToPt(1) : 0);
      this.drawCenteredText(page, fonts, line.caption, x, topY, width, labelSize, true);
      this.drawCenteredText(page, fonts, line.value, x, topY - priceSize - 1, width, priceSize, true);
    });
  }

  private drawCompactCutPriceLabel(
    page: PDFPage,
    fonts: PdfFonts,
    label: PrintableLabel,
    template: LabelTemplate,
    options: Required<LabelOptionsDto>,
    box: { x: number; y: number; width: number; height: number; padding: number },
  ) {
    const priceWidth = options.priceMode === 'none' ? 0 : mmToPt(16);
    const dividerX = box.x + box.width - priceWidth;
    const contentX = box.x + box.padding;
    const contentWidth = box.width - priceWidth - box.padding * 2 - mmToPt(0.8);
    const titleSize = this.fontSize(template, 4);
    const metaSize = this.fontSize(template, 3.4);
    const skuSize = this.fontSize(template, 3.2);
    const hasVariant = options.showVariantName && Boolean(label.variantName);
    const barcodeHeight = mmToPt(this.cutPriceBarcodeHeightMm(template, true));
    // Keep the barcode in the lower band of the compact label. Moving it up
    // when a variant is present makes its bars cross the variant baseline on
    // the 54 x 17 mm stock; reducing only its height is enough to make room.
    const barcodeBottomOffset = mmToPt(2.8);

    if (options.priceMode !== 'none') {
      this.drawCutLine(page, dividerX, box.y, box.height);
      this.drawPriceBlock(page, fonts, label, options, {
        x: dividerX + mmToPt(0.7),
        y: box.y + box.padding,
        width: priceWidth - mmToPt(1.4),
        height: box.height - box.padding * 2,
        compact: true,
        template,
      });
    }

    if (options.showProductName) {
      this.drawText(page, fonts, {
        x: contentX,
        y: box.y + box.height - box.padding - titleSize,
        text: this.fitText(label.productName, contentWidth, titleSize),
        size: titleSize,
        bold: true,
      });
    }

    if (hasVariant) {
      this.drawText(page, fonts, {
        x: contentX,
        y: box.y + box.height - box.padding - titleSize - metaSize - 1.2,
        text: this.fitText(label.variantName, contentWidth, metaSize),
        size: metaSize,
      });
    }

    this.drawBarcode(
      page,
      label.sku,
      contentX,
      box.y + box.padding + barcodeBottomOffset,
      contentWidth,
      hasVariant ? barcodeHeight * 0.72 : barcodeHeight,
      template,
    );

    if (options.showSku) {
      this.drawText(page, fonts, {
        x: contentX,
        y: box.y + box.padding,
        text: this.fitText(label.sku, contentWidth, skuSize),
        size: skuSize,
      });
    }
  }

  private drawShippingLabel(
    page: PDFPage,
    fonts: PdfFonts,
    label: PrintableLabel,
    template: LabelTemplate,
    _options: Required<LabelOptionsDto>,
    box: { x: number; y: number; width: number; height: number; padding: number },
  ) {
    const contentX = box.x + box.padding;
    const contentWidth = box.width - box.padding * 2;
    const titleSize = this.fontSize(template, 7.2);
    const bodySize = this.fontSize(template, 5);
    let cursorY = box.y + box.height - box.padding - titleSize;

    this.drawText(page, fonts, {
      x: contentX,
      y: cursorY,
      text: this.fitText(label.storeName || 'Pedido interno', contentWidth, titleSize),
      size: titleSize,
      bold: true,
    });
    cursorY -= titleSize + 8;

    if (label.storeAddress) {
      this.drawText(page, fonts, {
        x: contentX,
        y: cursorY,
        text: this.fitText(label.storeAddress, contentWidth, bodySize),
        size: bodySize,
        bold: true,
      });
      cursorY -= bodySize + 5;
    }

    [
      `Producto: ${label.productName}`,
      label.variantName ? `Variante: ${label.variantName}` : '',
      `SKU: ${label.sku}`,
    ]
      .filter(Boolean)
      .forEach((line) => {
        this.drawText(page, fonts, {
          x: contentX,
          y: cursorY,
          text: this.fitText(line, contentWidth, bodySize),
          size: bodySize,
        });
        cursorY -= bodySize + 5;
      });

    this.drawBarcode(page, label.sku, contentX, box.y + box.padding + mmToPt(8), contentWidth, mmToPt(18), template);
    this.drawText(page, fonts, {
      x: contentX,
      y: box.y + box.padding,
      text: this.fitText(label.sku, contentWidth, bodySize),
      size: bodySize,
    });
  }

  private drawPriceBlock(
    page: PDFPage,
    fonts: PdfFonts,
    label: PrintableLabel,
    options: Required<LabelOptionsDto>,
    box: { x: number; y: number; width: number; height: number; compact: boolean; template: LabelTemplate },
  ) {
    const priceLines = this.resolvePriceLines(label, options);
    const scale = this.readabilityScale(box.template);
    const labelSize = (box.compact ? 3.7 : 4.4) * scale;
    const priceSize = (box.compact ? 6.2 : 8.4) * scale;
    const captionGap = box.compact ? 1 : 1.6;
    const groupGap = box.compact ? 1.8 : 2.8;
    const blockHeight = priceLines.reduce(
      (total, line, index) =>
        total +
        priceSize +
        (line.caption ? labelSize + captionGap : 0) +
        (index < priceLines.length - 1 ? groupGap : 0),
      0,
    );
    let topY = box.y + box.height / 2 + blockHeight / 2;

    priceLines.forEach((line) => {
      if (line.caption) {
        topY -= labelSize;
        this.drawRightAlignedText(
          page,
          fonts,
          line.caption,
          box.x,
          topY,
          box.width,
          labelSize,
          this.usesStrongCutPriceText(box.template),
        );
        topY -= captionGap;
      }
      topY -= priceSize;
      this.drawRightAlignedText(page, fonts, line.value, box.x, topY, box.width, priceSize, true);
      topY -= groupGap;
    });
  }

  private resolvePriceLines(label: PrintableLabel, options: Required<LabelOptionsDto>) {
    if (options.priceMode === 'none') return [];
    if (options.priceMode === 'transfer') {
      return [{ caption: 'EFECT/TRANSF', value: label.transferPrice ?? label.normalPrice }];
    }
    if (options.priceMode === 'both') {
      return [
        { caption: 'TARJETA', value: label.normalPrice },
        { caption: 'EFECT/TRANSF', value: label.transferPrice ?? label.normalPrice },
      ];
    }

    return [{ caption: '', value: label.normalPrice }];
  }

  private drawCutLine(page: PDFPage, x: number, y: number, height: number) {
    page.drawLine({
      start: { x, y: y + 1 },
      end: { x, y: y + height - 1 },
      thickness: 0.45,
      color: rgb(0, 0, 0),
      dashArray: [2, 2],
    });
  }

  private drawRightAlignedText(
    page: PDFPage,
    fonts: PdfFonts,
    text: string,
    x: number,
    y: number,
    width: number,
    size: number,
    bold: boolean,
  ) {
    const font = bold ? fonts.bold : fonts.regular;
    const fitted = this.fitText(text, width, size);
    const textWidth = font.widthOfTextAtSize(fitted, size);
    page.drawText(fitted, {
      x: x + Math.max(0, width - textWidth),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  private drawCenteredText(
    page: PDFPage,
    fonts: PdfFonts,
    text: string,
    x: number,
    y: number,
    width: number,
    size: number,
    bold: boolean,
  ) {
    const font = bold ? fonts.bold : fonts.regular;
    const fitted = this.fitText(text, width, size);
    const textWidth = font.widthOfTextAtSize(fitted, size);
    page.drawText(fitted, {
      x: x + Math.max(0, (width - textWidth) / 2),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
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
    if (template.key === 'BROTHER_QL570_54X17_ACCESSORY') {
      return base + 0.8;
    }

    if (template.key === 'BROTHER_QL570_29X90' || template.key === 'TROJANI_30X70') {
      return base + 3;
    }

    if (template.key === 'TROJANI_100X150_6UP') {
      return base + 2;
    }

    if (template.key === 'TROJANI_44X55') {
      return base + 2.4;
    }

    return template.key.startsWith('THERMAL') ? base + 1.4 : base;
  }

  private readabilityScale(template: LabelTemplate) {
    if (template.key === 'BROTHER_QL570_54X17_ACCESSORY') return 1.15;
    if (template.key === 'BROTHER_QL570_29X90' || template.key === 'TROJANI_30X70') return 1.3;
    if (template.key === 'TROJANI_100X150_6UP') return 1.24;
    if (template.key === 'TROJANI_44X55') return 1.28;
    return 1;
  }

  private cutPriceBarcodeHeightMm(template: LabelTemplate, compact: boolean) {
    if (template.key === 'BROTHER_QL570_54X17_ACCESSORY') return 9;
    if (template.key === 'BROTHER_QL570_62X29_CLOTHING') return 14;
    if (template.key === 'BROTHER_QL570_29X90') return 15.5;
    if (template.key === 'TROJANI_30X70') return 13;
    if (template.key === 'TROJANI_44X55') return 11.6;
    if (template.key === 'TROJANI_100X150_6UP') return 9.8;
    return compact ? 5 : 7.6;
  }

  private cutPriceWidthMm(template: LabelTemplate) {
    if (template.key === 'TROJANI_44X55') return 18;
    return 22;
  }

  private usesStrongCutPriceText(template: LabelTemplate) {
    return template.key === 'TROJANI_44X55';
  }

  private barWidthRatio(template: LabelTemplate) {
    if (template.key === 'BROTHER_QL570_54X17_ACCESSORY') return 0.72;
    if (template.key === 'BROTHER_QL570_62X29_CLOTHING') return 0.76;
    if (template.key === 'BROTHER_QL570_29X90' || template.key === 'TROJANI_30X70') return 0.76;
    if (template.key === 'TROJANI_44X55') return 0.78;
    if (template.key === 'TROJANI_100X150_6UP') return 0.8;
    return 0.86;
  }

  private productVariantGap(template: LabelTemplate) {
    if (template.key === 'BROTHER_QL570_29X90' || template.key === 'TROJANI_30X70') return 0.35;
    if (template.key === 'TROJANI_100X150_6UP') return 0.8;
    if (template.key === 'TROJANI_44X55') return 1;
    return 1.8;
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
