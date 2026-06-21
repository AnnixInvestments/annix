import { StockControlApiClient } from "./base";
import type {
  CommitRubberBondingAgentImportInput,
  CreateRubberBondingAgentInput,
  PriceListImportCommitResult,
  RubberBondingAgentImportPreview,
  RubberBondingAgentsResponse,
  UpdateRubberBondingAgentInput,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    rubberBondingAgents(): Promise<RubberBondingAgentsResponse>;
    createRubberBondingAgent(input: CreateRubberBondingAgentInput): Promise<unknown>;
    updateRubberBondingAgent(id: number, input: UpdateRubberBondingAgentInput): Promise<unknown>;
    deleteRubberBondingAgent(id: number): Promise<{ success: true }>;
    seedRubberBondingAgents(): Promise<{ seeded: number }>;
    importRubberBondingAgents(file: File): Promise<RubberBondingAgentImportPreview>;
    commitRubberBondingAgentImport(
      input: CommitRubberBondingAgentImportInput,
    ): Promise<PriceListImportCommitResult>;
  }
}

const proto = StockControlApiClient.prototype;

proto.rubberBondingAgents = async function () {
  return this.request("/stock-control/rubber-bonding-agents");
};

proto.createRubberBondingAgent = async function (input) {
  return this.request("/stock-control/rubber-bonding-agents", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.updateRubberBondingAgent = async function (id, input) {
  return this.request(`/stock-control/rubber-bonding-agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

proto.deleteRubberBondingAgent = async function (id) {
  return this.request(`/stock-control/rubber-bonding-agents/${id}`, { method: "DELETE" });
};

proto.seedRubberBondingAgents = async function () {
  return this.request("/stock-control/rubber-bonding-agents/seed", { method: "POST" });
};

proto.importRubberBondingAgents = async function (file) {
  return this.uploadFile("/stock-control/rubber-bonding-agents/import", file);
};

proto.commitRubberBondingAgentImport = async function (input) {
  return this.request("/stock-control/rubber-bonding-agents/import/commit", {
    method: "POST",
    body: JSON.stringify(input),
  });
};
