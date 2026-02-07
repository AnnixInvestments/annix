import { useQuery } from "@tanstack/react-query";
import {
  type AdminRfqListItem,
  type AdminRfqListResponse,
  type AdminRfqQueryDto,
  adminApiClient,
  type RfqFullDraftResponse,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useAdminRfqs(params?: AdminRfqQueryDto) {
  return useQuery<AdminRfqListResponse>({
    queryKey: adminKeys.rfqs.list(params),
    queryFn: () => adminApiClient.listRfqs(params),
  });
}

interface AdminRfqDetailData {
  rfq: AdminRfqListItem;
  fullDraft: RfqFullDraftResponse;
}

export function useAdminRfqDetail(id: number) {
  return useQuery<AdminRfqDetailData>({
    queryKey: adminKeys.rfqs.detail(id),
    queryFn: async () => {
      const [rfq, fullDraft] = await Promise.all([
        adminApiClient.getRfqDetail(id),
        adminApiClient.getRfqFullDraft(id),
      ]);
      return { rfq, fullDraft };
    },
    enabled: id > 0,
  });
}
