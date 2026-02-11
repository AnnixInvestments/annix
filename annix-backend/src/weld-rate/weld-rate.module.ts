import { Module } from "@nestjs/common";
import { WeldRateService } from "./weld-rate.service";

/**
 * Weld Rate Module
 *
 * Provides weld cost calculation services based on consumable type,
 * gas consumption, filler material, and labor rates.
 *
 * Data sourced from Graham Dell Calculator.
 *
 * NOT YET EXPOSED VIA CONTROLLER - For future use.
 * When ready to expose, create a controller and add endpoints.
 */
@Module({
  providers: [WeldRateService],
  exports: [WeldRateService],
})
export class WeldRateModule {}
