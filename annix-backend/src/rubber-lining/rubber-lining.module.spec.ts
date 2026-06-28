import { MODULE_METADATA } from "@nestjs/common/constants";
import { AdminModule } from "../admin/admin.module";
import { RubberLiningModule } from "./rubber-lining.module";

jest.mock("../admin/admin.module", () => ({ AdminModule: class AdminModule {} }));
jest.mock("./blog-posts.controller", () => ({ BlogPostsController: class BlogPostsController {} }));
jest.mock("./chemical-supplier-document.controller", () => ({
  ChemicalSupplierDocumentController: class ChemicalSupplierDocumentController {},
}));
jest.mock("./compound-data-sheets.controller", () => ({
  CompoundDataSheetsController: class CompoundDataSheetsController {},
}));
jest.mock("./core/rubber-lining-core.module", () => ({
  RubberLiningCoreModule: class RubberLiningCoreModule {},
}));
jest.mock("./public-au-industries.controller", () => ({
  PublicAuIndustriesController: class PublicAuIndustriesController {},
}));
jest.mock("./rubber-admin.controller", () => ({
  RubberAdminController: class RubberAdminController {},
}));
jest.mock("./rubber-inbound-email.controller", () => ({
  RubberInboundEmailController: class RubberInboundEmailController {},
}));
jest.mock("./rubber-lining.controller", () => ({
  RubberLiningController: class RubberLiningController {},
}));
jest.mock("./rubber-reference-data.controller", () => ({
  RubberReferenceDataController: class RubberReferenceDataController {},
}));
jest.mock("./testimonials.controller", () => ({
  TestimonialsController: class TestimonialsController {},
}));
jest.mock("./website-pages.controller", () => ({
  WebsitePagesController: class WebsitePagesController {},
}));

describe("RubberLiningModule", () => {
  it("imports admin auth providers for guarded rubber controllers", () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, RubberLiningModule) as unknown[];

    expect(imports).toContain(AdminModule);
  });
});
