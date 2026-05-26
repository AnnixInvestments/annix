import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";
import { MalleableFittingController } from "./malleable-fitting.controller";
import { MalleableFittingRepository } from "./malleable-fitting.repository";
import { MongoMalleableFittingRepository } from "./malleable-fitting.repository.mongo";
import { PostgresMalleableFittingRepository } from "./malleable-fitting.repository.postgres";
import { MalleableFittingService } from "./malleable-fitting.service";
import { MalleableIronFittingDimensionSchema } from "./schemas/malleable-iron-fitting-dimension.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "MalleableIronFittingDimension", schema: MalleableIronFittingDimensionSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([MalleableIronFittingDimension])]),
  ],
  controllers: [MalleableFittingController],
  providers: [
    MalleableFittingService,
    repositoryProvider(
      MalleableFittingRepository,
      PostgresMalleableFittingRepository,
      MongoMalleableFittingRepository,
    ),
  ],
  exports: [MalleableFittingService],
})
export class MalleableFittingModule {}
