"use client";

import { useEffect, useState } from "react";
import { voiceAgentApi } from "./voiceAgentApi";

export interface TranscriptEntry {
  key: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

interface AgentTranscriptData {
  timestamp: string;
  speakerId: string | null;
  speakerName: string;
  text: string;
  confidence: number;
}

interface AgentMessage {
  type: string;
  data?: AgentTranscriptData;
}

export function useTranscriptStream(enabled: boolean) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const socket = new WebSocket(voiceAgentApi.transcriptStreamUrl());

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as AgentMessage;
      const data = parsed.data;
      if (parsed.type === "meeting-transcript-entry" && data) {
        setEntries((prev) => [
          ...prev,
          {
            key: `${data.timestamp}-${prev.length}`,
            speakerName: data.speakerName,
            text: data.text,
            timestamp: data.timestamp,
          },
        ]);
      }
    };

    return () => {
      socket.close();
    };
  }, [enabled]);

  const reset = () => setEntries([]);

  return { entries, connected, reset };
}
