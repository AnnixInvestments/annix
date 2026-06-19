import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangePtRatingController } from "./flange-pt-rating.controller";
import { FlangePtRatingRepository } from "./flange-pt-rating.repository";
import { MongoFlangePtRatingRepository } from "./flange-pt-rating.repository.mongo";
import { FlangePtRatingService } from "./flange-pt-rating.service";
import { FlangePtRatingSchema } from "./schemas/flange-pt-rating.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FlangePtRating", schema: FlangePtRatingSchema },
      { name: "FlangePressureClass", schema: FlangePressureClassSchema },
    ]),
  ],
  controllers: [FlangePtRatingController],
  providers: [
    FlangePtRatingService,
    repositoryProvider(FlangePtRatingRepository, MongoFlangePtRatingRepository),
  ],
  exports: [FlangePtRatingService],
})
export class FlangePtRatingModule {}
