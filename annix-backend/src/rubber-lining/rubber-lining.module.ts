import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { LicensingModule } from "../licensing";
import { RbacModule } from "../rbac/rbac.module";
import { BlogPostsController } from "./blog-posts.controller";
import { ChemicalSupplierDocumentController } from "./chemical-supplier-document.controller";
import { CompoundDataSheetsController } from "./compound-data-sheets.controller";
import { RubberLiningCoreModule } from "./core/rubber-lining-core.module";
import { PublicAuIndustriesController } from "./public-au-industries.controller";
import { RubberAdminController } from "./rubber-admin.controller";
import { RubberInboundEmailController } from "./rubber-inbound-email.controller";
import { RubberLiningController } from "./rubber-lining.controller";
import { RubberReferenceDataController } from "./rubber-reference-data.controller";
import { TestimonialsController } from "./testimonials.controller";
import { WebsitePagesController } from "./website-pages.controller";

@Module({
  imports: [AdminModule, LicensingModule, RbacModule, RubberLiningCoreModule],
  controllers: [
    RubberLiningController,
    RubberReferenceDataController,
    RubberAdminController,
    RubberInboundEmailController,
    WebsitePagesController,
    TestimonialsController,
    BlogPostsController,
    CompoundDataSheetsController,
    ChemicalSupplierDocumentController,
    PublicAuIndustriesController,
  ],
  exports: [RubberLiningCoreModule],
})
export class RubberLiningModule {}
