import { Injectable } from "@nestjs/common";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";
import { SpectacleBlindRepository } from "./spectacle-blind.repository";

@Injectable()
export class SpectacleBlindService {
  constructor(private readonly spectacleBlindRepo: SpectacleBlindRepository) {}

  findAll(): Promise<SpectacleBlind[]> {
    return this.spectacleBlindRepo.findAllOrdered();
  }

  findByPressureClass(pressureClass: string): Promise<SpectacleBlind[]> {
    return this.spectacleBlindRepo.findByPressureClass(pressureClass);
  }

  findByNpsAndClass(nps: string, pressureClass: string): Promise<SpectacleBlind | null> {
    return this.spectacleBlindRepo.findByNpsAndClass(nps, pressureClass);
  }
}
