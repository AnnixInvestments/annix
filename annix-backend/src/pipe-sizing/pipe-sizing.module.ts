import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PipeNpsOd, PipeScheduleWall } from "./entities/pipe-schedule-wall.entity";
import { PipeAllowableStress, PipeSteelGrade } from "./entities/steel-grade-stress.entity";
import { PipeSizingController } from "./pipe-sizing.controller";
import { PipeSizingRepository } from "./pipe-sizing.repository";
import { MongoPipeSizingRepository } from "./pipe-sizing.repository.mongo";
import { PostgresPipeSizingRepository } from "./pipe-sizing.repository.postgres";
import { PipeSizingService } from "./pipe-sizing.service";
import { PipeAllowableStressSchema } from "./schemas/pipe-allowable-stress.schema";
import { PipeNpsOdSchema } from "./schemas/pipe-nps-od.schema";
import { PipeScheduleWallSchema } from "./schemas/pipe-schedule-wall.schema";
import { PipeSteelGradeSchema } from "./schemas/pipe-steel-grade.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PipeSteelGrade", schema: PipeSteelGradeSchema },
            { name: "PipeAllowableStress", schema: PipeAllowableStressSchema },
            { name: "PipeScheduleWall", schema: PipeScheduleWallSchema },
            { name: "PipeNpsOd", schema: PipeNpsOdSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            PipeSteelGrade,
            PipeAllowableStress,
            PipeScheduleWall,
            PipeNpsOd,
          ]),
        ]),
  ],
  controllers: [PipeSizingController],
  providers: [
    PipeSizingService,
    repositoryProvider(
      PipeSizingRepository,
      PostgresPipeSizingRepository,
      MongoPipeSizingRepository,
    ),
  ],
  exports: [PipeSizingService],
})
export class PipeSizingModule {}
