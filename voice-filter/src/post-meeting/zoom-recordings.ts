import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { IRecordingProvider, RecordingMetadata } from "./types.js";

const ZOOM_API = "https://api.zoom.us/v2";

interface ZoomMeetingInstance {
  uuid: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  status?: string;
}

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  download_url: string;
  status: string;
  recording_type: string;
}

interface ZoomRecordingResponse {
  uuid: string;
  id: number;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
  participant_audio_files?: ZoomRecordingFile[];
}

interface ZoomPastMeetingsResponse {
  meetings: ZoomMeetingInstance[];
}

export class ZoomRecordingsProvider implements IRecordingProvider {
  readonly platform = "zoom" as const;

  async checkMeetingEnded(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<{ ended: boolean; endTime: string | null }> {
    const url = `${ZOOM_API}/past_meetings/${encodeURIComponent(meetingId)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404 || response.status === 400) {
      return { ended: false, endTime: null };
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${error}`);
    }

    const data = (await response.json()) as { end_time?: string };
    return {
      ended: !!data.end_time,
      endTime: data.end_time ?? null,
    };
  }

  async listRecordings(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<RecordingMetadata[]> {
    const instances = await this.meetingInstances(credentials, meetingId);

    const recordings: RecordingMetadata[] = [];

    for (const instance of instances) {
      const instanceRecordings = await this.recordingsForInstance(
        credentials,
        instance.uuid,
      );
      recordings.push(...instanceRecordings);
    }

    return recordings;
  }

  private async meetingInstances(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<ZoomMeetingInstance[]> {
    const url = `${ZOOM_API}/past_meetings/${encodeURIComponent(meetingId)}/instances`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404 || response.status === 400) {
      return [];
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${error}`);
    }

    const data = (await response.json()) as ZoomPastMeetingsResponse;
    return data.meetings ?? [];
  }

  private async recordingsForInstance(
    credentials: { accessToken: string },
    meetingUuid: string,
  ): Promise<RecordingMetadata[]> {
    const doubleEncoded = encodeURIComponent(encodeURIComponent(meetingUuid));
    const url = `${ZOOM_API}/meetings/${doubleEncoded}/recordings`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404 || response.status === 400) {
      return [];
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${error}`);
    }

    const data = (await response.json()) as ZoomRecordingResponse;

    const audioFiles = [
      ...(data.recording_files?.filter((f) => f.file_type === "M4A") ?? []),
      ...(data.participant_audio_files ?? []),
    ];

    return audioFiles.map((file) => ({
      platform: "zoom" as const,
      meetingId: data.id.toString(),
      recordingId: file.id,
      downloadUrl: file.download_url,
      duration: data.duration * 60,
      fileSize: file.file_size,
      recordedAt: file.recording_start,
      participants: [],
    }));
  }

  async downloadRecording(
    credentials: { accessToken: string },
    recording: RecordingMetadata,
    outputPath: string,
  ): Promise<string> {
    const downloadUrl = `${recording.downloadUrl}?access_token=${credentials.accessToken}`;

    const response = await fetch(downloadUrl);

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
