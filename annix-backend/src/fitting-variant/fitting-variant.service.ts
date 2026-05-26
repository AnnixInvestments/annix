import { Injectable } from "@nestjs/common";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { FittingRepository } from "src/fitting/fitting.repository";
import { FittingBore } from "src/fitting-bore/entities/fitting-bore.entity";
import { FittingBoreRepository } from "src/fitting-bore/fitting-bore.repository";
import { FittingDimension } from "src/fitting-dimension/entities/fitting-dimension.entity";
import { FittingDimensionRepository } from "src/fitting-dimension/fitting-dimension.repository";
import { BaseCrudService } from "../lib/base-crud.service";
import { findByIdOrFail } from "../lib/entity-helpers";
import { CreateFittingVariantDto } from "./dto/create-fitting-variant.dto";
import { UpdateFittingVariantDto } from "./dto/update-fitting-variant.dto";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantRepository } from "./fitting-variant.repository";

@Injectable()
export class FittingVariantService extends BaseCrudService<
  FittingVariant,
  CreateFittingVariantDto,
  UpdateFittingVariantDto
> {
  constructor(
    repository: FittingVariantRepository,
    private readonly fittingRepo: FittingRepository,
    private readonly boreRepo: FittingBoreRepository,
    private readonly dimensionRepo: FittingDimensionRepository,
  ) {
    super(repository, {
      entityName: "FittingVariant",
      defaultRelations: ["fitting", "bores", "dimensions"],
    });
  }

  async create(dto: CreateFittingVariantDto): Promise<FittingVariant> {
    const fitting = await findByIdOrFail(this.fittingRepo, dto.fittingId, "Fitting");

    const bores: FittingBore[] = dto.bores.map((b) =>
      this.boreRepo.instantiate({
        borePositionName: b.borePosition,
        nominalOutsideDiameter: { id: b.nominalId },
      }),
    );

    const dimensions: FittingDimension[] =
      dto.dimensions?.map((d) =>
        this.dimensionRepo.instantiate({
          dimension_name: d.dimensionName,
          dimension_value_mm: d.dimensionValueMm,
          angleRange: d.angleRangeId ? ({ id: d.angleRangeId } as AngleRange) : null,
        }),
      ) || [];

    return this.repository.create({
      fitting,
      bores,
      dimensions,
    });
  }
}
