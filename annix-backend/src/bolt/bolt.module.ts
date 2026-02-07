import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { NutMass } from "src/nut-mass/entities/nut-mass.entity";
import { BoltController } from "./bolt.controller";
import { BoltService } from "./bolt.service";
import { Bolt } from "./entities/bolt.entity";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { UBoltEntity } from "./entities/u-bolt.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Bolt, BoltMass, NutMass, UBoltEntity, PipeClampEntity])],
  controllers: [BoltController],
  providers: [BoltService],
  exports: [BoltService],
})
export class BoltModule {}
