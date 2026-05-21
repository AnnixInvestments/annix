import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CompanySettings,
  type NotificationPreferences,
  type PopiaRetentionStats,
  type UpdateCompanySettingsInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useCvSettings() {
  return useQuery<CompanySettings>({
    queryKey: annixOrbitKeys.settings.company(),
    queryFn: () => annixOrbitApiClient.settings(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvPopiaStats() {
  return useQuery<PopiaRetentionStats | null>({
    queryKey: annixOrbitKeys.candidates.popiaStats(),
    queryFn: () => annixOrbitApiClient.popiaRetentionStats().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvNotificationPreferences() {
  return useQuery<NotificationPreferences | null>({
    queryKey: annixOrbitKeys.settings.notifications(),
    queryFn: () => annixOrbitApiClient.notificationPreferences().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanySettingsInput) =>
      annixOrbitApiClient.updateCompanySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.settings.all });
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

      return annixOrbitApiClient.updateImapSettings({
        imapHost: rawImapHost || undefined,
        imapPort: rawImapPort || undefined,
        imapUser: rawImapUser || undefined,
        imapPassword: rawImapPassword || undefined,
        monitoringEnabled: data.monitoringEnabled,
        emailFromAddress: rawEmailFromAddress || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.settings.all });
    },
  });
}

export function useCvUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      annixOrbitApiClient.updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.settings.notifications() });
    },
  });
}
