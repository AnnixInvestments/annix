import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateUniqueId } from "../lib/datetime";
import {
  AdjustOtherStockDto,
  CreateOtherStockDto,
  ImportOtherStockResultDto,
  ImportOtherStockRowDto,
  ReceiveOtherStockDto,
  RubberOtherStockDto,
  UpdateOtherStockDto,
} from "./dto/rubber-portal.dto";
import { OtherStockUnitOfMeasure, RubberOtherStock } from "./entities/rubber-other-stock.entity";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";

const UNIT_OF_MEASURE_LABELS: Record<OtherStockUnitOfMeasure, string> = {
  [OtherStockUnitOfMeasure.EACH]: "Each",
  [OtherStockUnitOfMeasure.BOX]: "Box",
  [OtherStockUnitOfMeasure.PACK]: "Pack",
  [OtherStockUnitOfMeasure.KG]: "Kg",
  [OtherStockUnitOfMeasure.LITERS]: "Liters",
  [OtherStockUnitOfMeasure.METERS]: "Meters",
  [OtherStockUnitOfMeasure.ROLLS]: "Rolls",
  [OtherStockUnitOfMeasure.SHEETS]: "Sheets",
  [OtherStockUnitOfMeasure.PAIRS]: "Pairs",
  [OtherStockUnitOfMeasure.SETS]: "Sets",
};

@Injectable()
export class RubberOtherStockService {
  constructor(
    @InjectRepository(RubberOtherStock)
    private otherStockRepository: Repository<RubberOtherStock>,
    @InjectRepository(RubberStockLocation)
    private stockLocationRepository: Repository<RubberStockLocation>,
  ) {}

  private mapOtherStockToDto(stock: RubberOtherStock): RubberOtherStockDto {
    return {
      id: stock.id,
      firebaseUid: stock.firebaseUid,
      itemCode: stock.itemCode,
      itemName: stock.itemName,
      description: stock.description,
      category: stock.category,
      unitOfMeasure: stock.unitOfMeasure,
      unitOfMeasureLabel: UNIT_OF_MEASURE_LABELS[stock.unitOfMeasure],
      quantity: Number(stock.quantity),
      minStockLevel: Number(stock.minStockLevel),
      reorderPoint: Number(stock.reorderPoint),
      costPerUnit: stock.costPerUnit ? Number(stock.costPerUnit) : null,
      pricePerUnit: stock.pricePerUnit ? Number(stock.pricePerUnit) : null,
      location: stock.location,
      locationId: stock.locationId,
      supplier: stock.supplier,
      notes: stock.notes,
      isActive: stock.isActive,
      isLowStock: Number(stock.quantity) <= Number(stock.reorderPoint),
      createdAt: stock.createdAt.toISOString(),
      updatedAt: stock.updatedAt.toISOString(),
    };
  }

  async allOtherStocks(includeInactive = false): Promise<RubberOtherStockDto[]> {
    const query = this.otherStockRepository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.stockLocation", "location")
      .orderBy("stock.item_name", "ASC");

    if (!includeInactive) {
      query.where("stock.is_active = :isActive", { isActive: true });
    }

    const stocks = await query.getMany();
    return stocks.map((s) => this.mapOtherStockToDto(s));
  }

  async lowStockItems(): Promise<RubberOtherStockDto[]> {
    const stocks = await this.otherStockRepository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.stockLocation", "location")
      .where("stock.is_active = :isActive", { isActive: true })
      .andWhere("stock.quantity <= stock.reorder_point")
      .orderBy("stock.item_name", "ASC")
      .getMany();
    return stocks.map((s) => this.mapOtherStockToDto(s));
  }

  async otherStockById(id: number): Promise<RubberOtherStockDto | null> {
    const stock = await this.otherStockRepository.findOne({
      where: { id },
      relations: ["stockLocation"],
    });
    return stock ? this.mapOtherStockToDto(stock) : null;
  }

  async createOtherStock(dto: CreateOtherStockDto): Promise<RubberOtherStockDto> {
    const existing = await this.otherStockRepository.findOne({
      where: { itemCode: dto.itemCode },
    });
    if (existing) {
      throw new BadRequestException(`Item code '${dto.itemCode}' already exists`);
    }

    let locationName: string | null = null;
    if (dto.locationId) {
      const location = await this.stockLocationRepository.findOne({
        where: { id: dto.locationId },
      });
      if (location) {
        locationName = location.name;
      }
    }

    const stock = this.otherStockRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      description: dto.description ?? null,
      category: dto.category ?? null,
      unitOfMeasure: dto.unitOfMeasure,
      quantity: dto.quantity,
      minStockLevel: dto.minStockLevel ?? 0,
      reorderPoint: dto.reorderPoint ?? 0,
      costPerUnit: dto.costPerUnit ?? null,
      pricePerUnit: dto.pricePerUnit ?? null,
      locationId: dto.locationId ?? null,
      location: locationName,
      supplier: dto.supplier ?? null,
      notes: dto.notes ?? null,
      isActive: true,
    });

    const saved = await this.otherStockRepository.save(stock);
    const result = await this.otherStockRepository.findOne({
      where: { id: saved.id },
      relations: ["stockLocation"],
    });
    return this.mapOtherStockToDto(result!);
  }

  async updateOtherStock(
    id: number,
    dto: UpdateOtherStockDto,
  ): Promise<RubberOtherStockDto | null> {
    const stock = await this.otherStockRepository.findOne({
      where: { id },
      relations: ["stockLocation"],
    });
    if (!stock) {
      return null;
    }

    if (dto.itemName !== undefined) stock.itemName = dto.itemName;
    if (dto.description !== undefined) stock.description = dto.description;
    if (dto.category !== undefined) stock.category = dto.category;
    if (dto.unitOfMeasure !== undefined) stock.unitOfMeasure = dto.unitOfMeasure;
    if (dto.quantity !== undefined) stock.quantity = dto.quantity;
    if (dto.minStockLevel !== undefined) stock.minStockLevel = dto.minStockLevel;
    if (dto.reorderPoint !== undefined) stock.reorderPoint = dto.reorderPoint;
    if (dto.costPerUnit !== undefined) stock.costPerUnit = dto.costPerUnit;
    if (dto.pricePerUnit !== undefined) stock.pricePerUnit = dto.pricePerUnit;
    if (dto.supplier !== undefined) stock.supplier = dto.supplier;
    if (dto.notes !== undefined) stock.notes = dto.notes;
    if (dto.isActive !== undefined) stock.isActive = dto.isActive;

    if (dto.locationId !== undefined) {
      stock.locationId = dto.locationId;
      if (dto.locationId) {
        const location = await this.stockLocationRepository.findOne({
          where: { id: dto.locationId },
        });
        stock.location = location ? location.name : null;
      } else {
        stock.location = null;
      }
    }

    await this.otherStockRepository.save(stock);
    const result = await this.otherStockRepository.findOne({
      where: { id },
      relations: ["stockLocation"],
    });
    return this.mapOtherStockToDto(result!);
  }

  async deleteOtherStock(id: number): Promise<boolean> {
    const stock = await this.otherStockRepository.findOne({ where: { id } });
    if (!stock) {
      return false;
    }
    await this.otherStockRepository.remove(stock);
    return true;
  }

  async receiveOtherStock(dto: ReceiveOtherStockDto): Promise<RubberOtherStockDto> {
    const stock = await this.otherStockRepository.findOne({
      where: { id: dto.otherStockId },
      relations: ["stockLocation"],
    });
    if (!stock) {
      throw new NotFoundException("Stock item not found");
    }

    stock.quantity = Number(stock.quantity) + dto.quantity;
    await this.otherStockRepository.save(stock);

    return this.mapOtherStockToDto(stock);
  }

  async adjustOtherStock(dto: AdjustOtherStockDto): Promise<RubberOtherStockDto> {
    const stock = await this.otherStockRepository.findOne({
      where: { id: dto.otherStockId },
      relations: ["stockLocation"],
    });
    if (!stock) {
      throw new NotFoundException("Stock item not found");
    }

    stock.quantity = dto.newQuantity;
    await this.otherStockRepository.save(stock);

    return this.mapOtherStockToDto(stock);
  }

  async importOtherStock(rows: ImportOtherStockRowDto[]): Promise<ImportOtherStockResultDto> {
    const result: ImportOtherStockResultDto = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.itemCode || !row.itemName) {
        result.errors.push({
          row: rowNum,
          itemCode: row.itemCode || "EMPTY",
          error: "Item code and item name are required",
        });
        continue;
      }

      if (!row.quantity || row.quantity < 0) {
        result.errors.push({
          row: rowNum,
          itemCode: row.itemCode,
          error: "Quantity must be a positive number",
        });
        continue;
      }

      const unitOfMeasure = this.parseUnitOfMeasure(row.unitOfMeasure);

      const existing = await this.otherStockRepository.findOne({
        where: { itemCode: row.itemCode },
      });

      if (existing) {
        existing.quantity = Number(existing.quantity) + row.quantity;
        if (row.itemName) existing.itemName = row.itemName;
        if (row.description !== undefined) existing.description = row.description;
        if (row.category !== undefined) existing.category = row.category;
        if (unitOfMeasure) existing.unitOfMeasure = unitOfMeasure;
        if (row.minStockLevel !== undefined && row.minStockLevel !== null) {
          existing.minStockLevel = row.minStockLevel;
        }
        if (row.reorderPoint !== undefined && row.reorderPoint !== null) {
          existing.reorderPoint = row.reorderPoint;
        }
        if (row.costPerUnit !== undefined) existing.costPerUnit = row.costPerUnit;
        if (row.pricePerUnit !== undefined) existing.pricePerUnit = row.pricePerUnit;
        if (row.location) existing.location = row.location;
        if (row.supplier !== undefined) existing.supplier = row.supplier;
        if (row.notes !== undefined) existing.notes = row.notes;

        await this.otherStockRepository.save(existing);
        result.updated++;
      } else {
        const stock = this.otherStockRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          itemCode: row.itemCode,
          itemName: row.itemName,
          description: row.description ?? null,
          category: row.category ?? null,
          unitOfMeasure: unitOfMeasure || OtherStockUnitOfMeasure.EACH,
          quantity: row.quantity,
          minStockLevel: row.minStockLevel ?? 0,
          reorderPoint: row.reorderPoint ?? 0,
          costPerUnit: row.costPerUnit ?? null,
          pricePerUnit: row.pricePerUnit ?? null,
          location: row.location ?? null,
          supplier: row.supplier ?? null,
          notes: row.notes ?? null,
          isActive: true,
        });
        await this.otherStockRepository.save(stock);
        result.created++;
      }
    }

    return result;
  }

  private parseUnitOfMeasure(value: string | null | undefined): OtherStockUnitOfMeasure | null {
    if (!value) return null;
    const upper = value.toUpperCase().trim();
    const validUnits = Object.values(OtherStockUnitOfMeasure);
    if (validUnits.includes(upper as OtherStockUnitOfMeasure)) {
      return upper as OtherStockUnitOfMeasure;
    }
    return null;
  }
}
