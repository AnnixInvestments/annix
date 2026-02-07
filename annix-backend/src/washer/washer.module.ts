import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { Washer } from "./entities/washer.entity";
import { WasherController } from "./washer.controller";
import { WasherService } from "./washer.service";

@Module({
  imports: [TypeOrmModule.forFeature([Washer, Bolt])],
  controllers: [WasherController],
  providers: [WasherService],
  exports: [WasherService],
})
export class WasherModule {}
