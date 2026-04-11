import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { findOneOrFail } from "../lib/entity-helpers";
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
    @InjectRepository(BoltMass)
    boltMassRepo: Repository<BoltMass>,
    @InjectRepository(Bolt)
    private readonly boltRepo: Repository<Bolt>,
  ) {
    super(boltMassRepo, { entityName: "BoltMass", defaultRelations: ["bolt"] });
  }

  async create(dto: CreateBoltMassDto): Promise<BoltMass> {
    const bolt = await findOneOrFail(this.boltRepo, { where: { id: dto.boltId } }, "Bolt");

    await this.checkUnique(
      { bolt: { id: dto.boltId }, length_mm: dto.length_mm },
      "BoltMass already exists",
    );

    const mass = this.repo.create({ bolt, ...dto });
    return this.repo.save(mass);
  }
}
