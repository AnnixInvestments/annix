import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  INDIVIDUAL_DOC_MAX_BYTES,
  isAcceptedDocumentMime,
} from "../config/individual-documents.config";
import { UploadIndividualDocumentDto } from "../dto/individual-profile.dto";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { IndividualProfileService } from "../services/individual-profile.service";
import { InterviewBookingService } from "../services/interview-booking.service";
import { NixSeekerAssistService } from "../services/nix-seeker-assist.service";

@Controller("cv-assistant/me")
@UseGuards(CvAssistantAuthGuard)
export class IndividualProfileController {
  constructor(
    private readonly individualProfileService: IndividualProfileService,
    private readonly nixSeekerAssistService: NixSeekerAssistService,
    private readonly interviewBookingService: InterviewBookingService,
  ) {}

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
    return this.individualProfileService.uploadDocument(req.user.id, file, dto.kind, dto.label);
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

  @Post("nix-wizard/cv-improvements")
  nixCvImprovements(@Request() req: { user: { id: number } }) {
    return this.nixSeekerAssistService.cvImprovements(req.user.id);
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
