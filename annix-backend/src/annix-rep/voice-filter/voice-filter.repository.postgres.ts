import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { VoiceProfile } from "./voice-filter.entity";
import { VoiceProfileRepository } from "./voice-filter.repository";

@Injectable()
export class PostgresVoiceProfileRepository
  extends TypeOrmCrudRepository<VoiceProfile>
  implements VoiceProfileRepository
{
  constructor(@InjectRepository(VoiceProfile) repository: Repository<VoiceProfile>) {
    super(repository);
  }

  findByUserId(userId: number): Promise<VoiceProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }
}
