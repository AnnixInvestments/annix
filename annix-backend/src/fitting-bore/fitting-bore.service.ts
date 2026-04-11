import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateFittingBoreDto } from "./dto/create-fitting-bore.dto";
import { UpdateFittingBoreDto } from "./dto/update-fitting-bore.dto";
import { FittingBore } from "./entities/fitting-bore.entity";

@Injectable()
export class FittingBoreService extends BaseCrudService<
  FittingBore,
  CreateFittingBoreDto,
  UpdateFittingBoreDto
> {
  constructor(
    @InjectRepository(FittingBore)
    boreRepo: Repository<FittingBore>,
    @InjectRepository(FittingVariant)
    private readonly variantRepo: Repository<FittingVariant>,
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
  ) {
    super(boreRepo, {
      entityName: "FittingBore",
      defaultRelations: ["variant", "nominalOutsideDiameter"],
    });
  }

  async create(dto: CreateFittingBoreDto): Promise<FittingBore> {
    const variant = await findOneOrFail(
      this.variantRepo,
      { where: { id: dto.variantId } },
      "FittingVariant",
    );

    const nominal = await findOneOrFail(
      this.nominalRepo,
      { where: { id: dto.nominalId } },
      "NominalOutsideDiameter",
    );

    await this.checkUnique(
      {
        variant: { id: dto.variantId },
        borePositionName: dto.borePosition,
      },
      `Bore position "${dto.borePosition}" already exists for this variant`,
    );

    const bore = this.repo.create({
      variant,
      nominalOutsideDiameter: nominal,
      borePositionName: dto.borePosition,
    });
    return this.repo.save(bore);
  }
}
