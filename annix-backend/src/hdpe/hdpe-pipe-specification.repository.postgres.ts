import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { HdpePipeSpecification } from "./entities/hdpe-pipe-specification.entity";
import { HdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository";

@Injectable()
export class PostgresHdpePipeSpecificationRepository
  extends TypeOrmCrudRepository<HdpePipeSpecification>
  implements HdpePipeSpecificationRepository
{
  constructor(
    @InjectRepository(HdpePipeSpecification) repository: Repository<HdpePipeSpecification>,
  ) {
    super(repository);
  }

  findByNominalBoreAndSdr(nominalBore: number, sdr: number): Promise<HdpePipeSpecification | null> {
    return this.repository.findOne({ where: { nominalBore, sdr, isActive: true } });
  }

  findAllByNominalBore(nominalBore: number): Promise<HdpePipeSpecification[]> {
    return this.repository.find({
      where: { nominalBore, isActive: true },
      order: { sdr: "ASC" },
    });
  }

  findActiveOrderedByNominalBoreAndSdr(): Promise<HdpePipeSpecification[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { nominalBore: "ASC", sdr: "ASC" },
    });
  }

  async findDistinctNominalBores(): Promise<number[]> {
    const pipes = await this.repository
      .createQueryBuilder("pipe")
      .select("DISTINCT pipe.nominalBore", "nb")
      .where("pipe.isActive = :active", { active: true })
      .orderBy("pipe.nominalBore", "ASC")
      .getRawMany();
    return pipes.map((p) => p.nb);
  }
}
