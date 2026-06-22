import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { SubmitEeDisclosureDto } from "../dto/ee-disclosure.dto";
import type { EePurpose } from "../entities/annix-orbit-candidate-ee-attributes.entity";
import {
  EeConsentSource,
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import { EeDisclosureService } from "../services/ee-disclosure.service";

@Controller("public/annix-orbit/ee-disclosure")
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class PublicEeDisclosureController {
  constructor(private readonly disclosure: EeDisclosureService) {}

  @Get(":token")
  async lookup(@Param("token") token: string) {
    if (!token) throw new NotFoundException("Token is required");
    return this.disclosure.lookupByToken(token);
  }

  @Post(":token")
  async submit(@Param("token") token: string, @Body() body: SubmitEeDisclosureDto) {
    if (!token) throw new NotFoundException("Token is required");
    await this.disclosure.submitDisclosure(token, {
      populationGroup: body.populationGroup as EePopulationGroup,
      gender: body.gender as EeGender,
      disabilityStatus: body.disabilityStatus as EeDisabilityStatus,
      requiresAccommodation: body.requiresAccommodation,
      accommodationNotes: body.accommodationNotes,
      nationalityStatus: body.nationalityStatus as EeNationalityStatus,
      purposes: body.purposes as EePurpose[],
    });
    return { ok: true, source: EeConsentSource.POST_APPLICATION_EMAIL };
  }
}
