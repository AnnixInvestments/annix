import { Injectable } from "@nestjs/common";
import { BaseCrudService } from "../lib/base-crud.service";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { WasherRepository } from "../washer/washer.repository";
import { BoltRepository } from "./bolt.repository";
import { CreateBoltDto } from "./dto/create-bolt.dto";
import { UpdateBoltDto } from "./dto/update-bolt.dto";
import { Bolt } from "./entities/bolt.entity";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { UBoltEntity } from "./entities/u-bolt.entity";
import { PipeClampRepository } from "./pipe-clamp.repository";
import { ThreadedInsertRepository } from "./threaded-insert.repository";
import { UBoltRepository } from "./u-bolt.repository";

export interface BoltFilters {
  grade?: string;
  material?: string;
  headStyle?: string;
  size?: string;
}

@Injectable()
export class BoltService extends BaseCrudService<Bolt, CreateBoltDto, UpdateBoltDto> {
  private unfilteredCache: Bolt[] | null = null;

  constructor(
    private readonly boltRepository: BoltRepository,
    private readonly uBoltRepository: UBoltRepository,
    private readonly pipeClampRepository: PipeClampRepository,
    private readonly nutMassRepo: NutMassRepository,
    private readonly washerRepo: WasherRepository,
    private readonly threadedInsertRepository: ThreadedInsertRepository,
  ) {
    super(boltRepository, { entityName: "Bolt" });
  }

  private invalidateCache(): void {
    this.unfilteredCache = null;
  }

  async create(dto: CreateBoltDto): Promise<Bolt> {
    await this.checkUnique(
      { designation: dto.designation },
      `Bolt ${dto.designation} already exists`,
    );
    const created = await super.create(dto);
    this.invalidateCache();
    return created;
  }

  async findAll(input?: BoltFilters | string[]): Promise<Bolt[]> {
    if (Array.isArray(input)) {
      return super.findAll(input);
    }
    const filters = input;
    const isUnfiltered =
      !filters || (!filters.grade && !filters.material && !filters.headStyle && !filters.size);

    if (isUnfiltered && this.unfilteredCache) {
      return this.unfilteredCache;
    }

    const result = await this.boltRepository.filteredBolts(filters ?? {});

    if (isUnfiltered) {
      this.unfilteredCache = result;
    }

    return result;
  }

  async update(id: number, dto: UpdateBoltDto): Promise<Bolt> {
    const bolt = await this.findOne(id);

    if (dto.designation) {
      await this.checkUniqueExceptId(
        { designation: dto.designation },
        id,
        `Bolt ${dto.designation} already exists`,
      );
      bolt.designation = dto.designation;
    }

    const saved = await this.repository.save(bolt);
    this.invalidateCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    await super.remove(id);
    this.invalidateCache();
  }

  async uBolts(nbMm?: number): Promise<UBoltEntity[]> {
    return this.uBoltRepository.uBolts(nbMm);
  }

  async uBolt(nbMm: number, threadSize?: string): Promise<UBoltEntity | null> {
    return this.uBoltRepository.uBolt(nbMm, threadSize);
  }

  async pipeClamps(clampType?: string, nbMm?: number): Promise<PipeClampEntity[]> {
    return this.pipeClampRepository.pipeClamps(clampType, nbMm);
  }

  async pipeClamp(clampType: string, nbMm: number): Promise<PipeClampEntity | null> {
    return this.pipeClampRepository.pipeClamp(clampType, nbMm);
  }

  async pipeClampTypes(): Promise<{ clampType: string; clampDescription: string }[]> {
    return this.pipeClampRepository.pipeClampTypes();
  }

  async fastenerTypesGrouped(): Promise<
    Array<{ category: string; types: Array<{ type: string; count: number }> }>
  > {
    const boltCategories = await this.boltRepository.boltCategoriesGrouped();

    const nutTypes = await this.nutMassRepo.typesGrouped();

    const washerTypes = await this.washerRepo.typesGrouped();

    const insertTypes = await this.threadedInsertRepository.insertTypesGrouped();

    return [
      { category: "bolt", types: boltCategories },
      { category: "nut", types: nutTypes },
      { category: "washer", types: washerTypes },
      { category: "insert", types: insertTypes },
    ];
  }

  async fastenerSizesForType(category: string, type: string): Promise<Array<{ size: string }>> {
    if (category === "bolt") {
      return this.boltRepository.fastenerSizesForBolt(type);
    } else if (category === "nut") {
      return this.nutMassRepo.boltDesignationsForType(type);
    } else if (category === "washer") {
      return this.washerRepo.boltDesignationsForType(type);
    } else if (category === "insert") {
      return this.threadedInsertRepository.insertSizesForType(type);
    }
    return [];
  }

  async fastenerGradesForTypeAndSize(
    category: string,
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    if (category === "bolt") {
      return this.boltRepository.fastenerGradesForBolt(type, size);
    } else if (category === "nut") {
      return this.nutMassRepo.gradesForTypeAndSize(type, size);
    } else if (category === "insert") {
      return this.threadedInsertRepository.insertGradesForTypeAndSize(type, size);
    }
    return [];
  }
}
