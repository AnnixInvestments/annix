import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { MongoFlangeStandardRepository } from "../flange-standard/flange-standard.repository.mongo";
import { PostgresFlangeStandardRepository } from "../flange-standard/flange-standard.repository.postgres";
import { FlangeStandardSchema } from "../flange-standard/schemas/flange-standard.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassController } from "./flange-pressure-class.controller";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";
import { MongoFlangePressureClassRepository } from "./flange-pressure-class.repository.mongo";
import { PostgresFlangePressureClassRepository } from "./flange-pressure-class.repository.postgres";
import { FlangePressureClassService } from "./flange-pressure-class.service";
import { FlangePressureClassSchema } from "./schemas/flange-pressure-class.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FlangePressureClass", schema: FlangePressureClassSchema },
            { name: "FlangeStandard", schema: FlangeStandardSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FlangePressureClass, FlangeStandard])]),
  ],
  controllers: [FlangePressureClassController],
  providers: [
    FlangePressureClassService,
    repositoryProvider(
      FlangePressureClassRepository,
      PostgresFlangePressureClassRepository,
      MongoFlangePressureClassRepository,
    ),
    repositoryProvider(
      FlangeStandardRepository,
      PostgresFlangeStandardRepository,
      MongoFlangeStandardRepository,
    ),
  ],
  exports: [FlangePressureClassService],
})
export class FlangePressureClassModule {}
