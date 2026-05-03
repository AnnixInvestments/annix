import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { InterviewBookingService } from "../services/interview-booking.service";

interface CreateSlotBody {
  startsAt?: string;
  endsAt?: string;
  locationLabel?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  capacity?: number;
  notes?: string;
}

const parseDate = (value: string | undefined, label: string): Date => {
  if (!value) throw new BadRequestException(`${label} is required`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} is not a valid ISO datetime`);
  }
  return parsed;
};

@Controller("cv-assistant/interview-slots")
@UseGuards(CvAssistantAuthGuard)
export class InterviewBookingController {
  constructor(private readonly bookings: InterviewBookingService) {}

  @Get()
  async listForCompany(
    @Request() req: { user: { companyId: number } },
    @Query("from") from?: string,
  ) {
    return this.bookings.listSlotsForCompany(req.user.companyId, from ?? null);
  }

  @Get("by-job/:jobId")
  async listForJob(
    @Request() req: { user: { companyId: number } },
    @Param("jobId", ParseIntPipe) jobId: number,
  ) {
    return this.bookings.listSlotsForJob(req.user.companyId, jobId);
  }

  @Post("by-job/:jobId")
  async createSlot(
    @Request() req: { user: { companyId: number } },
    @Param("jobId", ParseIntPipe) jobId: number,
    @Body() body: CreateSlotBody,
  ) {
    return this.bookings.createSlot(req.user.companyId, jobId, {
      startsAt: parseDate(body.startsAt, "startsAt"),
      endsAt: parseDate(body.endsAt, "endsAt"),
      locationLabel: body.locationLabel ?? null,
      locationAddress: body.locationAddress ?? null,
      locationLat: body.locationLat ?? null,
      locationLng: body.locationLng ?? null,
      capacity: body.capacity ?? 1,
      notes: body.notes ?? null,
    });
  }

  @Delete(":slotId")
  async deleteSlot(
    @Request() req: { user: { companyId: number } },
    @Param("slotId", ParseIntPipe) slotId: number,
  ) {
    return this.bookings.deleteSlot(req.user.companyId, slotId);
  }

  @Post("invite/:candidateId")
  async sendInvite(
    @Request() req: { user: { companyId: number } },
    @Param("candidateId", ParseIntPipe) candidateId: number,
  ) {
    return this.bookings.sendInviteToCandidate(req.user.companyId, candidateId);
  }
}
