import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SteelSpecification } from "./entities/steel-specification.entity";
import { SteelSpecificationSchema } from "./schemas/steel-specification.schema";
import { SteelSpecificationController } from "./steel-specification.controller";
import { SteelSpecificationRepository } from "./steel-specification.repository";
import { MongoSteelSpecificationRepository } from "./steel-specification.repository.mongo";
import { PostgresSteelSpecificationRepository } from "./steel-specification.repository.postgres";
import { SteelSpecificationService } from "./steel-specification.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "SteelSpecification", schema: SteelSpecificationSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([SteelSpecification])]),
  ],
  controllers: [SteelSpecificationController],
  providers: [
    SteelSpecificationService,
    repositoryProvider(
      SteelSpecificationRepository,
      PostgresSteelSpecificationRepository,
      MongoSteelSpecificationRepository,
    ),
  ],
})
export class SteelSpecificationModule {}
