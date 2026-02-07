import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { NutMass } from "./entities/nut-mass.entity";
import { NutMassController } from "./nut-mass.controller";
import { NutMassService } from "./nut-mass.service";

@Module({
  imports: [TypeOrmModule.forFeature([NutMass, Bolt])],
  controllers: [NutMassController],
  providers: [NutMassService],
  exports: [NutMassService],
})
export class NutMassModule {}
