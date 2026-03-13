import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixRepAuthModule } from "../auth/annix-rep-auth.module";
import { RepProfileController } from "./rep-profile.controller";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileService } from "./rep-profile.service";

@Module({
  imports: [TypeOrmModule.forFeature([RepProfile]), AnnixRepAuthModule],
  controllers: [RepProfileController],
  providers: [RepProfileService],
  exports: [RepProfileService],
})
export class RepProfileModule {}
