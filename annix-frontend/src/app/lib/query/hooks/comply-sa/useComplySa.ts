import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/app/comply-sa/lib/api";
import { createArrayQueryHook, createMutationHook, createQueryHook } from "../../factories";
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

export const useComplySaDashboard = createQueryHook(complySaKeys.compliance.dashboard, () =>
  api.dashboard(),
);

export const useComplySaRequirements = createArrayQueryHook(
  complySaKeys.compliance.requirements,
  () => api.requirements(),
);

export const useAssessCompany = createMutationHook<
  Awaited<ReturnType<typeof api.assessCompany>>,
  void
>(() => api.assessCompany(), [complySaKeys.compliance.all]);

export const useToggleChecklist = createMutationHook(
  ({ requirementId, stepIndex }: { requirementId: string; stepIndex: number }) =>
    api.toggleChecklist(requirementId, stepIndex),
  [complySaKeys.compliance.dashboard()],
);

export const useUpdateComplianceStatus = createMutationHook(
  ({ statusId, data }: { statusId: string; data: Record<string, unknown> }) =>
    api.updateStatus(statusId, data),
  [complySaKeys.compliance.all],
);

export const useComplySaDocuments = createArrayQueryHook(complySaKeys.documents.list, () =>
  api.documents(),
);

export const useDocumentsByRequirement = createArrayQueryHook<
  Awaited<ReturnType<typeof api.documentsByRequirement>>[number],
  [string]
>(
  (reqId: string) => complySaKeys.documents.byRequirement(reqId),
  (reqId: string) => api.documentsByRequirement(reqId),
  { enabled: (reqId: string) => reqId.length > 0 },
);

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, requirementId }: { file: File; requirementId?: string }) =>
      api.uploadDocument(file, requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complySaKeys.documents.all });
      queryClient.invalidateQueries({ queryKey: complySaKeys.compliance.dashboard() });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: complySaKeys.compliance.dashboard() });
      }, 8000);
    },
  });
}

export const useDeleteDocument = createMutationHook(
  (id: string) => api.deleteDocument(id),
  [complySaKeys.documents.all],
);

export type GovernmentDocumentCategory = Awaited<
  ReturnType<typeof api.governmentDocuments>
>[number];

export const useGovernmentDocuments = createArrayQueryHook(
  complySaKeys.governmentDocuments.list,
  () => api.governmentDocuments(),
  { staleTime: 1000 * 60 * 30 },
);

export const useSyncGovernmentDocuments = createMutationHook<
  Awaited<ReturnType<typeof api.syncGovernmentDocuments>>,
  void
>(() => api.syncGovernmentDocuments(), [complySaKeys.governmentDocuments.all]);

export const useComplySaNotifications = createArrayQueryHook(complySaKeys.notifications.list, () =>
  api.notifications(),
);

export const useMarkNotificationRead = createMutationHook(
  (id: string) => api.markNotificationRead(id),
  [complySaKeys.notifications.list()],
);

export const useNotificationPreferences = createQueryHook(
  complySaKeys.notifications.preferences,
  () => api.notificationPreferences(),
);

export const useUpdateNotificationPreferences = createMutationHook(
  (data: Record<string, unknown>) => api.updateNotificationPreferences(data),
  [complySaKeys.notifications.preferences()],
);

export const useRegulatoryUpdates = createArrayQueryHook<RegulatoryUpdate, [(number | undefined)?]>(
  (limit?: number) => complySaKeys.regulatory.updates(limit),
  (limit?: number) => api.regulatoryUpdates(limit),
);

export const useRegulatoryUpdatesByCategory = createArrayQueryHook<RegulatoryUpdate, [string]>(
  (category: string) => complySaKeys.regulatory.byCategory(category),
  (category: string) => api.regulatoryUpdatesByCategory(category),
  { enabled: (category: string) => category.length > 0 },
);

export const useTemplatesList = createArrayQueryHook(complySaKeys.templates.list, () =>
  api.templatesList(),
);

export const useGenerateTemplate = createMutationHook(
  ({ templateId, data }: { templateId: string; data: Record<string, string> }) =>
    api.generateTemplate(templateId, data),
);

export const useTenderChecklist = createArrayQueryHook(complySaKeys.tender.checklist, () =>
  api.tenderChecklist(),
);

export const useTenderScore = createQueryHook(complySaKeys.tender.score, () => api.tenderScore());

export const useUploadTenderDocument = createMutationHook(
  ({ file, requirementId }: { file: File; requirementId?: string }) =>
    api.uploadDocument(file, requirementId),
  [complySaKeys.tender.all],
);

export const useBbeeScorecardElements = createArrayQueryHook(
  complySaKeys.bbee.scorecardElements,
  () => api.bbeeScorecardElements(),
);

export const useBbeeCalculate = createMutationHook(
  ({ turnover, blackOwnershipPercent }: { turnover: number; blackOwnershipPercent: number }) =>
    api.bbeeCalculate(turnover, blackOwnershipPercent),
);

export const useTaxCalendar = createArrayQueryHook<TaxCalendarItem, [number]>(
  (financialYearEndMonth: number) => complySaKeys.tax.calendar(financialYearEndMonth),
  (financialYearEndMonth: number) => api.taxCalendar(financialYearEndMonth),
  { enabled: (financialYearEndMonth: number) => financialYearEndMonth > 0 },
);

export const useSetaGrantInfo = createQueryHook(complySaKeys.tax.setaGrants, () =>
  api.setaGrantInfo(),
);

export const useMinimumWageCheck = createMutationHook((hourlyRate: number) =>
  api.minimumWageCheck(hourlyRate),
);

export const useVatAssessment = createMutationHook((annualTurnover: number) =>
  api.vatAssessment(annualTurnover),
);

export const useTurnoverTaxEstimate = createMutationHook((annualTurnover: number) =>
  api.turnoverTaxEstimate(annualTurnover),
);

export const useUifCalculation = createMutationHook((monthlyRemuneration: number) =>
  api.uifCalculation(monthlyRemuneration),
);

export const useSdlAssessment = createMutationHook((annualPayroll: number) =>
  api.sdlAssessment(annualPayroll),
);

export const useAdvisorDashboard = createQueryHook(complySaKeys.advisor.dashboard, () =>
  api.advisorDashboard(),
);

export const useAdvisorClients = createArrayQueryHook(complySaKeys.advisor.clients, () =>
  api.advisorClients(),
);

export const useAdvisorCalendar = createArrayQueryHook<AdvisorCalendarEntry, [number, number]>(
  (month: number, year: number) => complySaKeys.advisor.calendar(month, year),
  (month: number, year: number) => api.advisorCalendar(month, year),
);

export const useAddAdvisorClient = createMutationHook(
  (companyId: number) => api.addAdvisorClient(companyId),
  [complySaKeys.advisor.all],
);

export const useRemoveAdvisorClient = createMutationHook(
  (companyId: number) => api.removeAdvisorClient(companyId),
  [complySaKeys.advisor.all],
);

export const useCompanyProfile = createQueryHook(complySaKeys.company.profile, () =>
  api.companyProfile(),
);

export const useUpdateCompanyProfile = createMutationHook(
  (data: Record<string, unknown>) => api.updateCompanyProfile(data),
  [complySaKeys.company.profile()],
);

export const useSubscriptionStatus = createQueryHook(complySaKeys.subscriptions.status, () =>
  api.subscriptionStatus(),
);

export const useUpgradeSubscription = createMutationHook(
  (tier: string) => api.upgradeSubscription(tier),
  [complySaKeys.subscriptions.status()],
);

export const useCancelSubscription = createMutationHook<
  Awaited<ReturnType<typeof api.cancelSubscription>>,
  void
>(() => api.cancelSubscription(), [complySaKeys.subscriptions.status()]);

export const useApiKeysList = createArrayQueryHook(complySaKeys.apiKeys.list, () =>
  api.apiKeysList(),
);

export const useGenerateApiKey = createMutationHook(
  (name: string) => api.generateApiKey(name),
  [complySaKeys.apiKeys.list()],
);

export const useRevokeApiKey = createMutationHook(
  (id: number) => api.revokeApiKey(id),
  [complySaKeys.apiKeys.list()],
);

export const useIntegrationsList = createArrayQueryHook(complySaKeys.integrations.list, () =>
  api.integrationsList(),
);

export const useAiChat = createMutationHook((question: string) => api.aiChat(question));

export const useHealthReport = createMutationHook<
  Awaited<ReturnType<typeof api.healthReport>>,
  void
>(() => api.healthReport());
