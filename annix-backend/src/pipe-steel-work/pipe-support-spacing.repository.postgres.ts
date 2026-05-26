import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeSupportSpacing } from "./entities/pipe-support-spacing.entity";
import { PipeSupportSpacingRepository } from "./pipe-support-spacing.repository";

@Injectable()
export class PostgresPipeSupportSpacingRepository
  extends TypeOrmCrudRepository<PipeSupportSpacing>
  implements PipeSupportSpacingRepository
{
  constructor(@InjectRepository(PipeSupportSpacing) repository: Repository<PipeSupportSpacing>) {
    super(repository);
  }
}
