import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commodity } from './entities/commodity.entity';
import { SaMine, OperationalStatus } from './entities/sa-mine.entity';
import { SlurryProfile, RiskLevel } from './entities/slurry-profile.entity';
import { LiningCoatingRule } from './entities/lining-coating-rule.entity';
import {
  CommodityDto,
  SaMineDto,
  SlurryProfileDto,
  LiningCoatingRuleDto,
  MineWithEnvironmentalDataDto,
} from './dto/mine.dto';

@Injectable()
export class MinesService {
  constructor(
    @InjectRepository(Commodity)
    private commodityRepository: Repository<Commodity>,
    @InjectRepository(SaMine)
    private saMineRepository: Repository<SaMine>,
    @InjectRepository(SlurryProfile)
    private slurryProfileRepository: Repository<SlurryProfile>,
    @InjectRepository(LiningCoatingRule)
    private liningCoatingRuleRepository: Repository<LiningCoatingRule>,
  ) {}

  async getAllCommodities(): Promise<CommodityDto[]> {
    const commodities = await this.commodityRepository.find({
      order: { commodityName: 'ASC' },
    });
    return commodities.map(this.mapCommodityToDto);
  }

  async getAllMines(
    commodityId?: number,
    province?: string,
    status?: OperationalStatus,
  ): Promise<SaMineDto[]> {
    const query = this.saMineRepository
      .createQueryBuilder('mine')
      .leftJoinAndSelect('mine.commodity', 'commodity')
      .orderBy('mine.mineName', 'ASC');

    if (commodityId) {
      query.andWhere('mine.commodityId = :commodityId', { commodityId });
    }

    if (province) {
      query.andWhere('mine.province = :province', { province });
    }

    if (status) {
      query.andWhere('mine.operationalStatus = :status', { status });
    }

    const mines = await query.getMany();
    return mines.map(this.mapMineToDto);
  }

  async getActiveMines(): Promise<SaMineDto[]> {
    return this.getAllMines(undefined, undefined, OperationalStatus.ACTIVE);
  }

  async getMineById(id: number): Promise<SaMineDto> {
    const mine = await this.saMineRepository.findOne({
      where: { id },
      relations: ['commodity'],
    });

    if (!mine) {
      throw new NotFoundException(`Mine with ID ${id} not found`);
    }

    return this.mapMineToDto(mine);
  }

  async getMineWithEnvironmentalData(mineId: number): Promise<MineWithEnvironmentalDataDto> {
    const mine = await this.saMineRepository.findOne({
      where: { id: mineId },
      relations: ['commodity'],
    });

    if (!mine) {
      throw new NotFoundException(`Mine with ID ${mineId} not found`);
    }

    // Get slurry profile for this commodity
    const slurryProfile = await this.slurryProfileRepository.findOne({
      where: { commodityId: mine.commodityId },
      relations: ['commodity'],
    });

    // Get lining recommendation based on slurry profile risks
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
    const profile = await this.slurryProfileRepository.findOne({
      where: { commodityId },
      relations: ['commodity'],
    });

    return profile ? this.mapSlurryProfileToDto(profile) : null;
  }

  async getAllSlurryProfiles(): Promise<SlurryProfileDto[]> {
    const profiles = await this.slurryProfileRepository.find({
      relations: ['commodity'],
      order: { commodityId: 'ASC' },
    });
    return profiles.map(this.mapSlurryProfileToDto);
  }

  async getLiningRecommendation(
    abrasionLevel: RiskLevel,
    corrosionLevel: RiskLevel,
  ): Promise<LiningCoatingRule | null> {
    return this.liningCoatingRuleRepository.findOne({
      where: {
        abrasionLevel,
        corrosionLevel,
      },
      order: { priority: 'DESC' },
    });
  }

  async getAllLiningRules(): Promise<LiningCoatingRuleDto[]> {
    const rules = await this.liningCoatingRuleRepository.find({
      order: { abrasionLevel: 'ASC', corrosionLevel: 'ASC' },
    });
    return rules.map(this.mapLiningRuleToDto);
  }

  async getProvinces(): Promise<string[]> {
    const result = await this.saMineRepository
      .createQueryBuilder('mine')
      .select('DISTINCT mine.province', 'province')
      .orderBy('mine.province', 'ASC')
      .getRawMany();
    return result.map((r) => r.province);
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
