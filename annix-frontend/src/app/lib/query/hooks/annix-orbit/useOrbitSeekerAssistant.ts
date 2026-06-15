import { useMutation } from "@tanstack/react-query";
import { annixOrbitApiClient, type SeekerAssistantChatPayload } from "@/app/lib/api/annixOrbitApi";

export function useOrbitSeekerAssistantChat() {
  return useMutation({
    mutationFn: (payload: SeekerAssistantChatPayload) =>
      annixOrbitApiClient.seekerAssistantChat(payload),
  });
}
