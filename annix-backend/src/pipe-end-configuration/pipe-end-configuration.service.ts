import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipeEndConfiguration } from './entities/pipe-end-configuration.entity';

export type FlangeType = 'fixed' | 'loose' | 'rotating' | null;
export type ItemType = 'pipe' | 'bend' | 'fitting';

export interface FlangeConfiguration {
  hasInlet: boolean;
  hasOutlet: boolean;
  hasBranch: boolean;
  inletType: FlangeType;
  outletType: FlangeType;
  branchType: FlangeType;
  totalFlanges: number;
  hasTackWelds: boolean;
  tackWeldCountPerFlange: number;
  tackWeldLengthMm: number;
}

export interface BoltSetCount {
  mainBoltSets: number;
  branchBoltSets: number;
}

export interface StubFlangeConfig {
  nominalBoreMm: number;
  flangeSpec: string;
}

@Injectable()
export class PipeEndConfigurationService {
  constructor(
    @InjectRepository(PipeEndConfiguration)
    private pipeEndConfigurationRepository: Repository<PipeEndConfiguration>,
  ) {}

  async findAll(): Promise<PipeEndConfiguration[]> {
    return this.pipeEndConfigurationRepository.find({
      relations: ['weldType'],
    });
  }

  async findByCode(configCode: string): Promise<PipeEndConfiguration | null> {
    return this.pipeEndConfigurationRepository.findOne({
      where: { config_code: configCode },
      relations: ['weldType'],
    });
  }

  async findByItemType(itemType: ItemType): Promise<PipeEndConfiguration[]> {
    const whereClause: any = {};

    if (itemType === 'pipe') {
      whereClause.applies_to_pipe = true;
    } else if (itemType === 'bend') {
      whereClause.applies_to_bend = true;
    } else if (itemType === 'fitting') {
      whereClause.applies_to_fitting = true;
    }

    return this.pipeEndConfigurationRepository.find({
      where: whereClause,
      relations: ['weldType'],
    });
  }

  async getWeldCountForConfig(
    configCode: string,
    itemType?: ItemType,
  ): Promise<number> {
    const config = await this.findByCode(configCode);
    if (!config) return 0;

    // Verify the config applies to the item type
    if (itemType) {
      if (itemType === 'pipe' && !config.applies_to_pipe) return 0;
      if (itemType === 'bend' && !config.applies_to_bend) return 0;
      if (itemType === 'fitting' && !config.applies_to_fitting) return 0;
    }

    return config.weld_count;
  }

  async getFlangeConfiguration(
    configCode: string,
  ): Promise<FlangeConfiguration> {
    const config = await this.findByCode(configCode);

    if (!config) {
      return {
        hasInlet: false,
        hasOutlet: false,
        hasBranch: false,
        inletType: null,
        outletType: null,
        branchType: null,
        totalFlanges: 0,
        hasTackWelds: false,
        tackWeldCountPerFlange: 0,
        tackWeldLengthMm: 0,
      };
    }

    // Determine flange types for each end
    const inletType: FlangeType = config.has_fixed_flange_end1
      ? 'fixed'
      : config.has_loose_flange_end1
        ? 'loose'
        : config.has_rotating_flange_end1
          ? 'rotating'
          : null;

    const outletType: FlangeType = config.has_fixed_flange_end2
      ? 'fixed'
      : config.has_loose_flange_end2
        ? 'loose'
        : config.has_rotating_flange_end2
          ? 'rotating'
          : null;

    const branchType: FlangeType = config.has_fixed_flange_end3
      ? 'fixed'
      : config.has_loose_flange_end3
        ? 'loose'
        : config.has_rotating_flange_end3
          ? 'rotating'
          : null;

    return {
      hasInlet: inletType !== null,
      hasOutlet: outletType !== null,
      hasBranch: branchType !== null,
      inletType,
      outletType,
      branchType,
      totalFlanges: config.total_flanges,
      hasTackWelds: config.has_tack_welds,
      tackWeldCountPerFlange: config.tack_weld_count_per_flange,
      tackWeldLengthMm: Number(config.tack_weld_length_mm),
    };
  }

  async getBoltSetCount(
    configCode: string,
    hasEqualBranch: boolean = true,
  ): Promise<BoltSetCount> {
    const config = await this.findByCode(configCode);

    if (!config) {
      return { mainBoltSets: 0, branchBoltSets: 0 };
    }

    // For fittings with unequal branches
    if (config.applies_to_fitting && !hasEqualBranch) {
      const mainFlangeCount =
        (config.has_fixed_flange_end1 ||
        config.has_loose_flange_end1 ||
        config.has_rotating_flange_end1
          ? 1
          : 0) +
        (config.has_fixed_flange_end2 ||
        config.has_loose_flange_end2 ||
        config.has_rotating_flange_end2
          ? 1
          : 0);

      const branchFlangeCount =
        config.has_fixed_flange_end3 ||
        config.has_loose_flange_end3 ||
        config.has_rotating_flange_end3
          ? 1
          : 0;

      return {
        mainBoltSets: mainFlangeCount,
        branchBoltSets: branchFlangeCount,
      };
    }

    // For pipes, bends, and fittings with equal branches
    return {
      mainBoltSets: config.bolt_sets_per_config,
      branchBoltSets: 0,
    };
  }

  hasLooseFlange(configCode: string): boolean {
    return (
      configCode.includes('_LF') ||
      configCode.includes('FOE_LF') ||
      configCode === '2xLF'
    );
  }

  async getPhysicalFlangeCount(configCode: string): Promise<number> {
    const config = await this.findByCode(configCode);
    if (!config) return 0;

    return config.total_flanges;
  }

  async getFixedFlangeCount(configCode: string): Promise<{
    count: number;
    positions: { inlet: boolean; outlet: boolean; branch: boolean };
  }> {
    const config = await this.findByCode(configCode);

    if (!config) {
      return {
        count: 0,
        positions: { inlet: false, outlet: false, branch: false },
      };
    }

    const positions = {
      inlet: config.has_fixed_flange_end1,
      outlet: config.has_fixed_flange_end2,
      branch: config.has_fixed_flange_end3,
    };

    const count =
      (positions.inlet ? 1 : 0) +
      (positions.outlet ? 1 : 0) +
      (positions.branch ? 1 : 0);

    return { count, positions };
  }

  formatStubFlangeCode(flangeSpec: string): string {
    if (!flangeSpec || flangeSpec === 'PE' || flangeSpec === '') return 'OE';
    if (flangeSpec === '2xLF' || flangeSpec.toLowerCase().includes('lf'))
      return 'L/F';
    if (flangeSpec === '2X_RF' || flangeSpec.toLowerCase().includes('rf'))
      return 'R/F';
    if (flangeSpec === 'FBE' || flangeSpec === 'FOE') return 'S/O';
    return flangeSpec;
  }

  formatCombinedEndConfig(
    mainEndConfig: string,
    stubs: StubFlangeConfig[],
  ): string {
    if (!stubs || stubs.length === 0) {
      return mainEndConfig;
    }

    const flangedStubs = stubs.filter(
      (s) => s.flangeSpec && s.flangeSpec !== 'PE' && s.flangeSpec !== '',
    );

    if (flangedStubs.length === 0) {
      return mainEndConfig;
    }

    const stubCodes = flangedStubs.map((s) => {
      const code = this.formatStubFlangeCode(s.flangeSpec);
      return `${s.nominalBoreMm}NB ${code}`;
    });

    return `${mainEndConfig} + ${stubCodes.join(' + ')}`;
  }

  async formatEndConfigForDescription(
    mainEndConfig: string,
    stubs: StubFlangeConfig[],
  ): Promise<string> {
    const config = await this.findByCode(mainEndConfig);
    const mainLabel = config?.config_name.split(' - ')[0] || mainEndConfig;

    if (!stubs || stubs.length === 0) {
      return mainLabel;
    }

    const flangedStubs = stubs.filter(
      (s) => s.flangeSpec && s.flangeSpec !== 'PE' && s.flangeSpec !== '',
    );

    if (flangedStubs.length === 0) {
      return mainLabel;
    }

    const stubDescriptions = flangedStubs.map((s) => {
      const code = this.formatStubFlangeCode(s.flangeSpec);
      return `${s.nominalBoreMm}NB Stub ${code}`;
    });

    return `${mainLabel} + ${stubDescriptions.join(' + ')}`;
  }
}
