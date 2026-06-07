import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { EE_POPULATION_GROUP_VALUES } from "../dto/ee-disclosure.dto";
import { OrbitEarlyAccessService } from "../services/orbit-early-access.service";

export const EARLY_ACCESS_AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;

class EarlyAccessSignupDto {
  @IsString()
  @MaxLength(120)
  firstName: string;

  @IsString()
  @MaxLength(120)
  lastName: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsString()
  @MaxLength(40)
  mobileNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  currentRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  yearsExperience?: string;

  @IsOptional()
  @IsIn(EARLY_ACCESS_AGE_RANGES)
  ageRange?: string;

  @IsOptional()
  @IsIn(EE_POPULATION_GROUP_VALUES)
  ethnicBackground?: string;

  @IsBoolean()
  consentToContact: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  referredBy?: string;
}

@Controller("annix-orbit/public/early-access")
export class PublicEarlyAccessController {
  constructor(private readonly service: OrbitEarlyAccessService) {}

  @Get("count")
  async count() {
    const total = await this.service.totalCount();
    return { total };
  }

  @Post()
  async signup(@Body() dto: EarlyAccessSignupDto) {
    if (!dto.consentToContact) {
      throw new BadRequestException("Consent is required to join the early-access list.");
    }
    return this.service.signup({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      mobileNumber: dto.mobileNumber,
      currentRole: dto.currentRole ?? null,
      industry: dto.industry ?? null,
      yearsExperience: dto.yearsExperience ?? null,
      ageRange: dto.ageRange ?? null,
      ethnicBackground: dto.ethnicBackground ?? null,
      consentToContact: dto.consentToContact,
      source: dto.source ?? null,
      campaign: dto.campaign ?? null,
      platform: dto.platform ?? null,
      referredBy: dto.referredBy ?? null,
    });
  }
}
