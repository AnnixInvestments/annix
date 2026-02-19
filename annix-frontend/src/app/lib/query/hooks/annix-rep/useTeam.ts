import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateInvitationDto,
  type CreateOrganizationDto,
  type CreateTerritoryDto,
  type TeamRole,
  teamApi,
  type UpdateOrganizationDto,
  type UpdateTerritoryDto,
} from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useOrganization() {
  return useQuery({
    queryKey: annixRepKeys.organization.current(),
    queryFn: () => teamApi.organization.current(),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateOrganizationDto) => teamApi.organization.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.organization.all });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateOrganizationDto }) =>
      teamApi.organization.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.organization.all });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamApi.organization.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.organization.all });
    },
  });
}

export function useOrganizationStats(id: number) {
  return useQuery({
    queryKey: annixRepKeys.organization.stats(id),
    queryFn: () => teamApi.organization.stats(id),
    enabled: id > 0,
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: annixRepKeys.team.members(),
    queryFn: () => teamApi.members.list(),
  });
}

export function useTeamMember(id: number) {
  return useQuery({
    queryKey: annixRepKeys.team.member(id),
    queryFn: () => teamApi.members.detail(id),
    enabled: id > 0,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: TeamRole }) =>
      teamApi.members.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.members() });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamApi.members.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.members() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.hierarchy() });
    },
  });
}

export function useSetReportsTo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reportsToId }: { id: number; reportsToId: number | null }) =>
      teamApi.members.setReportsTo(id, reportsToId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.members() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.hierarchy() });
    },
  });
}

export function useTeamHierarchy() {
  return useQuery({
    queryKey: annixRepKeys.team.hierarchy(),
    queryFn: () => teamApi.members.hierarchy(),
  });
}

export function useMyTeam() {
  return useQuery({
    queryKey: annixRepKeys.team.myTeam(),
    queryFn: () => teamApi.members.myTeam(),
  });
}

export function useTeamInvitations() {
  return useQuery({
    queryKey: annixRepKeys.invitations.list(),
    queryFn: () => teamApi.invitations.list(),
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateInvitationDto) => teamApi.invitations.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.invitations.list() });
    },
  });
}

export function useValidateInvitation(token: string) {
  return useQuery({
    queryKey: annixRepKeys.invitations.validate(token),
    queryFn: () => teamApi.invitations.validate(token),
    enabled: Boolean(token),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => teamApi.invitations.accept(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.organization.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.members() });
    },
  });
}

export function useDeclineInvitation() {
  return useMutation({
    mutationFn: (token: string) => teamApi.invitations.decline(token),
  });
}

export function useCancelTeamInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamApi.invitations.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.invitations.list() });
    },
  });
}

export function useResendTeamInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamApi.invitations.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.invitations.list() });
    },
  });
}

export function useTerritories() {
  return useQuery({
    queryKey: annixRepKeys.territories.list(),
    queryFn: () => teamApi.territories.list(),
  });
}

export function useMyTerritories() {
  return useQuery({
    queryKey: annixRepKeys.territories.my(),
    queryFn: () => teamApi.territories.my(),
  });
}

export function useTerritory(id: number) {
  return useQuery({
    queryKey: annixRepKeys.territories.detail(id),
    queryFn: () => teamApi.territories.detail(id),
    enabled: id > 0,
  });
}

export function useCreateTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateTerritoryDto) => teamApi.territories.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.territories.all });
    },
  });
}

export function useUpdateTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateTerritoryDto }) =>
      teamApi.territories.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.territories.list() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.territories.detail(id) });
    },
  });
}

export function useDeleteTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamApi.territories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.territories.all });
    },
  });
}

export function useAssignTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) =>
      teamApi.territories.assign(id, userId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.territories.list() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.territories.detail(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.team.members() });
    },
  });
}

export function useTerritoryProspects(id: number) {
  return useQuery({
    queryKey: annixRepKeys.territories.prospects(id),
    queryFn: () => teamApi.territories.prospects(id),
    enabled: id > 0,
  });
}

export function useProspectHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      prospectId,
      toUserId,
      reason,
    }: {
      prospectId: number;
      toUserId: number;
      reason?: string;
    }) => teamApi.handoff.handoff(prospectId, toUserId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.teamActivity.feed() });
    },
  });
}

export function useBulkHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      prospectIds,
      toUserId,
      reason,
    }: {
      prospectIds: number[];
      toUserId: number;
      reason?: string;
    }) => teamApi.handoff.bulkHandoff(prospectIds, toUserId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.teamActivity.feed() });
    },
  });
}

export function useHandoffHistory(prospectId: number) {
  return useQuery({
    queryKey: annixRepKeys.handoff.history(prospectId),
    queryFn: () => teamApi.handoff.history(prospectId),
    enabled: prospectId > 0,
  });
}

export function useTeamActivityFeed(limit?: number) {
  return useQuery({
    queryKey: annixRepKeys.teamActivity.feed(limit),
    queryFn: () => teamApi.activity.feed(limit),
  });
}

export function useMyTeamActivityFeed(limit?: number) {
  return useQuery({
    queryKey: annixRepKeys.teamActivity.myTeamFeed(limit),
    queryFn: () => teamApi.activity.myTeamFeed(limit),
  });
}

export function useUserActivity(userId: number, limit?: number) {
  return useQuery({
    queryKey: annixRepKeys.teamActivity.userActivity(userId, limit),
    queryFn: () => teamApi.activity.userActivity(userId, limit),
    enabled: userId > 0,
  });
}

export function useManagerDashboard() {
  return useQuery({
    queryKey: annixRepKeys.managerDashboard.data(),
    queryFn: () => teamApi.manager.dashboard(),
  });
}

export function useTeamPerformance(period?: string) {
  return useQuery({
    queryKey: annixRepKeys.managerDashboard.teamPerformance(period),
    queryFn: () => teamApi.manager.teamPerformance(period),
  });
}

export function useTerritoryPerformance() {
  return useQuery({
    queryKey: annixRepKeys.managerDashboard.territoryPerformance(),
    queryFn: () => teamApi.manager.territoryPerformance(),
  });
}

export function usePipelineByRep() {
  return useQuery({
    queryKey: annixRepKeys.managerDashboard.pipelineByRep(),
    queryFn: () => teamApi.manager.pipelineByRep(),
  });
}

type LeaderboardMetric =
  | "deals_won"
  | "pipeline_value"
  | "meetings_completed"
  | "prospects_created";

export function useLeaderboard(metric?: LeaderboardMetric) {
  return useQuery({
    queryKey: annixRepKeys.managerDashboard.leaderboard(metric),
    queryFn: () => teamApi.manager.leaderboard(metric),
  });
}
