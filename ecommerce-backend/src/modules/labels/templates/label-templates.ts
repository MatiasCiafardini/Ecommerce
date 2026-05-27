export type LabelTemplateKey = 'A4_50x25' | 'A4_40x30' | 'THERMAL_58' | 'THERMAL_80';

export type LabelTemplate = {
  key: LabelTemplateKey;
  name: string;
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
  A4_50x25: {
    key: 'A4_50x25',
    name: 'A4 50x25 mm',
    page: { widthMm: 210, heightMm: 297 },
    label: { widthMm: 50, heightMm: 25, paddingMm: 2 },
    margins: { topMm: 10, rightMm: 5, bottomMm: 10, leftMm: 5 },
    grid: { columns: 4, rows: 10, columnSpacingMm: 2, rowSpacingMm: 2 },
  },
  A4_40x30: {
    key: 'A4_40x30',
    name: 'A4 40x30 mm',
    page: { widthMm: 210, heightMm: 297 },
    label: { widthMm: 40, heightMm: 30, paddingMm: 2 },
    margins: { topMm: 10, rightMm: 5, bottomMm: 10, leftMm: 5 },
    grid: { columns: 5, rows: 8, columnSpacingMm: 2, rowSpacingMm: 3 },
  },
  THERMAL_58: {
    key: 'THERMAL_58',
    name: 'Termica 58 mm',
    page: { widthMm: 58, heightMm: 40 },
    label: { widthMm: 58, heightMm: 40, paddingMm: 3 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
  THERMAL_80: {
    key: 'THERMAL_80',
    name: 'Termica 80 mm',
    page: { widthMm: 80, heightMm: 45 },
    label: { widthMm: 80, heightMm: 45, paddingMm: 4 },
    margins: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
    grid: { columns: 1, rows: 1, columnSpacingMm: 0, rowSpacingMm: 0 },
  },
};

export function getLabelTemplate(key: string) {
  return LABEL_TEMPLATES[key as LabelTemplateKey] ?? null;
}
