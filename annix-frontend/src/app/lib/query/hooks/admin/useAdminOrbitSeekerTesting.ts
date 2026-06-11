import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient } from "@/app/lib/api/adminApi";
import type {
  CreateSeekerTestingIssueInput,
  CreateSeekerTestPhaseInput,
  SeekerErrorsLatency,
  SeekerProgressRow,
  SeekerReadinessReport,
  SeekerTestingIssue,
  SeekerTestingOverview,
  SeekerTestPhase,
  UpdateSeekerTestingIssueInput,
  UpdateSeekerTestPhaseInput,
} from "@/app/lib/api/seeker-testing.types";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitSeekerTestingPhases() {
  return useQuery<SeekerTestPhase[]>({
    queryKey: adminKeys.orbitSeekerTesting.phases(),
    queryFn: () => adminApiClient.orbitSeekerTestingPhases(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminOrbitSeekerTestingOverview() {
  return useQuery<SeekerTestingOverview>({
    queryKey: adminKeys.orbitSeekerTesting.overview(),
    queryFn: () => adminApiClient.orbitSeekerTestingOverview(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminOrbitSeekerTestingErrorsLatency() {
  return useQuery<SeekerErrorsLatency>({
    queryKey: adminKeys.orbitSeekerTesting.errorsLatency(),
    queryFn: () => adminApiClient.orbitSeekerTestingErrorsLatency(),
    staleTime: 60 * 1000,
  });
}

export function useAdminOrbitSeekerTestingUsers() {
  return useQuery<SeekerProgressRow[]>({
    queryKey: adminKeys.orbitSeekerTesting.users(),
    queryFn: () => adminApiClient.orbitSeekerTestingUsers(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminOrbitSeekerTestingReadiness() {
  return useQuery<SeekerReadinessReport>({
    queryKey: adminKeys.orbitSeekerTesting.readiness(),
    queryFn: () => adminApiClient.orbitSeekerTestingReadiness(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminOrbitSeekerTestingIssues() {
  return useQuery<SeekerTestingIssue[]>({
    queryKey: adminKeys.orbitSeekerTesting.issues(),
    queryFn: () => adminApiClient.orbitSeekerTestingIssues(),
    staleTime: 60 * 1000,
  });
}

export function useAdminCreateSeekerTestingPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSeekerTestPhaseInput) =>
      adminApiClient.createOrbitSeekerTestingPhase(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitSeekerTesting.all });
    },
  });
}

export function useAdminUpdateSeekerTestingPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSeekerTestPhaseInput }) =>
      adminApiClient.updateOrbitSeekerTestingPhase(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitSeekerTesting.all });
    },
  });
}

export function useAdminCreateSeekerTestingIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSeekerTestingIssueInput) =>
      adminApiClient.createOrbitSeekerTestingIssue(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitSeekerTesting.all });
    },
  });
}

export function useAdminUpdateSeekerTestingIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSeekerTestingIssueInput }) =>
      adminApiClient.updateOrbitSeekerTestingIssue(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitSeekerTesting.all });
    },
  });
}

export function useAdminRecalculateSeekerReadiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApiClient.recalculateOrbitSeekerTestingReadiness(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitSeekerTesting.all });
    },
  });
}
