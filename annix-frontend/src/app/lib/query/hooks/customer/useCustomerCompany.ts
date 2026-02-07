import { useQuery } from "@tanstack/react-query";
import { type CustomerCompanyDto, customerPortalApi } from "@/app/lib/api/customerApi";
import { customerKeys } from "../../keys";

export function useCustomerCompany() {
  return useQuery<CustomerCompanyDto>({
    queryKey: customerKeys.company.data(),
    queryFn: () => customerPortalApi.getCompany(),
  });
}
