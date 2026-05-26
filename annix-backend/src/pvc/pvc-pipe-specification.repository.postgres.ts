import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";
import { PvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository";

@Injectable()
export class PostgresPvcPipeSpecificationRepository
  extends TypeOrmCrudRepository<PvcPipeSpecification>
  implements PvcPipeSpecificationRepository
{
  constructor(
    @InjectRepository(PvcPipeSpecification) repository: Repository<PvcPipeSpecification>,
  ) {
    super(repository);
  }

  findActive(): Promise<PvcPipeSpecification[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { nominalDiameter: "ASC", pressureRating: "ASC" },
    });
  }

  findByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]> {
    return this.repository.find({
      where: { nominalDiameter, isActive: true },
      order: { pressureRating: "ASC" },
    });
  }

  findByDNAndPN(
    nominalDiameter: number,
    pressureRating: number,
    pvcType: string,
  ): Promise<PvcPipeSpecification | null> {
    return this.repository.findOne({
      where: { nominalDiameter, pressureRating, pvcType, isActive: true },
    });
  }

  async findDistinctActiveDNs(): Promise<number[]> {
    const rows = await this.repository
      .createQueryBuilder("pipe")
      .select("DISTINCT pipe.nominalDiameter", "dn")
      .where("pipe.isActive = :active", { active: true })
      .orderBy("pipe.nominalDiameter", "ASC")
      .getRawMany<{ dn: number }>();
    return rows.map((r) => r.dn);
  }

  findActiveByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]> {
    return this.repository.find({
      where: { nominalDiameter, isActive: true },
      order: { pressureRating: "ASC" },
    });
  }
}
