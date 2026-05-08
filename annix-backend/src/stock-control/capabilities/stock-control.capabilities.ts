import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

/**
 * Stock Control Nix capability registration (ref #262 Phase 3).
 *
 * Stock Control has the deepest how-to-guide library (34 guides) so this
 * registration leans heavily on guideSlug pointers — every capability
 * with a corresponding guide is set up for Phase 4 walkthrough mode.
 */
@Injectable()
export class StockControlCapabilities implements OnModuleInit {
  private readonly logger = new Logger(StockControlCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} Stock Control capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "stock-control.create-job-card",
        appCode: "stock-control",
        label: "Create a job card",
        description: "Walk through creating a new job card with line items and workflow steps.",
        intents: ["create job card", "new jc", "new job card", "make a job card"],
        guideSlug: "creating-a-job-card",
      },
      {
        key: "stock-control.approve-job-card",
        appCode: "stock-control",
        label: "Approve a job card",
        description: "Walk through reviewing and approving a job card.",
        intents: ["approve job card", "approve jc", "sign off job card"],
        guideSlug: "approving-a-job-card",
      },
      {
        key: "stock-control.close-job-card",
        appCode: "stock-control",
        label: "Close a job card",
        description: "Walk through closing out a completed job card.",
        intents: ["close job card", "close jc", "complete job card"],
        guideSlug: "closing-a-job-card",
      },
      {
        key: "stock-control.process-delivery",
        appCode: "stock-control",
        label: "Process an incoming delivery",
        description: "Receive a delivery, match it to a PO, and reconcile line items.",
        intents: ["process delivery", "receive delivery", "log delivery", "incoming delivery"],
        guideSlug: "processing-a-delivery",
      },
      {
        key: "stock-control.extract-supplier-invoice",
        appCode: "stock-control",
        label: "Extract a supplier invoice",
        description: "Drop a supplier invoice and have Nix extract line items, totals, and dates.",
        intents: ["extract supplier invoice", "process invoice", "upload invoice"],
        guideSlug: "extracting-supplier-invoice",
      },
      {
        key: "stock-control.upload-positector",
        appCode: "stock-control",
        label: "Upload PosiTector measurements",
        description: "Upload PosiTector DFT measurements and have Nix match them to job cards.",
        intents: ["upload positector", "dft measurements", "thickness readings"],
        guideSlug: "positector-upload",
      },
      {
        key: "stock-control.use-qcps",
        appCode: "stock-control",
        label: "Use Quality Control Plans (QCPs)",
        description: "Configure and use QCPs across job-card workflows.",
        intents: ["use qcps", "quality control plan", "qcp setup"],
        guideSlug: "using-qcps",
      },
      {
        key: "stock-control.raise-requisition",
        appCode: "stock-control",
        label: "Raise a requisition",
        description: "Walk through raising and fulfilling a stock requisition.",
        intents: ["raise requisition", "request stock", "stock requisition"],
        guideSlug: "using-requisitions",
      },
      {
        key: "stock-control.merge-duplicates",
        appCode: "stock-control",
        label: "Find and merge duplicate stock items",
        description: "Identify duplicate stock items and merge them safely.",
        intents: ["merge duplicates", "duplicate stock items", "consolidate stock"],
        guideSlug: "finding-and-merging-duplicate-stock-items",
      },
      {
        key: "stock-control.invite-team",
        appCode: "stock-control",
        label: "Invite team members",
        description: "Invite a teammate to your Stock Control workspace and assign their role.",
        intents: ["invite team", "add user", "invite colleague", "add team member"],
        guideSlug: "inviting-team-members",
      },
    ];
  }
}
