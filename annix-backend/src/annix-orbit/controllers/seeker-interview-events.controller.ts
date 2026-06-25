import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { SeekerInterviewEventsService } from "../services/seeker-interview-events.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class CreateInterviewEventDto {
  @IsOptional()
  @IsInt()
  applyClickId?: number | null;

  @IsOptional()
  @IsInt()
  externalJobId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleTitle?: string | null;

  @IsISO8601()
  startsAt: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  locationAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

class UpdateInterviewEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleTitle?: string | null;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  locationAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

@Controller("annix-orbit/me/interview-events")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.INDIVIDUAL)
export class SeekerInterviewEventsController {
  constructor(private readonly interviewEventsService: SeekerInterviewEventsService) {}

  @Get()
  async list(@Request() req: SeekerAuthRequest) {
    const events = await this.interviewEventsService.listForSeeker(req.user.email);
    return { events };
  }

  @Post()
  async create(@Request() req: SeekerAuthRequest, @Body() body: CreateInterviewEventDto) {
    const event = await this.interviewEventsService.create(req.user.email, body);
    if (!event) {
      throw new BadRequestException("Could not save the interview. Check the date and try again.");
    }
    return { event };
  }

  @Patch(":id")
  async update(
    @Request() req: SeekerAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateInterviewEventDto,
  ) {
    const event = await this.interviewEventsService.update(req.user.email, id, body);
    if (!event) {
      throw new NotFoundException("Interview not found");
    }
    return { event };
  }

  @Delete(":id")
  async cancel(@Request() req: SeekerAuthRequest, @Param("id", ParseIntPipe) id: number) {
    const cancelled = await this.interviewEventsService.cancel(req.user.email, id);
    if (!cancelled) {
      throw new NotFoundException("Interview not found");
    }
    return { success: true };
  }
}
