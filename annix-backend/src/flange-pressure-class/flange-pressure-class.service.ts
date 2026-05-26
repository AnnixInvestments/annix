import { Injectable, NotFoundException } from "@nestjs/common";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { BaseCrudService } from "../lib/base-crud.service";
import { findByIdOrFail } from "../lib/entity-helpers";
import { CreateFlangePressureClassDto } from "./dto/create-flange-pressure-class.dto";
import { UpdateFlangePressureClassDto } from "./dto/update-flange-pressure-class.dto";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";

@Injectable()
export class FlangePressureClassService extends BaseCrudService<
  FlangePressureClass,
  CreateFlangePressureClassDto,
  UpdateFlangePressureClassDto
> {
  private findAllCache: FlangePressureClass[] | null = null;
  private byStandardCache = new Map<number, FlangePressureClass[]>();

  constructor(
    private readonly pressureRepository: FlangePressureClassRepository,
    private readonly standardRepo: FlangeStandardRepository,
  ) {
    super(pressureRepository, {
      entityName: "Flange pressure class",
      defaultRelations: ["standard"],
    });
  }

  private invalidateCache(): void {
    this.findAllCache = null;
    this.byStandardCache.clear();
  }

  async findAll(relations?: string[]): Promise<FlangePressureClass[]> {
    if (!relations && this.findAllCache) {
      return this.findAllCache;
    }
    const result = await super.findAll(relations);
    if (!relations) {
      this.findAllCache = result;
    }
    return result;
  }

  async create(dto: CreateFlangePressureClassDto): Promise<FlangePressureClass> {
    const standard = await findByIdOrFail(this.standardRepo, dto.standardId, "Flange standard");

    await this.checkUnique(
      { designation: dto.designation, standard: { id: dto.standardId } },
      "Pressure class already exists for this standard",
    );

    const saved = await this.repository.create({ designation: dto.designation, standard });
    this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: UpdateFlangePressureClassDto): Promise<FlangePressureClass> {
    const updated = await super.update(id, dto);
    this.invalidateCache();
    return updated;
  }

  async remove(id: number): Promise<void> {
    await super.remove(id);
    this.invalidateCache();
  }

  async getAllByStandard(standardId: number): Promise<FlangePressureClass[]> {
    const cached = this.byStandardCache.get(standardId);
    if (cached) {
      return cached;
    }

    const standard = await this.standardRepo.findById(standardId);
    if (!standard) {
      throw new NotFoundException(`Flange standard ${standardId} not found`);
    }

    const classes = await this.pressureRepository.findByStandardId(standardId);

    const sorted = classes.sort((a, b) => {
      const numericValue = (designation: string): number => {
        const match = designation?.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return numericValue(a.designation) - numericValue(b.designation);
    });

    this.byStandardCache.set(standardId, sorted);
    return sorted;
  }
}
