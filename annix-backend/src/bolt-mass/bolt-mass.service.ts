import { Injectable } from "@nestjs/common";
import { BoltRepository } from "../bolt/bolt.repository";
import { BaseCrudService } from "../lib/base-crud.service";
import { findByIdOrFail } from "../lib/entity-helpers";
import { BoltMassRepository } from "./bolt-mass.repository";
import { CreateBoltMassDto } from "./dto/create-bolt-mass.dto";
import { UpdateBoltMassDto } from "./dto/update-bolt-mass.dto";
import { BoltMass } from "./entities/bolt-mass.entity";

@Injectable()
export class BoltMassService extends BaseCrudService<
  BoltMass,
  CreateBoltMassDto,
  UpdateBoltMassDto
> {
  constructor(
    repository: BoltMassRepository,
    private readonly boltRepo: BoltRepository,
  ) {
    super(repository, { entityName: "BoltMass", defaultRelations: ["bolt"] });
  }

  async create(dto: CreateBoltMassDto): Promise<BoltMass> {
    const bolt = await findByIdOrFail(this.boltRepo, dto.boltId, "Bolt");

    await this.checkUnique(
      { bolt: { id: dto.boltId }, length_mm: dto.length_mm },
      "BoltMass already exists",
    );

    return this.repository.create({ bolt, ...dto });
  }
}
