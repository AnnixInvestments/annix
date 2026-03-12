import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/app/comply-sa/lib/api";
import { complySaKeys } from "../../keys";

export type DashboardData = Awaited<ReturnType<typeof api.dashboard>>;
export type DocumentItem = Awaited<ReturnType<typeof api.documents>>[number];
export type RequirementItem = Awaited<ReturnType<typeof api.requirements>>[number];
export type NotificationItem = Awaited<ReturnType<typeof api.notifications>>[number];
export type RegulatoryUpdate = Awaited<ReturnType<typeof api.regulatoryUpdates>>[number];
export type TemplateItem = Awaited<ReturnType<typeof api.templatesList>>[number];
export type TenderChecklistItem = Awaited<ReturnType<typeof api.tenderChecklist>>[number];
export type TenderScoreData = Awaited<ReturnType<typeof api.tenderScore>>;
export type BbeeElement = Awaited<ReturnType<typeof api.bbeeScorecardElements>>[number];
export type BbeeResult = Awaited<ReturnType<typeof api.bbeeCalculate>>;
export type TaxCalendarItem = Awaited<ReturnType<typeof api.taxCalendar>>[number];
export type SetaGrantData = Awaited<ReturnType<typeof api.setaGrantInfo>>;
export type AdvisorDashboardData = Awaited<ReturnType<typeof api.advisorDashboard>>;
export type AdvisorCalendarEntry = Awaited<ReturnType<typeof api.advisorCalendar>>[number];
export type CompanyProfile = Awaited<ReturnType<typeof api.companyProfile>>;
export type NotificationPreferences = Awaited<ReturnType<typeof api.notificationPreferences>>;
export type SubscriptionStatusData = Awaited<ReturnType<typeof api.subscriptionStatus>>;
export type ApiKeyItem = Awaited<ReturnType<typeof api.apiKeysList>>[number];
export type IntegrationItem = Awaited<ReturnType<typeof api.integrationsList>>[number];
export type AiChatResponse = Awaited<ReturnType<typeof api.aiChat>>;

export function useComplySaDashboard() {
  return useQuery({
    queryKey: complySaKeys.compliance.dashboard(),
    queryFn: () => api.dashboard(),
  });
}

export function useComplySaRequirements() {
  return useQuery({
    queryKey: complySaKeys.compliance.requirements(),
    queryFn: () => api.requirements(),
  });
}

export function useAssessCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.assessCompany(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.compliance.all });
    },
  });
}

export function useToggleChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requirementId, stepIndex }: { requirementId: string; stepIndex: number }) =>
      api.toggleChecklist(requirementId, stepIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.compliance.dashboard() });
    },
  });
}

export function useUpdateComplianceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ statusId, data }: { statusId: string; data: Record<string, unknown> }) =>
      api.updateStatus(statusId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.compliance.all });
    },
  });
}

export function useComplySaDocuments() {
  return useQuery({
    queryKey: complySaKeys.documents.list(),
    queryFn: () => api.documents(),
  });
}

export function useDocumentsByRequirement(reqId: string) {
  return useQuery({
    queryKey: complySaKeys.documents.byRequirement(reqId),
    queryFn: () => api.documentsByRequirement(reqId),
    enabled: reqId.length > 0,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, requirementId }: { file: File; requirementId?: string }) =>
      api.uploadDocument(file, requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.documents.all });
      queryClient.invalidateQueries({ queryKey: complySaKeys.compliance.dashboard() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.documents.all });
    },
  });
}

export function useComplySaNotifications() {
  return useQuery({
    queryKey: complySaKeys.notifications.list(),
    queryFn: () => api.notifications(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.notifications.list() });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: complySaKeys.notifications.preferences(),
    queryFn: () => api.notificationPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.notifications.preferences() });
    },
  });
}

export function useRegulatoryUpdates(limit?: number) {
  return useQuery({
    queryKey: complySaKeys.regulatory.updates(limit),
    queryFn: () => api.regulatoryUpdates(limit),
  });
}

export function useRegulatoryUpdatesByCategory(category: string) {
  return useQuery({
    queryKey: complySaKeys.regulatory.byCategory(category),
    queryFn: () => api.regulatoryUpdatesByCategory(category),
    enabled: category.length > 0,
  });
}

export function useTemplatesList() {
  return useQuery({
    queryKey: complySaKeys.templates.list(),
    queryFn: () => api.templatesList(),
  });
}

export function useGenerateTemplate() {
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Record<string, string> }) =>
      api.generateTemplate(templateId, data),
  });
}

export function useTenderChecklist() {
  return useQuery({
    queryKey: complySaKeys.tender.checklist(),
    queryFn: () => api.tenderChecklist(),
  });
}

export function useTenderScore() {
  return useQuery({
    queryKey: complySaKeys.tender.score(),
    queryFn: () => api.tenderScore(),
  });
}

export function useUploadTenderDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, requirementId }: { file: File; requirementId?: string }) =>
      api.uploadDocument(file, requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.tender.all });
    },
  });
}

export function useBbeeScorecardElements() {
  return useQuery({
    queryKey: complySaKeys.bbee.scorecardElements(),
    queryFn: () => api.bbeeScorecardElements(),
  });
}

export function useBbeeCalculate() {
  return useMutation({
    mutationFn: ({
      turnover,
      blackOwnershipPercent,
    }: {
      turnover: number;
      blackOwnershipPercent: number;
    }) => api.bbeeCalculate(turnover, blackOwnershipPercent),
  });
}

export function useTaxCalendar(financialYearEndMonth: number) {
  return useQuery({
    queryKey: complySaKeys.tax.calendar(financialYearEndMonth),
    queryFn: () => api.taxCalendar(financialYearEndMonth),
    enabled: financialYearEndMonth > 0,
  });
}

export function useSetaGrantInfo() {
  return useQuery({
    queryKey: complySaKeys.tax.setaGrants(),
    queryFn: () => api.setaGrantInfo(),
  });
}

export function useMinimumWageCheck() {
  return useMutation({
    mutationFn: (hourlyRate: number) => api.minimumWageCheck(hourlyRate),
  });
}

export function useVatAssessment() {
  return useMutation({
    mutationFn: (annualTurnover: number) => api.vatAssessment(annualTurnover),
  });
}

export function useTurnoverTaxEstimate() {
  return useMutation({
    mutationFn: (annualTurnover: number) => api.turnoverTaxEstimate(annualTurnover),
  });
}

export function useUifCalculation() {
  return useMutation({
    mutationFn: (monthlyRemuneration: number) => api.uifCalculation(monthlyRemuneration),
  });
}

export function useSdlAssessment() {
  return useMutation({
    mutationFn: (annualPayroll: number) => api.sdlAssessment(annualPayroll),
  });
}

export function useAdvisorDashboard() {
  return useQuery({
    queryKey: complySaKeys.advisor.dashboard(),
    queryFn: () => api.advisorDashboard(),
  });
}

export function useAdvisorClients() {
  return useQuery({
    queryKey: complySaKeys.advisor.clients(),
    queryFn: () => api.advisorClients(),
  });
}

export function useAdvisorCalendar(month: number, year: number) {
  return useQuery({
    queryKey: complySaKeys.advisor.calendar(month, year),
    queryFn: () => api.advisorCalendar(month, year),
  });
}

export function useAddAdvisorClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: number) => api.addAdvisorClient(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.advisor.all });
    },
  });
}

export function useRemoveAdvisorClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: number) => api.removeAdvisorClient(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.advisor.all });
    },
  });
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: complySaKeys.company.profile(),
    queryFn: () => api.companyProfile(),
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateCompanyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.company.profile() });
    },
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: complySaKeys.subscriptions.status(),
    queryFn: () => api.subscriptionStatus(),
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tier: string) => api.upgradeSubscription(tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.subscriptions.status() });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.subscriptions.status() });
    },
  });
}

export function useApiKeysList() {
  return useQuery({
    queryKey: complySaKeys.apiKeys.list(),
    queryFn: () => api.apiKeysList(),
  });
}

export function useGenerateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.generateApiKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.apiKeys.list() });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.apiKeys.list() });
    },
  });
}

export function useIntegrationsList() {
  return useQuery({
    queryKey: complySaKeys.integrations.list(),
    queryFn: () => api.integrationsList(),
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: (question: string) => api.aiChat(question),
  });
}

export function useHealthReport() {
  return useMutation({
    mutationFn: () => api.healthReport(),
  });
}
