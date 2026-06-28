import { GUARDS_METADATA } from "@nestjs/common/constants";
import { CertificateController } from "./certificate.controller";
import { ContactController } from "./contact.controller";
import { DeliveryNoteController } from "./delivery-note.controller";
import { InvoiceController } from "./invoice.controller";
import { PlatformCompanyAuthGuard } from "./platform-company-auth.guard";

describe("platform company resource controllers", () => {
  const guardedControllers = [
    ContactController,
    InvoiceController,
    CertificateController,
    DeliveryNoteController,
  ];

  it("requires platform tenant auth on company-scoped resources", () => {
    guardedControllers.forEach((controller) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([PlatformCompanyAuthGuard]);
    });
  });
});
