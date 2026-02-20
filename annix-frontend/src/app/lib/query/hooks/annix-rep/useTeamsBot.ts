import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixRepApi, type JoinTeamsMeetingDto, type TeamsBotSession } from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys";

export function useTeamsBotActiveSessions() {
  return useQuery({
    queryKey: annixRepKeys.teamsBot.activeSessions(),
    queryFn: () => annixRepApi.teamsBot.activeSessions(),
  });
}

export function useTeamsBotSessionHistory(limit?: number) {
  return useQuery({
    queryKey: annixRepKeys.teamsBot.sessionHistory(limit),
    queryFn: () => annixRepApi.teamsBot.sessionHistory(limit),
  });
}

export function useTeamsBotSession(sessionId: string) {
  return useQuery({
    queryKey: annixRepKeys.teamsBot.session(sessionId),
    queryFn: () => annixRepApi.teamsBot.session(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useTeamsBotTranscript(sessionId: string) {
  return useQuery({
    queryKey: annixRepKeys.teamsBot.transcript(sessionId),
    queryFn: () => annixRepApi.teamsBot.transcript(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useJoinTeamsMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: JoinTeamsMeetingDto) => annixRepApi.teamsBot.join(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.teamsBot.activeSessions() });
    },
  });
}

export function useLeaveTeamsMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => annixRepApi.teamsBot.leave(sessionId),
    onSuccess: (data: TeamsBotSession) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.teamsBot.activeSessions() });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.teamsBot.session(data.sessionId) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.teamsBot.sessionHistory() });
    },
  });
}

export function teamsBotEventsUrl(sessionId: string): string {
  return annixRepApi.teamsBot.eventsUrl(sessionId);
}
