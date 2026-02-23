import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChemicalComposition, TensileTestResult, WeldingRequirement } from "./entities";

@Module({
  imports: [TypeOrmModule.forFeature([ChemicalComposition, TensileTestResult, WeldingRequirement])],
  exports: [TypeOrmModule],
})
export class MaterialCertificationModule {}
