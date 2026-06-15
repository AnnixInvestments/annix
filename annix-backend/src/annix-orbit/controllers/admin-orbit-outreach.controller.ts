import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import {
  OrbitOutreachService,
  type OutreachEnvironment,
  type SendOutreachInput,
} from "../services/orbit-outreach.service";

class UploadOutreachAssetDto {
  @IsIn(["iphone-guide", "android-guide", "fbw-guide", "extra"])
  slot: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  label?: string;
}

class OutreachRecipientDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ageRange?: string;

  @IsOptional()
  @IsIn(["iphone", "android"])
  device?: string;
}

class SendOutreachDto {
  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(20000)
  body: string;

  @IsIn(["prod", "test"])
  environment: OutreachEnvironment;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutreachRecipientDto)
  recipients: OutreachRecipientDto[];

  @IsBoolean()
  includeDeviceGuide: boolean;

  @IsBoolean()
  includeFbwGuide: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraAssetIds?: string[];

  @IsOptional()
  @IsBoolean()
  trackEarlyAccess?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  provisionTier?: string;
}

class ScheduleOutreachDto extends SendOutreachDto {
  @IsDateString()
  scheduledAt: string;
}

@Controller("admin/annix-orbit/outreach")
@UseGuards(AdminAuthGuard)
export class AdminOrbitOutreachController {
  constructor(private readonly service: OrbitOutreachService) {}

  private toInput(dto: SendOutreachDto): SendOutreachInput {
    return {
      subject: dto.subject,
      body: dto.body,
      environment: dto.environment,
      recipients: dto.recipients.map((r) => ({
        email: r.email,
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        mobile: r.mobile ?? null,
        ageRange: r.ageRange ?? null,
        device: r.device ?? null,
      })),
      includeDeviceGuide: dto.includeDeviceGuide,
      includeFbwGuide: dto.includeFbwGuide,
      extraAssetIds: dto.extraAssetIds ?? [],
      trackEarlyAccess: dto.trackEarlyAccess ?? false,
      provisionTier: dto.provisionTier ?? null,
    };
  }

  @Get("assets")
  assets() {
    return this.service.listAssets();
  }

  @Post("assets")
  @UseInterceptors(FileInterceptor("file"))
  uploadAsset(@Body() dto: UploadOutreachAssetDto, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadAsset(dto.slot, dto.label ?? null, file);
  }

  @Delete("assets/:id")
  async deleteAsset(@Param("id") id: string) {
    await this.service.deleteAsset(id);
    return { ok: true };
  }

  @Post("send")
  send(@Body() dto: SendOutreachDto) {
    return this.service.send(this.toInput(dto));
  }

  @Get("schedules")
  schedules() {
    return this.service.listSchedules();
  }

  @Post("schedule")
  schedule(@Body() dto: ScheduleOutreachDto) {
    return this.service.schedule(this.toInput(dto), dto.scheduledAt);
  }

  @Delete("schedules/:id")
  async cancelSchedule(@Param("id") id: string) {
    await this.service.cancelSchedule(id);
    return { ok: true };
  }

  @Post("dispatch-now")
  dispatchNow() {
    return this.service.runDueSchedulesNow();
  }
}
