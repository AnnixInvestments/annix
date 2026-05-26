import { Injectable } from "@nestjs/common";
import { FittingVariantRepository } from "../fitting-variant/fitting-variant.repository";
import { BaseCrudService } from "../lib/base-crud.service";
import { findByIdOrFail } from "../lib/entity-helpers";
import { NominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository";
import { CreateFittingBoreDto } from "./dto/create-fitting-bore.dto";
import { UpdateFittingBoreDto } from "./dto/update-fitting-bore.dto";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreRepository } from "./fitting-bore.repository";

@Injectable()
export class FittingBoreService extends BaseCrudService<
  FittingBore,
  CreateFittingBoreDto,
  UpdateFittingBoreDto
> {
  constructor(
    repository: FittingBoreRepository,
    private readonly variantRepo: FittingVariantRepository,
    private readonly nominalRepo: NominalOutsideDiameterMmRepository,
  ) {
    super(repository, {
      entityName: "FittingBore",
      defaultRelations: ["variant", "nominalOutsideDiameter"],
    });
  }

  async create(dto: CreateFittingBoreDto): Promise<FittingBore> {
    const variant = await findByIdOrFail(this.variantRepo, dto.variantId, "FittingVariant");

    const nominal = await findByIdOrFail(this.nominalRepo, dto.nominalId, "NominalOutsideDiameter");

    await this.checkUnique(
      {
        variant: { id: dto.variantId },
        borePositionName: dto.borePosition,
      },
      `Bore position "${dto.borePosition}" already exists for this variant`,
    );

    return this.repository.create({
      variant,
      nominalOutsideDiameter: nominal,
      borePositionName: dto.borePosition,
    });
  }
}
