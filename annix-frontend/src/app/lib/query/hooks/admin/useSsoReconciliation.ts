import { useQuery } from "@tanstack/react-query";
import { adminApiClient, type IdentityReconciliationReport } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useSsoIdentityReconciliation() {
  return useQuery<IdentityReconciliationReport>({
    queryKey: adminKeys.sso.identityReconciliation(),
    queryFn: () => adminApiClient.ssoIdentityReconciliation(),
  });
}
