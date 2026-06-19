import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PipeScheduleController } from "./pipe-schedule.controller";
import { PipeScheduleRepository } from "./pipe-schedule.repository";
import { MongoPipeScheduleRepository } from "./pipe-schedule.repository.mongo";
import { PipeScheduleService } from "./pipe-schedule.service";
import { MaterialAllowableStressSchema } from "./schemas/material-allowable-stress.schema";
import { PipeScheduleSchema } from "./schemas/pipe-schedule.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PipeSchedule", schema: PipeScheduleSchema },
      { name: "MaterialAllowableStress", schema: MaterialAllowableStressSchema },
    ]),
  ],
  controllers: [PipeScheduleController],
  providers: [
    PipeScheduleService,
    repositoryProvider(PipeScheduleRepository, MongoPipeScheduleRepository),
  ],
  exports: [PipeScheduleService],
})
export class PipeScheduleModule {}
