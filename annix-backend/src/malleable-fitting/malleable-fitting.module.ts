import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";
import { MalleableFittingController } from "./malleable-fitting.controller";
import { MalleableFittingService } from "./malleable-fitting.service";

@Module({
  imports: [TypeOrmModule.forFeature([MalleableIronFittingDimension])],
  controllers: [MalleableFittingController],
  providers: [MalleableFittingService],
  exports: [MalleableFittingService],
})
export class MalleableFittingModule {}
