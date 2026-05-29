export type LabelTemplateKey =
  | 'BROTHER_QL570_62X29_CLOTHING'
  | 'BROTHER_QL570_54X17_ACCESSORY'
  | 'BROTHER_DK2205_SHIPPING'
  | 'A4_50x25'
  | 'A4_40x30'
  | 'THERMAL_58'
  | 'THERMAL_80';

export type LabelUseCase = 'clothing' | 'accessory' | 'shipping' | 'generic';
export type LabelLayout = 'product_cut_price' | 'compact_cut_price' | 'shipping' | 'legacy';
export type LabelPriceMode = 'normal' | 'transfer' | 'both' | 'none';

export type LabelTemplate = {
  key: LabelTemplateKey;
  id: LabelTemplateKey;
  name: string;
  type: LabelUseCase;
  useCase: LabelUseCase;
  layout: LabelLayout;
  continuous?: boolean;
  fields: string[];
  priceOptions: LabelPriceMode[];
  page: {
    widthMm: number;
    heightMm: number;
  };
  label: {
    widthMm: number;
    heightMm: number;
    paddingMm: number;
  };
  margins: {
    topMm: number;
    rightMm: number;
    bottomMm: number;
    leftMm: number;
  };
  grid: {
    columns: number;
    rows: number;
    columnSpacingMm: number;
    rowSpacingMm: number;
  };
};

export const LABEL_TEMPLATES: Record<LabelTemplateKey, LabelTemplate> = {
  BROTHER_QL570_62X29_CLOTHING: {
    key: 'BROTHER_QL570_62X29_CLOTHING',
    id: 'BROTHER_QL570_62X29_CLOTHING',
    name: 'Etiqueta normal ropa 62x29 mm',
    type: 'clothing',
    useCase: 'clothing',
    layout: 'product_cut_price',
    fields: ['storeName', 'productName', 'variantName', 'sku', 'barcode', 'price'],
    priceOptions: ['normal', 'transfer', 'both', 'none'],
    page: { widthMm: 62, heightMm: 29 },
    label: { widthMm: 62, heightMm: 29, paddingMm: 2 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
  BROTHER_QL570_54X17_ACCESSORY: {
    key: 'BROTHER_QL570_54X17_ACCESSORY',
    id: 'BROTHER_QL570_54X17_ACCESSORY',
    name: 'Etiqueta chica accesorios 54x17 mm',
    type: 'accessory',
    useCase: 'accessory',
    layout: 'compact_cut_price',
    fields: ['productName', 'sku', 'barcode', 'price'],
    priceOptions: ['normal', 'transfer', 'both', 'none'],
    page: { widthMm: 54, heightMm: 17 },
    label: { widthMm: 54, heightMm: 17, paddingMm: 1.4 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
  BROTHER_DK2205_SHIPPING: {
    key: 'BROTHER_DK2205_SHIPPING',
    id: 'BROTHER_DK2205_SHIPPING',
    name: 'Etiqueta envio DK-2205 62 mm continuo',
    type: 'shipping',
    useCase: 'shipping',
    layout: 'shipping',
    continuous: true,
    fields: ['order', 'recipient', 'address', 'carrier', 'tracking', 'barcode'],
    priceOptions: ['none'],
    page: { widthMm: 62, heightMm: 90 },
    label: { widthMm: 62, heightMm: 90, paddingMm: 3 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
  A4_50x25: {
    key: 'A4_50x25',
    id: 'A4_50x25',
    name: 'A4 50x25 mm',
    type: 'generic',
    useCase: 'generic',
    layout: 'legacy',
    fields: ['storeName', 'productName', 'variantName', 'sku', 'barcode', 'price'],
    priceOptions: ['normal', 'transfer', 'both', 'none'],
    page: { widthMm: 210, heightMm: 297 },
    label: { widthMm: 50, heightMm: 25, paddingMm: 2 },
    margins: { topMm: 10, rightMm: 5, bottomMm: 10, leftMm: 5 },
    grid: { columns: 4, rows: 10, columnSpacingMm: 2, rowSpacingMm: 2 },
  },
  A4_40x30: {
    key: 'A4_40x30',
    id: 'A4_40x30',
    name: 'A4 40x30 mm',
    type: 'generic',
    useCase: 'generic',
    layout: 'legacy',
    fields: ['storeName', 'productName', 'variantName', 'sku', 'barcode', 'price'],
    priceOptions: ['normal', 'transfer', 'both', 'none'],
    page: { widthMm: 210, heightMm: 297 },
    label: { widthMm: 40, heightMm: 30, paddingMm: 2 },
    margins: { topMm: 10, rightMm: 5, bottomMm: 10, leftMm: 5 },
    grid: { columns: 5, rows: 8, columnSpacingMm: 2, rowSpacingMm: 3 },
  },
  THERMAL_58: {
    key: 'THERMAL_58',
    id: 'THERMAL_58',
    name: 'Termica 58 mm',
    type: 'generic',
    useCase: 'generic',
    layout: 'legacy',
    fields: ['storeName', 'productName', 'variantName', 'sku', 'barcode', 'price'],
    priceOptions: ['normal', 'transfer', 'both', 'none'],
    page: { widthMm: 58, heightMm: 40 },
    label: { widthMm: 58, heightMm: 40, paddingMm: 3 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
  THERMAL_80: {
    key: 'THERMAL_80',
    id: 'THERMAL_80',
    name: 'Termica 80 mm',
    type: 'generic',
    useCase: 'generic',
    layout: 'legacy',
    fields: ['storeName', 'productName', 'variantName', 'sku', 'barcode', 'price'],
    priceOptions: ['normal', 'transfer', 'both', 'none'],
    page: { widthMm: 80, heightMm: 45 },
    label: { widthMm: 80, heightMm: 45, paddingMm: 4 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
};

export function getLabelTemplate(key: string) {
  return LABEL_TEMPLATES[key as LabelTemplateKey] ?? null;
}
