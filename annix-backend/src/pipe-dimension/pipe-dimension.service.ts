import { Injectable, NotFoundException } from "@nestjs/common";
import { CreatePipeDimensionDto } from "./dto/create-pipe-dimension.dto";
import { UpdatePipeDimensionDto } from "./dto/update-pipe-dimension.dto";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "./pipe-dimension.repository";

@Injectable()
export class PipeDimensionService {
  private findAllCache: PipeDimension[] | null = null;
  private bySpecAndNominalCache = new Map<string, PipeDimension[]>();

  constructor(private readonly pipeDimensionRepository: PipeDimensionRepository) {}

  private invalidateCache(): void {
    this.findAllCache = null;
    this.bySpecAndNominalCache.clear();
  }

  async create(dto: CreatePipeDimensionDto): Promise<PipeDimension> {
    const nominal = await this.pipeDimensionRepository.findNominalById(
      dto.nominalOutsideDiameterId,
    );
    if (!nominal)
      throw new NotFoundException(
        `NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`,
      );

    const steel = await this.pipeDimensionRepository.findSteelById(dto.steelSpecificationId);
    if (!steel)
      throw new NotFoundException(`SteelSpecification ${dto.steelSpecificationId} not found`);

    const saved = await this.pipeDimensionRepository.createPipe({
      nominalOutsideDiameter: nominal,
      steelSpecification: steel,
      ...dto,
    });
    this.invalidateCache();
    return saved;
  }

  async findAll(): Promise<PipeDimension[]> {
    if (this.findAllCache) {
      return this.findAllCache;
    }
    const result = await this.pipeDimensionRepository.findAllWithRelations();
    this.findAllCache = result;
    return result;
  }

  async findOne(id: number): Promise<PipeDimension> {
    const pipe = await this.pipeDimensionRepository.findOneWithRelations(id);
    if (!pipe) throw new NotFoundException(`PipeDimension ${id} not found`);
    return pipe;
  }

  async update(id: number, dto: UpdatePipeDimensionDto): Promise<PipeDimension> {
    const pipe = await this.findOne(id);
    Object.assign(pipe, dto);
    const saved = await this.pipeDimensionRepository.savePipe(pipe);
    this.invalidateCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const pipe = await this.findOne(id);
    await this.pipeDimensionRepository.removePipe(pipe);
    this.invalidateCache();
  }

  async getRecommendedSpecs(
    nominalBore: number,
    workingPressure: number,
    temperature: number = 20,
    steelSpecId?: number,
  ): Promise<{
    pipeDimension: PipeDimension;
    schedule?: string;
    wallThickness: number;
    maxPressure: number;
    availableUpgrades?: PipeDimension[];
  }> {
    const nominal = await this.pipeDimensionRepository.findNominalByDiameter(nominalBore);

    if (!nominal) {
      throw new NotFoundException(`No pipe dimensions found for ${nominalBore}mm nominal bore`);
    }

    const workingPressureMpa = workingPressure;

    const suitablePipes = await this.pipeDimensionRepository.recommendedSpecs(
      nominal.id,
      workingPressureMpa,
      temperature,
      steelSpecId,
    );

    if (suitablePipes.length === 0) {
      throw new NotFoundException(
        `No suitable pipe dimensions found for ${nominalBore}mm NB at ${workingPressure} bar and ${temperature}°C`,
      );
    }

    const sortedPipes = suitablePipes.sort((a, b) => {
      const getSchedulePriority = (pipe: PipeDimension): number => {
        if (pipe.schedule_designation === "STD" || pipe.schedule_number === 40) return 1;
        if (pipe.schedule_number === 80 || pipe.schedule_designation === "XS") return 2;
        if (pipe.schedule_number === 120) return 3;
        if (pipe.schedule_number === 160 || pipe.schedule_designation === "XXS") return 4;
        if (pipe.schedule_number) return pipe.schedule_number;
        return 100 + pipe.wall_thickness_mm * 10;
      };

      return getSchedulePriority(a) - getSchedulePriority(b);
    });

    const recommendedPipe = sortedPipes[0];

    const recommendedScheduleNum = this.getScheduleNumber(recommendedPipe);
    const availableUpgrades = sortedPipes.filter((pipe) => {
      const pipeScheduleNum = this.getScheduleNumber(pipe);
      return pipeScheduleNum > recommendedScheduleNum;
    });

    const suitablePressure = recommendedPipe.pressures
      .filter((p) => p.temperature_c !== null && p.temperature_c >= temperature)
      .sort((a, b) => (a.temperature_c || 0) - (b.temperature_c || 0))[0];

    const schedule =
      recommendedPipe.schedule_designation ||
      (recommendedPipe.schedule_number ? `Sch${recommendedPipe.schedule_number}` : "STD");

    return {
      pipeDimension: recommendedPipe,
      schedule,
      wallThickness: recommendedPipe.wall_thickness_mm,
      maxPressure: (suitablePressure?.max_working_pressure_mpa || 0) * 10,
      availableUpgrades,
    };
  }

  private getScheduleNumber(pipe: PipeDimension): number {
    if (pipe.schedule_number) return pipe.schedule_number;
    if (pipe.schedule_designation === "STD") return 40;
    if (pipe.schedule_designation === "XS") return 80;
    if (pipe.schedule_designation === "XXS") return 160;
    return pipe.wall_thickness_mm * 10;
  }

  async getHigherSchedules(
    nominalBore: number,
    currentWallThickness: number,
    workingPressure: number,
    temperature: number = 20,
    steelSpecId?: number,
  ): Promise<PipeDimension[]> {
    const nominal = await this.pipeDimensionRepository.findNominalByDiameter(nominalBore);

    if (!nominal) {
      throw new NotFoundException(`No pipe dimensions found for ${nominalBore}mm nominal bore`);
    }

    const higherSchedules = await this.pipeDimensionRepository.higherSchedules(
      nominal.id,
      currentWallThickness,
      workingPressure,
      temperature,
      steelSpecId,
    );

    return higherSchedules.sort((a, b) => a.wall_thickness_mm - b.wall_thickness_mm);
  }

  async findAllBySpecAndNominal(steelSpecId: number, nominalId: number): Promise<PipeDimension[]> {
    const cacheKey = `${steelSpecId}-${nominalId}`;
    const cached = this.bySpecAndNominalCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const pipes = await this.pipeDimensionRepository.findBySpecAndNominal(steelSpecId, nominalId);
    this.bySpecAndNominalCache.set(cacheKey, pipes);
    return pipes;
  }
}
