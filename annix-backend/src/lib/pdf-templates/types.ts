import type PDFDocument from "pdfkit";

export type PdfDoc = InstanceType<typeof PDFDocument>;

export interface HeaderOptions {
  logoBuf?: Buffer | null;
  title: string;
  subtitle?: string | null;
  brandColor?: string;
  x?: number;
  y?: number;
  width?: number;
  logoHeight?: number;
  rightImage?: { buffer: Buffer; width: number; height: number; caption?: string } | null;
}

export interface FooterOptions {
  companyName: string;
  brandColor?: string;
  extraCenterText?: string | null;
  marginX?: number;
  pageWidth?: number;
  pageHeight?: number;
  showBrandBar?: boolean;
}

export interface TableColumn<Row> {
  key: string;
  header: string;
  width: number;
  align?: "left" | "center" | "right";
  format?: (row: Row, index: number) => string;
}

export interface TableOptions<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  startX: number;
  startY: number;
  headerBg?: string;
  headerColor?: string;
  rowHeight?: number;
  headerHeight?: number;
  fontSize?: number;
  stripeBg?: string;
  borderColor?: string;
  onOverflow?: (currentY: number) => number | null;
}

export interface SignatureParty {
  label: string;
  name?: string | null;
  signatureImg?: Buffer | null;
  date?: string | null;
}

export interface SignatureBlockOptions {
  parties: SignatureParty[];
  startX: number;
  startY: number;
  width: number;
  gap?: number;
  lineColor?: string;
}

export interface MetadataItem {
  label: string;
  value: string;
}

export interface MetadataBlockOptions {
  items: MetadataItem[];
  columns?: 1 | 2;
  startX: number;
  startY: number;
  width: number;
  lineHeight?: number;
  labelWidth?: number;
  fontSize?: number;
}
