import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PipeSizingController } from "./pipe-sizing.controller";
import { PipeSizingRepository } from "./pipe-sizing.repository";
import { MongoPipeSizingRepository } from "./pipe-sizing.repository.mongo";
import { PipeSizingService } from "./pipe-sizing.service";
import { PipeAllowableStressSchema } from "./schemas/pipe-allowable-stress.schema";
import { PipeNpsOdSchema } from "./schemas/pipe-nps-od.schema";
import { PipeScheduleWallSchema } from "./schemas/pipe-schedule-wall.schema";
import { PipeSteelGradeSchema } from "./schemas/pipe-steel-grade.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PipeSteelGrade", schema: PipeSteelGradeSchema },
      { name: "PipeAllowableStress", schema: PipeAllowableStressSchema },
      { name: "PipeScheduleWall", schema: PipeScheduleWallSchema },
      { name: "PipeNpsOd", schema: PipeNpsOdSchema },
    ]),
  ],
  controllers: [PipeSizingController],
  providers: [
    PipeSizingService,
    repositoryProvider(PipeSizingRepository, MongoPipeSizingRepository),
  ],
  exports: [PipeSizingService],
})
export class PipeSizingModule {}
