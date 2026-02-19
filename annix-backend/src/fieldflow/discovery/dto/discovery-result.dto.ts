import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DiscoverySource } from "./discover-prospects.dto";

export class DiscoveredBusiness {
  @ApiProperty({ enum: DiscoverySource })
  source: DiscoverySource;

  @ApiProperty()
  externalId: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  streetAddress: string | null;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  province: string | null;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  website: string | null;

  @ApiProperty({ type: [String] })
  businessTypes: string[];

  @ApiPropertyOptional()
  rating: number | null;

  @ApiPropertyOptional()
  userRatingsTotal: number | null;
}

export class DiscoverySearchResult {
  @ApiProperty({ type: [DiscoveredBusiness] })
  discovered: DiscoveredBusiness[];

  @ApiProperty()
  existingMatches: number;

  @ApiProperty()
  totalFound: number;

  @ApiProperty({ type: [String] })
  sourcesQueried: string[];
}

export class DiscoveryImportResult {
  @ApiProperty()
  created: number;

  @ApiProperty()
  duplicates: number;

  @ApiProperty({ type: [Number] })
  createdIds: number[];
}

export class DiscoveryQuota {
  @ApiProperty()
  googleDailyLimit: number;

  @ApiProperty()
  googleUsedToday: number;

  @ApiProperty()
  googleRemaining: number;

  @ApiProperty()
  lastResetAt: string;
}
