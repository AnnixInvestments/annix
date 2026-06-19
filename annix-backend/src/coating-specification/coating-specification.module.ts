import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
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
import { CoatingSpecificationService } from "./coating-specification.service";
import { CoatingEnvironmentSchema } from "./schemas/coating-environment.schema";
import { CoatingSpecificationSchema } from "./schemas/coating-specification.schema";
import { CoatingStandardSchema } from "./schemas/coating-standard.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "CoatingStandard", schema: CoatingStandardSchema },
      { name: "CoatingEnvironment", schema: CoatingEnvironmentSchema },
      { name: "CoatingSpecification", schema: CoatingSpecificationSchema },
    ]),
  ],
  controllers: [CoatingSpecificationController],
  providers: [
    CoatingSpecificationService,
    repositoryProvider(CoatingStandardRepository, MongoCoatingStandardRepository),
    repositoryProvider(CoatingEnvironmentRepository, MongoCoatingEnvironmentRepository),
    repositoryProvider(CoatingSpecificationRepository, MongoCoatingSpecificationRepository),
  ],
  exports: [CoatingSpecificationService],
})
export class CoatingSpecificationModule {}
