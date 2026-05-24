import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelUpdatePreferencesDto } from "./dto/update-preferences.dto";
import { AnnixSentinelNotificationPreferences } from "./entities/notification-preferences.entity";
import { AnnixSentinelNotificationsService } from "./notifications.service";

@ApiTags("annix-sentinel/notifications")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/notifications")
export class AnnixSentinelNotificationsController {
  constructor(
    private readonly notificationsService: AnnixSentinelNotificationsService,
    @InjectRepository(AnnixSentinelNotificationPreferences)
    private readonly preferencesRepository: Repository<AnnixSentinelNotificationPreferences>,
  ) {}

  @Get()
  async unread(@Req() req: { user: { userId: number } }) {
    return this.notificationsService.unreadForUser(req.user.userId);
  }

  @Patch(":id/read")
  async markRead(@Param("id", ParseIntPipe) id: number) {
    return this.notificationsService.markRead(id);
  }

  @Get("preferences")
  async preferences(@Req() req: { user: { userId: number } }) {
    const existing = await this.preferencesRepository.findOne({
      where: { userId: req.user.userId },
    });

    if (existing !== null) {
      return existing;
    }

    const defaults = this.preferencesRepository.create({
      userId: req.user.userId,
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      inAppEnabled: true,
      weeklyDigest: true,
      phone: null,
    });

    return this.preferencesRepository.save(defaults);
  }

  @Put("preferences")
  async updatePreferences(
    @Req() req: { user: { userId: number } },
    @Body() dto: AnnixSentinelUpdatePreferencesDto,
  ) {
    const existing = await this.preferencesRepository.findOne({
      where: { userId: req.user.userId },
    });

    if (existing !== null) {
      const updated = this.preferencesRepository.merge(existing, dto);
      return this.preferencesRepository.save(updated);
    }

    const preferences = this.preferencesRepository.create({
      userId: req.user.userId,
      ...dto,
    });

    return this.preferencesRepository.save(preferences);
  }
}
