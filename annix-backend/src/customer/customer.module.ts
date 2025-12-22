import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import {
  CustomerCompany,
  CustomerProfile,
  CustomerDeviceBinding,
  CustomerLoginAttempt,
  CustomerSession,
} from './entities';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';

// Services
import { CustomerAuthService } from './customer-auth.service';
import { CustomerService } from './customer.service';
import { CustomerAdminService } from './customer-admin.service';

// Controllers
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerController } from './customer.controller';
import { CustomerAdminController } from './customer-admin.controller';

// External modules
import { UserModule } from '../user/user.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCompany,
      CustomerProfile,
      CustomerDeviceBinding,
      CustomerLoginAttempt,
      CustomerSession,
      User,
      UserRole,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuditModule,
  ],
  controllers: [
    CustomerAuthController,
    CustomerController,
    CustomerAdminController,
  ],
  providers: [
    CustomerAuthService,
    CustomerService,
    CustomerAdminService,
  ],
  exports: [
    CustomerAuthService,
    CustomerService,
  ],
})
export class CustomerModule {}
