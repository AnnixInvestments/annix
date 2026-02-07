import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BracketDimensionBySizeEntity } from "./entities/bracket-dimension-by-size.entity";
import { BracketTypeEntity } from "./entities/bracket-type.entity";
import { PipeSteelWorkConfigEntity } from "./entities/pipe-steel-work-config.entity";
import { PipeSupportSpacing } from "./entities/pipe-support-spacing.entity";
import { ReinforcementPadStandardEntity } from "./entities/reinforcement-pad-standard.entity";
import { PipeSteelWorkController } from "./pipe-steel-work.controller";
import { PipeSteelWorkService } from "./pipe-steel-work.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipeSupportSpacing,
      BracketTypeEntity,
      ReinforcementPadStandardEntity,
      BracketDimensionBySizeEntity,
      PipeSteelWorkConfigEntity,
    ]),
  ],
  controllers: [PipeSteelWorkController],
  providers: [PipeSteelWorkService],
  exports: [PipeSteelWorkService],
})
export class PipeSteelWorkModule {}
