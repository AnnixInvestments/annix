import { Body, Controller, Get, Patch, Request, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { SeekerReminderPreferencesService } from "../services/seeker-reminder-preferences.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class UpdateReminderPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  interviewReminderEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  interviewReminderSms?: boolean;

  @IsOptional()
  @IsBoolean()
  interviewReminderWhatsapp?: boolean;
}

@Controller("annix-orbit/me/reminder-preferences")
@UseGuards(AnnixOrbitAuthGuard)
export class SeekerReminderPreferencesController {
  constructor(private readonly reminderPreferencesService: SeekerReminderPreferencesService) {}

  @Get()
  async get(@Request() req: SeekerAuthRequest) {
    return this.reminderPreferencesService.get(req.user.id);
  }

  @Patch()
  async update(@Request() req: SeekerAuthRequest, @Body() body: UpdateReminderPreferencesDto) {
    return this.reminderPreferencesService.update(req.user.id, body);
  }
}
