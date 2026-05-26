import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CoatingSpecificationController } from "./coating-specification.controller";
import {
  CoatingEnvironmentRepository,
  CoatingSpecificationRepository,
  CoatingStandardRepository,
} from "./coating-specification.repository";
import {
  MongoCoatingEnvironmentRepository,
  MongoCoatingSpecificationRepository,
  MongoCoatingStandardRepository,
} from "./coating-specification.repository.mongo";
import {
  PostgresCoatingEnvironmentRepository,
  PostgresCoatingSpecificationRepository,
  PostgresCoatingStandardRepository,
} from "./coating-specification.repository.postgres";
import { CoatingSpecificationService } from "./coating-specification.service";
import { CoatingEnvironment } from "./entities/coating-environment.entity";
import { CoatingSpecification } from "./entities/coating-specification.entity";
import { CoatingStandard } from "./entities/coating-standard.entity";
import { CoatingEnvironmentSchema } from "./schemas/coating-environment.schema";
import { CoatingSpecificationSchema } from "./schemas/coating-specification.schema";
import { CoatingStandardSchema } from "./schemas/coating-standard.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "CoatingStandard", schema: CoatingStandardSchema },
            { name: "CoatingEnvironment", schema: CoatingEnvironmentSchema },
            { name: "CoatingSpecification", schema: CoatingSpecificationSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([CoatingStandard, CoatingEnvironment, CoatingSpecification])]),
  ],
  controllers: [CoatingSpecificationController],
  providers: [
    CoatingSpecificationService,
    repositoryProvider(
      CoatingStandardRepository,
      PostgresCoatingStandardRepository,
      MongoCoatingStandardRepository,
    ),
    repositoryProvider(
      CoatingEnvironmentRepository,
      PostgresCoatingEnvironmentRepository,
      MongoCoatingEnvironmentRepository,
    ),
    repositoryProvider(
      CoatingSpecificationRepository,
      PostgresCoatingSpecificationRepository,
      MongoCoatingSpecificationRepository,
    ),
  ],
  exports: [CoatingSpecificationService],
})
export class CoatingSpecificationModule {}
