export interface AnalyzedOrderLine {
  lineNumber: number;
  productName: string | null;
  productId: number | null;
  thickness: number | null;
  width: number | null;
  length: number | null;
  quantity: number | null;
  confidence: number;
  rawText: string | null;
}

export type ExtractionMethod = "ai" | "template";

export interface AnalyzedOrderData {
  filename: string;
  fileType: "pdf" | "excel" | "email";
  companyName: string | null;
  companyId: number | null;
  poNumber: string | null;
  orderDate: string | null;
  deliveryDate: string | null;
  lines: AnalyzedOrderLine[];
  confidence: number;
  errors: string[];
  emailSubject?: string | null;
  emailFrom?: string | null;
  extractionMethod: ExtractionMethod;
  templateId: number | null;
  templateName: string | null;
  formatHash: string | null;
  isNewFormat: boolean;
  isNewCustomer: boolean;
}

export interface AnalyzeOrderFilesResult {
  files: AnalyzedOrderData[];
  totalLines: number;
}

export interface CreateOrderLineFromAnalysisDto {
  productId?: number;
  thickness?: number;
  width?: number;
  length?: number;
  quantity?: number;
}

export interface CreateOrderFromAnalysisDto {
  analysis: AnalyzedOrderData;
  overrides?: {
    companyId?: number;
    poNumber?: string;
    lines?: CreateOrderLineFromAnalysisDto[];
  };
}
