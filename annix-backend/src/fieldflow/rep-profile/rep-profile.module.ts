import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RepProfileController } from "./rep-profile.controller";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileService } from "./rep-profile.service";

@Module({
  imports: [TypeOrmModule.forFeature([RepProfile])],
  controllers: [RepProfileController],
  providers: [RepProfileService],
  exports: [RepProfileService],
})
export class RepProfileModule {}
