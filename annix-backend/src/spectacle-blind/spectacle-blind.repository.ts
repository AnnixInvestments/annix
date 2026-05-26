import { CrudRepository } from "../lib/persistence/crud-repository";
import { SpectacleBlind } from "./entities/spectacle-blind.entity";

export abstract class SpectacleBlindRepository extends CrudRepository<SpectacleBlind> {
  abstract findAllOrdered(): Promise<SpectacleBlind[]>;
  abstract findByPressureClass(pressureClass: string): Promise<SpectacleBlind[]>;
  abstract findByNpsAndClass(nps: string, pressureClass: string): Promise<SpectacleBlind | null>;
}
