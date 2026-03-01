export interface AnalyzedProductLine {
  lineNumber: number;
  title: string | null;
  type: string | null;
  compound: string | null;
  colour: string | null;
  hardness: string | null;
  grade: string | null;
  curingMethod: string | null;
  specificGravity: number | null;
  baseCostPerKg: number | null;
  confidence: number;
  rawText: string | null;
}

export interface AnalyzedProductData {
  filename: string;
  fileType: "pdf" | "excel" | "word";
  lines: AnalyzedProductLine[];
  confidence: number;
  errors: string[];
}

export interface AnalyzeProductFilesResult {
  files: AnalyzedProductData[];
  totalLines: number;
}
