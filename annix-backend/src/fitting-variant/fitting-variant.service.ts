import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Fitting } from "src/fitting/entities/fitting.entity";
import { FittingBore } from "src/fitting-bore/entities/fitting-bore.entity";
import { FittingDimension } from "src/fitting-dimension/entities/fitting-dimension.entity";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateFittingVariantDto } from "./dto/create-fitting-variant.dto";
import { UpdateFittingVariantDto } from "./dto/update-fitting-variant.dto";
import { FittingVariant } from "./entities/fitting-variant.entity";

@Injectable()
export class FittingVariantService extends BaseCrudService<
  FittingVariant,
  CreateFittingVariantDto,
  UpdateFittingVariantDto
> {
  constructor(
    @InjectRepository(FittingVariant)
    variantRepo: Repository<FittingVariant>,
    @InjectRepository(Fitting)
    private readonly fittingRepo: Repository<Fitting>,
    @InjectRepository(FittingBore)
    private readonly boreRepo: Repository<FittingBore>,
    @InjectRepository(FittingDimension)
    private readonly dimensionRepo: Repository<FittingDimension>,
  ) {
    super(variantRepo, {
      entityName: "FittingVariant",
      defaultRelations: ["fitting", "bores", "dimensions"],
    });
  }

  async create(dto: CreateFittingVariantDto): Promise<FittingVariant> {
    const fitting = await findOneOrFail(
      this.fittingRepo,
      { where: { id: dto.fittingId } },
      "Fitting",
    );

    const bores: FittingBore[] = dto.bores.map((b) =>
      this.boreRepo.create({
        borePositionName: b.borePosition,
        nominalOutsideDiameter: { id: b.nominalId },
      }),
    );

    const dimensions: FittingDimension[] =
      dto.dimensions?.map((d) =>
        this.dimensionRepo.create({
          dimension_name: d.dimensionName,
          dimension_value_mm: d.dimensionValueMm,
          angleRange: d.angleRangeId ? { id: d.angleRangeId } : null,
        }),
      ) || [];

    const variant = this.repo.create({
      fitting,
      bores,
      dimensions,
    });

    return this.repo.save(variant);
  }
}
