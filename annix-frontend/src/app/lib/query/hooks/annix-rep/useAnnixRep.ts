import { useQuery } from "@tanstack/react-query";
import {
  type ActivityHeatmapCell,
  type AnalyticsSummary,
  type AnnixRepDashboard,
  type AvailableSlot,
  annixRepApi,
  type BookingConfirmation,
  type BookingLink,
  type BookSlotDto,
  type BulkDeleteResponse,
  type BulkTagOperationResponse,
  type BulkUpdateStatusResponse,
  type CreateBookingLinkDto,
  type CreateCustomFieldDto,
  type CreateGoalDto,
  type CreateMeetingDto,
  type CreateProspectDto,
  type CreateRecurringMeetingDto,
  type CreateVisitDto,
  type CustomFieldDefinition,
  type DeleteRecurringMeetingDto,
  type DuplicateProspects,
  type GoalPeriod,
  type GoalProgress,
  type ImportProspectRow,
  type ImportProspectsResult,
  type Meeting,
  type MeetingsOverTime,
  type Prospect,
  type ProspectFunnel,
  type ProspectStatus,
  type PublicBookingLink,
  publicBookingApi,
  type RescheduleMeetingDto,
  type RevenuePipeline,
  type SalesGoal,
  type TopProspect,
  type UpdateBookingLinkDto,
  type UpdateCustomFieldDto,
  type UpdateGoalDto,
  type UpdateRecurringMeetingDto,
  type Visit,
  type VisitOutcome,
  type WinLossRateTrend,
} from "@/app/lib/api/annixRepApi";
import { cacheConfig } from "../../cacheConfig";
import { createArrayQueryHook, createMutationHook, createQueryHook } from "../../factories";
import { annixRepKeys } from "../../keys/annixRepKeys";

export const useAnnixRepDashboard = createQueryHook<AnnixRepDashboard>(
  annixRepKeys.dashboard.data,
  () => annixRepApi.dashboard(),
  { ...cacheConfig.dashboard },
);

export const useProspects = createArrayQueryHook<Prospect>(annixRepKeys.prospects.list, () =>
  annixRepApi.prospects.list(),
);

export const useProspectsByStatus = createArrayQueryHook<Prospect, [ProspectStatus]>(
  annixRepKeys.prospects.listByStatus,
  (status) => annixRepApi.prospects.listByStatus(status),
);

export const useProspect = createQueryHook<Prospect, [number]>(
  annixRepKeys.prospects.detail,
  (id) => annixRepApi.prospects.detail(id),
  { enabled: (id) => id > 0 },
);

export function useNearbyProspects(lat: number, lng: number, radiusKm?: number, limit?: number) {
  return useQuery<Prospect[]>({
    queryKey: annixRepKeys.prospects.nearby(lat, lng, radiusKm),
    queryFn: () => annixRepApi.prospects.nearby(lat, lng, radiusKm, limit),
    enabled: lat !== 0 && lng !== 0,
  });
}

export const useProspectStats = createQueryHook<Record<ProspectStatus, number>>(
  annixRepKeys.prospects.stats,
  () => annixRepApi.prospects.stats(),
);

export const useFollowUpsDue = createArrayQueryHook<Prospect>(
  annixRepKeys.prospects.followUps,
  () => annixRepApi.prospects.followUpsDue(),
);

export const useCreateProspect = createMutationHook<Prospect, CreateProspectDto>(
  (dto) => annixRepApi.prospects.create(dto),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useUpdateProspect = createMutationHook<
  Prospect,
  { id: number; dto: Partial<CreateProspectDto> }
>(
  ({ id, dto }) => annixRepApi.prospects.update(id, dto),
  (_data, { id }) => [annixRepKeys.prospects.detail(id), annixRepKeys.prospects.list()],
);

export const useUpdateProspectStatus = createMutationHook<
  Prospect,
  { id: number; status: ProspectStatus }
>(
  ({ id, status }) => annixRepApi.prospects.updateStatus(id, status),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useMarkContacted = createMutationHook<Prospect, number>(
  (id) => annixRepApi.prospects.markContacted(id),
  (_data, id) => [annixRepKeys.prospects.detail(id), annixRepKeys.prospects.list()],
);

export const useCompleteFollowUp = createMutationHook<Prospect, number>(
  (id) => annixRepApi.prospects.completeFollowUp(id),
  (_data, id) => [
    annixRepKeys.prospects.detail(id),
    annixRepKeys.prospects.list(),
    annixRepKeys.prospects.followUps(),
    annixRepKeys.dashboard.all,
  ],
);

export const useDeleteProspect = createMutationHook<void, number>(
  (id) => annixRepApi.prospects.delete(id),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useBulkUpdateProspectStatus = createMutationHook<
  BulkUpdateStatusResponse,
  { ids: number[]; status: ProspectStatus }
>(
  ({ ids, status }) => annixRepApi.prospects.bulkUpdateStatus(ids, status),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useBulkDeleteProspects = createMutationHook<BulkDeleteResponse, number[]>(
  (ids) => annixRepApi.prospects.bulkDelete(ids),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useProspectsCsvExport = createMutationHook<Blob, void>(() =>
  annixRepApi.prospects.exportCsv(),
);

export const useProspectDuplicates = createArrayQueryHook<DuplicateProspects>(
  annixRepKeys.prospects.duplicates,
  () => annixRepApi.prospects.duplicates(),
);

export const useImportProspects = createMutationHook<
  ImportProspectsResult,
  { rows: ImportProspectRow[]; skipInvalid?: boolean }
>(
  ({ rows, skipInvalid }) => annixRepApi.prospects.import(rows, skipInvalid),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useMergeProspects = createMutationHook<
  Prospect,
  { primaryId: number; mergeIds: number[]; fieldOverrides?: Partial<CreateProspectDto> }
>(
  (dto) => annixRepApi.prospects.merge(dto),
  [annixRepKeys.prospects.all, annixRepKeys.dashboard.all],
);

export const useBulkTagOperation = createMutationHook<
  BulkTagOperationResponse,
  { ids: number[]; tags: string[]; operation: "add" | "remove" }
>((dto) => annixRepApi.prospects.bulkTagOperation(dto), [annixRepKeys.prospects.all]);

export const useBulkAssignProspects = createMutationHook<
  { updated: number; updatedIds: number[] },
  { ids: number[]; assignedToId: number | null }
>(
  ({ ids, assignedToId }) => annixRepApi.prospects.bulkAssign(ids, assignedToId),
  [annixRepKeys.prospects.all],
);

export const useRecalculateProspectScores = createMutationHook<{ updated: number }, void>(
  () => annixRepApi.prospects.recalculateScores(),
  [annixRepKeys.prospects.all],
);

export const useProspectActivities = createQueryHook(
  (id: number, limit?: number) => annixRepKeys.prospects.activities(id, limit),
  (id: number, limit?: number) => annixRepApi.prospects.activities(id, limit),
  { enabled: (id: number) => id > 0 },
);

export const useCustomFields = createQueryHook(
  (includeInactive: boolean) => annixRepKeys.customFields.list(includeInactive),
  (includeInactive: boolean) => annixRepApi.customFields.list(includeInactive),
  { ...cacheConfig.static },
);

export const useCustomField = createQueryHook(
  (id: number) => annixRepKeys.customFields.detail(id),
  (id: number) => annixRepApi.customFields.detail(id),
  { enabled: (id: number) => id > 0, ...cacheConfig.static },
);

export const useCreateCustomField = createMutationHook<unknown, CreateCustomFieldDto>(
  (dto) => annixRepApi.customFields.create(dto),
  [annixRepKeys.customFields.all],
);

export const useUpdateCustomField = createMutationHook<
  unknown,
  { id: number; dto: UpdateCustomFieldDto }
>(
  ({ id, dto }) => annixRepApi.customFields.update(id, dto),
  (_data, { id }) => [annixRepKeys.customFields.detail(id), annixRepKeys.customFields.list()],
);

export const useDeleteCustomField = createMutationHook<void, number>(
  (id) => annixRepApi.customFields.delete(id),
  [annixRepKeys.customFields.all],
);

export const useReorderCustomFields = createMutationHook<CustomFieldDefinition[], number[]>(
  (orderedIds) => annixRepApi.customFields.reorder(orderedIds),
  [annixRepKeys.customFields.all],
);

export const useMeetings = createArrayQueryHook<Meeting>(annixRepKeys.meetings.list, () =>
  annixRepApi.meetings.list(),
);

export const useTodaysMeetings = createArrayQueryHook<Meeting>(
  annixRepKeys.meetings.today,
  () => annixRepApi.meetings.today(),
  { ...cacheConfig.timeSensitive },
);

export const useUpcomingMeetings = createArrayQueryHook<Meeting, [number | undefined]>(
  annixRepKeys.meetings.upcoming,
  (days) => annixRepApi.meetings.upcoming(days),
);

export const useMeeting = createQueryHook<Meeting, [number]>(
  annixRepKeys.meetings.detail,
  (id) => annixRepApi.meetings.detail(id),
  { enabled: (id) => id > 0 },
);

export const useCreateMeeting = createMutationHook<Meeting, CreateMeetingDto>(
  (dto) => annixRepApi.meetings.create(dto),
  [annixRepKeys.meetings.all, annixRepKeys.dashboard.all],
);

export const useStartMeeting = createMutationHook<Meeting, number>(
  (id) => annixRepApi.meetings.start(id),
  (_data, id) => [annixRepKeys.meetings.detail(id), annixRepKeys.meetings.all],
);

export const useEndMeeting = createMutationHook<
  Meeting,
  { id: number; notes?: string; outcomes?: string }
>(
  ({ id, notes, outcomes }) => annixRepApi.meetings.end(id, notes, outcomes),
  (_data, { id }) => [
    annixRepKeys.meetings.detail(id),
    annixRepKeys.meetings.all,
    annixRepKeys.dashboard.all,
  ],
);

export const useCancelMeeting = createMutationHook<Meeting, number>(
  (id) => annixRepApi.meetings.cancel(id),
  [annixRepKeys.meetings.all, annixRepKeys.dashboard.all],
);

export const useRescheduleMeeting = createMutationHook<
  Meeting,
  { id: number; dto: RescheduleMeetingDto }
>(
  ({ id, dto }) => annixRepApi.meetings.reschedule(id, dto),
  [annixRepKeys.meetings.all, annixRepKeys.dashboard.all],
);

export const useCreateRecurringMeeting = createMutationHook<Meeting, CreateRecurringMeetingDto>(
  (dto) => annixRepApi.meetings.createRecurring(dto),
  [annixRepKeys.meetings.all, annixRepKeys.dashboard.all],
);

export const useExpandedRecurringMeetings = createArrayQueryHook<Meeting, [string, string]>(
  annixRepKeys.meetings.expandedRecurring,
  (startDate, endDate) => annixRepApi.meetings.expandedRecurring(startDate, endDate),
  { enabled: (startDate, endDate) => !!startDate && !!endDate },
);

export const useSeriesInstances = createArrayQueryHook<Meeting, [number]>(
  annixRepKeys.meetings.seriesInstances,
  (parentId) => annixRepApi.meetings.seriesInstances(parentId),
  { enabled: (parentId) => parentId > 0 },
);

export const useUpdateRecurringMeeting = createMutationHook<
  Meeting,
  { id: number; dto: UpdateRecurringMeetingDto }
>(
  ({ id, dto }) => annixRepApi.meetings.updateRecurring(id, dto),
  [annixRepKeys.meetings.all, annixRepKeys.dashboard.all],
);

export const useDeleteRecurringMeeting = createMutationHook<
  void,
  { id: number; dto: DeleteRecurringMeetingDto }
>(
  ({ id, dto }) => annixRepApi.meetings.deleteRecurring(id, dto),
  [annixRepKeys.meetings.all, annixRepKeys.dashboard.all],
);

export const useVisits = createArrayQueryHook<Visit>(annixRepKeys.visits.list, () =>
  annixRepApi.visits.list(),
);

export const useTodaysVisits = createArrayQueryHook<Visit>(
  annixRepKeys.visits.today,
  () => annixRepApi.visits.today(),
  { ...cacheConfig.timeSensitive },
);

export const useProspectVisits = createArrayQueryHook<Visit, [number]>(
  annixRepKeys.visits.byProspect,
  (prospectId) => annixRepApi.visits.byProspect(prospectId),
  { enabled: (prospectId) => prospectId > 0 },
);

export const useCreateVisit = createMutationHook<Visit, CreateVisitDto>(
  (dto) => annixRepApi.visits.create(dto),
  [annixRepKeys.visits.all, annixRepKeys.dashboard.all],
);

export const useCheckIn = createMutationHook<
  Visit,
  { id: number; latitude: number; longitude: number }
>(
  ({ id, latitude, longitude }) => annixRepApi.visits.checkIn(id, latitude, longitude),
  [annixRepKeys.visits.all],
);

export const useCheckOut = createMutationHook<
  Visit,
  { id: number; latitude: number; longitude: number; outcome?: VisitOutcome; notes?: string }
>(
  ({ id, latitude, longitude, outcome, notes }) =>
    annixRepApi.visits.checkOut(id, latitude, longitude, outcome, notes),
  [annixRepKeys.visits.all],
);

export const useAnalyticsSummary = createQueryHook<AnalyticsSummary>(
  annixRepKeys.analytics.summary,
  () => annixRepApi.analytics.summary(),
  { ...cacheConfig.analytics },
);

export const useMeetingsOverTime = createArrayQueryHook<
  MeetingsOverTime,
  ["week" | "month" | undefined, number | undefined]
>(
  annixRepKeys.analytics.meetingsOverTime,
  (period, count) => annixRepApi.analytics.meetingsOverTime(period, count),
  { ...cacheConfig.analytics },
);

export const useProspectFunnel = createArrayQueryHook<ProspectFunnel>(
  annixRepKeys.analytics.prospectFunnel,
  () => annixRepApi.analytics.prospectFunnel(),
  { ...cacheConfig.analytics },
);

export const useWinLossRateTrends = createArrayQueryHook<WinLossRateTrend, [number | undefined]>(
  annixRepKeys.analytics.winLossRateTrends,
  (months) => annixRepApi.analytics.winLossRateTrends(months),
  { ...cacheConfig.analytics },
);

export const useActivityHeatmap = createArrayQueryHook<ActivityHeatmapCell>(
  annixRepKeys.analytics.activityHeatmap,
  () => annixRepApi.analytics.activityHeatmap(),
  { ...cacheConfig.analytics },
);

export const useRevenuePipeline = createArrayQueryHook<RevenuePipeline>(
  annixRepKeys.analytics.revenuePipeline,
  () => annixRepApi.analytics.revenuePipeline(),
  { ...cacheConfig.analytics },
);

export const useTopProspects = createArrayQueryHook<TopProspect, [number | undefined]>(
  annixRepKeys.analytics.topProspects,
  (limit) => annixRepApi.analytics.topProspects(limit),
  { ...cacheConfig.analytics },
);

export const useSalesGoals = createArrayQueryHook<SalesGoal>(
  annixRepKeys.goals.list,
  () => annixRepApi.goals.list(),
  { ...cacheConfig.goals },
);

export const useSalesGoalByPeriod = createQueryHook<SalesGoal, [GoalPeriod]>(
  annixRepKeys.goals.byPeriod,
  (period) => annixRepApi.goals.byPeriod(period),
  { ...cacheConfig.goals },
);

export const useGoalProgress = createQueryHook<GoalProgress, [GoalPeriod]>(
  annixRepKeys.goals.progress,
  (period) => annixRepApi.goals.progress(period),
  { ...cacheConfig.goals },
);

export const useCreateOrUpdateGoal = createMutationHook<SalesGoal, CreateGoalDto>(
  (dto) => annixRepApi.goals.createOrUpdate(dto),
  (_data, dto) => [annixRepKeys.goals.all, annixRepKeys.goals.progress(dto.period)],
);

export const useUpdateGoal = createMutationHook<
  SalesGoal,
  { period: GoalPeriod; dto: UpdateGoalDto }
>(
  ({ period, dto }) => annixRepApi.goals.update(period, dto),
  (_data, { period }) => [
    annixRepKeys.goals.all,
    annixRepKeys.goals.byPeriod(period),
    annixRepKeys.goals.progress(period),
  ],
);

export const useDeleteGoal = createMutationHook<void, GoalPeriod>(
  (period) => annixRepApi.goals.delete(period),
  [annixRepKeys.goals.all],
);

export const useBookingLinks = createArrayQueryHook<BookingLink>(
  annixRepKeys.bookingLinks.list,
  () => annixRepApi.bookingLinks.list(),
);

export const useBookingLink = createQueryHook<BookingLink, [number]>(
  annixRepKeys.bookingLinks.detail,
  (id) => annixRepApi.bookingLinks.detail(id),
  { enabled: (id) => id > 0 },
);

export const useCreateBookingLink = createMutationHook<BookingLink, CreateBookingLinkDto>(
  (dto) => annixRepApi.bookingLinks.create(dto),
  [annixRepKeys.bookingLinks.all],
);

export const useUpdateBookingLink = createMutationHook<
  BookingLink,
  { id: number; dto: UpdateBookingLinkDto }
>(
  ({ id, dto }) => annixRepApi.bookingLinks.update(id, dto),
  (_data, { id }) => [annixRepKeys.bookingLinks.all, annixRepKeys.bookingLinks.detail(id)],
);

export const useDeleteBookingLink = createMutationHook<void, number>(
  (id) => annixRepApi.bookingLinks.delete(id),
  [annixRepKeys.bookingLinks.all],
);

export const usePublicBookingLink = createQueryHook<PublicBookingLink, [string]>(
  annixRepKeys.publicBooking.linkDetails,
  (slug) => publicBookingApi.linkDetails(slug),
  { enabled: (slug) => !!slug },
);

export const useBookingAvailability = createArrayQueryHook<AvailableSlot, [string, string]>(
  annixRepKeys.publicBooking.availability,
  (slug, date) => publicBookingApi.availability(slug, date),
  { enabled: (slug, date) => !!slug && !!date, ...cacheConfig.timeSensitive },
);

export const useBookSlot = createMutationHook<
  BookingConfirmation,
  { slug: string; dto: BookSlotDto }
>(({ slug, dto }) => publicBookingApi.bookSlot(slug, dto));
