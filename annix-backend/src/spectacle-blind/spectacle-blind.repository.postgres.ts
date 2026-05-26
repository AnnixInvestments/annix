import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";
import { SpectacleBlindRepository } from "./spectacle-blind.repository";

@Injectable()
export class PostgresSpectacleBlindRepository
  extends TypeOrmCrudRepository<SpectacleBlind>
  implements SpectacleBlindRepository
{
  constructor(@InjectRepository(SpectacleBlind) repository: Repository<SpectacleBlind>) {
    super(repository);
  }

  findAllOrdered(): Promise<SpectacleBlind[]> {
    return this.repository.find({
      order: { pressureClass: "ASC", nps: "ASC" },
    });
  }

  findByPressureClass(pressureClass: string): Promise<SpectacleBlind[]> {
    return this.repository.find({
      where: { pressureClass },
      order: { nps: "ASC" },
    });
  }

  findByNpsAndClass(nps: string, pressureClass: string): Promise<SpectacleBlind | null> {
    return this.repository.findOne({
      where: { nps, pressureClass },
    });
  }
}
