import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @InjectRepository(DeliveryNoteItem)
    private readonly deliveryNoteItemRepo: Repository<DeliveryNoteItem>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
  ) {}

  async create(data: {
    deliveryNumber: string;
    supplierName: string;
    receivedDate?: Date;
    notes?: string;
    photoUrl?: string;
    receivedBy?: string;
    items: { stockItemId: number; quantityReceived: number; photoUrl?: string }[];
  }): Promise<DeliveryNote> {
    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber: data.deliveryNumber,
      supplierName: data.supplierName,
      receivedDate: data.receivedDate || new Date(),
      notes: data.notes || null,
      photoUrl: data.photoUrl || null,
      receivedBy: data.receivedBy || null,
    });
    const savedNote = await this.deliveryNoteRepo.save(deliveryNote);

    const itemPromises = data.items.map(async (itemData) => {
      const stockItem = await this.stockItemRepo.findOne({ where: { id: itemData.stockItemId } });
      if (!stockItem) {
        throw new NotFoundException(`Stock item ${itemData.stockItemId} not found`);
      }

      const noteItem = this.deliveryNoteItemRepo.create({
        deliveryNote: savedNote,
        stockItem,
        quantityReceived: itemData.quantityReceived,
        photoUrl: itemData.photoUrl || null,
      });
      await this.deliveryNoteItemRepo.save(noteItem);

      stockItem.quantity = stockItem.quantity + itemData.quantityReceived;
      await this.stockItemRepo.save(stockItem);

      const movement = this.movementRepo.create({
        stockItem,
        movementType: MovementType.IN,
        quantity: itemData.quantityReceived,
        referenceType: ReferenceType.DELIVERY,
        referenceId: savedNote.id,
        notes: `Received via delivery ${data.deliveryNumber}`,
        createdBy: data.receivedBy || null,
      });
      await this.movementRepo.save(movement);

      return noteItem;
    });

    await Promise.all(itemPromises);

    return this.findById(savedNote.id);
  }

  async findAll(): Promise<DeliveryNote[]> {
    return this.deliveryNoteRepo.find({
      relations: ["items", "items.stockItem"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepo.findOne({
      where: { id },
      relations: ["items", "items.stockItem"],
    });
    if (!note) {
      throw new NotFoundException("Delivery note not found");
    }
    return note;
  }

  async remove(id: number): Promise<void> {
    const note = await this.findById(id);
    await this.deliveryNoteRepo.remove(note);
  }
}
