import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { type StockAssessmentItem } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { StockReturn } from "../entities/stock-return.entity";
import { parseRubberSpecNote, suggestPlyCombinations } from "../lib/rubberCuttingCalculator";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { StockReturnRepository } from "../repositories/stock-return.repository";

export interface AllocationPlanItem {
  product: string;
  stockItemId: number;
  stockItemName: string;
  requiredLitres: number;
  packSizeLitres: number | null;
  recommendedPacks: number | null;
  componentGroup: string | null;
  componentRole: string | null;
  mixRatio: string | null;
  availableQuantity: number;
  leftoverSuggestion: LeftoverSuggestion | null;
  unitOfMeasure?: string | null;
  rubberRollWidthMm?: number | null;
  rubberRollLengthM?: number | null;
  rubberRollThicknessMm?: number | null;
  rubberRollsRequired?: number | null;
}

export interface LeftoverSuggestion {
  stockItemId: number;
  stockItemName: string;
  availableLitres: number;
  sourceJobCardId: number | null;
}

interface AllocatePackDto {
  stockItemId: number;
  packCount: number;
  sourceLeftoverItemId?: number | null;
}

@Injectable()
export class StockAllocationService {
  private readonly logger = new Logger(StockAllocationService.name);

  constructor(
    private readonly allocationRepo: StockAllocationRepository,
    private readonly stockItemRepo: StockItemRepository,
    private readonly analysisRepo: JobCardCoatingAnalysisRepository,
    private readonly jobCardRepo: JobCardRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly stockReturnRepo: StockReturnRepository,
  ) {}

  async recommendedAllocations(
    companyId: number,
    jobCardId: number,
  ): Promise<{ items: AllocationPlanItem[]; leftovers: LeftoverSuggestion[] }> {
    const analysis = await this.analysisRepo.findOneForJobCard(companyId, jobCardId);

    if (!analysis) {
      throw new NotFoundException("Coating analysis not found for this job card");
    }

    const assessment: StockAssessmentItem[] =
      analysis.pmEditedAssessment || analysis.stockAssessment || [];

    const stockItems = await this.stockItemRepo.findForCompanySelectMatch(companyId);
    const leftoverItems = stockItems.filter((si) => si.isLeftover && Number(si.quantity) > 0);

    const leftovers: LeftoverSuggestion[] = [];
    const items: AllocationPlanItem[] = assessment.map((assessItem) => {
      const linkedItem = assessItem.stockItemId
        ? stockItems.find((si) => si.id === assessItem.stockItemId) || null
        : null;
      const linkedHasStock = linkedItem ? Number(linkedItem.quantity) > 0 : false;
      const matchedItem = linkedHasStock
        ? linkedItem
        : this.fuzzyMatchStockItem(assessItem.product, stockItems) || linkedItem;

      const leftover = matchedItem
        ? this.findMatchingLeftover(assessItem.product, leftoverItems)
        : null;

      if (leftover && !leftovers.some((l) => l.stockItemId === leftover.id)) {
        leftovers.push({
          stockItemId: leftover.id,
          stockItemName: leftover.name,
          availableLitres: Number(leftover.quantity),
          sourceJobCardId: leftover.sourceJobCardId,
        });
      }

      const packSizeLitres = matchedItem
        ? matchedItem.packSizeLitres
          ? Number(matchedItem.packSizeLitres)
          : null
        : null;
      const rawQuantity = matchedItem ? Number(matchedItem.quantity) : 0;
      const uom = matchedItem ? matchedItem.unitOfMeasure : null;
      const isLitreUnit = uom === "ltr" || uom === "L" || uom === "litre";

      const availableKits = (() => {
        if (!matchedItem) return 0;
        const cg = matchedItem.componentGroup;
        if (!cg) return rawQuantity;
        const siblings = stockItems.filter(
          (si) => si.componentGroup === cg && Number(si.quantity) >= 0,
        );
        if (siblings.length <= 1) return rawQuantity;
        return Math.min(...siblings.map((si) => Number(si.quantity)));
      })();

      const availableLitres =
        isLitreUnit || !packSizeLitres ? availableKits : availableKits * packSizeLitres;
      const remainingLitres = leftover
        ? Math.max(0, assessItem.required - Number(leftover.quantity))
        : assessItem.required;
      const recommendedPacks = packSizeLitres ? Math.ceil(remainingLitres / packSizeLitres) : null;

      return {
        product: assessItem.product,
        stockItemId: matchedItem?.id || 0,
        stockItemName: matchedItem?.name || assessItem.product,
        requiredLitres: assessItem.required,
        packSizeLitres,
        recommendedPacks,
        componentGroup: matchedItem?.componentGroup || null,
        componentRole: matchedItem?.componentRole || null,
        mixRatio: matchedItem?.mixRatio || null,
        availableQuantity: availableLitres,
        leftoverSuggestion: leftover
          ? {
              stockItemId: leftover.id,
              stockItemName: leftover.name,
              availableLitres: Number(leftover.quantity),
              sourceJobCardId: leftover.sourceJobCardId,
            }
          : null,
      };
    });

    const rubberItems = await this.rubberAllocationItems(companyId, jobCardId);

    return { items: [...items, ...rubberItems], leftovers };
  }

  private async rubberAllocationItems(
    companyId: number,
    jobCardId: number,
  ): Promise<AllocationPlanItem[]> {
    const jobCard = await this.jobCardRepo.findOneForCompanyWithLineItems(jobCardId, companyId);

    if (!jobCard) {
      return [];
    }

    const analysis = await this.analysisRepo.findLiningFlagForJobCard(companyId, jobCardId);

    const override = jobCard.rubberPlanOverride;
    const hasOverride = override && override.status !== "pending";

    if (!hasOverride && !analysis?.hasInternalLining) {
      return [];
    }

    const rubberStock = await this.stockItemRepo.findRubberInStockForCompanyOrdered(companyId);

    if (rubberStock.length === 0) {
      return [];
    }

    if (hasOverride && override.manualRolls?.length) {
      return override.manualRolls.map((roll, idx) => {
        const matched = rubberStock.find(
          (si) =>
            si.thicknessMm !== null &&
            Number(si.thicknessMm) === roll.thicknessMm &&
            si.widthMm !== null &&
            Number(si.widthMm) === roll.widthMm,
        );

        return {
          product: `Rubber ${roll.thicknessMm}mm (Roll ${idx + 1})`,
          stockItemId: matched?.id || 0,
          stockItemName: matched?.name || `${roll.widthMm}mm x ${roll.lengthM}m rubber`,
          requiredLitres: 1,
          packSizeLitres: null,
          recommendedPacks: 1,
          componentGroup: "Rubber Lining",
          componentRole: `${roll.thicknessMm}mm ply`,
          mixRatio: null,
          availableQuantity: matched ? Number(matched.quantity) : 0,
          leftoverSuggestion: null,
          unitOfMeasure: "rolls",
          rubberRollWidthMm: roll.widthMm,
          rubberRollLengthM: roll.lengthM,
          rubberRollThicknessMm: roll.thicknessMm,
          rubberRollsRequired: 1,
        };
      });
    }

    if (hasOverride && override.selectedPlyCombination?.length) {
      return override.selectedPlyCombination.map((thicknessMm) => {
        const matched = rubberStock.find(
          (si) => si.thicknessMm !== null && Number(si.thicknessMm) === thicknessMm,
        );

        return {
          product: `Rubber ${thicknessMm}mm`,
          stockItemId: matched?.id || 0,
          stockItemName: matched?.name || `${thicknessMm}mm rubber sheet`,
          requiredLitres: 1,
          packSizeLitres: null,
          recommendedPacks: 1,
          componentGroup: "Rubber Lining",
          componentRole: `${thicknessMm}mm ply`,
          mixRatio: null,
          availableQuantity: matched ? Number(matched.quantity) : 0,
          leftoverSuggestion: null,
          unitOfMeasure: "rolls",
          rubberRollWidthMm: matched?.widthMm ? Number(matched.widthMm) : null,
          rubberRollLengthM: matched?.lengthM ? Number(matched.lengthM) : null,
          rubberRollThicknessMm: thicknessMm,
          rubberRollsRequired: 1,
        };
      });
    }

    const rubberSpec = this.detectRubberSpec(jobCard);
    if (!rubberSpec) {
      const thickest = rubberStock[rubberStock.length - 1];
      return [
        {
          product: "Rubber Lining",
          stockItemId: thickest.id,
          stockItemName: thickest.name,
          requiredLitres: 1,
          packSizeLitres: null,
          recommendedPacks: 1,
          componentGroup: "Rubber Lining",
          componentRole: null,
          mixRatio: null,
          availableQuantity: Number(thickest.quantity),
          leftoverSuggestion: null,
          unitOfMeasure: "rolls",
          rubberRollWidthMm: thickest.widthMm ? Number(thickest.widthMm) : null,
          rubberRollLengthM: thickest.lengthM ? Number(thickest.lengthM) : null,
          rubberRollThicknessMm: thickest.thicknessMm ? Number(thickest.thicknessMm) : null,
          rubberRollsRequired: 1,
        },
      ];
    }

    const plyCombinations = suggestPlyCombinations(rubberSpec.thicknessMm);
    const availableThicknesses = new Set(
      rubberStock.filter((si) => si.thicknessMm !== null).map((si) => Number(si.thicknessMm)),
    );
    const bestCombo = plyCombinations.find((combo) =>
      combo.every((t) => availableThicknesses.has(t)),
    ) ||
      plyCombinations[0] || [rubberSpec.thicknessMm];

    return bestCombo.map((thicknessMm) => {
      const matched = rubberStock.find(
        (si) => si.thicknessMm !== null && Number(si.thicknessMm) === thicknessMm,
      );

      return {
        product: `Rubber ${thicknessMm}mm`,
        stockItemId: matched?.id || 0,
        stockItemName: matched?.name || `${thicknessMm}mm rubber sheet`,
        requiredLitres: 1,
        packSizeLitres: null,
        recommendedPacks: 1,
        componentGroup: "Rubber Lining (auto-detected)",
        componentRole: `${thicknessMm}mm ply`,
        mixRatio: null,
        availableQuantity: matched ? Number(matched.quantity) : 0,
        leftoverSuggestion: null,
        unitOfMeasure: "rolls",
        rubberRollWidthMm: matched?.widthMm ? Number(matched.widthMm) : null,
        rubberRollLengthM: matched?.lengthM ? Number(matched.lengthM) : null,
        rubberRollThicknessMm: thicknessMm,
        rubberRollsRequired: 1,
      };
    });
  }

  private detectRubberSpec(jobCard: JobCard): { thicknessMm: number } | null {
    const allNotes = [
      jobCard.notes || "",
      ...(jobCard.lineItems || []).map(
        (li) => `${li.itemCode || ""} ${li.itemDescription || ""} ${li.notes || ""}`,
      ),
    ].filter(Boolean);

    const result = allNotes.reduce(
      (found: { thicknessMm: number } | null, text) => found || parseRubberSpecNote(text),
      null,
    );
    return result;
  }

  async allocatePacks(
    companyId: number,
    jobCardId: number,
    items: AllocatePackDto[],
    staffMemberId: number | null,
    allocatedByName: string | null,
  ): Promise<StockAllocation[]> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const allocations = await items.reduce(
      async (accPromise, item) => {
        const acc = await accPromise;

        const stockItem = await this.stockItemRepo.findOneForCompany(item.stockItemId, companyId);

        if (!stockItem) {
          throw new NotFoundException(`Stock item ${item.stockItemId} not found`);
        }

        const litresPerPack = stockItem.packSizeLitres
          ? Number(stockItem.packSizeLitres)
          : Number(stockItem.quantity);
        const totalLitres = item.packCount * litresPerPack;

        if (Number(stockItem.quantity) < totalLitres) {
          throw new BadRequestException(
            `Insufficient stock for ${stockItem.name}. Available: ${stockItem.quantity}, Requested: ${totalLitres}`,
          );
        }

        stockItem.quantity = Number(stockItem.quantity) - totalLitres;
        await this.stockItemRepo.save(stockItem);

        const saved = await this.allocationRepo.create({
          stockItemId: stockItem.id,
          jobCardId,
          companyId,
          quantityUsed: totalLitres,
          packCount: item.packCount,
          litresPerPack,
          totalLitres,
          allocationType: "allocation",
          allocatedBy: allocatedByName,
          staffMemberId,
          sourceLeftoverItemId: item.sourceLeftoverItemId || null,
          pendingApproval: false,
          undone: false,
        });

        await this.movementRepo.create({
          stockItemId: stockItem.id,
          movementType: MovementType.OUT,
          quantity: totalLitres,
          referenceType: ReferenceType.ALLOCATION,
          referenceId: saved.id,
          createdBy: allocatedByName,
          companyId,
        });

        return [...acc, saved];
      },
      Promise.resolve([] as StockAllocation[]),
    );

    this.logger.log(
      `Allocated ${allocations.length} items for JC ${jobCardId} by ${allocatedByName}`,
    );

    return allocations;
  }

  async deallocate(
    companyId: number,
    jobCardId: number,
    allocationId: number,
    userName: string | null,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findActiveUnissuedByIdForJobCard(
      allocationId,
      jobCardId,
      companyId,
    );

    if (!allocation) {
      throw new NotFoundException("Allocation not found or already issued/undone");
    }

    const stockItem = await this.stockItemRepo.findOneForCompany(allocation.stockItemId, companyId);

    if (stockItem) {
      stockItem.quantity =
        Number(stockItem.quantity) + Number(allocation.totalLitres || allocation.quantityUsed);
      await this.stockItemRepo.save(stockItem);
    }

    allocation.undone = true;
    allocation.undoneAt = now().toJSDate();
    allocation.undoneByName = userName;
    const saved = await this.allocationRepo.save(allocation);

    if (stockItem) {
      await this.movementRepo.create({
        stockItemId: stockItem.id,
        movementType: MovementType.IN,
        quantity: Number(allocation.totalLitres || allocation.quantityUsed),
        referenceType: ReferenceType.ALLOCATION,
        referenceId: allocation.id,
        notes: "Deallocated",
        createdBy: userName,
        companyId,
      });
    }

    return saved;
  }

  async confirmIssuance(
    companyId: number,
    jobCardId: number,
    allocationIds: number[],
    issuedByName: string | null,
  ): Promise<StockAllocation[]> {
    const allocations = await this.allocationRepo.findPendingByIdsForJobCard(
      allocationIds,
      jobCardId,
      companyId,
    );

    if (allocations.length === 0) {
      throw new NotFoundException("No pending allocations found");
    }

    const issuedAt = now().toJSDate();
    const updated = allocations.map((alloc) => ({
      ...alloc,
      issuedAt,
      issuedByName,
      allocationType: "issuance",
    }));

    const saved = await this.allocationRepo.saveMany(updated);

    this.logger.log(`Issued ${saved.length} allocations for JC ${jobCardId} by ${issuedByName}`);

    return saved;
  }

  async returnLeftovers(
    companyId: number,
    jobCardId: number,
    allocationId: number,
    litresReturned: number,
    returnedByName: string | null,
    staffMemberId: number | null,
    notes: string | null,
  ): Promise<{ stockReturn: StockReturn; costReduction: number }> {
    const allocation = await this.allocationRepo.findActiveByIdForJobCard(
      allocationId,
      jobCardId,
      companyId,
    );

    if (!allocation) {
      throw new NotFoundException("Allocation not found");
    }

    const totalAllocated = Number(allocation.totalLitres || allocation.quantityUsed);
    if (litresReturned > totalAllocated) {
      throw new BadRequestException(
        `Cannot return ${litresReturned}L — only ${totalAllocated}L was allocated`,
      );
    }

    const originalItem = allocation.stockItem;
    const costPerLitre = originalItem.packSizeLitres
      ? Number(originalItem.costPerUnit) / Number(originalItem.packSizeLitres)
      : Number(originalItem.costPerUnit) > 0
        ? Number(originalItem.costPerUnit)
        : 0;
    const costReduction = Math.round(litresReturned * costPerLitre * 100) / 100;

    const leftoverName = `${originalItem.name} (Leftover)`;
    const existingLeftover = await this.stockItemRepo.findOneWhere({
      companyId,
      name: leftoverName,
      isLeftover: true,
    });

    if (existingLeftover) {
      existingLeftover.quantity = Number(existingLeftover.quantity) + litresReturned;
    }

    const leftoverItem = existingLeftover
      ? await this.stockItemRepo.save(existingLeftover)
      : await this.stockItemRepo.create({
          sku: `${originalItem.sku}-LO`,
          name: leftoverName,
          description: `Leftover from ${originalItem.name}`,
          category: originalItem.category,
          unitOfMeasure: "litres",
          costPerUnit: costPerLitre,
          quantity: litresReturned,
          minStockLevel: 0,
          location: originalItem.location,
          locationId: originalItem.locationId,
          companyId,
          isLeftover: true,
          sourceJobCardId: jobCardId,
          packSizeLitres: null,
          componentGroup: originalItem.componentGroup,
          componentRole: originalItem.componentRole,
          mixRatio: originalItem.mixRatio,
          needsQrPrint: false,
        });

    await this.movementRepo.create({
      stockItemId: leftoverItem.id,
      movementType: MovementType.IN,
      quantity: litresReturned,
      referenceType: ReferenceType.RETURN,
      referenceId: allocationId,
      notes: `Returned from JC ${jobCardId}`,
      createdBy: returnedByName,
      companyId,
    });

    const stockReturn = await this.stockReturnRepo.create({
      companyId,
      jobCardId,
      allocationId,
      originalStockItemId: originalItem.id,
      leftoverStockItemId: leftoverItem.id,
      litresReturned,
      costReduction,
      returnedByName,
      returnedByStaffId: staffMemberId,
      notes,
    });

    this.logger.log(
      `Returned ${litresReturned}L from allocation ${allocationId}, cost reduction: R${costReduction}`,
    );

    return { stockReturn, costReduction };
  }

  async leftoverItems(companyId: number): Promise<StockItem[]> {
    return this.stockItemRepo.findLeftoverForCompany(companyId);
  }

  private fuzzyMatchStockItem(productName: string, stockItems: StockItem[]): StockItem | null {
    const normalised = productName.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalised.split(" ");

    const scored = stockItems
      .filter((si) => !si.isLeftover)
      .map((item) => {
        const itemName = item.name.toLowerCase().replace(/\s+/g, " ").trim();
        const matchingWords = words.filter((word) => itemName.includes(word));
        return { item, score: matchingWords.length / words.length };
      })
      .filter((entry) => entry.score >= 0.4)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aHasStock = Number(a.item.quantity) > 0 ? 1 : 0;
        const bHasStock = Number(b.item.quantity) > 0 ? 1 : 0;
        return bHasStock - aHasStock;
      });

    return scored.length > 0 ? scored[0].item : null;
  }

  private findMatchingLeftover(productName: string, leftoverItems: StockItem[]): StockItem | null {
    const normalised = productName.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalised.split(" ");

    const scored = leftoverItems
      .map((item) => {
        const itemName = item.name.toLowerCase().replace(/\s+/g, " ").trim();
        const matchingWords = words.filter((word) => itemName.includes(word));
        return { item, score: matchingWords.length / words.length };
      })
      .filter((entry) => entry.score >= 0.4)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].item : null;
  }
}
