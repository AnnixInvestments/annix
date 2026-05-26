import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MaterialAllowableStress } from "./entities/material-allowable-stress.entity";
import { PipeSchedule } from "./entities/pipe-schedule.entity";
import { PipeScheduleController } from "./pipe-schedule.controller";
import { PipeScheduleRepository } from "./pipe-schedule.repository";
import { MongoPipeScheduleRepository } from "./pipe-schedule.repository.mongo";
import { PostgresPipeScheduleRepository } from "./pipe-schedule.repository.postgres";
import { PipeScheduleService } from "./pipe-schedule.service";
import { MaterialAllowableStressSchema } from "./schemas/material-allowable-stress.schema";
import { PipeScheduleSchema } from "./schemas/pipe-schedule.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PipeSchedule", schema: PipeScheduleSchema },
            { name: "MaterialAllowableStress", schema: MaterialAllowableStressSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([PipeSchedule, MaterialAllowableStress])]),
  ],
  controllers: [PipeScheduleController],
  providers: [
    PipeScheduleService,
    repositoryProvider(
      PipeScheduleRepository,
      PostgresPipeScheduleRepository,
      MongoPipeScheduleRepository,
    ),
  ],
  exports: [PipeScheduleService],
})
export class PipeScheduleModule {}
