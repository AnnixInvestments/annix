export { StockControlApiClient } from "./base";
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
import "./qcMethods";
import "./positectorMethods";
import "./miscMethods";
import "./inspectionMethods";
import "./reconciliationMethods";

import { StockControlApiClient } from "./base";

export const stockControlApiClient = new StockControlApiClient();
