import { Controller, Get, Param, Query } from "@nestjs/common";
import { SpectacleBlindService } from "./spectacle-blind.service";

@Controller("spectacle-blinds")
export class SpectacleBlindController {
  constructor(private readonly spectacleBlindService: SpectacleBlindService) {}

  @Get()
  findAll(@Query("pressureClass") pressureClass?: string) {
    if (pressureClass) {
      return this.spectacleBlindService.findByPressureClass(pressureClass);
    }
    return this.spectacleBlindService.findAll();
  }

  @Get(":nps/:pressureClass")
  findByNpsAndClass(@Param("nps") nps: string, @Param("pressureClass") pressureClass: string) {
    return this.spectacleBlindService.findByNpsAndClass(nps, pressureClass);
  }
}
