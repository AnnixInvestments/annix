import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangeBoltingController } from "./flange-bolting.controller";
import {
  FlangeBoltingMaterialRepository,
  FlangeBoltingRepository,
} from "./flange-bolting.repository";
import {
  MongoFlangeBoltingMaterialRepository,
  MongoFlangeBoltingRepository,
} from "./flange-bolting.repository.mongo";
import { FlangeBoltingService } from "./flange-bolting.service";
import { FlangeBoltingSchema } from "./schemas/flange-bolting.schema";
import { FlangeBoltingMaterialSchema } from "./schemas/flange-bolting-material.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FlangeBolting", schema: FlangeBoltingSchema },
      { name: "FlangeBoltingMaterial", schema: FlangeBoltingMaterialSchema },
    ]),
  ],
  controllers: [FlangeBoltingController],
  providers: [
    FlangeBoltingService,
    repositoryProvider(FlangeBoltingRepository, MongoFlangeBoltingRepository),
    repositoryProvider(FlangeBoltingMaterialRepository, MongoFlangeBoltingMaterialRepository),
  ],
  exports: [FlangeBoltingService],
})
export class FlangeBoltingModule {}
