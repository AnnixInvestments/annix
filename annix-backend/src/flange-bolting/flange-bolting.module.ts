import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeBolting } from "./entities/flange-bolting.entity";
import { FlangeBoltingMaterial } from "./entities/flange-bolting-material.entity";
import { FlangeBoltingController } from "./flange-bolting.controller";
import {
  FlangeBoltingMaterialRepository,
  FlangeBoltingRepository,
} from "./flange-bolting.repository";
import {
  MongoFlangeBoltingMaterialRepository,
  MongoFlangeBoltingRepository,
} from "./flange-bolting.repository.mongo";
import {
  PostgresFlangeBoltingMaterialRepository,
  PostgresFlangeBoltingRepository,
} from "./flange-bolting.repository.postgres";
import { FlangeBoltingService } from "./flange-bolting.service";
import { FlangeBoltingSchema } from "./schemas/flange-bolting.schema";
import { FlangeBoltingMaterialSchema } from "./schemas/flange-bolting-material.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FlangeBolting", schema: FlangeBoltingSchema },
            { name: "FlangeBoltingMaterial", schema: FlangeBoltingMaterialSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FlangeBolting, FlangeBoltingMaterial])]),
  ],
  controllers: [FlangeBoltingController],
  providers: [
    FlangeBoltingService,
    repositoryProvider(
      FlangeBoltingRepository,
      PostgresFlangeBoltingRepository,
      MongoFlangeBoltingRepository,
    ),
    repositoryProvider(
      FlangeBoltingMaterialRepository,
      PostgresFlangeBoltingMaterialRepository,
      MongoFlangeBoltingMaterialRepository,
    ),
  ],
  exports: [FlangeBoltingService],
})
export class FlangeBoltingModule {}
