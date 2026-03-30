import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnsiFittingController } from "./ansi-fitting.controller";
import { AnsiFittingService } from "./ansi-fitting.service";
import { AnsiB169FittingDimension } from "./entities/ansi-b16-9-fitting-dimension.entity";
import { AnsiB169FittingType } from "./entities/ansi-b16-9-fitting-type.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AnsiB169FittingDimension, AnsiB169FittingType])],
  controllers: [AnsiFittingController],
  providers: [AnsiFittingService],
  exports: [AnsiFittingService],
})
export class AnsiFittingModule {}
