export { StockControlApiClient } from "./base";
export type { CpoChildJcLineItems } from "./qcMethods";
export * from "./types";

import "./authMethods";
import "./inventoryMethods";
import "./jobCardMethods";
import "./deliveryMethods";
import "./staffMethods";
import "./dashboardMethods";
import "./workflowMethods";
import "./invoiceMethods";
import "./issuanceMethods";
import "./chatMethods";
import "./certificateMethods";
import "./supplierDocumentMethods";
import "./qcMethods";
import "./positectorMethods";
import "./miscMethods";
import "./inspectionMethods";
import "./leaveMethods";
import "./reconciliationMethods";

import { StockControlApiClient } from "./base";

export const stockControlApiClient = new StockControlApiClient();
