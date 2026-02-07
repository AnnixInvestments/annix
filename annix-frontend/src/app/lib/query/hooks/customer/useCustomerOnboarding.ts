import { useQuery } from "@tanstack/react-query";
import { customerOnboardingApi, type OnboardingStatus } from "@/app/lib/api/customerApi";
import { customerKeys } from "../../keys";

export function useCustomerOnboardingStatus() {
  return useQuery<OnboardingStatus>({
    queryKey: customerKeys.onboarding.status(),
    queryFn: () => customerOnboardingApi.getStatus(),
  });
}
