import { useMutation } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";

export interface AuIndustriesEnquiry {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

async function submitEnquiry(enquiry: AuIndustriesEnquiry): Promise<void> {
  const response = await fetch(`${browserBaseUrl()}/public/au-industries/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enquiry),
  });
  if (!response.ok) {
    throw new Error("Failed to send message");
  }
}

export function useSubmitAuIndustriesEnquiry() {
  return useMutation({
    mutationFn: submitEnquiry,
  });
}
