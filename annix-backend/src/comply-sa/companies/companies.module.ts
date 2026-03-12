import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaCompaniesController } from "./companies.controller";
import { ComplySaCompaniesService } from "./companies.service";
import { ComplySaCompany } from "./entities/company.entity";
import { ComplySaUser } from "./entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplySaCompany, ComplySaUser])],
  controllers: [ComplySaCompaniesController],
  providers: [ComplySaCompaniesService],
  exports: [TypeOrmModule, ComplySaCompaniesService],
})
export class ComplySaCompaniesModule {}
