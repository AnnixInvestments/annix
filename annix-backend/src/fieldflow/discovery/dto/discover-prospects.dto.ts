import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export enum DiscoverySource {
  GOOGLE_PLACES = "google_places",
  YELLOW_PAGES = "yellow_pages",
  OSM = "osm",
}

export class DiscoverProspectsDto {
  @ApiProperty({ description: "Center latitude for search" })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: "Center longitude for search" })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: "Search radius in kilometers", default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({
    description: "Data sources to query",
    enum: DiscoverySource,
    isArray: true,
    default: [DiscoverySource.GOOGLE_PLACES],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DiscoverySource, { each: true })
  sources?: DiscoverySource[];

  @ApiPropertyOptional({ description: "Custom search terms to use" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchTerms?: string[];
}

export class ImportDiscoveredBusinessesDto {
  @ApiProperty({ description: "IDs of discovered businesses to import" })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  externalIds: string[];

  @ApiProperty({ description: "Source of the businesses", enum: DiscoverySource })
  @IsEnum(DiscoverySource)
  source: DiscoverySource;
}
