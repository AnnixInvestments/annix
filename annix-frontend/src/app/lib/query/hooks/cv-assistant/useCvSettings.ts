import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CompanySettings,
  cvAssistantApiClient,
  type NotificationPreferences,
  type PopiaRetentionStats,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvSettings() {
  return useQuery<CompanySettings>({
    queryKey: cvAssistantKeys.settings.company(),
    queryFn: () => cvAssistantApiClient.settings(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvPopiaStats() {
  return useQuery<PopiaRetentionStats | null>({
    queryKey: cvAssistantKeys.candidates.popiaStats(),
    queryFn: () => cvAssistantApiClient.popiaRetentionStats().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvNotificationPreferences() {
  return useQuery<NotificationPreferences | null>({
    queryKey: cvAssistantKeys.settings.notifications(),
    queryFn: () => cvAssistantApiClient.notificationPreferences().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string }) => cvAssistantApiClient.updateCompanySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.settings.all });
    },
  });
}

export function useCvUpdateImapSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      imapHost?: string | null;
      imapPort?: number | null;
      imapUser?: string | null;
      imapPassword?: string | null;
      monitoringEnabled?: boolean;
      emailFromAddress?: string | null;
    }) => {
      const rawImapHost = data.imapHost;
      const rawImapPort = data.imapPort;
      const rawImapUser = data.imapUser;
      const rawImapPassword = data.imapPassword;
      const rawEmailFromAddress = data.emailFromAddress;

      return cvAssistantApiClient.updateImapSettings({
        imapHost: rawImapHost || undefined,
        imapPort: rawImapPort || undefined,
        imapUser: rawImapUser || undefined,
        imapPassword: rawImapPassword || undefined,
        monitoringEnabled: data.monitoringEnabled,
        emailFromAddress: rawEmailFromAddress || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.settings.all });
    },
  });
}

export function useCvUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      cvAssistantApiClient.updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.settings.notifications() });
    },
  });
}
