import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltMassController } from "./bolt-mass.controller";
import { BoltMassService } from "./bolt-mass.service";
import { BoltMass } from "./entities/bolt-mass.entity";

@Module({
  imports: [TypeOrmModule.forFeature([BoltMass, Bolt])],
  controllers: [BoltMassController],
  providers: [BoltMassService],
  exports: [BoltMassService],
})
export class BoltMassModule {}
