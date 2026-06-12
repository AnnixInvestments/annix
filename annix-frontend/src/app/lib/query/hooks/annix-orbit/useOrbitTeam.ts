import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixOrbitApiClient, type OrbitTeamList } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitTeam() {
  return useQuery<OrbitTeamList>({
    queryKey: annixOrbitKeys.team.list(),
    queryFn: () => annixOrbitApiClient.team(),
    staleTime: 60 * 1000,
  });
}

export function useOrbitCreateTeamInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { email: string; recruiterRole: string }) =>
      annixOrbitApiClient.createTeamInvite(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.team.all });
    },
  });
}

export function useOrbitUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: number; recruiterRole: string }) =>
      annixOrbitApiClient.updateMemberRole(vars.userId, vars.recruiterRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.team.all });
    },
  });
}

export function useOrbitRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => annixOrbitApiClient.removeTeamMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.team.all });
    },
  });
}

export function useOrbitCancelTeamInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.cancelTeamInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.team.all });
    },
  });
}
