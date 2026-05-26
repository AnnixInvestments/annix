import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangeBolting } from "./entities/flange-bolting.entity";
import { FlangeBoltingMaterial } from "./entities/flange-bolting-material.entity";
import {
  FlangeBoltingMaterialRepository,
  FlangeBoltingRepository,
} from "./flange-bolting.repository";

@Injectable()
export class PostgresFlangeBoltingRepository
  extends TypeOrmCrudRepository<FlangeBolting>
  implements FlangeBoltingRepository
{
  constructor(@InjectRepository(FlangeBolting) repository: Repository<FlangeBolting>) {
    super(repository);
  }

  async saveMany(entities: FlangeBolting[]): Promise<FlangeBolting[]> {
    return this.repository.save(entities);
  }

  async findAllWithStandard(): Promise<FlangeBolting[]> {
    return this.repository.find({
      relations: ["standard"],
      order: { standardId: "ASC", pressureClass: "ASC", nps: "ASC" },
    });
  }

  async findByStandardId(standardId: number): Promise<FlangeBolting[]> {
    return this.repository.find({
      where: { standardId },
      order: { pressureClass: "ASC", nps: "ASC" },
    });
  }

  async findByStandardAndClass(
    standardId: number,
    pressureClass: string,
  ): Promise<FlangeBolting[]> {
    return this.repository.find({
      where: { standardId, pressureClass },
      order: { nps: "ASC" },
    });
  }

  async findByStandardClassAndNps(
    standardId: number,
    pressureClass: string,
    nps: string,
  ): Promise<FlangeBolting | null> {
    return this.repository.findOne({
      where: { standardId, pressureClass, nps },
      relations: ["standard"],
    });
  }
}

@Injectable()
export class PostgresFlangeBoltingMaterialRepository
  extends TypeOrmCrudRepository<FlangeBoltingMaterial>
  implements FlangeBoltingMaterialRepository
{
  constructor(
    @InjectRepository(FlangeBoltingMaterial) repository: Repository<FlangeBoltingMaterial>,
  ) {
    super(repository);
  }

  async findAllOrderedByGroup(): Promise<FlangeBoltingMaterial[]> {
    return this.repository.find({
      order: { materialGroup: "ASC" },
    });
  }

  async findByMaterialGroup(materialGroup: string): Promise<FlangeBoltingMaterial | null> {
    return this.repository.findOne({
      where: { materialGroup },
    });
  }
}
