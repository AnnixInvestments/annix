import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffMember, StockControlDepartment } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useStaffMembers(params: { search?: string; active?: string }) {
  return useQuery<StaffMember[]>({
    queryKey: stockControlKeys.staff.list(params),
    queryFn: async () => {
      const data = await stockControlApiClient.staffMembers(params);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useStaffDepartments() {
  return useQuery<StockControlDepartment[]>({
    queryKey: stockControlKeys.staff.departments(),
    queryFn: async () => {
      const data = await stockControlApiClient.departments();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.staff.all });
}
