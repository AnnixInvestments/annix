import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { NixExtraction } from "../entities/nix-extraction.entity";
import type { ExtractedItem } from "../services/excel-extractor.service";
import type {
  ExtractionProfileContext,
  ExtractionProfileResult,
  IExtractionProfileHandler,
} from "./extraction-profile-handler.interface";
import { NixExtractionProfileRegistry } from "./nix-extraction-profile-registry.service";

interface SupplierBundle {
  key: string;
  label: string;
  itemCount: number;
  totalLineQuantity: number;
  units: string[];
  itemRowNumbers: number[];
}

interface DuplicateGroup {
  description: string;
  occurrences: Array<{
    sheetName: string | undefined;
    rowNumber: number;
    quantity: number;
    unit: string;
  }>;
}

@Injectable()
export class RfqPipingProfileHandler implements IExtractionProfileHandler, OnModuleInit {
  private readonly logger = new Logger(RfqPipingProfileHandler.name);
  readonly profileKey = "rfq-piping";
  readonly label = "RFQ — Piping & fabrication";
  readonly sourceModule = "rfq";

  constructor(private readonly registry: NixExtractionProfileRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async postExtract(
    extraction: NixExtraction,
    context: ExtractionProfileContext,
  ): Promise<ExtractionProfileResult> {
    const items = (context.extractedItems ?? []) as ExtractedItem[];
    if (items.length === 0) {
      this.logger.debug(
        `rfq-piping postExtract called for extraction #${extraction.id} with no items — nothing to bundle.`,
      );
      return {};
    }

    const supplyOnly = items.filter((it) => it.actionType === "supply");
    const bundles = this.groupIntoBundles(supplyOnly);
    const duplicates = this.detectDuplicates(supplyOnly);
    const drawingReferences = this.collectDistinct(supplyOnly, (i) => i.drawingReference);
    const itemCodes = this.collectDistinct(supplyOnly, (i) => i.itemCode);

    const notes: string[] = [];
    if (duplicates.length > 0) {
      notes.push(
        `${duplicates.length} duplicate description(s) detected across sheets — review whether quantities should be summed or each kept separate.`,
      );
    }
    const dismantleCount = items.filter((it) => it.actionType === "dismantle").length;
    if (dismantleCount > 0) {
      notes.push(
        `${dismantleCount} dismantle/dispose row(s) found — these are demolition items, not procurement; review separately.`,
      );
    }

    this.logger.log(
      `rfq-piping postExtract: extraction #${extraction.id}, ${supplyOnly.length} supply items → ${bundles.length} supplier bundle(s), ${duplicates.length} duplicate group(s), ${drawingReferences.length} drawing ref(s).`,
    );

    return {
      metadata: {
        supplierBundles: bundles,
        duplicates,
        drawingReferences,
        itemCodes,
        supplyItemCount: supplyOnly.length,
        dismantleItemCount: dismantleCount,
      },
      notes,
    };
  }

  systemPrompt(): string | undefined {
    return undefined;
  }

  private groupIntoBundles(items: ExtractedItem[]): SupplierBundle[] {
    const buckets = new Map<string, SupplierBundle>();
    for (const item of items) {
      const { key, label } = this.bundleKeyFor(item);
      const bucket = buckets.get(key) ?? {
        key,
        label,
        itemCount: 0,
        totalLineQuantity: 0,
        units: [],
        itemRowNumbers: [],
      };
      bucket.itemCount += 1;
      bucket.totalLineQuantity += item.quantity;
      if (item.unit && !bucket.units.includes(item.unit)) bucket.units.push(item.unit);
      bucket.itemRowNumbers.push(item.rowNumber);
      buckets.set(key, bucket);
    }
    return Array.from(buckets.values()).sort((a, b) => b.itemCount - a.itemCount);
  }

  private bundleKeyFor(item: ExtractedItem): { key: string; label: string } {
    const desc = item.description.toLowerCase();

    if (item.itemType === "valve") {
      if (/pinch/.test(desc)) return { key: "valves-pinch", label: "Valves — Hydraulic Pinch" };
      if (/gate|rsv/.test(desc)) return { key: "valves-gate", label: "Valves — Gate (RSV)" };
      return { key: "valves-other", label: "Valves — Other" };
    }
    if (item.itemType === "pump") {
      return { key: "valve-accessories", label: "Valve Accessories — Hand Pumps" };
    }
    if (item.itemType === "consumable") {
      if (/gaskets?/.test(desc))
        return { key: "consumables-gaskets", label: "Consumables — Gaskets" };
      if (/bolt/.test(desc)) return { key: "consumables-bolts", label: "Consumables — Bolt Sets" };
      if (/drum|carboline|epoxy/.test(desc))
        return { key: "consumables-coating", label: "Consumables — Coating" };
      return { key: "consumables-other", label: "Consumables — Other" };
    }
    if (item.itemType === "wrapping") return { key: "pipe-wrapping", label: "Pipe Wrapping" };
    if (item.itemType === "upvc") return { key: "upvc-specials", label: "UPVC Specials" };
    if (item.itemType === "puddle_pipe")
      return { key: "hdpe-puddle-pipes", label: "HDPE Puddle Pipes (Cast-In)" };
    if (item.itemType === "boot") return { key: "hdpe-boots", label: "HDPE Pipe Boots" };
    if (item.itemType === "skid")
      return { key: "fabricated-skids", label: "Fabricated Pipe Skids" };

    if (/rubber[-\s]?lined|rudex/.test(desc)) {
      return { key: "rubber-lined-steel", label: "Rubber-Lined Steel Pipe & Specials" };
    }
    if (/mild\s*steel|sabs?\s*719|sans?\s*719/.test(desc)) {
      return { key: "mild-steel", label: "Mild Steel Pipe & Fabricated Specials" };
    }
    if (/hdpe|pe\s?100|\bsdr\b/.test(desc)) {
      return { key: "hdpe-pipe-fittings", label: "HDPE Pipe & Fittings" };
    }
    return { key: "other", label: "Other / Uncategorised" };
  }

  private detectDuplicates(items: ExtractedItem[]): DuplicateGroup[] {
    const groups = new Map<string, DuplicateGroup>();
    for (const item of items) {
      const normalised = this.normaliseDescription(item.description);
      const group = groups.get(normalised) ?? {
        description: item.description,
        occurrences: [],
      };
      group.occurrences.push({
        sheetName: item.sheetName,
        rowNumber: item.rowNumber,
        quantity: item.quantity,
        unit: item.unit,
      });
      groups.set(normalised, group);
    }
    return Array.from(groups.values()).filter((g) => g.occurrences.length > 1);
  }

  private normaliseDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s/-]/g, "")
      .trim();
  }

  private collectDistinct<T>(
    items: ExtractedItem[],
    pick: (item: ExtractedItem) => T | undefined,
  ): T[] {
    const seen = new Set<T>();
    const out: T[] = [];
    for (const item of items) {
      const value = pick(item);
      if (value && !seen.has(value)) {
        seen.add(value);
        out.push(value);
      }
    }
    return out;
  }
}
