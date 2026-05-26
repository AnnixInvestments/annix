import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { BracketCompatibilityService } from "./bracket-compatibility.service";
import { BracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository";
import { MongoBracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository.mongo";
import { PostgresBracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository.postgres";
import { BracketTypeRepository } from "./bracket-type.repository";
import { MongoBracketTypeRepository } from "./bracket-type.repository.mongo";
import { PostgresBracketTypeRepository } from "./bracket-type.repository.postgres";
import { BracketDimensionBySizeEntity } from "./entities/bracket-dimension-by-size.entity";
import { BracketTypeEntity } from "./entities/bracket-type.entity";
import { PipeSteelWorkConfigEntity } from "./entities/pipe-steel-work-config.entity";
import { PipeSupportSpacing } from "./entities/pipe-support-spacing.entity";
import { ReinforcementPadStandardEntity } from "./entities/reinforcement-pad-standard.entity";
import { PipeSteelWorkController } from "./pipe-steel-work.controller";
import { PipeSteelWorkService } from "./pipe-steel-work.service";
import { PipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository";
import { MongoPipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository.mongo";
import { PostgresPipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository.postgres";
import { PipeSupportSpacingRepository } from "./pipe-support-spacing.repository";
import { MongoPipeSupportSpacingRepository } from "./pipe-support-spacing.repository.mongo";
import { PostgresPipeSupportSpacingRepository } from "./pipe-support-spacing.repository.postgres";
import { ReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository";
import { MongoReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository.mongo";
import { PostgresReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository.postgres";
import { BracketDimensionBySizeEntitySchema } from "./schemas/bracket-dimension-by-size-entity.schema";
import { BracketTypeEntitySchema } from "./schemas/bracket-type-entity.schema";
import { PipeSteelWorkConfigEntitySchema } from "./schemas/pipe-steel-work-config-entity.schema";
import { PipeSupportSpacingSchema } from "./schemas/pipe-support-spacing.schema";
import { ReinforcementPadStandardEntitySchema } from "./schemas/reinforcement-pad-standard-entity.schema";
import { SupportSpacingService } from "./support-spacing.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            PipeSupportSpacing,
            BracketTypeEntity,
            ReinforcementPadStandardEntity,
            BracketDimensionBySizeEntity,
            PipeSteelWorkConfigEntity,
          ]),
        ]),
  ],
  controllers: [PipeSteelWorkController],
  providers: [
    PipeSteelWorkService,
    BracketCompatibilityService,
    SupportSpacingService,
    repositoryProvider(
      PipeSupportSpacingRepository,
      PostgresPipeSupportSpacingRepository,
      MongoPipeSupportSpacingRepository,
    ),
    repositoryProvider(
      BracketTypeRepository,
      PostgresBracketTypeRepository,
      MongoBracketTypeRepository,
    ),
    repositoryProvider(
      ReinforcementPadStandardRepository,
      PostgresReinforcementPadStandardRepository,
      MongoReinforcementPadStandardRepository,
    ),
    repositoryProvider(
      BracketDimensionBySizeRepository,
      PostgresBracketDimensionBySizeRepository,
      MongoBracketDimensionBySizeRepository,
    ),
    repositoryProvider(
      PipeSteelWorkConfigRepository,
      PostgresPipeSteelWorkConfigRepository,
      MongoPipeSteelWorkConfigRepository,
    ),
  ],
  exports: [PipeSteelWorkService],
})
export class PipeSteelWorkModule {}
