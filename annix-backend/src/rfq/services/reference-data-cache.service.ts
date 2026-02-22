import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FlangeDimension } from "../../flange-dimension/entities/flange-dimension.entity";
import { NbNpsLookup } from "../../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { PipeDimension } from "../../pipe-dimension/entities/pipe-dimension.entity";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";

interface CacheEntry<T> {
  data: T;
  loadedAt: Date;
}

@Injectable()
export class ReferenceDataCacheService implements OnModuleInit {
  private readonly logger = new Logger(ReferenceDataCacheService.name);

  private nbNpsLookupCache: CacheEntry<Map<number, NbNpsLookup>> | null = null;
  private steelSpecCache: CacheEntry<Map<number, SteelSpecification>> | null = null;
  private pipeDimensionsByNbCache: CacheEntry<Map<number, PipeDimension[]>> | null = null;
  private flangeDimensionsByNbCache: CacheEntry<Map<string, FlangeDimension[]>> | null = null;

  constructor(
    @InjectRepository(NbNpsLookup)
    private readonly nbNpsLookupRepository: Repository<NbNpsLookup>,
    @InjectRepository(SteelSpecification)
    private readonly steelSpecRepository: Repository<SteelSpecification>,
    @InjectRepository(PipeDimension)
    private readonly pipeDimensionRepository: Repository<PipeDimension>,
    @InjectRepository(FlangeDimension)
    private readonly flangeDimensionRepository: Repository<FlangeDimension>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("Warming up reference data cache...");
    await Promise.all([
      this.loadNbNpsLookup(),
      this.loadSteelSpecifications(),
      this.loadPipeDimensions(),
      this.loadFlangeDimensions(),
    ]);
    this.logger.log("Reference data cache warmed up successfully");
  }

  private async loadNbNpsLookup(): Promise<void> {
    const data = await this.nbNpsLookupRepository.find();
    const map = new Map<number, NbNpsLookup>();
    for (const item of data) {
      map.set(item.nb_mm, item);
    }
    this.nbNpsLookupCache = { data: map, loadedAt: new Date() };
    this.logger.debug(`Loaded ${data.length} NB-NPS lookup entries`);
  }

  private async loadSteelSpecifications(): Promise<void> {
    const data = await this.steelSpecRepository.find();
    const map = new Map<number, SteelSpecification>();
    for (const item of data) {
      map.set(item.id, item);
    }
    this.steelSpecCache = { data: map, loadedAt: new Date() };
    this.logger.debug(`Loaded ${data.length} steel specifications`);
  }

  private async loadPipeDimensions(): Promise<void> {
    const data = await this.pipeDimensionRepository.find({
      relations: ["nominalOutsideDiameter", "steelSpecification"],
    });
    const map = new Map<number, PipeDimension[]>();
    for (const item of data) {
      const nb = item.nominalOutsideDiameter?.nominal_diameter_mm;
      if (nb !== undefined) {
        const existing = map.get(nb) || [];
        existing.push(item);
        map.set(nb, existing);
      }
    }
    this.pipeDimensionsByNbCache = { data: map, loadedAt: new Date() };
    this.logger.debug(`Loaded ${data.length} pipe dimensions`);
  }

  private async loadFlangeDimensions(): Promise<void> {
    const data = await this.flangeDimensionRepository.find({
      relations: ["nominalOutsideDiameter", "standard", "pressureClass", "bolt"],
    });
    const map = new Map<string, FlangeDimension[]>();
    for (const item of data) {
      const nb = item.nominalOutsideDiameter?.nominal_diameter_mm;
      if (nb !== undefined) {
        const key = `${nb}`;
        const existing = map.get(key) || [];
        existing.push(item);
        map.set(key, existing);
      }
    }
    this.flangeDimensionsByNbCache = { data: map, loadedAt: new Date() };
    this.logger.debug(`Loaded ${data.length} flange dimensions`);
  }

  nbNpsLookupByNb(nb: number): NbNpsLookup | undefined {
    return this.nbNpsLookupCache?.data.get(nb);
  }

  steelSpecificationById(id: number): SteelSpecification | undefined {
    return this.steelSpecCache?.data.get(id);
  }

  pipeDimensionsByNb(nb: number): PipeDimension[] {
    return this.pipeDimensionsByNbCache?.data.get(nb) || [];
  }

  pipeDimensionByNbAndSchedule(
    nb: number,
    scheduleDesignation: string,
    steelSpecId?: number,
  ): PipeDimension | undefined {
    const dimensions = this.pipeDimensionsByNb(nb);
    return dimensions.find(
      (d) =>
        d.schedule_designation === scheduleDesignation &&
        (steelSpecId === undefined || d.steelSpecification?.id === steelSpecId),
    );
  }

  pipeDimensionByNbAndWallThickness(
    nb: number,
    wallThicknessMm: number,
    steelSpecId?: number,
  ): PipeDimension | undefined {
    const dimensions = this.pipeDimensionsByNb(nb);
    return dimensions.find(
      (d) =>
        d.wall_thickness_mm === wallThicknessMm &&
        (steelSpecId === undefined || d.steelSpecification?.id === steelSpecId),
    );
  }

  flangeDimensionsByNb(nb: number): FlangeDimension[] {
    return this.flangeDimensionsByNbCache?.data.get(`${nb}`) || [];
  }

  flangeDimension(
    nb: number,
    flangeStandardId: number,
    pressureClassId: number,
  ): FlangeDimension | undefined {
    const dimensions = this.flangeDimensionsByNb(nb);
    return dimensions.find(
      (d) => d.standard?.id === flangeStandardId && d.pressureClass?.id === pressureClassId,
    );
  }

  async refreshCache(): Promise<void> {
    this.logger.log("Refreshing reference data cache...");
    await Promise.all([
      this.loadNbNpsLookup(),
      this.loadSteelSpecifications(),
      this.loadPipeDimensions(),
      this.loadFlangeDimensions(),
    ]);
    this.logger.log("Reference data cache refreshed");
  }

  cacheStats(): {
    nbNpsLookup: { count: number; loadedAt: Date | null };
    steelSpecs: { count: number; loadedAt: Date | null };
    pipeDimensions: { count: number; loadedAt: Date | null };
    flangeDimensions: { count: number; loadedAt: Date | null };
  } {
    return {
      nbNpsLookup: {
        count: this.nbNpsLookupCache?.data.size || 0,
        loadedAt: this.nbNpsLookupCache?.loadedAt || null,
      },
      steelSpecs: {
        count: this.steelSpecCache?.data.size || 0,
        loadedAt: this.steelSpecCache?.loadedAt || null,
      },
      pipeDimensions: {
        count: this.pipeDimensionsByNbCache?.data.size || 0,
        loadedAt: this.pipeDimensionsByNbCache?.loadedAt || null,
      },
      flangeDimensions: {
        count: this.flangeDimensionsByNbCache?.data.size || 0,
        loadedAt: this.flangeDimensionsByNbCache?.loadedAt || null,
      },
    };
  }
}
