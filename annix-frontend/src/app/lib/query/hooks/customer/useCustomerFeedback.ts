import { useMutation } from "@tanstack/react-query";
import {
  customerFeedbackApi,
  type SubmitFeedbackDto,
  type SubmitFeedbackResponse,
} from "@/app/lib/api/feedbackApi";

export function useSubmitFeedback() {
  return useMutation<SubmitFeedbackResponse, Error, SubmitFeedbackDto>({
    mutationFn: (dto: SubmitFeedbackDto) => customerFeedbackApi.submitFeedback(dto),
  });
}
