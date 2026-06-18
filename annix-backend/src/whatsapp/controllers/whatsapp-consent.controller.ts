import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { WhatsAppConsentContext, WhatsAppConsentResult } from "../dto/whatsapp-consent.dto";
import { SubmitWhatsAppConsentDto } from "../dto/whatsapp-consent.dto";
import { WhatsAppConsentService } from "../services/whatsapp-consent.service";

@ApiExcludeController()
@Controller("public/whatsapp-consent")
export class WhatsAppConsentController {
  constructor(private readonly consentService: WhatsAppConsentService) {}

  @Get(":token")
  context(@Param("token") token: string): Promise<WhatsAppConsentContext> {
    return this.consentService.context(token);
  }

  @Post(":token")
  submit(
    @Param("token") token: string,
    @Body() dto: SubmitWhatsAppConsentDto,
  ): Promise<WhatsAppConsentResult> {
    return this.consentService.submit(token, {
      whatsappPhone: dto.whatsappPhone,
      consent: dto.consent,
    });
  }
}
