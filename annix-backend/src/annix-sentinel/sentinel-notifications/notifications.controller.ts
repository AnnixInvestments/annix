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
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelUpdatePreferencesDto } from "./dto/update-preferences.dto";
import { AnnixSentinelNotificationsService } from "./notifications.service";

@ApiTags("annix-sentinel/notifications")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/notifications")
export class AnnixSentinelNotificationsController {
  constructor(private readonly notificationsService: AnnixSentinelNotificationsService) {}

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
    return this.notificationsService.preferencesForUser(req.user.userId);
  }

  @Put("preferences")
  async updatePreferences(
    @Req() req: { user: { userId: number } },
    @Body() dto: AnnixSentinelUpdatePreferencesDto,
  ) {
    return this.notificationsService.upsertPreferences(req.user.userId, dto);
  }
}
