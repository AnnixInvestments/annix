import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { IRecordingProvider, RecordingMetadata } from "./types.js";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

interface TeamsOnlineMeeting {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
}

interface TeamsCallRecord {
  id: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  participants: Array<{
    user?: { displayName: string; id: string };
  }>;
}

interface TeamsRecording {
  id: string;
  createdDateTime: string;
  recordingContentUrl: string;
}

interface TeamsRecordingsResponse {
  value: TeamsRecording[];
}

export class TeamsRecordingsProvider implements IRecordingProvider {
  readonly platform = "teams" as const;

  async checkMeetingEnded(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<{ ended: boolean; endTime: string | null }> {
    const url = `${GRAPH_API}/me/onlineMeetings/${meetingId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404) {
      return { ended: true, endTime: null };
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${error}`);
    }

    const meeting = (await response.json()) as TeamsOnlineMeeting;

    const now = new Date();
    const endTime = new Date(meeting.endDateTime);
    const ended = now > endTime;

    return {
      ended,
      endTime: ended ? meeting.endDateTime : null,
    };
  }

  async listRecordings(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<RecordingMetadata[]> {
    const callRecords = await this.callRecordsForMeeting(credentials, meetingId);

    const recordings: RecordingMetadata[] = [];

    for (const callRecord of callRecords) {
      const callRecordings = await this.recordingsForCall(credentials, callRecord.id);

      for (const recording of callRecordings) {
        const participants = callRecord.participants
          .map((p) => p.user?.displayName)
          .filter((name): name is string => !!name);

        const startTime = new Date(callRecord.startDateTime);
        const endTime = new Date(callRecord.endDateTime);
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        recordings.push({
          platform: "teams",
          meetingId,
          recordingId: recording.id,
          downloadUrl: recording.recordingContentUrl,
          duration,
          fileSize: 0,
          recordedAt: recording.createdDateTime,
          participants,
        });
      }
    }

    return recordings;
  }

  private async callRecordsForMeeting(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<TeamsCallRecord[]> {
    const url = `${GRAPH_API}/communications/callRecords?$filter=contains(joinWebUrl,'${meetingId}')`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${error}`);
    }

    const data = (await response.json()) as { value: TeamsCallRecord[] };
    return data.value ?? [];
  }

  private async recordingsForCall(
    credentials: { accessToken: string },
    callRecordId: string,
  ): Promise<TeamsRecording[]> {
    const url = `${GRAPH_API}/communications/callRecords/${callRecordId}/recordings`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${error}`);
    }

    const data = (await response.json()) as TeamsRecordingsResponse;
    return data.value ?? [];
  }

  async downloadRecording(
    credentials: { accessToken: string },
    recording: RecordingMetadata,
    outputPath: string,
  ): Promise<string> {
    const response = await fetch(recording.downloadUrl, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.status}`);
    }

    mkdirSync(dirname(outputPath), { recursive: true });

    const fileStream = createWriteStream(outputPath);
    const body = response.body;

    if (!body) {
      throw new Error("No response body received");
    }

    await pipeline(Readable.fromWeb(body as never), fileStream);

    return outputPath;
  }
}
