import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { MineType, OperationalStatus } from '../entities/sa-mine.entity';
import { RiskLevel } from '../entities/slurry-profile.entity';

export class CommodityDto {
  id: number;
  commodityName: string;
  typicalProcessRoute: string | null;
  applicationNotes: string | null;
}

export class SaMineDto {
  id: number;
  mineName: string;
  operatingCompany: string;
  commodityId: number;
  commodityName?: string;
  province: string;
  district: string | null;
  physicalAddress: string | null;
  mineType: MineType;
  operationalStatus: OperationalStatus;
  latitude: number | null;
  longitude: number | null;
}

export class SlurryProfileDto {
  id: number;
  commodityId: number;
  commodityName?: string;
  profileName: string | null;
  typicalSgMin: number;
  typicalSgMax: number;
  solidsConcentrationMin: number;
  solidsConcentrationMax: number;
  phMin: number;
  phMax: number;
  tempMin: number;
  tempMax: number;
  abrasionRisk: RiskLevel;
  corrosionRisk: RiskLevel;
  primaryFailureMode: string | null;
  notes: string | null;
}

export class LiningCoatingRuleDto {
  id: number;
  abrasionLevel: RiskLevel;
  corrosionLevel: RiskLevel;
  recommendedLining: string;
  recommendedCoating: string | null;
  applicationNotes: string | null;
  priority: number;
}

export class MineWithEnvironmentalDataDto {
  mine: SaMineDto;
  slurryProfile: SlurryProfileDto | null;
  liningRecommendation: LiningCoatingRuleDto | null;
}

export class CreateCommodityDto {
  @IsString()
  @IsNotEmpty()
  commodityName: string;

  @IsString()
  @IsOptional()
  typicalProcessRoute?: string;

  @IsString()
  @IsOptional()
  applicationNotes?: string;
}

export class CreateSaMineDto {
  @IsString()
  @IsNotEmpty()
  mineName: string;

  @IsString()
  @IsNotEmpty()
  operatingCompany: string;

  @IsNumber()
  commodityId: number;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  physicalAddress?: string;

  @IsEnum(MineType)
  @IsOptional()
  mineType?: MineType;

  @IsEnum(OperationalStatus)
  @IsOptional()
  operationalStatus?: OperationalStatus;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
