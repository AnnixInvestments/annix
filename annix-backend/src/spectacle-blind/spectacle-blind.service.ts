import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";

@Injectable()
export class SpectacleBlindService {
  constructor(
    @InjectRepository(SpectacleBlind)
    private readonly spectacleBlindRepo: Repository<SpectacleBlind>,
  ) {}

  findAll(): Promise<SpectacleBlind[]> {
    return this.spectacleBlindRepo.find({
      order: { pressureClass: "ASC", nps: "ASC" },
    });
  }

  findByPressureClass(pressureClass: string): Promise<SpectacleBlind[]> {
    return this.spectacleBlindRepo.find({
      where: { pressureClass },
      order: { nps: "ASC" },
    });
  }

  findByNpsAndClass(nps: string, pressureClass: string): Promise<SpectacleBlind | null> {
    return this.spectacleBlindRepo.findOne({
      where: { nps, pressureClass },
    });
  }
}
