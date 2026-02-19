import { useMutation, useQuery } from "@tanstack/react-query";
import {
  annixRepApi,
  type MeetingOutcomesReport,
  type MonthlySalesReport,
  type TerritoryCoverageReport,
  type WeeklyActivityReport,
} from "@/app/lib/api/annixRepApi";
import { cacheConfig } from "../../cacheConfig";
import { annixRepKeys } from "../../keys/annixRepKeys";

export function useWeeklyActivityReport(startDate: string, endDate: string) {
  return useQuery<WeeklyActivityReport>({
    queryKey: annixRepKeys.reports.weeklyActivity(startDate, endDate),
    queryFn: () => annixRepApi.reports.weeklyActivity(startDate, endDate),
    enabled: Boolean(startDate && endDate),
    ...cacheConfig.reports,
  });
}

export function useMonthlySalesReport(month: string) {
  return useQuery<MonthlySalesReport>({
    queryKey: annixRepKeys.reports.monthlySales(month),
    queryFn: () => annixRepApi.reports.monthlySales(month),
    enabled: Boolean(month),
    ...cacheConfig.reports,
  });
}

export function useTerritoryCoverageReport(startDate: string, endDate: string) {
  return useQuery<TerritoryCoverageReport>({
    queryKey: annixRepKeys.reports.territoryCoverage(startDate, endDate),
    queryFn: () => annixRepApi.reports.territoryCoverage(startDate, endDate),
    enabled: Boolean(startDate && endDate),
    ...cacheConfig.reports,
  });
}

export function useMeetingOutcomesReport(startDate: string, endDate: string) {
  return useQuery<MeetingOutcomesReport>({
    queryKey: annixRepKeys.reports.meetingOutcomes(startDate, endDate),
    queryFn: () => annixRepApi.reports.meetingOutcomes(startDate, endDate),
    enabled: Boolean(startDate && endDate),
    ...cacheConfig.reports,
  });
}

export type ReportType =
  | "weekly-activity"
  | "monthly-sales"
  | "territory-coverage"
  | "meeting-outcomes";

interface ExportPdfParams {
  reportType: ReportType;
  startDate?: string;
  endDate?: string;
  month?: string;
}

export function useExportReportPdf() {
  return useMutation<Blob, Error, ExportPdfParams>({
    mutationFn: async ({ reportType, startDate, endDate, month }) => {
      if (reportType === "weekly-activity" && startDate && endDate) {
        return annixRepApi.reports.weeklyActivityPdf(startDate, endDate);
      } else if (reportType === "monthly-sales" && month) {
        return annixRepApi.reports.monthlySalesPdf(month);
      } else if (reportType === "territory-coverage" && startDate && endDate) {
        return annixRepApi.reports.territoryCoveragePdf(startDate, endDate);
      } else if (reportType === "meeting-outcomes" && startDate && endDate) {
        return annixRepApi.reports.meetingOutcomesPdf(startDate, endDate);
      }
      throw new Error("Invalid report type or missing parameters");
    },
  });
}
