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
  CustomerOnboarding,
  CustomerDocument,
  CustomerPreferredSupplier,
  CustomerBlockedSupplier,
  SupplierInvitation,
} from './entities';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { SupplierCompany } from '../supplier/entities/supplier-company.entity';
import { SupplierCapability } from '../supplier/entities/supplier-capability.entity';
import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';

// Services
import { CustomerAuthService } from './customer-auth.service';
import { CustomerService } from './customer.service';
import { CustomerAdminService } from './customer-admin.service';
import { CustomerOnboardingService } from './customer-onboarding.service';
import { CustomerDocumentService } from './customer-document.service';
import { CustomerSupplierService } from './customer-supplier.service';
import { DocumentOcrService } from './document-ocr.service';
import { CertificateExpiryService } from './services/certificate-expiry.service';

// Controllers
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerController } from './customer.controller';
import { CustomerAdminController } from './customer-admin.controller';
import { CustomerOnboardingController } from './customer-onboarding.controller';
import { CustomerDocumentController } from './customer-document.controller';
import { CustomerSupplierController } from './customer-supplier.controller';
import { CustomerMessagingController } from './customer-messaging.controller';

// Guards
import { CustomerAuthGuard } from './guards/customer-auth.guard';

// External modules
import { UserModule } from '../user/user.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { AdminModule } from '../admin/admin.module';
import { NixModule } from '../nix/nix.module';
import { MessagingModule } from '../messaging/messaging.module';
import { SecureDocumentsModule } from '../secure-documents/secure-documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCompany,
      CustomerProfile,
      CustomerDeviceBinding,
      CustomerLoginAttempt,
      CustomerSession,
      CustomerOnboarding,
      CustomerDocument,
      CustomerPreferredSupplier,
      CustomerBlockedSupplier,
      SupplierInvitation,
      SupplierProfile,
      SupplierCompany,
      SupplierCapability,
      User,
      UserRole,
      Rfq,
      RfqDraft,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuditModule,
    EmailModule,
    StorageModule,
    AdminModule,
    NixModule,
    MessagingModule,
    SecureDocumentsModule,
  ],
  controllers: [
    CustomerAuthController,
    CustomerController,
    CustomerAdminController,
    CustomerOnboardingController,
    CustomerDocumentController,
    CustomerSupplierController,
    CustomerMessagingController,
  ],
  providers: [
    CustomerAuthService,
    CustomerService,
    CustomerAdminService,
    CustomerOnboardingService,
    CustomerDocumentService,
    CustomerSupplierService,
    DocumentOcrService,
    CertificateExpiryService,
    CustomerAuthGuard,
  ],
  exports: [
    CustomerAuthService,
    CustomerService,
    CustomerOnboardingService,
    CustomerSupplierService,
    CustomerAuthGuard,
    JwtModule,
  ],
})
export class CustomerModule {}
