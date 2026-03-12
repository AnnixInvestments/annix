import { Module } from "@nestjs/common";
import { ComplySaAdvisorModule } from "./advisor/advisor.module";
import { ComplySaAiModule } from "./ai/ai.module";
import { ComplySaApiKeysModule } from "./api-keys/api-keys.module";
import { ComplySaBbeeModule } from "./bbee/bbee.module";
import { ComplySaCompaniesModule } from "./companies/companies.module";
import { ComplySaComplianceModule } from "./compliance/compliance.module";
import { ComplySaAuthModule } from "./comply-auth/auth.module";
import { ComplySaDocumentsModule } from "./comply-documents/documents.module";
import { ComplySaIntegrationsModule } from "./comply-integrations/integrations.module";
import { ComplySaNotificationsModule } from "./comply-notifications/notifications.module";
import { ComplySaTemplatesModule } from "./comply-templates/templates.module";
import { ComplySaI18nModule } from "./i18n/i18n.module";
import { ComplySaRegulatoryModule } from "./regulatory/regulatory.module";
import { ComplySaSubscriptionsModule } from "./subscriptions/subscriptions.module";
import { ComplySaTaxModule } from "./tax/tax.module";
import { ComplySaTenderModule } from "./tender/tender.module";

@Module({
  imports: [
    ComplySaAuthModule,
    ComplySaCompaniesModule,
    ComplySaComplianceModule,
    ComplySaDocumentsModule,
    ComplySaNotificationsModule,
    ComplySaBbeeModule,
    ComplySaTaxModule,
    ComplySaTemplatesModule,
    ComplySaAdvisorModule,
    ComplySaAiModule,
    ComplySaTenderModule,
    ComplySaRegulatoryModule,
    ComplySaSubscriptionsModule,
    ComplySaApiKeysModule,
    ComplySaIntegrationsModule,
    ComplySaI18nModule,
  ],
})
export class ComplySaModule {}
