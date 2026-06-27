import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { CompanyBrandingService } from "../company-branding/company-branding.service";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  type BoardMeetingMinutes,
  BoardMeetingMinutesStatus,
  RubberBoardMeeting,
} from "./entities/rubber-board-meeting.entity";
import type { MeetingListing, MeetingProviderName } from "./meetings/meeting-provider.interface";
import { MeetingProviderRegistry } from "./meetings/meeting-provider.registry";
import { RubberBoardMeetingRepository } from "./repositories/rubber-board-meeting.repository";
import {
  type GeneratedAgenda,
  RubberBoardMeetingAiService,
} from "./rubber-board-meeting-ai.service";
import { RubberBoardMeetingPdfService } from "./rubber-board-meeting-pdf.service";

export interface BoardMeetingDto {
  id: number;
  title: string;
  meetingDate: string | null;
  provider: MeetingProviderName;
  externalId: string | null;
  recordingUrl: string | null;
  attendees: string[];
  providerSummary: string | null;
  hasTranscript: boolean;
  minutes: BoardMeetingMinutes | null;
  minutesStatus: BoardMeetingMinutesStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const AGENDA_HISTORY_LIMIT = 5;

@Injectable()
export class RubberBoardMeetingService {
  private readonly logger = new Logger(RubberBoardMeetingService.name);

  constructor(
    private readonly repository: RubberBoardMeetingRepository,
    private readonly providers: MeetingProviderRegistry,
    private readonly aiService: RubberBoardMeetingAiService,
    private readonly pdfService: RubberBoardMeetingPdfService,
    private readonly branding: CompanyBrandingService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  // Render the meeting's minutes onto the company letterhead and return them as a
  // base64 PDF data URL the browser can download.
  async downloadMinutes(
    id: number,
    companyId: number | null,
  ): Promise<{ filename: string; dataUrl: string }> {
    const meeting = await this.repository.findById(id);
    if (!meeting) {
      throw new BadRequestException("Board meeting not found");
    }
    if (!meeting.minutes) {
      throw new BadRequestException("Generate the minutes before downloading");
    }
    const buffer = await this.pdfService.generateMinutesPdf({
      title: meeting.title,
      meetingDate: meeting.meetingDate ? meeting.meetingDate.toISOString() : null,
      attendees: meeting.attendees ?? [],
      minutes: meeting.minutes,
      letterhead: await this.branding.letterheadImage(companyId),
    });
    const safe =
      meeting.title
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "board-meeting";
    return {
      filename: `${safe}-minutes.pdf`,
      dataUrl: `data:application/pdf;base64,${buffer.toString("base64")}`,
    };
  }

  // Providers that are registered AND configured (have credentials) — drives the
  // "import from…" picker in the UI.
  configuredProviders(): MeetingProviderName[] {
    return this.providers.configured().map((p) => p.name);
  }

  async listMeetings(): Promise<BoardMeetingDto[]> {
    const meetings = await this.repository.findAllOrderedByDate();
    return meetings.map((m) => this.mapToDto(m));
  }

  async getMeeting(id: number): Promise<BoardMeetingDto | null> {
    const meeting = await this.repository.findById(id);
    return meeting ? this.mapToDto(meeting) : null;
  }

  // List meetings available to import from a given provider (no transcript yet).
  async availableMeetings(provider: MeetingProviderName): Promise<MeetingListing[]> {
    const impl = this.providers.get(provider);
    if (!impl.isConfigured()) {
      throw new BadRequestException(`${provider} is not configured`);
    }
    return impl.listMeetings({ limit: 50 });
  }

  // Pull a meeting in full from the provider, store its transcript, and persist
  // a board-meeting record. Re-importing the same meeting returns the existing
  // record rather than duplicating it.
  async importMeeting(
    provider: MeetingProviderName,
    ref: { externalId?: string; url?: string },
    createdBy: string | null,
  ): Promise<BoardMeetingDto> {
    const impl = this.providers.get(provider);
    if (!impl.isConfigured()) {
      throw new BadRequestException(`${provider} is not configured`);
    }
    const normalized = await impl.getMeeting(ref);

    if (normalized.externalId) {
      const existing = await this.repository.findByProviderExternalId(
        provider,
        normalized.externalId,
      );
      if (existing) {
        this.logger.log(
          `Board meeting ${normalized.externalId} (${provider}) already imported as #${existing.id}`,
        );
        return this.mapToDto(existing);
      }
    }

    let transcriptPath: string | null = null;
    if (normalized.transcript) {
      transcriptPath = await this.storeTranscript(
        provider,
        normalized.externalId || `import-${Date.now()}`,
        normalized.transcript,
      );
    }

    const meeting = this.repository.build({
      title: normalized.title,
      meetingDate: normalized.meetingDate ? new Date(normalized.meetingDate) : null,
      provider,
      externalId: normalized.externalId || null,
      recordingUrl: normalized.recordingUrl,
      attendees: normalized.attendees,
      providerSummary: normalized.summary,
      transcriptPath,
      minutes: null,
      minutesStatus: BoardMeetingMinutesStatus.NONE,
      createdBy,
    });
    const saved = await this.repository.save(meeting);
    this.logger.log(`Imported board meeting "${saved.title}" (#${saved.id}) from ${provider}`);
    return this.mapToDto(saved);
  }

  // Generate (or regenerate) structured board minutes for a meeting via Nix.
  async generateMinutes(id: number): Promise<BoardMeetingDto> {
    const meeting = await this.repository.findById(id);
    if (!meeting) {
      throw new BadRequestException("Board meeting not found");
    }
    const transcript = await this.loadTranscript(meeting);
    if (!transcript && !meeting.providerSummary) {
      throw new BadRequestException(
        "This meeting has neither a transcript nor a summary to generate minutes from",
      );
    }
    try {
      const minutes = await this.aiService.generateMinutes({
        title: meeting.title,
        meetingDate: meeting.meetingDate ? meeting.meetingDate.toISOString() : null,
        transcript,
        providerSummary: meeting.providerSummary,
      });
      meeting.minutes = minutes;
      meeting.minutesStatus = BoardMeetingMinutesStatus.GENERATED;
      const saved = await this.repository.save(meeting);
      this.logger.log(`Generated minutes for board meeting #${id}`);
      return this.mapToDto(saved);
    } catch (err) {
      meeting.minutesStatus = BoardMeetingMinutesStatus.FAILED;
      await this.repository.save(meeting);
      this.logger.error(
        `Failed to generate minutes for board meeting #${id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  // Draft the next meeting's agenda from the most recent minuted meetings.
  async generateAgenda(): Promise<GeneratedAgenda> {
    const recent = await this.repository.findRecentWithMinutes(AGENDA_HISTORY_LIMIT);
    const withMinutes = recent.filter(
      (m): m is RubberBoardMeeting & { minutes: BoardMeetingMinutes } => m.minutes != null,
    );
    if (withMinutes.length === 0) {
      throw new BadRequestException(
        "No meetings with generated minutes yet — generate minutes on at least one meeting first",
      );
    }
    return this.aiService.generateAgenda(
      withMinutes.map((m) => ({
        title: m.title,
        meetingDate: m.meetingDate ? m.meetingDate.toISOString() : null,
        minutes: m.minutes,
      })),
    );
  }

  async deleteMeeting(id: number): Promise<boolean> {
    return this.repository.deleteById(id);
  }

  private async storeTranscript(
    provider: string,
    externalId: string,
    transcript: string,
  ): Promise<string> {
    const safeId = externalId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const file = {
      fieldname: "transcript",
      originalname: `${safeId}.txt`,
      encoding: "7bit",
      mimetype: "text/plain",
      size: Buffer.byteLength(transcript),
      buffer: Buffer.from(transcript, "utf8"),
      stream: undefined,
      destination: "",
      filename: "",
      path: "",
    } as unknown as Express.Multer.File;
    const result = await this.storageService.upload(
      file,
      `au-rubber/board-meetings/${provider}/${safeId}`,
    );
    return result.path;
  }

  private async loadTranscript(meeting: RubberBoardMeeting): Promise<string | null> {
    if (!meeting.transcriptPath) {
      return null;
    }
    try {
      const buffer = await this.storageService.download(meeting.transcriptPath);
      return buffer.toString("utf8");
    } catch (err) {
      this.logger.warn(
        `Transcript missing for board meeting #${meeting.id} (${meeting.transcriptPath}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  private mapToDto(meeting: RubberBoardMeeting): BoardMeetingDto {
    return {
      id: meeting.id,
      title: meeting.title,
      meetingDate: meeting.meetingDate ? meeting.meetingDate.toISOString() : null,
      provider: meeting.provider,
      externalId: meeting.externalId ?? null,
      recordingUrl: meeting.recordingUrl ?? null,
      attendees: meeting.attendees ?? [],
      providerSummary: meeting.providerSummary ?? null,
      hasTranscript: Boolean(meeting.transcriptPath),
      minutes: meeting.minutes ?? null,
      minutesStatus:
        (meeting.minutesStatus as BoardMeetingMinutesStatus) ?? BoardMeetingMinutesStatus.NONE,
      createdBy: meeting.createdBy ?? null,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
    };
  }
}
