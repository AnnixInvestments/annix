import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
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
  ) {}

  async create(data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = this.jobCardRepo.create(data);
    return this.jobCardRepo.save(jobCard);
  }

  async findAll(status?: string): Promise<JobCard[]> {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    return this.jobCardRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id },
      relations: ["allocations", "allocations.stockItem"],
    });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }
    return jobCard;
  }

  async update(id: number, data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = await this.findById(id);
    Object.assign(jobCard, data);
    return this.jobCardRepo.save(jobCard);
  }

  async remove(id: number): Promise<void> {
    const jobCard = await this.findById(id);
    await this.jobCardRepo.remove(jobCard);
  }

  async allocateStock(data: {
    stockItemId: number;
    jobCardId: number;
    quantityUsed: number;
    photoUrl?: string;
    notes?: string;
    allocatedBy?: string;
  }): Promise<StockAllocation> {
    const stockItem = await this.stockItemRepo.findOne({ where: { id: data.stockItemId } });
    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    const jobCard = await this.jobCardRepo.findOne({ where: { id: data.jobCardId } });
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
    });
    await this.movementRepo.save(movement);

    return saved;
  }

  async allocationsByJobCard(jobCardId: number): Promise<StockAllocation[]> {
    return this.allocationRepo.find({
      where: { jobCard: { id: jobCardId } },
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
    });
  }
}
