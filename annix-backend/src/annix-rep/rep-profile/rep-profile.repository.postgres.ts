import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileRepository } from "./rep-profile.repository";

@Injectable()
export class PostgresRepProfileRepository
  extends TypeOrmCrudRepository<RepProfile>
  implements RepProfileRepository
{
  constructor(@InjectRepository(RepProfile) repository: Repository<RepProfile>) {
    super(repository);
  }

  findByUserId(userId: number): Promise<RepProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findAllWithUserOrderedById(): Promise<RepProfile[]> {
    return this.repository.find({ relations: ["user"], order: { id: "ASC" } });
  }
}
