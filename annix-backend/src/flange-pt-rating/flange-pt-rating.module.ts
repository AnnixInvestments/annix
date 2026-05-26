import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangePressureClassSchema } from "../flange-pressure-class/schemas/flange-pressure-class.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FlangePtRating } from "./entities/flange-pt-rating.entity";
import { FlangePtRatingController } from "./flange-pt-rating.controller";
import { FlangePtRatingRepository } from "./flange-pt-rating.repository";
import { MongoFlangePtRatingRepository } from "./flange-pt-rating.repository.mongo";
import { PostgresFlangePtRatingRepository } from "./flange-pt-rating.repository.postgres";
import { FlangePtRatingService } from "./flange-pt-rating.service";
import { FlangePtRatingSchema } from "./schemas/flange-pt-rating.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "FlangePtRating", schema: FlangePtRatingSchema },
            { name: "FlangePressureClass", schema: FlangePressureClassSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([FlangePtRating, FlangePressureClass])]),
  ],
  controllers: [FlangePtRatingController],
  providers: [
    FlangePtRatingService,
    repositoryProvider(
      FlangePtRatingRepository,
      PostgresFlangePtRatingRepository,
      MongoFlangePtRatingRepository,
    ),
  ],
  exports: [FlangePtRatingService],
})
export class FlangePtRatingModule {}
