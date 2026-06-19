import { ApiProperty } from "@nestjs/swagger";
export enum SystemStandard {
  ISO_12944 = "ISO 12944",
  NORSOK_M501 = "NORSOK M-501",
  SSPC = "SSPC",
  AS_NZS_2312 = "AS/NZS 2312",
  ISO_21809 = "ISO 21809",
}

export enum SystemApplication {
  EXTERNAL_ATMOSPHERIC = "external_atmospheric",
  EXTERNAL_BURIED = "external_buried",
  EXTERNAL_SUBMERGED = "external_submerged",
  INTERNAL_DRY = "internal_dry",
  INTERNAL_IMMERSION = "internal_immersion",
  INTERNAL_ABRASIVE = "internal_abrasive",
  HIGH_TEMPERATURE = "high_temperature",
  FIRE_PROTECTION = "fire_protection",
}

export class CoatingSystem {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "System code (e.g., ISO system number)",
    example: "C4.07",
  })
  systemCode: string;

  @ApiProperty({ description: "System name" })
  systemName: string;

  @ApiProperty({ description: "Coating standard", enum: SystemStandard })
  systemStandard: SystemStandard;

  @ApiProperty({ description: "Application type", enum: SystemApplication })
  application: SystemApplication;

  @ApiProperty({ description: "Full system description" })
  description: string;

  @ApiProperty({ description: "Supported corrosivity categories (comma-separated)" })
  corrosivityCategories: string;

  @ApiProperty({ description: "Supported durability classes (comma-separated)" })
  durabilityClasses: string;

  @ApiProperty({ description: "Minimum total DFT in microns" })
  minTotalDftUm: number;

  @ApiProperty({ description: "Maximum total DFT in microns" })
  maxTotalDftUm: number;

  @ApiProperty({ description: "Number of coats" })
  numberOfCoats: number;

  @ApiProperty({ description: "Required surface preparation grade" })
  surfacePrepGrade: string;

  @ApiProperty({ description: "Coat specifications as JSON array" })
  coatSpecifications: Array<{
    coatNumber: number;
    coatType: string;
    genericType: string;
    minDftUm: number;
    maxDftUm: number;
    recoatWindowHours?: string;
  }>;

  @ApiProperty({ description: "Primer generic type" })
  primerType: string;

  @ApiProperty({ description: "Intermediate coat generic type", required: false })
  intermediateType?: string;

  @ApiProperty({ description: "Topcoat generic type", required: false })
  topcoatType?: string;

  @ApiProperty({ description: "Minimum operating temperature in Celsius", required: false })
  minOperatingTempC?: number;

  @ApiProperty({ description: "Maximum operating temperature in Celsius", required: false })
  maxOperatingTempC?: number;

  @ApiProperty({ description: "Chemical resistance notes", required: false })
  chemicalResistance?: string;

  @ApiProperty({ description: "UV resistance rating", required: false })
  uvResistance?: string;

  @ApiProperty({ description: "Is this a recommended/preferred system" })
  isRecommended: boolean;

  @ApiProperty({ description: "System is active", default: true })
  isActive: boolean;

  @ApiProperty({ description: "Additional notes", required: false })
  notes?: string;

  createdAt: Date;

  updatedAt: Date;
}
