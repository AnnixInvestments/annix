import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Address, ContactDetails } from "../../lib/value-objects";
import { RubberAppProfile } from "../entities/rubber-app-profile.entity";

export class RubberAppProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tradingName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vatNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streetAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  websiteUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpHost?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  smtpPort?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpUser?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPass?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpFromEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpFromName?: string | null;
}

export interface RubberAppProfileResponseDto {
  id: number;
  legalName: string | null;
  tradingName: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  postalAddress: string | null;
  deliveryAddress: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  heroUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  updatedAt: Date;
}

export const toRubberAppProfileResponse = (
  profile: RubberAppProfile,
): RubberAppProfileResponseDto => ({
  id: profile.id,
  legalName: profile.legalName ?? null,
  tradingName: profile.tradingName ?? null,
  vatNumber: profile.vatNumber ?? null,
  registrationNumber: profile.registrationNumber ?? null,
  streetAddress: profile.address?.streetAddress ?? null,
  city: profile.address?.city ?? null,
  province: profile.address?.province ?? null,
  postalCode: profile.address?.postalCode ?? null,
  postalAddress: profile.postalAddress ?? null,
  deliveryAddress: profile.deliveryAddress ?? null,
  phone: profile.contact?.phone ?? null,
  email: profile.contact?.email ?? null,
  websiteUrl: profile.websiteUrl ?? null,
  logoUrl: profile.logoUrl ?? null,
  heroUrl: profile.heroUrl ?? null,
  primaryColor: profile.primaryColor ?? null,
  accentColor: profile.accentColor ?? null,
  smtpHost: profile.smtpHost ?? null,
  smtpPort: profile.smtpPort ?? null,
  smtpUser: profile.smtpUser ?? null,
  smtpPass: profile.smtpPass ?? null,
  smtpFromEmail: profile.smtpFromEmail ?? null,
  smtpFromName: profile.smtpFromName ?? null,
  updatedAt: profile.updatedAt,
});

export const applyRubberAppProfileDto = (
  existing: RubberAppProfile | null,
  dto: RubberAppProfileDto,
): Partial<RubberAppProfile> => {
  const updates: Partial<RubberAppProfile> = {};

  if (dto.legalName !== undefined) updates.legalName = dto.legalName ?? null;
  if (dto.tradingName !== undefined) updates.tradingName = dto.tradingName ?? null;
  if (dto.vatNumber !== undefined) updates.vatNumber = dto.vatNumber ?? null;
  if (dto.registrationNumber !== undefined) {
    updates.registrationNumber = dto.registrationNumber ?? null;
  }
  if (dto.postalAddress !== undefined) updates.postalAddress = dto.postalAddress ?? null;
  if (dto.deliveryAddress !== undefined) updates.deliveryAddress = dto.deliveryAddress ?? null;
  if (dto.websiteUrl !== undefined) updates.websiteUrl = dto.websiteUrl ?? null;
  if (dto.logoUrl !== undefined) updates.logoUrl = dto.logoUrl ?? null;
  if (dto.heroUrl !== undefined) updates.heroUrl = dto.heroUrl ?? null;
  if (dto.primaryColor !== undefined) updates.primaryColor = dto.primaryColor ?? null;
  if (dto.accentColor !== undefined) updates.accentColor = dto.accentColor ?? null;
  if (dto.smtpHost !== undefined) updates.smtpHost = dto.smtpHost ?? null;
  if (dto.smtpPort !== undefined) updates.smtpPort = dto.smtpPort ?? null;
  if (dto.smtpUser !== undefined) updates.smtpUser = dto.smtpUser ?? null;
  if (dto.smtpPass !== undefined) updates.smtpPass = dto.smtpPass ?? null;
  if (dto.smtpFromEmail !== undefined) updates.smtpFromEmail = dto.smtpFromEmail ?? null;
  if (dto.smtpFromName !== undefined) updates.smtpFromName = dto.smtpFromName ?? null;

  const touchesAddress =
    dto.streetAddress !== undefined ||
    dto.city !== undefined ||
    dto.province !== undefined ||
    dto.postalCode !== undefined;
  if (touchesAddress) {
    updates.address = Address.fromParts({
      streetAddress: dto.streetAddress ?? existing?.address?.streetAddress ?? null,
      city: dto.city ?? existing?.address?.city ?? null,
      province: dto.province ?? existing?.address?.province ?? null,
      postalCode: dto.postalCode ?? existing?.address?.postalCode ?? null,
    });
  }

  const touchesContact = dto.phone !== undefined || dto.email !== undefined;
  if (touchesContact) {
    updates.contact = ContactDetails.fromParts({
      phone: dto.phone ?? existing?.contact?.phone ?? null,
      email: dto.email ?? existing?.contact?.email ?? null,
    });
  }

  return updates;
};
