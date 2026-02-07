import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SteelSpecification } from "./entities/steel-specification.entity";
import { SteelSpecificationController } from "./steel-specification.controller";
import { SteelSpecificationService } from "./steel-specification.service";

@Module({
  imports: [TypeOrmModule.forFeature([SteelSpecification])],
  controllers: [SteelSpecificationController],
  providers: [SteelSpecificationService],
})
export class SteelSpecificationModule {}
