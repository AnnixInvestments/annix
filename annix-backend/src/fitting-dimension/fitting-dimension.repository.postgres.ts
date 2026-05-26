import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { Repository } from "typeorm";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionRepository } from "./fitting-dimension.repository";

@Injectable()
export class PostgresFittingDimensionRepository
  extends TypeOrmCrudRepository<FittingDimension>
  implements FittingDimensionRepository
{
  constructor(
    @InjectRepository(FittingDimension) repository: Repository<FittingDimension>,
    @InjectRepository(FittingVariant)
    private readonly variantRepository: Repository<FittingVariant>,
    @InjectRepository(AngleRange) private readonly angleRangeRepository: Repository<AngleRange>,
  ) {
    super(repository);
  }

  async findAllWithRelations(): Promise<FittingDimension[]> {
    return this.repository.find({ relations: ["variant", "angleRange"] });
  }

  async findByIdWithRelations(id: number): Promise<FittingDimension | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["variant", "angleRange"],
    });
  }

  async findVariantById(id: number): Promise<FittingVariant | null> {
    return this.variantRepository.findOne({ where: { id } });
  }

  async findAngleRangeById(id: number): Promise<AngleRange | null> {
    return this.angleRangeRepository.findOne({ where: { id } });
  }

  instantiate(data: DeepPartial<FittingDimension>): FittingDimension {
    return this.repository.create(data);
  }
}
