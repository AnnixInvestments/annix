import { useQuery } from "@tanstack/react-query";
import { type AdminAttention, adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

/** Per-app counts of items needing admin action (Global Apps badges + dashboard panel). */
export function useAdminAttention() {
  return useQuery<AdminAttention>({
    queryKey: adminKeys.dashboard.attention(),
    queryFn: () => adminApiClient.getAttention(),
  });
}
