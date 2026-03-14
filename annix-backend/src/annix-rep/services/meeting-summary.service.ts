import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { formatDateLongZA, fromISO, fromJSDate } from "../../lib/datetime";
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
  sentiment: string | null;
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
    const sentiment = analysis?.sentiment ?? null;

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
    const topicSummary = analysis?.topics?.length
      ? `The discussion covered ${this.formatListNatural(analysis.topics.slice(0, 3))}.`
      : "";

    const questionCount = analysis?.questions?.length ?? 0;
    const actionCount = analysis?.actionItems?.length ?? 0;

    const openingLine = meeting.prospect
      ? `This meeting with ${meeting.prospect.companyName} focused on ${meeting.title.toLowerCase()}.`
      : `This meeting focused on ${meeting.title.toLowerCase()}.`;

    const stats: string[] = [
      ...(questionCount > 0
        ? [`${questionCount} question${questionCount !== 1 ? "s" : ""} were raised`]
        : []),
      ...(actionCount > 0
        ? [`${actionCount} action item${actionCount !== 1 ? "s" : ""} were identified`]
        : []),
    ];

    const sentimentLine =
      analysis?.sentiment === "positive"
        ? "The overall tone of the meeting was positive."
        : analysis?.sentiment === "negative"
          ? "Some concerns were raised that may need follow-up."
          : null;

    const parts: string[] = [
      openingLine,
      ...(topicSummary ? [topicSummary] : []),
      ...(stats.length > 0 ? [`During the meeting, ${stats.join(" and ")}.`] : []),
      ...(sentimentLine ? [sentimentLine] : []),
    ];

    return parts.join(" ");
  }

  private extractKeyPoints(
    analysis: MeetingAnalysis | null,
    segments: TranscriptSegment[],
  ): string[] {
    const fromAnalysis = analysis?.keyPoints?.length ? analysis.keyPoints.slice(0, 5) : [];

    const withObjections =
      fromAnalysis.length < 3 && analysis?.objections?.length
        ? [...fromAnalysis, `Concern raised: ${analysis.objections[0]}`]
        : fromAnalysis;

    const keyPoints =
      withObjections.length === 0
        ? segments
            .filter((s) => s.text.length > 100)
            .slice(0, 3)
            .map((s) => this.truncateText(s.text, 150))
        : withObjections;

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
    const hasAssignedActions = analysis?.actionItems?.some((item) => item.assignee) ?? false;

    const conditionalSteps: string[] = [
      ...(hasAssignedActions ? ["Follow up on assigned action items"] : []),
      ...(analysis?.questions?.length && analysis.questions.length > 2
        ? ["Address remaining questions from the meeting"]
        : []),
      ...(analysis?.objections?.length
        ? ["Review and address concerns raised during discussion"]
        : []),
      ...(meeting.outcomes ? ["Review documented meeting outcomes"] : []),
    ];

    const nextSteps =
      conditionalSteps.length === 0
        ? [
            "Schedule follow-up meeting if needed",
            "Share meeting summary with relevant stakeholders",
          ]
        : conditionalSteps;

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
      ? `${frontendUrl}/annix-rep/meetings/${meetingId}/transcript`
      : null;

    const duration =
      meeting.actualEnd && meeting.actualStart
        ? this.calculateDuration(meeting.actualStart, meeting.actualEnd)
        : meeting.scheduledEnd && meeting.scheduledStart
          ? this.calculateDuration(meeting.scheduledStart, meeting.scheduledEnd)
          : "Duration not recorded";

    const meetingDetails = {
      title: meeting.title,
      date: formatDateLongZA(meeting.scheduledStart),
      duration,
      attendees: meeting.attendees ?? [],
      companyName: meeting.prospect?.companyName,
    };

    const results = await Promise.allSettled(
      dto.recipientEmails.map(async (email) => {
        const recipientName = dto.recipientNames?.[email] ?? email.split("@")[0];

        const success = await this.emailService.sendMeetingSummaryEmail(
          email,
          recipientName,
          meetingDetails,
          { ...summary, sentiment: summary.sentiment ?? undefined },
          transcriptUrl ?? undefined,
        );

        if (success) {
          this.logger.log(`Meeting summary sent to ${email} for meeting ${meetingId}`);
          return { email, success: true };
        } else {
          this.logger.warn(`Failed to send meeting summary to ${email}`);
          return { email, success: false };
        }
      }),
    );

    const { sent, failed } = results.reduce(
      (acc, result, index) => {
        const email = dto.recipientEmails[index];
        if (result.status === "rejected") {
          this.logger.error(`Error sending meeting summary to ${email}: ${result.reason}`);
          return { sent: acc.sent, failed: [...acc.failed, email] };
        } else if (result.value.success) {
          return { sent: [...acc.sent, email], failed: acc.failed };
        } else {
          return { sent: acc.sent, failed: [...acc.failed, email] };
        }
      },
      { sent: [] as string[], failed: [] as string[] },
    );

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
        ? this.calculateDuration(meeting.actualStart, meeting.actualEnd)
        : meeting.scheduledEnd && meeting.scheduledStart
          ? this.calculateDuration(meeting.scheduledStart, meeting.scheduledEnd)
          : "Duration not recorded";

    return {
      summary,
      meeting: {
        title: meeting.title,
        date: formatDateLongZA(meeting.scheduledStart),
        duration,
        attendees: meeting.attendees ?? [],
        companyName: meeting.prospect?.companyName ?? null,
      },
    };
  }

  private calculateDuration(start: Date | string, end: Date | string): string {
    const startDt = start instanceof Date ? fromJSDate(start) : fromISO(start);
    const endDt = end instanceof Date ? fromJSDate(end) : fromISO(end);
    const diff = endDt.diff(startDt, ["hours", "minutes"]);
    const hours = Math.floor(diff.hours);
    const minutes = Math.round(diff.minutes);

    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else {
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }
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
