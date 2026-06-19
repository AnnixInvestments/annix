import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlangeDimensionSchema } from "../flange-dimension/schemas/flange-dimension.schema";
import { FlangeTypeWeightModule } from "../flange-type-weight/flange-type-weight.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { NominalOutsideDiameterMmSchema } from "../nominal-outside-diameter-mm/schemas/nominal-outside-diameter-mm.schema";
import { PipeDimensionSchema } from "../pipe-dimension/schemas/pipe-dimension.schema";
import { BendCenterToFaceController } from "./bend-center-to-face.controller";
import { BendCenterToFaceRepository } from "./bend-center-to-face.repository";
import { MongoBendCenterToFaceRepository } from "./bend-center-to-face.repository.mongo";
import { BendCenterToFaceService } from "./bend-center-to-face.service";
import { BendCenterToFaceSchema } from "./schemas/bend-center-to-face.schema";

@Module({
  imports: [
    FlangeTypeWeightModule,
    MongooseModule.forFeature([
      { name: "BendCenterToFace", schema: BendCenterToFaceSchema },
      { name: "PipeDimension", schema: PipeDimensionSchema },
      { name: "FlangeDimension", schema: FlangeDimensionSchema },
      { name: "NominalOutsideDiameterMm", schema: NominalOutsideDiameterMmSchema },
    ]),
  ],
  controllers: [BendCenterToFaceController],
  providers: [
    BendCenterToFaceService,
    repositoryProvider(BendCenterToFaceRepository, MongoBendCenterToFaceRepository),
  ],
  exports: [BendCenterToFaceService],
})
export class BendCenterToFaceModule {}
