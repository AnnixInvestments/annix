import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SteelSpecificationSchema } from "./schemas/steel-specification.schema";
import { SteelSpecificationController } from "./steel-specification.controller";
import { SteelSpecificationRepository } from "./steel-specification.repository";
import { MongoSteelSpecificationRepository } from "./steel-specification.repository.mongo";
import { SteelSpecificationService } from "./steel-specification.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "SteelSpecification", schema: SteelSpecificationSchema }]),
  ],
  controllers: [SteelSpecificationController],
  providers: [
    SteelSpecificationService,
    repositoryProvider(SteelSpecificationRepository, MongoSteelSpecificationRepository),
  ],
})
export class SteelSpecificationModule {}
