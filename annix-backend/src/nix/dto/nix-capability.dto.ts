import { ApiProperty } from "@nestjs/swagger";
import type { INixCapability } from "../capabilities";

/**
 * Frontend-facing representation of an INixCapability. Strips runtime-only
 * fields (handler instances, systemPrompt callable) and exposes only
 * serialisable metadata.
 */
export class NixCapabilityDto {
  @ApiProperty({ description: "Globally unique capability key (e.g. 'rfq.extract-boq')" })
  key!: string;

  @ApiProperty({ description: "Owning app code (e.g. 'rfq', 'stock-control')" })
  appCode!: string;

  @ApiProperty({ description: "Short human-readable label" })
  label!: string;

  @ApiProperty({ description: "One-sentence description for users" })
  description!: string;

  @ApiProperty({
    description: "Phrases / keywords this capability matches in chat intent routing",
    type: [String],
    required: false,
  })
  intents?: string[];

  @ApiProperty({
    description: "Slug of a how-to guide (under <appCode>/how-to/guides/) for walkthrough mode",
    required: false,
  })
  guideSlug?: string;

  @ApiProperty({ description: "True if this capability has a walkthrough definition" })
  hasWalkthrough!: boolean;

  @ApiProperty({
    description: "True if this capability delegates to an extraction profile handler",
  })
  hasExtractionProfile!: boolean;

  static from(capability: INixCapability): NixCapabilityDto {
    const dto = new NixCapabilityDto();
    dto.key = capability.key;
    dto.appCode = capability.appCode;
    dto.label = capability.label;
    dto.description = capability.description;
    if (capability.intents) {
      dto.intents = [...capability.intents];
    }
    if (capability.guideSlug) {
      dto.guideSlug = capability.guideSlug;
    }
    dto.hasWalkthrough = capability.walkthrough !== undefined;
    dto.hasExtractionProfile = capability.extractionProfile !== undefined;
    return dto;
  }
}

export class NixAppDto {
  @ApiProperty({ description: "App code" })
  appCode!: string;

  @ApiProperty({ description: "Number of registered capabilities for this app" })
  capabilityCount!: number;
}
