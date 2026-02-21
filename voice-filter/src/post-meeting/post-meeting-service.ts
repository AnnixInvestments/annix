import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type CalendarEvent,
  type CalendarProvider,
  calendarEventById,
  createPostMeetingJob,
  oauthTokens,
  pendingPostMeetingJobs,
  type PostMeetingJob,
  postMeetingJobsByUser,
  updatePostMeetingJob,
  incrementPostMeetingJobRetry,
} from "../auth/database.js";
import { Transcriber } from "../meeting/Transcriber.js";
import type { TranscriptEntry } from "../meeting/types.js";
import { createEmailService, EmailService } from "./email-service.js";
import { MeetRecordingsProvider } from "./meet-recordings.js";
import { SummaryGenerator } from "./summary-generator.js";
import { TeamsRecordingsProvider } from "./teams-recordings.js";
import type {
  IRecordingProvider,
  PostMeetingConfig,
  RecordingMetadata,
} from "./types.js";
import { ZoomRecordingsProvider } from "./zoom-recordings.js";

interface PostMeetingServiceEvents {
  "job-started": (job: PostMeetingJob) => void;
  "job-progress": (job: PostMeetingJob, stage: string) => void;
  "job-completed": (job: PostMeetingJob) => void;
  "job-failed": (job: PostMeetingJob, error: Error) => void;
  error: (error: Error) => void;
}

export class PostMeetingService extends EventEmitter {
  private config: PostMeetingConfig;
  private recordingProviders: Map<string, IRecordingProvider> = new Map();
  private emailService: EmailService | null = null;
  private summaryGenerator: SummaryGenerator | null = null;
  private transcriber: Transcriber | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;

  constructor(config: PostMeetingConfig) {
    super();
    this.config = config;

    this.recordingProviders.set("zoom", new ZoomRecordingsProvider());
    this.recordingProviders.set("teams", new TeamsRecordingsProvider());
    this.recordingProviders.set("meet", new MeetRecordingsProvider());

    if (config.smtpHost && config.smtpUser && config.smtpPassword && config.smtpFromAddress) {
      this.emailService = createEmailService({
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword,
        fromAddress: config.smtpFromAddress,
      });
    }

    if (config.openaiApiKey) {
      this.summaryGenerator = new SummaryGenerator({
        openaiApiKey: config.openaiApiKey,
      });

      this.transcriber = new Transcriber({
        openaiApiKey: config.openaiApiKey,
      });
    }
  }

  startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    console.log("Starting post-meeting job polling...");

    this.pollingInterval = setInterval(() => {
      this.processJobs().catch((error) => {
        console.error("Error processing post-meeting jobs:", error);
        this.emit("error", error);
      });
    }, this.config.detectionIntervalMs);

    this.processJobs().catch((error) => {
      console.error("Error in initial job processing:", error);
    });
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("Stopped post-meeting job polling");
    }
  }

  async processJobs(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const jobs = pendingPostMeetingJobs();

      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async processJob(job: PostMeetingJob): Promise<void> {
    const event = calendarEventById(job.calendar_event_id);
    if (!event) {
      updatePostMeetingJob(job.id, {
        status: "failed",
        error_message: "Calendar event not found",
      });
      return;
    }

    const tokens = oauthTokens(job.user_id);
    const accessToken = tokens[job.provider];
    const refreshToken = tokens[`${job.provider}_refresh`];

    if (!accessToken) {
      updatePostMeetingJob(job.id, {
        status: "failed",
        error_message: `No access token for ${job.provider}`,
      });
      return;
    }

    const credentials = { accessToken, refreshToken };

    try {
      this.emit("job-started", job);

      const meetingEnded = await this.checkMeetingEnded(job, event, credentials);
      if (!meetingEnded) {
        return;
      }

      if (this.config.enableRecordingFetch) {
        this.emit("job-progress", job, "fetching_recording");
        await this.fetchRecordings(job, event, credentials);
      }

      if (this.config.enableTranscription && job.recording_path) {
        this.emit("job-progress", job, "transcribing");
        await this.transcribeRecording(job);
      }

      if (this.config.enableSummary && job.transcript_path) {
        this.emit("job-progress", job, "generating_summary");
        await this.generateSummary(job, event);
      }

      if (this.config.enableEmailSummary && job.summary_path && this.emailService) {
        this.emit("job-progress", job, "sending_email");
        await this.sendSummaryEmail(job, event);
      }

      updatePostMeetingJob(job.id, { status: "completed" });
      this.emit("job-completed", job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error processing job ${job.id}:`, errorMessage);

      if (job.retry_count < this.config.maxRetries) {
        incrementPostMeetingJobRetry(job.id);
        updatePostMeetingJob(job.id, { error_message: errorMessage });
      } else {
        updatePostMeetingJob(job.id, {
          status: "failed",
          error_message: `Max retries exceeded: ${errorMessage}`,
        });
        this.emit("job-failed", job, error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }

  private async checkMeetingEnded(
    job: PostMeetingJob,
    event: CalendarEvent,
    credentials: { accessToken: string; refreshToken?: string },
  ): Promise<boolean> {
    updatePostMeetingJob(job.id, { status: "detecting_end" });

    const provider = this.recordingProviders.get(this.platformForProvider(job.provider));
    if (!provider) {
      const endTime = new Date(event.end_time);
      const graceMinutes = this.config.endDetectionGraceMinutes;
      const now = new Date();

      if (now.getTime() > endTime.getTime() + graceMinutes * 60 * 1000) {
        updatePostMeetingJob(job.id, {
          actual_end_time: event.end_time,
        });
        return true;
      }
      return false;
    }

    const meetingId = this.extractMeetingId(event);
    if (!meetingId) {
      const endTime = new Date(event.end_time);
      const now = new Date();
      return now > endTime;
    }

    const result = await provider.checkMeetingEnded(credentials, meetingId);

    if (result.ended) {
      updatePostMeetingJob(job.id, {
        actual_end_time: result.endTime ?? new Date().toISOString(),
      });
      return true;
    }

    return false;
  }

  private async fetchRecordings(
    job: PostMeetingJob,
    event: CalendarEvent,
    credentials: { accessToken: string; refreshToken?: string },
  ): Promise<void> {
    updatePostMeetingJob(job.id, { status: "fetching_recording" });

    const provider = this.recordingProviders.get(this.platformForProvider(job.provider));
    if (!provider) {
      console.log(`No recording provider for ${job.provider}, skipping recording fetch`);
      return;
    }

    const meetingId = this.extractMeetingId(event);
    if (!meetingId) {
      console.log("Could not extract meeting ID from event, skipping recording fetch");
      return;
    }

    const recordings = await provider.listRecordings(credentials, meetingId);
    if (recordings.length === 0) {
      console.log("No recordings found for meeting");
      return;
    }

    const recording = recordings[0];
    const outputDir = this.jobDirectory(job.id);
    const outputPath = join(outputDir, `recording.${this.fileExtensionForPlatform(provider.platform)}`);

    await provider.downloadRecording(credentials, recording, outputPath);

    updatePostMeetingJob(job.id, {
      recording_url: recording.downloadUrl,
      recording_path: outputPath,
    });
  }

  private async transcribeRecording(job: PostMeetingJob): Promise<void> {
    if (!this.transcriber || !job.recording_path) {
      return;
    }

    updatePostMeetingJob(job.id, { status: "transcribing" });

    const recordingBuffer = readFileSync(job.recording_path);

    const transcript = await this.transcriber.transcribe(recordingBuffer, {
      speakerId: null,
      speakerName: "Unknown",
      confidence: 1,
      timestamp: new Date().toISOString(),
    });

    if (!transcript) {
      return;
    }

    const transcriptPath = join(this.jobDirectory(job.id), "transcript.json");
    writeFileSync(transcriptPath, JSON.stringify([transcript], null, 2));

    updatePostMeetingJob(job.id, { transcript_path: transcriptPath });
  }

  private async generateSummary(job: PostMeetingJob, event: CalendarEvent): Promise<void> {
    if (!this.summaryGenerator || !job.transcript_path) {
      return;
    }

    updatePostMeetingJob(job.id, { status: "generating_summary" });

    const transcriptContent = readFileSync(job.transcript_path, "utf-8");
    const transcript: TranscriptEntry[] = JSON.parse(transcriptContent);

    const attendees = event.attendees ? JSON.parse(event.attendees) : [];
    const attendeeEmails = new Map<string, string>();
    for (const a of attendees) {
      if (a.name && a.email) {
        attendeeEmails.set(a.name, a.email);
      }
    }

    const startTime = new Date(event.start_time);
    const endTime = job.actual_end_time ? new Date(job.actual_end_time) : new Date(event.end_time);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const summary = await this.summaryGenerator.generateSummary(
      event.title,
      new Date(event.start_time).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      durationSeconds,
      transcript,
      attendeeEmails,
    );

    const summaryDir = this.jobDirectory(job.id);
    const htmlPath = join(summaryDir, "summary.html");
    const textPath = join(summaryDir, "summary.txt");
    const jsonPath = join(summaryDir, "summary.json");

    writeFileSync(htmlPath, this.summaryGenerator.formatAsHtml(summary));
    writeFileSync(textPath, this.summaryGenerator.formatAsText(summary));
    writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

    updatePostMeetingJob(job.id, { summary_path: jsonPath });
  }

  private async sendSummaryEmail(job: PostMeetingJob, event: CalendarEvent): Promise<void> {
    if (!this.emailService || !this.summaryGenerator || !job.summary_path) {
      return;
    }

    updatePostMeetingJob(job.id, { status: "sending_email" });

    const summaryContent = readFileSync(job.summary_path, "utf-8");
    const summary = JSON.parse(summaryContent);

    const htmlContent = this.summaryGenerator.formatAsHtml(summary);
    const textContent = this.summaryGenerator.formatAsText(summary);

    const attendees = event.attendees ? JSON.parse(event.attendees) : [];
    const recipients = attendees
      .filter((a: { email?: string }) => a.email)
      .map((a: { email: string }) => a.email);

    if (recipients.length === 0 && event.organizer_email) {
      recipients.push(event.organizer_email);
    }

    if (recipients.length === 0) {
      console.log("No recipients for summary email");
      return;
    }

    await this.emailService.sendMeetingSummary(summary, htmlContent, textContent, recipients);

    updatePostMeetingJob(job.id, { email_sent_at: new Date().toISOString() });
  }

  private platformForProvider(provider: CalendarProvider): string {
    const mapping: Record<CalendarProvider, string> = {
      google: "meet",
      microsoft: "teams",
      zoom: "zoom",
    };
    return mapping[provider];
  }

  private extractMeetingId(event: CalendarEvent): string | null {
    const meetingUrl = event.meeting_url;
    if (!meetingUrl) {
      return null;
    }

    const zoomMatch = meetingUrl.match(/zoom\.us\/j\/(\d+)/);
    if (zoomMatch) {
      return zoomMatch[1];
    }

    const teamsMatch = meetingUrl.match(/meetup-join\/([^/]+)/);
    if (teamsMatch) {
      return teamsMatch[1];
    }

    const meetMatch = meetingUrl.match(/meet\.google\.com\/([\w-]+)/);
    if (meetMatch) {
      return meetMatch[1];
    }

    return null;
  }

  private fileExtensionForPlatform(platform: string): string {
    const extensions: Record<string, string> = {
      zoom: "m4a",
      teams: "mp4",
      meet: "mp4",
    };
    return extensions[platform] ?? "mp4";
  }

  private jobDirectory(jobId: number): string {
    const dir = join(homedir(), ".voice-filter", "post-meeting-jobs", jobId.toString());
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  async createJobForCalendarEvent(
    userId: number,
    calendarEventId: number,
    provider: CalendarProvider,
    scheduledEndTime: string,
    meetingSessionId?: string,
  ): Promise<PostMeetingJob> {
    return createPostMeetingJob({
      userId,
      calendarEventId,
      meetingSessionId,
      provider,
      scheduledEndTime,
    });
  }

  jobsForUser(userId: number, status?: string): PostMeetingJob[] {
    return postMeetingJobsByUser(userId, {
      status: status as PostMeetingJob["status"],
    });
  }
}

let postMeetingServiceInstance: PostMeetingService | null = null;

export function initPostMeetingService(config: PostMeetingConfig): PostMeetingService {
  if (postMeetingServiceInstance) {
    return postMeetingServiceInstance;
  }

  postMeetingServiceInstance = new PostMeetingService(config);
  return postMeetingServiceInstance;
}

export function postMeetingService(): PostMeetingService | null {
  return postMeetingServiceInstance;
}
