import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { IRecordingProvider, RecordingMetadata } from "./types.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MEET_API = "https://meet.googleapis.com/v1";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webContentLink?: string;
}

interface DriveFilesResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

interface MeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
  config?: {
    entryPointAccess?: string;
    accessType?: string;
  };
}

interface MeetConferenceRecord {
  name: string;
  space: string;
  startTime: string;
  endTime?: string;
}

interface MeetRecording {
  name: string;
  state: string;
  startTime: string;
  endTime?: string;
  driveDestination?: {
    file: string;
    exportUri: string;
  };
}

export class MeetRecordingsProvider implements IRecordingProvider {
  readonly platform = "meet" as const;

  async checkMeetingEnded(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<{ ended: boolean; endTime: string | null }> {
    const conferenceRecords = await this.conferenceRecords(credentials, meetingId);

    if (conferenceRecords.length === 0) {
      return { ended: false, endTime: null };
    }

    const latestRecord = conferenceRecords.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    if (latestRecord.endTime) {
      return { ended: true, endTime: latestRecord.endTime };
    }

    return { ended: false, endTime: null };
  }

  private async conferenceRecords(
    credentials: { accessToken: string },
    meetingCode: string,
  ): Promise<MeetConferenceRecord[]> {
    const url = `${MEET_API}/conferenceRecords?filter=space.meeting_code="${meetingCode}"`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404 || response.status === 403) {
      return [];
    }

    if (!response.ok) {
      return await this.conferenceRecordsFromDrive(credentials, meetingCode);
    }

    const data = (await response.json()) as { conferenceRecords?: MeetConferenceRecord[] };
    return data.conferenceRecords ?? [];
  }

  private async conferenceRecordsFromDrive(
    credentials: { accessToken: string },
    meetingCode: string,
  ): Promise<MeetConferenceRecord[]> {
    const files = await this.searchDriveForRecordings(credentials, meetingCode);

    return files.map((file) => ({
      name: `conferenceRecords/${file.id}`,
      space: meetingCode,
      startTime: file.createdTime,
      endTime: file.modifiedTime,
    }));
  }

  async listRecordings(
    credentials: { accessToken: string },
    meetingId: string,
  ): Promise<RecordingMetadata[]> {
    const meetRecordings = await this.recordingsFromMeetApi(credentials, meetingId);

    if (meetRecordings.length > 0) {
      return meetRecordings;
    }

    return await this.recordingsFromDrive(credentials, meetingId);
  }

  private async recordingsFromMeetApi(
    credentials: { accessToken: string },
    meetingCode: string,
  ): Promise<RecordingMetadata[]> {
    const conferenceRecords = await this.conferenceRecords(credentials, meetingCode);

    const recordings: RecordingMetadata[] = [];

    for (const record of conferenceRecords) {
      const url = `${MEET_API}/${record.name}/recordings`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as { recordings?: MeetRecording[] };

      for (const recording of data.recordings ?? []) {
        if (recording.driveDestination?.exportUri) {
          const startTime = new Date(recording.startTime);
          const endTime = recording.endTime ? new Date(recording.endTime) : new Date();
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

          recordings.push({
            platform: "meet",
            meetingId: meetingCode,
            recordingId: recording.name,
            downloadUrl: recording.driveDestination.exportUri,
            duration,
            fileSize: 0,
            recordedAt: recording.startTime,
            participants: [],
          });
        }
      }
    }

    return recordings;
  }

  private async recordingsFromDrive(
    credentials: { accessToken: string },
    meetingCode: string,
  ): Promise<RecordingMetadata[]> {
    const files = await this.searchDriveForRecordings(credentials, meetingCode);

    return files.map((file) => ({
      platform: "meet" as const,
      meetingId: meetingCode,
      recordingId: file.id,
      downloadUrl: `${DRIVE_API}/files/${file.id}?alt=media`,
      duration: 0,
      fileSize: parseInt(file.size ?? "0", 10),
      recordedAt: file.createdTime,
      participants: [],
    }));
  }

  private async searchDriveForRecordings(
    credentials: { accessToken: string },
    meetingCode: string,
  ): Promise<DriveFile[]> {
    const query = `name contains '${meetingCode}' and (mimeType='video/mp4' or mimeType='audio/mp4')`;
    const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webContentLink)`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as DriveFilesResponse;
    return data.files ?? [];
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
