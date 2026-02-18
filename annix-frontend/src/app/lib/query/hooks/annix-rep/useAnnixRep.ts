import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  type BulkUpdateStatusResponse,
  type CreateBookingLinkDto,
  type CreateCustomFieldDto,
  type CreateGoalDto,
  type CreateMeetingDto,
  type CreateProspectDto,
  type CreateRecurringMeetingDto,
  type CreateVisitDto,
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
import { annixRepKeys } from "../../keys/annixRepKeys";

export function useAnnixRepDashboard() {
  return useQuery<AnnixRepDashboard>({
    queryKey: annixRepKeys.dashboard.data(),
    queryFn: () => annixRepApi.dashboard(),
  });
}

export function useProspects() {
  return useQuery<Prospect[]>({
    queryKey: annixRepKeys.prospects.list(),
    queryFn: () => annixRepApi.prospects.list(),
  });
}

export function useProspectsByStatus(status: ProspectStatus) {
  return useQuery<Prospect[]>({
    queryKey: annixRepKeys.prospects.listByStatus(status),
    queryFn: () => annixRepApi.prospects.listByStatus(status),
  });
}

export function useProspect(id: number) {
  return useQuery<Prospect>({
    queryKey: annixRepKeys.prospects.detail(id),
    queryFn: () => annixRepApi.prospects.detail(id),
    enabled: id > 0,
  });
}

export function useNearbyProspects(lat: number, lng: number, radiusKm?: number, limit?: number) {
  return useQuery<Prospect[]>({
    queryKey: annixRepKeys.prospects.nearby(lat, lng, radiusKm),
    queryFn: () => annixRepApi.prospects.nearby(lat, lng, radiusKm, limit),
    enabled: lat !== 0 && lng !== 0,
  });
}

export function useProspectStats() {
  return useQuery<Record<ProspectStatus, number>>({
    queryKey: annixRepKeys.prospects.stats(),
    queryFn: () => annixRepApi.prospects.stats(),
  });
}

export function useFollowUpsDue() {
  return useQuery<Prospect[]>({
    queryKey: annixRepKeys.prospects.followUps(),
    queryFn: () => annixRepApi.prospects.followUpsDue(),
  });
}

export function useCreateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateProspectDto) => annixRepApi.prospects.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateProspectDto> }) =>
      annixRepApi.prospects.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.list() });
    },
  });
}

export function useUpdateProspectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProspectStatus }) =>
      annixRepApi.prospects.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useMarkContacted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.prospects.markContacted(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.list() });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.prospects.completeFollowUp(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.list() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.followUps() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.prospects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useBulkUpdateProspectStatus() {
  const queryClient = useQueryClient();

  return useMutation<BulkUpdateStatusResponse, Error, { ids: number[]; status: ProspectStatus }>({
    mutationFn: ({ ids, status }) => annixRepApi.prospects.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useBulkDeleteProspects() {
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteResponse, Error, number[]>({
    mutationFn: (ids) => annixRepApi.prospects.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useProspectsCsvExport() {
  return useMutation<Blob, Error, void>({
    mutationFn: () => annixRepApi.prospects.exportCsv(),
  });
}

export function useProspectDuplicates() {
  return useQuery<DuplicateProspects[]>({
    queryKey: annixRepKeys.prospects.duplicates(),
    queryFn: () => annixRepApi.prospects.duplicates(),
  });
}

export function useImportProspects() {
  const queryClient = useQueryClient();

  return useMutation<
    ImportProspectsResult,
    Error,
    { rows: ImportProspectRow[]; skipInvalid?: boolean }
  >({
    mutationFn: ({ rows, skipInvalid }) => annixRepApi.prospects.import(rows, skipInvalid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useMergeProspects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: {
      primaryId: number;
      mergeIds: number[];
      fieldOverrides?: Partial<CreateProspectDto>;
    }) => annixRepApi.prospects.merge(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useBulkTagOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: { ids: number[]; tags: string[]; operation: "add" | "remove" }) =>
      annixRepApi.prospects.bulkTagOperation(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
    },
  });
}

export function useBulkAssignProspects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, assignedToId }: { ids: number[]; assignedToId: number | null }) =>
      annixRepApi.prospects.bulkAssign(ids, assignedToId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
    },
  });
}

export function useRecalculateProspectScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => annixRepApi.prospects.recalculateScores(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
    },
  });
}

export function useProspectActivities(id: number, limit?: number) {
  return useQuery({
    queryKey: annixRepKeys.prospects.activities(id, limit),
    queryFn: () => annixRepApi.prospects.activities(id, limit),
    enabled: id > 0,
  });
}

export function useCustomFields(includeInactive = false) {
  return useQuery({
    queryKey: annixRepKeys.customFields.list(includeInactive),
    queryFn: () => annixRepApi.customFields.list(includeInactive),
  });
}

export function useCustomField(id: number) {
  return useQuery({
    queryKey: annixRepKeys.customFields.detail(id),
    queryFn: () => annixRepApi.customFields.detail(id),
    enabled: id > 0,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCustomFieldDto) => annixRepApi.customFields.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.customFields.all });
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCustomFieldDto }) =>
      annixRepApi.customFields.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.customFields.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.customFields.list() });
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.customFields.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.customFields.all });
    },
  });
}

export function useReorderCustomFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: number[]) => annixRepApi.customFields.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.customFields.all });
    },
  });
}

export function useMeetings() {
  return useQuery<Meeting[]>({
    queryKey: annixRepKeys.meetings.list(),
    queryFn: () => annixRepApi.meetings.list(),
  });
}

export function useTodaysMeetings() {
  return useQuery<Meeting[]>({
    queryKey: annixRepKeys.meetings.today(),
    queryFn: () => annixRepApi.meetings.today(),
  });
}

export function useUpcomingMeetings(days?: number) {
  return useQuery<Meeting[]>({
    queryKey: annixRepKeys.meetings.upcoming(days),
    queryFn: () => annixRepApi.meetings.upcoming(days),
  });
}

export function useMeeting(id: number) {
  return useQuery<Meeting>({
    queryKey: annixRepKeys.meetings.detail(id),
    queryFn: () => annixRepApi.meetings.detail(id),
    enabled: id > 0,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMeetingDto) => annixRepApi.meetings.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useStartMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.meetings.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
    },
  });
}

export function useEndMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes, outcomes }: { id: number; notes?: string; outcomes?: string }) =>
      annixRepApi.meetings.end(id, notes, outcomes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.meetings.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useRescheduleMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: RescheduleMeetingDto }) =>
      annixRepApi.meetings.reschedule(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useCreateRecurringMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRecurringMeetingDto) => annixRepApi.meetings.createRecurring(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useExpandedRecurringMeetings(startDate: string, endDate: string) {
  return useQuery<Meeting[]>({
    queryKey: annixRepKeys.meetings.expandedRecurring(startDate, endDate),
    queryFn: () => annixRepApi.meetings.expandedRecurring(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useSeriesInstances(parentId: number) {
  return useQuery<Meeting[]>({
    queryKey: annixRepKeys.meetings.seriesInstances(parentId),
    queryFn: () => annixRepApi.meetings.seriesInstances(parentId),
    enabled: parentId > 0,
  });
}

export function useUpdateRecurringMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateRecurringMeetingDto }) =>
      annixRepApi.meetings.updateRecurring(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useDeleteRecurringMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: DeleteRecurringMeetingDto }) =>
      annixRepApi.meetings.deleteRecurring(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useVisits() {
  return useQuery<Visit[]>({
    queryKey: annixRepKeys.visits.list(),
    queryFn: () => annixRepApi.visits.list(),
  });
}

export function useTodaysVisits() {
  return useQuery<Visit[]>({
    queryKey: annixRepKeys.visits.today(),
    queryFn: () => annixRepApi.visits.today(),
  });
}

export function useProspectVisits(prospectId: number) {
  return useQuery<Visit[]>({
    queryKey: annixRepKeys.visits.byProspect(prospectId),
    queryFn: () => annixRepApi.visits.byProspect(prospectId),
    enabled: prospectId > 0,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateVisitDto) => annixRepApi.visits.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.visits.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      latitude,
      longitude,
    }: {
      id: number;
      latitude: number;
      longitude: number;
    }) => annixRepApi.visits.checkIn(id, latitude, longitude),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.visits.all });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      latitude,
      longitude,
      outcome,
      notes,
    }: {
      id: number;
      latitude: number;
      longitude: number;
      outcome?: VisitOutcome;
      notes?: string;
    }) => annixRepApi.visits.checkOut(id, latitude, longitude, outcome, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.visits.all });
    },
  });
}

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: annixRepKeys.analytics.summary(),
    queryFn: () => annixRepApi.analytics.summary(),
  });
}

export function useMeetingsOverTime(period?: "week" | "month", count?: number) {
  return useQuery<MeetingsOverTime[]>({
    queryKey: annixRepKeys.analytics.meetingsOverTime(period, count),
    queryFn: () => annixRepApi.analytics.meetingsOverTime(period, count),
  });
}

export function useProspectFunnel() {
  return useQuery<ProspectFunnel[]>({
    queryKey: annixRepKeys.analytics.prospectFunnel(),
    queryFn: () => annixRepApi.analytics.prospectFunnel(),
  });
}

export function useWinLossRateTrends(months?: number) {
  return useQuery<WinLossRateTrend[]>({
    queryKey: annixRepKeys.analytics.winLossRateTrends(months),
    queryFn: () => annixRepApi.analytics.winLossRateTrends(months),
  });
}

export function useActivityHeatmap() {
  return useQuery<ActivityHeatmapCell[]>({
    queryKey: annixRepKeys.analytics.activityHeatmap(),
    queryFn: () => annixRepApi.analytics.activityHeatmap(),
  });
}

export function useRevenuePipeline() {
  return useQuery<RevenuePipeline[]>({
    queryKey: annixRepKeys.analytics.revenuePipeline(),
    queryFn: () => annixRepApi.analytics.revenuePipeline(),
  });
}

export function useTopProspects(limit?: number) {
  return useQuery<TopProspect[]>({
    queryKey: annixRepKeys.analytics.topProspects(limit),
    queryFn: () => annixRepApi.analytics.topProspects(limit),
  });
}

export function useSalesGoals() {
  return useQuery<SalesGoal[]>({
    queryKey: annixRepKeys.goals.list(),
    queryFn: () => annixRepApi.goals.list(),
  });
}

export function useSalesGoalByPeriod(period: GoalPeriod) {
  return useQuery<SalesGoal>({
    queryKey: annixRepKeys.goals.byPeriod(period),
    queryFn: () => annixRepApi.goals.byPeriod(period),
  });
}

export function useGoalProgress(period: GoalPeriod) {
  return useQuery<GoalProgress>({
    queryKey: annixRepKeys.goals.progress(period),
    queryFn: () => annixRepApi.goals.progress(period),
  });
}

export function useCreateOrUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateGoalDto) => annixRepApi.goals.createOrUpdate(dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.goals.progress(dto.period) });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ period, dto }: { period: GoalPeriod; dto: UpdateGoalDto }) =>
      annixRepApi.goals.update(period, dto),
    onSuccess: (_, { period }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.goals.byPeriod(period) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.goals.progress(period) });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (period: GoalPeriod) => annixRepApi.goals.delete(period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.goals.all });
    },
  });
}

export function useBookingLinks() {
  return useQuery<BookingLink[]>({
    queryKey: annixRepKeys.bookingLinks.list(),
    queryFn: () => annixRepApi.bookingLinks.list(),
  });
}

export function useBookingLink(id: number) {
  return useQuery<BookingLink>({
    queryKey: annixRepKeys.bookingLinks.detail(id),
    queryFn: () => annixRepApi.bookingLinks.detail(id),
    enabled: id > 0,
  });
}

export function useCreateBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBookingLinkDto) => annixRepApi.bookingLinks.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.bookingLinks.all });
    },
  });
}

export function useUpdateBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateBookingLinkDto }) =>
      annixRepApi.bookingLinks.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.bookingLinks.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.bookingLinks.detail(id) });
    },
  });
}

export function useDeleteBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.bookingLinks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.bookingLinks.all });
    },
  });
}

export function usePublicBookingLink(slug: string) {
  return useQuery<PublicBookingLink>({
    queryKey: annixRepKeys.publicBooking.linkDetails(slug),
    queryFn: () => publicBookingApi.linkDetails(slug),
    enabled: !!slug,
  });
}

export function useBookingAvailability(slug: string, date: string) {
  return useQuery<AvailableSlot[]>({
    queryKey: annixRepKeys.publicBooking.availability(slug, date),
    queryFn: () => publicBookingApi.availability(slug, date),
    enabled: !!slug && !!date,
  });
}

export function useBookSlot() {
  return useMutation<BookingConfirmation, Error, { slug: string; dto: BookSlotDto }>({
    mutationFn: ({ slug, dto }) => publicBookingApi.bookSlot(slug, dto),
  });
}
