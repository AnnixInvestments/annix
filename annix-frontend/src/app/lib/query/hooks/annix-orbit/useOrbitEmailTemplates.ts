"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CvEmailTemplate,
  type CvEmailTemplateKind,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitEmailTemplates() {
  return useQuery<CvEmailTemplate[]>({
    queryKey: annixOrbitKeys.emailTemplates.all,
    queryFn: () => annixOrbitApiClient.listEmailTemplates(),
    staleTime: 60_000,
  });
}

export function useOrbitEmailTemplate(kind: CvEmailTemplateKind) {
  return useQuery<CvEmailTemplate>({
    queryKey: annixOrbitKeys.emailTemplates.detail(kind),
    queryFn: () => annixOrbitApiClient.getEmailTemplate(kind),
    staleTime: 60_000,
  });
}

export function useOrbitUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation<
    CvEmailTemplate,
    Error,
    { kind: CvEmailTemplateKind; subject: string; bodyHtml: string; bodyText: string }
  >({
    mutationFn: ({ kind, subject, bodyHtml, bodyText }) =>
      annixOrbitApiClient.updateEmailTemplate(kind, { subject, bodyHtml, bodyText }),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.emailTemplates.detail(data.kind), data);
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.emailTemplates.all });
    },
  });
}

export function useOrbitResetEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation<CvEmailTemplate, Error, CvEmailTemplateKind>({
    mutationFn: (kind) => annixOrbitApiClient.resetEmailTemplate(kind),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.emailTemplates.detail(data.kind), data);
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.emailTemplates.all });
    },
  });
}

export function useOrbitNixDraftEmailTemplate() {
  return useMutation<
    { subject: string; bodyHtml: string; bodyText: string },
    Error,
    { kind: CvEmailTemplateKind; instructions?: string }
  >({
    mutationFn: ({ kind, instructions }) =>
      annixOrbitApiClient.nixDraftEmailTemplate(kind, instructions),
  });
}
