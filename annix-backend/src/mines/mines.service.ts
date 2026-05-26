import { Injectable, NotFoundException } from "@nestjs/common";
import { CommodityRepository } from "./commodity.repository";
import {
  CommodityDto,
  CreateSaMineDto,
  LiningCoatingRuleDto,
  MineWithEnvironmentalDataDto,
  SaMineDto,
  SlurryProfileDto,
} from "./dto/mine.dto";
import { Commodity } from "./entities/commodity.entity";
import { LiningCoatingRule } from "./entities/lining-coating-rule.entity";
import { MineType, OperationalStatus, SaMine } from "./entities/sa-mine.entity";
import { RiskLevel, SlurryProfile } from "./entities/slurry-profile.entity";
import { LiningCoatingRuleRepository } from "./lining-coating-rule.repository";
import { SaMineRepository } from "./sa-mine.repository";
import { SlurryProfileRepository } from "./slurry-profile.repository";

@Injectable()
export class MinesService {
  private allMinesCache: SaMineDto[] | null = null;
  private commoditiesCache: CommodityDto[] | null = null;

  constructor(
    private readonly commodityRepo: CommodityRepository,
    private readonly saMineRepo: SaMineRepository,
    private readonly slurryProfileRepo: SlurryProfileRepository,
    private readonly liningCoatingRuleRepo: LiningCoatingRuleRepository,
  ) {}

  private invalidateMinesCache(): void {
    this.allMinesCache = null;
  }

  async getAllCommodities(): Promise<CommodityDto[]> {
    if (this.commoditiesCache) {
      return this.commoditiesCache;
    }
    const commodities = await this.commodityRepo.findAllOrdered();
    const dtos = commodities.map(this.mapCommodityToDto);
    this.commoditiesCache = dtos;
    return dtos;
  }

  async getAllMines(
    commodityId?: number,
    province?: string,
    status?: OperationalStatus,
  ): Promise<SaMineDto[]> {
    const isUnfiltered = !commodityId && !province && !status;

    if (isUnfiltered && this.allMinesCache) {
      return this.allMinesCache;
    }

    const mines = await this.saMineRepo.findFiltered({ commodityId, province, status });
    const dtos = mines.map(this.mapMineToDto);

    if (isUnfiltered) {
      this.allMinesCache = dtos;
    }

    return dtos;
  }

  async getActiveMines(): Promise<SaMineDto[]> {
    return this.getAllMines(undefined, undefined, OperationalStatus.ACTIVE);
  }

  async getMineById(id: number): Promise<SaMineDto> {
    const mine = await this.saMineRepo.findByIdWithCommodity(id);

    if (!mine) {
      throw new NotFoundException(`Mine with ID ${id} not found`);
    }

    return this.mapMineToDto(mine);
  }

  async getMineWithEnvironmentalData(mineId: number): Promise<MineWithEnvironmentalDataDto> {
    const mine = await this.saMineRepo.findByIdWithCommodity(mineId);

    if (!mine) {
      throw new NotFoundException(`Mine with ID ${mineId} not found`);
    }

    const slurryProfile = await this.slurryProfileRepo.findByCommodityWithRelation(
      mine.commodityId,
    );

    let liningRecommendation: LiningCoatingRule | null = null;
    if (slurryProfile) {
      liningRecommendation = await this.getLiningRecommendation(
        slurryProfile.abrasionRisk,
        slurryProfile.corrosionRisk,
      );
    }

    return {
      mine: this.mapMineToDto(mine),
      slurryProfile: slurryProfile ? this.mapSlurryProfileToDto(slurryProfile) : null,
      liningRecommendation: liningRecommendation
        ? this.mapLiningRuleToDto(liningRecommendation)
        : null,
    };
  }

  async getSlurryProfileByCommodity(commodityId: number): Promise<SlurryProfileDto | null> {
    const profile = await this.slurryProfileRepo.findByCommodityWithRelation(commodityId);
    return profile ? this.mapSlurryProfileToDto(profile) : null;
  }

  async getAllSlurryProfiles(): Promise<SlurryProfileDto[]> {
    const profiles = await this.slurryProfileRepo.findAllWithCommodity();
    return profiles.map(this.mapSlurryProfileToDto);
  }

  async getLiningRecommendation(
    abrasionLevel: RiskLevel,
    corrosionLevel: RiskLevel,
  ): Promise<LiningCoatingRule | null> {
    return this.liningCoatingRuleRepo.findTopByRisks(abrasionLevel, corrosionLevel);
  }

  async getAllLiningRules(): Promise<LiningCoatingRuleDto[]> {
    const rules = await this.liningCoatingRuleRepo.findAllOrdered();
    return rules.map(this.mapLiningRuleToDto);
  }

  async getProvinces(): Promise<string[]> {
    return this.saMineRepo.distinctProvinces();
  }

  async createMine(createMineDto: CreateSaMineDto): Promise<SaMineDto> {
    const commodity = await this.commodityRepo.findByIdWithRelations(createMineDto.commodityId);

    if (!commodity) {
      throw new NotFoundException(`Commodity with ID ${createMineDto.commodityId} not found`);
    }

    const savedMine = await this.saMineRepo.createMine({
      mineName: createMineDto.mineName,
      operatingCompany: createMineDto.operatingCompany,
      commodityId: createMineDto.commodityId,
      province: createMineDto.province,
      district: createMineDto.district || null,
      physicalAddress: createMineDto.physicalAddress || null,
      mineType: createMineDto.mineType || MineType.UNDERGROUND,
      operationalStatus: createMineDto.operationalStatus || OperationalStatus.ACTIVE,
      latitude: createMineDto.latitude || null,
      longitude: createMineDto.longitude || null,
    });

    const mineWithRelations = await this.saMineRepo.findCreatedMine(savedMine.id);

    this.invalidateMinesCache();
    return this.mapMineToDto(mineWithRelations);
  }

  private mapCommodityToDto(commodity: Commodity): CommodityDto {
    return {
      id: commodity.id,
      commodityName: commodity.commodityName,
      typicalProcessRoute: commodity.typicalProcessRoute,
      applicationNotes: commodity.applicationNotes,
    };
  }

  private mapMineToDto(mine: SaMine): SaMineDto {
    return {
      id: mine.id,
      mineName: mine.mineName,
      operatingCompany: mine.operatingCompany,
      commodityId: mine.commodityId,
      commodityName: mine.commodity?.commodityName,
      province: mine.province,
      district: mine.district,
      physicalAddress: mine.physicalAddress,
      mineType: mine.mineType,
      operationalStatus: mine.operationalStatus,
      latitude: mine.latitude,
      longitude: mine.longitude,
    };
  }

  private mapSlurryProfileToDto(profile: SlurryProfile): SlurryProfileDto {
    return {
      id: profile.id,
      commodityId: profile.commodityId,
      commodityName: profile.commodity?.commodityName,
      profileName: profile.profileName,
      typicalSgMin: profile.typicalSgMin,
      typicalSgMax: profile.typicalSgMax,
      solidsConcentrationMin: profile.solidsConcentrationMin,
      solidsConcentrationMax: profile.solidsConcentrationMax,
      phMin: profile.phMin,
      phMax: profile.phMax,
      tempMin: profile.tempMin,
      tempMax: profile.tempMax,
      abrasionRisk: profile.abrasionRisk,
      corrosionRisk: profile.corrosionRisk,
      primaryFailureMode: profile.primaryFailureMode,
      notes: profile.notes,
    };
  }

  private mapLiningRuleToDto(rule: LiningCoatingRule): LiningCoatingRuleDto {
    return {
      id: rule.id,
      abrasionLevel: rule.abrasionLevel,
      corrosionLevel: rule.corrosionLevel,
      recommendedLining: rule.recommendedLining,
      recommendedCoating: rule.recommendedCoating,
      applicationNotes: rule.applicationNotes,
      priority: rule.priority,
    };
  }
}
