import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { ChemicalComposition, TensileTestResult, WeldingRequirement } from "./entities";

@Module({
  imports: [
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([ChemicalComposition, TensileTestResult, WeldingRequirement])]),
  ],
  exports: [...(isMongoDriver() ? [] : [TypeOrmModule])],
})
export class MaterialCertificationModule {}
