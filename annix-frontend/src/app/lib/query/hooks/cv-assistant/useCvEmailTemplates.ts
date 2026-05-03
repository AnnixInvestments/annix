"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CvEmailTemplate,
  type CvEmailTemplateKind,
  cvAssistantApiClient,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvEmailTemplates() {
  return useQuery<CvEmailTemplate[]>({
    queryKey: cvAssistantKeys.emailTemplates.all,
    queryFn: () => cvAssistantApiClient.listEmailTemplates(),
    staleTime: 60_000,
  });
}

export function useCvEmailTemplate(kind: CvEmailTemplateKind) {
  return useQuery<CvEmailTemplate>({
    queryKey: cvAssistantKeys.emailTemplates.detail(kind),
    queryFn: () => cvAssistantApiClient.getEmailTemplate(kind),
    staleTime: 60_000,
  });
}

export function useCvUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation<
    CvEmailTemplate,
    Error,
    { kind: CvEmailTemplateKind; subject: string; bodyHtml: string; bodyText: string }
  >({
    mutationFn: ({ kind, subject, bodyHtml, bodyText }) =>
      cvAssistantApiClient.updateEmailTemplate(kind, { subject, bodyHtml, bodyText }),
    onSuccess: (data) => {
      queryClient.setQueryData(cvAssistantKeys.emailTemplates.detail(data.kind), data);
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.emailTemplates.all });
    },
  });
}

export function useCvResetEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation<CvEmailTemplate, Error, CvEmailTemplateKind>({
    mutationFn: (kind) => cvAssistantApiClient.resetEmailTemplate(kind),
    onSuccess: (data) => {
      queryClient.setQueryData(cvAssistantKeys.emailTemplates.detail(data.kind), data);
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.emailTemplates.all });
    },
  });
}

export function useCvNixDraftEmailTemplate() {
  return useMutation<
    { subject: string; bodyHtml: string; bodyText: string },
    Error,
    { kind: CvEmailTemplateKind; instructions?: string }
  >({
    mutationFn: ({ kind, instructions }) =>
      cvAssistantApiClient.nixDraftEmailTemplate(kind, instructions),
  });
}
