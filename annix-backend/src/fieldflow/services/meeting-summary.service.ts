import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { formatDateLongZA } from "../../lib/datetime";
import {
  Meeting,
  type MeetingAnalysis,
  MeetingRecording,
  MeetingTranscript,
  type TranscriptSegment,
} from "../entities";

export interface MeetingSummary {
  overview: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee: string | null;
    dueDate: string | null;
  }>;
  nextSteps: string[];
  topics: string[];
  sentiment?: string;
}

export interface SendSummaryDto {
  recipientEmails: string[];
  recipientNames?: Record<string, string>;
  includeTranscriptLink?: boolean;
  customMessage?: string;
}

export interface SendSummaryResult {
  sent: string[];
  failed: string[];
}

@Injectable()
export class MeetingSummaryService {
  private readonly logger = new Logger(MeetingSummaryService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingRecording)
    private readonly recordingRepo: Repository<MeetingRecording>,
    @InjectRepository(MeetingTranscript)
    private readonly transcriptRepo: Repository<MeetingTranscript>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async generateSummary(meetingId: number): Promise<MeetingSummary> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ["prospect"],
    });

    if (!meeting) {
      throw new NotFoundException("Meeting not found");
    }

    const recording = await this.recordingRepo.findOne({
      where: { meetingId },
    });

    if (!recording) {
      throw new BadRequestException("Meeting has no recording");
    }

    const transcript = await this.transcriptRepo.findOne({
      where: { recordingId: recording.id },
    });

    if (!transcript) {
      throw new BadRequestException("Meeting has no transcript");
    }

    const summary = this.buildSummaryFromTranscript(transcript, meeting);

    return summary;
  }

  private buildSummaryFromTranscript(
    transcript: MeetingTranscript,
    meeting: Meeting,
  ): MeetingSummary {
    const analysis = transcript.analysis;
    const segments = transcript.segments;

    const overview = this.generateOverview(meeting, transcript, analysis);
    const keyPoints = this.extractKeyPoints(analysis, segments);
    const actionItems = this.extractActionItems(analysis);
    const nextSteps = this.generateNextSteps(analysis, meeting);
    const topics = analysis?.topics ?? [];
    const sentiment = analysis?.sentiment ?? undefined;

    return {
      overview,
      keyPoints,
      actionItems,
      nextSteps,
      topics,
      sentiment,
    };
  }

  private generateOverview(
    meeting: Meeting,
    transcript: MeetingTranscript,
    analysis: MeetingAnalysis | null,
  ): string {
    const parts: string[] = [];

    const topicSummary = analysis?.topics?.length
      ? `The discussion covered ${this.formatListNatural(analysis.topics.slice(0, 3))}.`
      : "";

    const questionCount = analysis?.questions?.length ?? 0;
    const actionCount = analysis?.actionItems?.length ?? 0;

    if (meeting.prospect) {
      parts.push(
        `This meeting with ${meeting.prospect.companyName} focused on ${meeting.title.toLowerCase()}.`,
      );
    } else {
      parts.push(`This meeting focused on ${meeting.title.toLowerCase()}.`);
    }

    if (topicSummary) {
      parts.push(topicSummary);
    }

    const stats: string[] = [];
    if (questionCount > 0) {
      stats.push(`${questionCount} question${questionCount !== 1 ? "s" : ""} were raised`);
    }
    if (actionCount > 0) {
      stats.push(`${actionCount} action item${actionCount !== 1 ? "s" : ""} were identified`);
    }

    if (stats.length > 0) {
      parts.push(`During the meeting, ${stats.join(" and ")}.`);
    }

    if (analysis?.sentiment === "positive") {
      parts.push("The overall tone of the meeting was positive.");
    } else if (analysis?.sentiment === "negative") {
      parts.push("Some concerns were raised that may need follow-up.");
    }

    return parts.join(" ");
  }

  private extractKeyPoints(
    analysis: MeetingAnalysis | null,
    segments: TranscriptSegment[],
  ): string[] {
    const keyPoints: string[] = [];

    if (analysis?.keyPoints?.length) {
      keyPoints.push(...analysis.keyPoints.slice(0, 5));
    }

    if (keyPoints.length < 3 && analysis?.objections?.length) {
      keyPoints.push(`Concern raised: ${analysis.objections[0]}`);
    }

    if (keyPoints.length === 0) {
      const longSegments = segments
        .filter((s) => s.text.length > 100)
        .slice(0, 3)
        .map((s) => this.truncateText(s.text, 150));
      keyPoints.push(...longSegments);
    }

    return keyPoints.slice(0, 5);
  }

  private extractActionItems(
    analysis: MeetingAnalysis | null,
  ): Array<{ task: string; assignee: string | null; dueDate: string | null }> {
    if (!analysis?.actionItems?.length) {
      return [];
    }

    return analysis.actionItems.slice(0, 10).map((item) => ({
      task: this.truncateText(item.task, 200),
      assignee: item.assignee,
      dueDate: item.dueDate,
    }));
  }

  private generateNextSteps(analysis: MeetingAnalysis | null, meeting: Meeting): string[] {
    const nextSteps: string[] = [];

    if (analysis?.actionItems?.length) {
      const assignedItems = analysis.actionItems.filter((item) => item.assignee);
      if (assignedItems.length > 0) {
        nextSteps.push("Follow up on assigned action items");
      }
    }

    if (analysis?.questions?.length && analysis.questions.length > 2) {
      nextSteps.push("Address remaining questions from the meeting");
    }

    if (analysis?.objections?.length) {
      nextSteps.push("Review and address concerns raised during discussion");
    }

    if (meeting.outcomes) {
      nextSteps.push("Review documented meeting outcomes");
    }

    if (nextSteps.length === 0) {
      nextSteps.push("Schedule follow-up meeting if needed");
      nextSteps.push("Share meeting summary with relevant stakeholders");
    }

    return nextSteps.slice(0, 5);
  }

  async sendSummaryEmail(meetingId: number, dto: SendSummaryDto): Promise<SendSummaryResult> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ["prospect"],
    });

    if (!meeting) {
      throw new NotFoundException("Meeting not found");
    }

    const summary = await this.generateSummary(meetingId);

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const transcriptUrl = dto.includeTranscriptLink
      ? `${frontendUrl}/fieldflow/meetings/${meetingId}/transcript`
      : undefined;

    const duration =
      meeting.actualEnd && meeting.actualStart
        ? this.calculateDuration(new Date(meeting.actualStart), new Date(meeting.actualEnd))
        : meeting.scheduledEnd && meeting.scheduledStart
          ? this.calculateDuration(new Date(meeting.scheduledStart), new Date(meeting.scheduledEnd))
          : "Duration not recorded";

    const meetingDetails = {
      title: meeting.title,
      date: formatDateLongZA(new Date(meeting.scheduledStart)),
      duration,
      attendees: meeting.attendees ?? [],
      companyName: meeting.prospect?.companyName,
    };

    const sent: string[] = [];
    const failed: string[] = [];

    for (const email of dto.recipientEmails) {
      const recipientName = dto.recipientNames?.[email] ?? email.split("@")[0];

      try {
        const success = await this.emailService.sendMeetingSummaryEmail(
          email,
          recipientName,
          meetingDetails,
          summary,
          transcriptUrl,
        );

        if (success) {
          sent.push(email);
          this.logger.log(`Meeting summary sent to ${email} for meeting ${meetingId}`);
        } else {
          failed.push(email);
          this.logger.warn(`Failed to send meeting summary to ${email}`);
        }
      } catch (error) {
        failed.push(email);
        this.logger.error(`Error sending meeting summary to ${email}: ${error}`);
      }
    }

    if (sent.length > 0) {
      meeting.summarySent = true;
      await this.meetingRepo.save(meeting);
    }

    return { sent, failed };
  }

  async previewSummary(meetingId: number): Promise<{
    summary: MeetingSummary;
    meeting: {
      title: string;
      date: string;
      duration: string;
      attendees: string[];
      companyName: string | null;
    };
  }> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ["prospect"],
    });

    if (!meeting) {
      throw new NotFoundException("Meeting not found");
    }

    const summary = await this.generateSummary(meetingId);

    const duration =
      meeting.actualEnd && meeting.actualStart
        ? this.calculateDuration(new Date(meeting.actualStart), new Date(meeting.actualEnd))
        : meeting.scheduledEnd && meeting.scheduledStart
          ? this.calculateDuration(new Date(meeting.scheduledStart), new Date(meeting.scheduledEnd))
          : "Duration not recorded";

    return {
      summary,
      meeting: {
        title: meeting.title,
        date: formatDateLongZA(new Date(meeting.scheduledStart)),
        duration,
        attendees: meeting.attendees ?? [],
        companyName: meeting.prospect?.companyName ?? null,
      },
    };
  }

  private calculateDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.round(diffMs / 60000);

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }

    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
  }

  private formatListNatural(items: string[]): string {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0].toLowerCase();
    if (items.length === 2) return `${items[0].toLowerCase()} and ${items[1].toLowerCase()}`;

    const last = items[items.length - 1].toLowerCase();
    const rest = items
      .slice(0, -1)
      .map((i) => i.toLowerCase())
      .join(", ");
    return `${rest}, and ${last}`;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3).trim()}...`;
  }
}
