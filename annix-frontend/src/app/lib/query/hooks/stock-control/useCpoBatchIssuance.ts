import type {
  CpoBatchIssuanceDto,
  CpoBatchIssuanceResult,
  CpoBatchIssueContext,
  IssuanceSession,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { createArrayQueryHook, createMutationHook, createQueryHook } from "../../factories";
import { stockControlKeys } from "../../keys/stockControlKeys";

export const useCpoBatchIssueContext = createQueryHook<CpoBatchIssueContext, [number]>(
  (cpoId) => stockControlKeys.cpoBatchIssuance.context(cpoId),
  (cpoId) => stockControlApiClient.cpoBatchIssueContext(cpoId),
  { enabled: (cpoId) => Number.isFinite(cpoId) && cpoId > 0 },
);

export const useCreateCpoBatchIssuance = createMutationHook<
  CpoBatchIssuanceResult,
  CpoBatchIssuanceDto
>(
  (dto) => stockControlApiClient.createCpoBatchIssuance(dto),
  (_data, variables) => [
    stockControlKeys.cpoBatchIssuance.context(variables.cpoId),
    stockControlKeys.issueStock.recentIssuances(),
    stockControlKeys.inventory.all,
    stockControlKeys.cpos.detail(variables.cpoId),
  ],
);

export const useIssuanceSession = createQueryHook<IssuanceSession, [number]>(
  (sessionId) => stockControlKeys.cpoBatchIssuance.session(sessionId),
  (sessionId) => stockControlApiClient.issuanceSessionById(sessionId),
  { enabled: (sessionId) => Number.isFinite(sessionId) && sessionId > 0 },
);

export const useUndoIssuanceSession = createMutationHook<IssuanceSession, number>(
  (sessionId) => stockControlApiClient.undoIssuanceSession(sessionId),
  (_data, sessionId) => [
    stockControlKeys.cpoBatchIssuance.session(sessionId),
    stockControlKeys.cpoBatchIssuance.all,
    stockControlKeys.issueStock.recentIssuances(),
    stockControlKeys.inventory.all,
  ],
);

export const useApproveIssuanceSession = createMutationHook<
  IssuanceSession,
  { sessionId: number; managerStaffId: number }
>(
  ({ sessionId, managerStaffId }) =>
    stockControlApiClient.approveIssuanceSession(sessionId, managerStaffId),
  (_data, variables) => [
    stockControlKeys.cpoBatchIssuance.session(variables.sessionId),
    stockControlKeys.cpoBatchIssuance.pendingApproval(),
  ],
);

export const useRejectIssuanceSession = createMutationHook<
  IssuanceSession,
  { sessionId: number; reason: string }
>(
  ({ sessionId, reason }) => stockControlApiClient.rejectIssuanceSession(sessionId, reason),
  (_data, variables) => [
    stockControlKeys.cpoBatchIssuance.session(variables.sessionId),
    stockControlKeys.cpoBatchIssuance.pendingApproval(),
    stockControlKeys.cpoBatchIssuance.all,
  ],
);

export const usePendingApprovalSessions = createArrayQueryHook<IssuanceSession>(
  () => stockControlKeys.cpoBatchIssuance.pendingApproval(),
  () => stockControlApiClient.pendingApprovalSessions(),
);

export const useSessionsForCpo = createArrayQueryHook<IssuanceSession, [number]>(
  (cpoId) => stockControlKeys.cpoBatchIssuance.forCpo(cpoId),
  (cpoId) => stockControlApiClient.sessionsForCpo(cpoId),
  { enabled: (cpoId) => Number.isFinite(cpoId) && cpoId > 0 },
);

export const useSessionsForJobCard = createArrayQueryHook<IssuanceSession, [number]>(
  (jobCardId) => stockControlKeys.cpoBatchIssuance.forJobCard(jobCardId),
  (jobCardId) => stockControlApiClient.sessionsForJobCard(jobCardId),
  { enabled: (jobCardId) => Number.isFinite(jobCardId) && jobCardId > 0 },
);
