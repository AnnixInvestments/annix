import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { RequestWhatsAppConsentDto } from "../dto/request-whatsapp-consent.dto";
import {
  type RequestConsentResult,
  WhatsAppConsentSenderService,
} from "../services/whatsapp-consent-sender.service";

@ApiTags("Admin RBAC")
@Controller("admin/rbac")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class WhatsAppConsentAdminController {
  constructor(private readonly sender: WhatsAppConsentSenderService) {}

  @Post("users/:userId/request-whatsapp-consent")
  @ApiOperation({ summary: "Ask a user to consent to WhatsApp updates by email or WhatsApp" })
  @ApiParam({ name: "userId", description: "User ID", example: 42 })
  @ApiResponse({ status: 201, description: "Consent request sent" })
  @ApiResponse({ status: 400, description: "No usable contact channel for this user" })
  @ApiResponse({ status: 404, description: "User not found" })
  async requestWhatsAppConsent(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() dto: RequestWhatsAppConsentDto,
  ): Promise<RequestConsentResult> {
    return this.sender.requestConsent(userId, dto.channel ?? "email");
  }
}
