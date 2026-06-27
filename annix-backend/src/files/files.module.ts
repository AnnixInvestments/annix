import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "../admin/admin.module";
import { AuthModule } from "../auth/auth.module";
import { AnyUserAuthGuard } from "../auth/guards/any-user-auth.guard";
import { CustomerModule } from "../customer/customer.module";
import { SupplierModule } from "../supplier/supplier.module";
import { UserModule } from "../user/user.module";
import { FilesController } from "./files.controller";

@Module({
  imports: [ConfigModule, AuthModule, AdminModule, CustomerModule, SupplierModule, UserModule],
  controllers: [FilesController],
  providers: [AnyUserAuthGuard],
})
export class FilesModule {}
