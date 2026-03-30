export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilter {
  dateRange?: ReportDateRange;
  companyId: number;
  moduleCode: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "currency" | "percentage";
  sortable?: boolean;
}

export interface ReportDefinition {
  code: string;
  name: string;
  description: string;
  moduleCode: string;
  columns: ReportColumn[];
  supportsCsv: boolean;
  supportsPdf: boolean;
}

export interface ReportRow {
  [key: string]: string | number | Date | boolean | null;
}

export interface ReportResult {
  definition: ReportDefinition;
  rows: ReportRow[];
  totals?: Record<string, number>;
  generatedAt: string;
}

export interface IReportProvider {
  reportDefinitions(): ReportDefinition[];
  generate(reportCode: string, filter: ReportFilter): Promise<ReportResult>;
}

export const REPORT_PROVIDER = "REPORT_PROVIDER";
