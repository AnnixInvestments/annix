import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyRepository } from "./passkey.repository";

@Injectable()
export class PostgresPasskeyRepository
  extends TypeOrmCrudRepository<Passkey>
  implements PasskeyRepository
{
  constructor(@InjectRepository(Passkey) repository: Repository<Passkey>) {
    super(repository);
  }

  findByCredentialId(credentialId: string): Promise<Passkey | null> {
    return this.repository.findOne({ where: { credentialId } });
  }

  findByUserId(userId: number): Promise<Passkey[]> {
    return this.repository.find({ where: { userId }, order: { createdAt: "DESC" } });
  }

  countByUserId(userId: number): Promise<number> {
    return this.repository.count({ where: { userId } });
  }

  async deleteByIdAndUserId(id: number, userId: number): Promise<void> {
    await this.repository.delete({ id, userId });
  }
}
