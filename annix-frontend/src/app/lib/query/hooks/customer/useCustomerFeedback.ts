import { useMutation } from "@tanstack/react-query";
import {
  customerFeedbackApi,
  type FeedbackAuthContext,
  type SubmitFeedbackDto,
  type SubmitFeedbackResponse,
  submitFeedbackWithAttachments,
} from "@/app/lib/api/feedbackApi";

export function useSubmitFeedback() {
  return useMutation<SubmitFeedbackResponse, Error, SubmitFeedbackDto>({
    mutationFn: (dto: SubmitFeedbackDto) => customerFeedbackApi.submitFeedback(dto),
  });
}

interface GeneralFeedbackVars {
  dto: SubmitFeedbackDto & { appContext?: string };
  files: File[];
  authContext: FeedbackAuthContext;
}

export function useSubmitGeneralFeedback() {
  return useMutation<SubmitFeedbackResponse, Error, GeneralFeedbackVars>({
    mutationFn: (vars: GeneralFeedbackVars) =>
      submitFeedbackWithAttachments(vars.dto, vars.files, vars.authContext),
  });
}
