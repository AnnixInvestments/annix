import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { BendCenterToFaceController } from "./bend-center-to-face.controller";
import { BendCenterToFaceRepository } from "./bend-center-to-face.repository";
import { MongoBendCenterToFaceRepository } from "./bend-center-to-face.repository.mongo";
import { PostgresBendCenterToFaceRepository } from "./bend-center-to-face.repository.postgres";
import { BendCenterToFaceService } from "./bend-center-to-face.service";
import { BendCenterToFace } from "./entities/bend-center-to-face.entity";
import { BendCenterToFaceSchema } from "./schemas/bend-center-to-face.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "BendCenterToFace", schema: BendCenterToFaceSchema },
            { name: "PipeDimension", schema: PipeDimensionSchema },
            { name: "FlangeDimension", schema: FlangeDimensionSchema },
            { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([BendCenterToFace, PipeDimension, FlangeDimension])]),
  ],
  controllers: [BendCenterToFaceController],
  providers: [
    BendCenterToFaceService,
    repositoryProvider(
      BendCenterToFaceRepository,
      PostgresBendCenterToFaceRepository,
      MongoBendCenterToFaceRepository,
    ),
  ],
  exports: [BendCenterToFaceService],
})
export class BendCenterToFaceModule {}
