import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";

@Injectable()
export class JobCardService {
  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async create(companyId: number, data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = this.jobCardRepo.create({ ...data, companyId });
    return this.jobCardRepo.save(jobCard);
  }

  async findAll(companyId: number, status?: string): Promise<JobCard[]> {
    const where: Record<string, unknown> = { companyId };
    if (status) {
      where.status = status;
    }
    return this.jobCardRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findById(companyId: number, id: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id, companyId },
      relations: ["allocations", "allocations.stockItem"],
    });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }
    return jobCard;
  }

  async update(companyId: number, id: number, data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = await this.findById(companyId, id);
    Object.assign(jobCard, data);
    return this.jobCardRepo.save(jobCard);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const jobCard = await this.findById(companyId, id);
    await this.jobCardRepo.remove(jobCard);
  }

  async allocateStock(
    companyId: number,
    data: {
      stockItemId: number;
      jobCardId: number;
      quantityUsed: number;
      photoUrl?: string;
      notes?: string;
      allocatedBy?: string;
    },
  ): Promise<StockAllocation> {
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: data.stockItemId, companyId },
    });
    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    const jobCard = await this.jobCardRepo.findOne({ where: { id: data.jobCardId, companyId } });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    if (stockItem.quantity < data.quantityUsed) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${data.quantityUsed}`,
      );
    }

    stockItem.quantity = stockItem.quantity - data.quantityUsed;
    await this.stockItemRepo.save(stockItem);

    const allocation = this.allocationRepo.create({
      stockItem,
      jobCard,
      quantityUsed: data.quantityUsed,
      photoUrl: data.photoUrl || null,
      notes: data.notes || null,
      allocatedBy: data.allocatedBy || null,
      companyId,
    });
    const saved = await this.allocationRepo.save(allocation);

    const movement = this.movementRepo.create({
      stockItem,
      movementType: MovementType.OUT,
      quantity: data.quantityUsed,
      referenceType: ReferenceType.ALLOCATION,
      referenceId: saved.id,
      notes: `Allocated to job ${jobCard.jobNumber}`,
      createdBy: data.allocatedBy || null,
      companyId,
    });
    await this.movementRepo.save(movement);

    return saved;
  }

  async allocationsByJobCard(companyId: number, jobCardId: number): Promise<StockAllocation[]> {
    return this.allocationRepo.find({
      where: { jobCard: { id: jobCardId }, companyId },
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
    });
  }

  async uploadAllocationPhoto(
    companyId: number,
    allocationId: number,
    file: Express.Multer.File,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, companyId },
      relations: ["stockItem"],
    });
    if (!allocation) {
      throw new NotFoundException("Allocation not found");
    }
    const result = await this.storageService.upload(file, "stock-control/allocations");
    allocation.photoUrl = result.url;
    return this.allocationRepo.save(allocation);
  }
}
