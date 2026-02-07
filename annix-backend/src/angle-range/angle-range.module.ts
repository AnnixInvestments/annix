import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AngleRangeController } from "./angle-range.controller";
import { AngleRangeService } from "./angle-range.service";
import { AngleRange } from "./entities/angle-range.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AngleRange])],
  controllers: [AngleRangeController],
  providers: [AngleRangeService],
  exports: [AngleRangeService],
})
export class AngleRangeModule {}
