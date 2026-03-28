import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, IsNull, MoreThan, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { JobCardCoatingAnalysis, StockAssessmentItem } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { StockReturn } from "../entities/stock-return.entity";

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
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockReturn)
    private readonly returnRepo: Repository<StockReturn>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly analysisRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    private readonly dataSource: DataSource,
  ) {}

  async recommendedAllocations(
    companyId: number,
    jobCardId: number,
  ): Promise<{ items: AllocationPlanItem[]; leftovers: LeftoverSuggestion[] }> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException("Coating analysis not found for this job card");
    }

    const assessment: StockAssessmentItem[] =
      analysis.pmEditedAssessment || analysis.stockAssessment || [];

    const stockItems = await this.stockItemRepo.find({ where: { companyId } });
    const leftoverItems = stockItems.filter((si) => si.isLeftover && Number(si.quantity) > 0);

    const leftovers: LeftoverSuggestion[] = [];
    const items: AllocationPlanItem[] = assessment.map((assessItem) => {
      const matchedItem = assessItem.stockItemId
        ? stockItems.find((si) => si.id === assessItem.stockItemId)
        : this.fuzzyMatchStockItem(assessItem.product, stockItems);

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
        availableQuantity: matchedItem ? Number(matchedItem.quantity) : 0,
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
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["lineItems"],
    });

    if (!jobCard) {
      return [];
    }

    const override = jobCard.rubberPlanOverride;
    if (!override || override.status === "pending") {
      return [];
    }

    const rubberStock = await this.stockItemRepo.find({
      where: {
        companyId,
        category: ILike("%rubber%"),
        quantity: MoreThan(0),
      },
      order: { thicknessMm: "ASC", widthMm: "ASC" },
    });

    if (rubberStock.length === 0) {
      return [];
    }

    if (override.manualRolls?.length) {
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

    const plyCombination = override.selectedPlyCombination || [];
    return plyCombination.map((thicknessMm) => {
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

  async allocatePacks(
    companyId: number,
    jobCardId: number,
    items: AllocatePackDto[],
    staffMemberId: number | null,
    allocatedByName: string | null,
  ): Promise<StockAllocation[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const jobCard = await queryRunner.manager.findOne(JobCard, {
        where: { id: jobCardId, companyId },
      });

      if (!jobCard) {
        throw new NotFoundException(`Job card ${jobCardId} not found`);
      }

      const allocations = await items.reduce(
        async (accPromise, item) => {
          const acc = await accPromise;

          const stockItem = await queryRunner.manager.findOne(StockItem, {
            where: { id: item.stockItemId, companyId },
            lock: { mode: "pessimistic_write" },
          });

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
          await queryRunner.manager.save(StockItem, stockItem);

          const allocation = queryRunner.manager.create(StockAllocation, {
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
          });
          const saved = await queryRunner.manager.save(StockAllocation, allocation);

          const movement = queryRunner.manager.create(StockMovement, {
            stockItem,
            movementType: MovementType.OUT,
            quantity: totalLitres,
            referenceType: ReferenceType.ALLOCATION,
            referenceId: saved.id,
            createdBy: allocatedByName,
            companyId,
          });
          await queryRunner.manager.save(StockMovement, movement);

          return [...acc, saved];
        },
        Promise.resolve([] as StockAllocation[]),
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Allocated ${allocations.length} items for JC ${jobCardId} by ${allocatedByName}`,
      );

      return allocations;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deallocate(
    companyId: number,
    jobCardId: number,
    allocationId: number,
    userName: string | null,
  ): Promise<StockAllocation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const allocation = await queryRunner.manager.findOne(StockAllocation, {
        where: { id: allocationId, jobCardId, companyId, undone: false, issuedAt: IsNull() },
      });

      if (!allocation) {
        throw new NotFoundException("Allocation not found or already issued/undone");
      }

      const stockItem = await queryRunner.manager.findOne(StockItem, {
        where: { id: allocation.stockItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (stockItem) {
        stockItem.quantity =
          Number(stockItem.quantity) + Number(allocation.totalLitres || allocation.quantityUsed);
        await queryRunner.manager.save(StockItem, stockItem);
      }

      allocation.undone = true;
      allocation.undoneAt = now().toJSDate();
      allocation.undoneByName = userName;
      const saved = await queryRunner.manager.save(StockAllocation, allocation);

      if (stockItem) {
        const movement = queryRunner.manager.create(StockMovement, {
          stockItem,
          movementType: MovementType.IN,
          quantity: Number(allocation.totalLitres || allocation.quantityUsed),
          referenceType: ReferenceType.ALLOCATION,
          referenceId: allocation.id,
          notes: "Deallocated",
          createdBy: userName,
          companyId,
        });
        await queryRunner.manager.save(StockMovement, movement);
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmIssuance(
    companyId: number,
    jobCardId: number,
    allocationIds: number[],
    issuedByName: string | null,
  ): Promise<StockAllocation[]> {
    const allocations = await this.allocationRepo.find({
      where: allocationIds.map((id) => ({
        id,
        jobCardId,
        companyId,
        undone: false,
        issuedAt: IsNull(),
      })),
    });

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

    const saved = await this.allocationRepo.save(updated);

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
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, jobCardId, companyId, undone: false },
      relations: ["stockItem"],
    });

    if (!allocation) {
      throw new NotFoundException("Allocation not found");
    }

    const totalAllocated = Number(allocation.totalLitres || allocation.quantityUsed);
    if (litresReturned > totalAllocated) {
      throw new BadRequestException(
        `Cannot return ${litresReturned}L — only ${totalAllocated}L was allocated`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const originalItem = allocation.stockItem;
      const costPerLitre = originalItem.packSizeLitres
        ? Number(originalItem.costPerUnit) / Number(originalItem.packSizeLitres)
        : Number(originalItem.costPerUnit) > 0
          ? Number(originalItem.costPerUnit)
          : 0;
      const costReduction = Math.round(litresReturned * costPerLitre * 100) / 100;

      const leftoverName = `${originalItem.name} (Leftover)`;
      let leftoverItem = await queryRunner.manager.findOne(StockItem, {
        where: { companyId, name: leftoverName, isLeftover: true },
      });

      if (leftoverItem) {
        leftoverItem.quantity = Number(leftoverItem.quantity) + litresReturned;
        leftoverItem = await queryRunner.manager.save(StockItem, leftoverItem);
      } else {
        leftoverItem = queryRunner.manager.create(StockItem, {
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
        });
        leftoverItem = await queryRunner.manager.save(StockItem, leftoverItem);
      }

      const movement = queryRunner.manager.create(StockMovement, {
        stockItem: leftoverItem,
        movementType: MovementType.IN,
        quantity: litresReturned,
        referenceType: ReferenceType.RETURN,
        referenceId: allocationId,
        notes: `Returned from JC ${jobCardId}`,
        createdBy: returnedByName,
        companyId,
      });
      await queryRunner.manager.save(StockMovement, movement);

      const stockReturn = queryRunner.manager.create(StockReturn, {
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
      const savedReturn = await queryRunner.manager.save(StockReturn, stockReturn);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Returned ${litresReturned}L from allocation ${allocationId}, cost reduction: R${costReduction}`,
      );

      return { stockReturn: savedReturn, costReduction };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async leftoverItems(companyId: number): Promise<StockItem[]> {
    return this.stockItemRepo.find({
      where: { companyId, isLeftover: true },
    });
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
      .sort((a, b) => b.score - a.score);

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
