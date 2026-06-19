import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BracketCompatibilityService } from "./bracket-compatibility.service";
import { BracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository";
import { MongoBracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository.mongo";
import { BracketTypeRepository } from "./bracket-type.repository";
import { MongoBracketTypeRepository } from "./bracket-type.repository.mongo";
import { PipeSteelWorkController } from "./pipe-steel-work.controller";
import { PipeSteelWorkService } from "./pipe-steel-work.service";
import { PipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository";
import { MongoPipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository.mongo";
import { PipeSupportSpacingRepository } from "./pipe-support-spacing.repository";
import { MongoPipeSupportSpacingRepository } from "./pipe-support-spacing.repository.mongo";
import { ReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository";
import { MongoReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository.mongo";
import { BracketDimensionBySizeEntitySchema } from "./schemas/bracket-dimension-by-size-entity.schema";
import { BracketTypeEntitySchema } from "./schemas/bracket-type-entity.schema";
import { PipeSteelWorkConfigEntitySchema } from "./schemas/pipe-steel-work-config-entity.schema";
import { PipeSupportSpacingSchema } from "./schemas/pipe-support-spacing.schema";
import { ReinforcementPadStandardEntitySchema } from "./schemas/reinforcement-pad-standard-entity.schema";
import { SupportSpacingService } from "./support-spacing.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PipeSupportSpacing", schema: PipeSupportSpacingSchema },
      { name: "BracketTypeEntity", schema: BracketTypeEntitySchema },
      {
        name: "ReinforcementPadStandardEntity",
        schema: ReinforcementPadStandardEntitySchema,
      },
      {
        name: "BracketDimensionBySizeEntity",
        schema: BracketDimensionBySizeEntitySchema,
      },
      { name: "PipeSteelWorkConfigEntity", schema: PipeSteelWorkConfigEntitySchema },
    ]),
  ],
  controllers: [PipeSteelWorkController],
  providers: [
    PipeSteelWorkService,
    BracketCompatibilityService,
    SupportSpacingService,
    repositoryProvider(PipeSupportSpacingRepository, MongoPipeSupportSpacingRepository),
    repositoryProvider(BracketTypeRepository, MongoBracketTypeRepository),
    repositoryProvider(ReinforcementPadStandardRepository, MongoReinforcementPadStandardRepository),
    repositoryProvider(BracketDimensionBySizeRepository, MongoBracketDimensionBySizeRepository),
    repositoryProvider(PipeSteelWorkConfigRepository, MongoPipeSteelWorkConfigRepository),
  ],
  exports: [PipeSteelWorkService],
})
export class PipeSteelWorkModule {}
