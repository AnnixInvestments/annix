import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoatingSpecificationController } from "./coating-specification.controller";
import { CoatingSpecificationService } from "./coating-specification.service";
import { CoatingEnvironment } from "./entities/coating-environment.entity";
import { CoatingSpecification } from "./entities/coating-specification.entity";
import { CoatingStandard } from "./entities/coating-standard.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CoatingStandard, CoatingEnvironment, CoatingSpecification])],
  controllers: [CoatingSpecificationController],
  providers: [CoatingSpecificationService],
  exports: [CoatingSpecificationService],
})
export class CoatingSpecificationModule {}
