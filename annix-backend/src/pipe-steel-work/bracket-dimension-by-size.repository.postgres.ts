import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository";
import { BracketDimensionBySizeEntity } from "./entities/bracket-dimension-by-size.entity";

@Injectable()
export class PostgresBracketDimensionBySizeRepository
  extends TypeOrmCrudRepository<BracketDimensionBySizeEntity>
  implements BracketDimensionBySizeRepository
{
  constructor(
    @InjectRepository(BracketDimensionBySizeEntity)
    repository: Repository<BracketDimensionBySizeEntity>,
  ) {
    super(repository);
  }

  findByTypeAndNb(
    bracketTypeCode: string,
    nbMm: number,
  ): Promise<BracketDimensionBySizeEntity | null> {
    return this.repository.findOne({
      where: { bracketTypeCode, nbMm },
    });
  }

  findByTypeOrdered(bracketTypeCode: string): Promise<BracketDimensionBySizeEntity[]> {
    return this.repository.find({
      where: { bracketTypeCode },
      order: { nbMm: "ASC" },
    });
  }
}
