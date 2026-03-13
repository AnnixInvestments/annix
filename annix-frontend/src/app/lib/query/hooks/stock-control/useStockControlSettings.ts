import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyRole, StockControlTeamMember } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useCompanyRoles() {
  return useQuery<CompanyRole[]>({
    queryKey: stockControlKeys.settings.companyRoles(),
    queryFn: async () => {
      const data = await stockControlApiClient.companyRoles();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSettingsTeamMembers() {
  return useQuery<StockControlTeamMember[]>({
    queryKey: stockControlKeys.settings.teamMembers(),
    queryFn: async () => {
      const data = await stockControlApiClient.teamMembers();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useInvalidateCompanyRoles() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.companyRoles() });
}

export function useInvalidateSettingsTeamMembers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.teamMembers() });
}
