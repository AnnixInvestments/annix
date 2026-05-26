import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { NixUserPreferenceRepository } from "./nix-user-preference.repository";

@Injectable()
export class PostgresNixUserPreferenceRepository
  extends TypeOrmCrudRepository<NixUserPreference>
  implements NixUserPreferenceRepository
{
  constructor(@InjectRepository(NixUserPreference) repository: Repository<NixUserPreference>) {
    super(repository);
  }
}
