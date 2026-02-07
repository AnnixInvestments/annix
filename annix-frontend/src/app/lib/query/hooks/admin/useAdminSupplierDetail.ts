import { useQuery } from "@tanstack/react-query";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useAdminSupplierDetail(id: number) {
  return useQuery({
    queryKey: adminKeys.suppliers.detail(id),
    queryFn: () => adminApiClient.getSupplierDetail(id),
    enabled: id > 0,
  });
}
