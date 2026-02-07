import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { BendCenterToFaceController } from "./bend-center-to-face.controller";
import { BendCenterToFaceService } from "./bend-center-to-face.service";
import { BendCenterToFace } from "./entities/bend-center-to-face.entity";

@Module({
  imports: [TypeOrmModule.forFeature([BendCenterToFace, PipeDimension, FlangeDimension])],
  controllers: [BendCenterToFaceController],
  providers: [BendCenterToFaceService],
  exports: [BendCenterToFaceService],
})
export class BendCenterToFaceModule {}
