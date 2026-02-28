import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { InvoiceExtractionService } from "./invoice-extraction.service";

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
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly extractionService: InvoiceExtractionService,
  ) {}

  async create(
    companyId: number,
    data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: Date;
      notes?: string;
      photoUrl?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number; photoUrl?: string }[];
    },
  ): Promise<DeliveryNote> {
    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber: data.deliveryNumber,
      supplierName: data.supplierName,
      receivedDate: data.receivedDate || new Date(),
      notes: data.notes || null,
      photoUrl: data.photoUrl || null,
      receivedBy: data.receivedBy || null,
      companyId,
    });
    const savedNote = await this.deliveryNoteRepo.save(deliveryNote);

    const itemPromises = data.items.map(async (itemData) => {
      const stockItem = await this.stockItemRepo.findOne({
        where: { id: itemData.stockItemId, companyId },
      });
      if (!stockItem) {
        throw new NotFoundException(`Stock item ${itemData.stockItemId} not found`);
      }

      const noteItem = this.deliveryNoteItemRepo.create({
        deliveryNote: savedNote,
        stockItem,
        quantityReceived: itemData.quantityReceived,
        photoUrl: itemData.photoUrl || null,
        companyId,
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
        companyId,
      });
      await this.movementRepo.save(movement);

      return noteItem;
    });

    await Promise.all(itemPromises);

    return this.findById(companyId, savedNote.id);
  }

  async findAll(companyId: number): Promise<DeliveryNote[]> {
    return this.deliveryNoteRepo.find({
      where: { companyId },
      relations: ["items", "items.stockItem"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepo.findOne({
      where: { id, companyId },
      relations: ["items", "items.stockItem"],
    });
    if (!note) {
      throw new NotFoundException("Delivery note not found");
    }
    return note;
  }

  async remove(companyId: number, id: number): Promise<void> {
    const note = await this.findById(companyId, id);
    await this.deliveryNoteRepo.remove(note);
  }

  async uploadPhoto(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/deliveries");
    note.photoUrl = result.url;
    await this.deliveryNoteRepo.save(note);
    return this.findById(companyId, id);
  }

  async extractFromPhoto(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);

    if (!note.photoUrl) {
      throw new BadRequestException("Delivery note has no photo to extract from");
    }

    note.extractionStatus = "processing";
    await this.deliveryNoteRepo.save(note);

    try {
      const photoBuffer = await this.storageService.download(note.photoUrl);
      const imageBase64 = photoBuffer.toString("base64");
      const mediaType = this.inferMediaTypeFromUrl(note.photoUrl);

      const extractedData = await this.extractionService.extractDeliveryNoteFromImage(
        imageBase64,
        mediaType,
      );

      note.extractedData = extractedData;
      note.extractionStatus = "completed";
      await this.deliveryNoteRepo.save(note);

      return this.findById(companyId, id);
    } catch (error) {
      note.extractionStatus = "failed";
      note.extractedData = { rawText: error.message };
      await this.deliveryNoteRepo.save(note);
      throw error;
    }
  }

  private inferMediaTypeFromUrl(
    url: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
    const lower = url.toLowerCase();
    if (lower.includes(".png")) return "image/png";
    if (lower.includes(".gif")) return "image/gif";
    if (lower.includes(".webp")) return "image/webp";
    return "image/jpeg";
  }

  async extractionStatus(
    companyId: number,
    id: number,
  ): Promise<{ status: string | null; data: unknown }> {
    const note = await this.findById(companyId, id);
    return {
      status: note.extractionStatus,
      data: note.extractedData,
    };
  }
}
