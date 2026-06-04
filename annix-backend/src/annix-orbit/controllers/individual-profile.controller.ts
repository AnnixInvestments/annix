import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { FEATURE_FLAGS } from "../../feature-flags/feature-flags.constants";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import {
  INDIVIDUAL_DOC_MAX_BYTES,
  isAcceptedDocumentMime,
} from "../config/individual-documents.config";
import { UploadIndividualDocumentDto } from "../dto/individual-profile.dto";
import { UpdateSeekerEeAttributesDto } from "../dto/seeker-ee-attributes.dto";
import type {
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
  EePurpose,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { IndividualProfileService } from "../services/individual-profile.service";
import { InterviewBookingService } from "../services/interview-booking.service";
import { NixCvPdfService } from "../services/nix-cv-pdf.service";
import type { NixCalendarAdvisoryConflict, NixGeneratedCv } from "../services/nix-prompts";
import { NixSeekerAssistService } from "../services/nix-seeker-assist.service";

@Controller("annix-orbit/me")
@UseGuards(AnnixOrbitAuthGuard)
export class IndividualProfileController {
  constructor(
    private readonly individualProfileService: IndividualProfileService,
    private readonly nixSeekerAssistService: NixSeekerAssistService,
    private readonly interviewBookingService: InterviewBookingService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly nixCvPdfService: NixCvPdfService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  private async ensureNixCvBuilderEnabled(): Promise<void> {
    const enabled = await this.featureFlagsService.isEnabled(
      FEATURE_FLAGS.ANNIX_ORBIT_NIX_CV_BUILDER,
    );
    if (!enabled) {
      throw new ForbiddenException(
        "The Nix CV builder is not available on your plan. Please contact us to enable it.",
      );
    }
  }

  @Get("profile/status")
  status(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.status(req.user.id);
  }

  @Get("documents")
  documents(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.listDocuments(req.user.id);
  }

  @Post("documents")
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: (_req, file, cb) => {
        if (isAcceptedDocumentMime(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Unsupported file type"), false);
        }
      },
      limits: { fileSize: INDIVIDUAL_DOC_MAX_BYTES },
    }),
  )
  uploadDocument(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadIndividualDocumentDto,
  ) {
    return this.individualProfileService.uploadDocument(
      req.user.id,
      file,
      dto.kind,
      dto.label,
      dto.source,
    );
  }

  @Delete("documents/:id")
  async deleteDocument(
    @Request() req: { user: { id: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.individualProfileService.deleteDocument(req.user.id, id);
    return { message: "Document deleted" };
  }

  @Get("notification-preferences")
  notificationPreferences(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.notificationPreferences(req.user.id);
  }

  @Patch("notification-preferences")
  updateNotificationPreferences(
    @Request() req: { user: { id: number } },
    @Body()
    body: { matchAlertThreshold?: number; digestEnabled?: boolean; pushEnabled?: boolean },
  ) {
    return this.individualProfileService.updateNotificationPreferences(req.user.id, body);
  }

  @Get("data-export")
  dataExport(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.dataExport(req.user.id);
  }

  @Post("account/request-delete")
  requestAccountDeletion(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.requestAccountDeletion(req.user.id);
  }

  @Post("withdraw-consent")
  withdrawConsent(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.withdrawConsent(req.user.id);
  }

  @Get("ee-attributes")
  eeAttributes(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.eeAttributesForUser(req.user.id);
  }

  @Patch("ee-attributes")
  updateEeAttributes(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateSeekerEeAttributesDto,
  ) {
    return this.individualProfileService.updateEeAttributesForUser(req.user.id, {
      populationGroup: dto.populationGroup as EePopulationGroup,
      gender: dto.gender as EeGender,
      disabilityStatus: dto.disabilityStatus as EeDisabilityStatus,
      requiresAccommodation: dto.requiresAccommodation,
      accommodationNotes: dto.accommodationNotes,
      nationalityStatus: dto.nationalityStatus as EeNationalityStatus,
      consentTextVersionId: dto.consentTextVersionId,
      purposes: dto.purposes as EePurpose[],
    });
  }

  @Delete("ee-attributes")
  deleteEeAttributes(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.deleteEeAttributesForUser(req.user.id);
  }

  @Post("nix-wizard/cv-improvements")
  nixCvImprovements(@Request() req: { user: { id: number } }) {
    return this.nixSeekerAssistService.cvImprovements(req.user.id);
  }

  @Post("nix-wizard/generate-cv")
  async nixGenerateCv(@Request() req: { user: { id: number } }) {
    await this.ensureNixCvBuilderEnabled();
    return this.nixSeekerAssistService.generateCv(req.user.id);
  }

  @Get("nix-wizard/generated-cv")
  async nixGeneratedCv(@Request() req: { user: { id: number } }) {
    await this.ensureNixCvBuilderEnabled();
    return this.nixSeekerAssistService.generatedCv(req.user.id);
  }

  @Patch("nix-wizard/generated-cv")
  async nixUpdateGeneratedCv(
    @Request() req: { user: { id: number } },
    @Body() body: NixGeneratedCv,
  ) {
    await this.ensureNixCvBuilderEnabled();
    return this.nixSeekerAssistService.updateGeneratedCv(req.user.id, body);
  }

  @Get("nix-wizard/generated-cv/pdf")
  async nixGeneratedCvPdf(
    @Request() req: { user: { id: number } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.ensureNixCvBuilderEnabled();
    const { cv } = await this.nixSeekerAssistService.generatedCv(req.user.id);
    if (!cv) {
      throw new BadRequestException("Generate your CV with Nix first.");
    }
    const buffer = await this.nixCvPdfService.renderPdf(cv);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Nix-CV.pdf"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }

  @Post("nix-wizard/adopt-cv")
  async adoptNixCv(@Request() req: { user: { id: number } }) {
    await this.ensureNixCvBuilderEnabled();
    const { cv } = await this.nixSeekerAssistService.generatedCv(req.user.id);
    if (!cv) {
      throw new BadRequestException("Generate your CV with Nix first.");
    }
    return this.extractionMetricService.time("orbit-cv-adopt", "nix-cv", async () => {
      const pdf = await this.nixCvPdfService.renderPdf(cv);
      return this.individualProfileService.adoptGeneratedCv(req.user.id, pdf);
    });
  }

  @Get("interview-bookings")
  async myInterviewBookings(@Request() req: { user: { email: string } }) {
    const bookings = await this.interviewBookingService.bookingsForIndividualByEmail(
      req.user.email,
    );
    return bookings.map((b) => ({
      id: b.id,
      slotId: b.slotId,
      candidateId: b.candidateId,
      status: b.status,
      bookedAt: b.bookedAt,
      slot: b.slot
        ? {
            id: b.slot.id,
            startsAt: b.slot.startsAt,
            endsAt: b.slot.endsAt,
            locationLabel: b.slot.locationLabel,
            locationAddress: b.slot.locationAddress,
            locationLat: b.slot.locationLat,
            locationLng: b.slot.locationLng,
            notes: b.slot.notes,
            jobPosting: b.slot.jobPosting
              ? {
                  id: b.slot.jobPosting.id,
                  title: b.slot.jobPosting.title,
                  referenceNumber: b.slot.jobPosting.referenceNumber,
                  companyId: b.slot.jobPosting.companyId,
                }
              : null,
          }
        : null,
    }));
  }

  @Post("calendar-advisory")
  async calendarAdvisory(@Body() body: { conflicts: NixCalendarAdvisoryConflict[] }) {
    const conflicts = body.conflicts ? body.conflicts : [];
    return this.nixSeekerAssistService.calendarAdvisory(conflicts);
  }

  @Get("interview-invites")
  async myOpenInterviewInvites(@Request() req: { user: { email: string } }) {
    const invites = await this.interviewBookingService.openInvitesForIndividualByEmail(
      req.user.email,
    );
    return invites.map((i) => ({
      id: i.id,
      token: i.token,
      candidateId: i.candidateId,
      jobPostingId: i.jobPostingId,
      expiresAt: i.expiresAt,
      usedAt: i.usedAt,
      createdAt: i.createdAt,
      jobPosting: i.jobPosting
        ? {
            id: i.jobPosting.id,
            title: i.jobPosting.title,
            referenceNumber: i.jobPosting.referenceNumber,
            location: i.jobPosting.location,
            province: i.jobPosting.province,
          }
        : null,
    }));
  }
}
