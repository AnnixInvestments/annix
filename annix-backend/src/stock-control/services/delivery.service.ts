import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { fromISO, now, nowMillis } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { DeliveryNote, SdnStatus } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { SupplierInvoice } from "../entities/supplier-invoice.entity";
import { CpoService } from "./cpo.service";
import { DeliveryExtractionService } from "./delivery-extraction.service";
import { DeliveryInvoiceService } from "./delivery-invoice.service";
import { DeliverySupplierService } from "./delivery-supplier.service";

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => CpoService))
    private readonly cpoService: CpoService,
    private readonly dataSource: DataSource,
    private readonly supplierService: DeliverySupplierService,
    private readonly extractionService: DeliveryExtractionService,
    private readonly invoiceService: DeliveryInvoiceService,
  ) {}

  async create(
    companyId: number,
    data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: Date | null;
      notes?: string;
      photoUrl?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number; photoUrl?: string }[];
    },
  ): Promise<DeliveryNote> {
    const existingNote = await this.deliveryNoteRepo.findOne({
      where: { companyId, deliveryNumber: data.deliveryNumber },
    });
    if (existingNote) {
      throw new ConflictException(`Delivery note ${data.deliveryNumber} has already been uploaded`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deliveryNote = queryRunner.manager.create(DeliveryNote, {
        deliveryNumber: data.deliveryNumber,
        supplierName: data.supplierName,
        receivedDate: data.receivedDate || now().toJSDate(),
        notes: data.notes || null,
        photoUrl: data.photoUrl || null,
        receivedBy: data.receivedBy || null,
        companyId,
      });
      const savedNote = await queryRunner.manager.save(DeliveryNote, deliveryNote);

      await data.items.reduce(async (prev, itemData) => {
        await prev;
        const stockItem = await queryRunner.manager.findOne(StockItem, {
          where: { id: itemData.stockItemId, companyId },
          lock: { mode: "pessimistic_write" },
        });
        if (!stockItem) {
          throw new NotFoundException(`Stock item ${itemData.stockItemId} not found`);
        }

        const noteItem = queryRunner.manager.create(DeliveryNoteItem, {
          deliveryNote: savedNote,
          stockItem,
          quantityReceived: itemData.quantityReceived,
          photoUrl: itemData.photoUrl || null,
          companyId,
        });
        await queryRunner.manager.save(DeliveryNoteItem, noteItem);

        stockItem.quantity = stockItem.quantity + itemData.quantityReceived;
        await queryRunner.manager.save(StockItem, stockItem);

        const movement = queryRunner.manager.create(StockMovement, {
          stockItem,
          movementType: MovementType.IN,
          quantity: itemData.quantityReceived,
          referenceType: ReferenceType.DELIVERY,
          referenceId: savedNote.id,
          notes: `Received via delivery ${data.deliveryNumber}`,
          createdBy: data.receivedBy || null,
          companyId,
        });
        await queryRunner.manager.save(StockMovement, movement);
      }, Promise.resolve());

      await queryRunner.commitTransaction();

      this.cpoService
        .linkDeliveryToCalloffs(companyId, data.supplierName, savedNote.id)
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          this.logger.warn(`Failed to link DN ${savedNote.id} to calloffs: ${msg}`);
        });

      return this.findById(companyId, savedNote.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createFromEmail(
    companyId: number,
    data: {
      deliveryNumber: string;
      supplierName: string;
      photoUrl?: string | null;
    },
  ): Promise<DeliveryNote> {
    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber: data.deliveryNumber,
      supplierName: data.supplierName,
      receivedDate: now().toJSDate(),
      photoUrl: data.photoUrl ?? null,
      companyId,
    });
    return this.deliveryNoteRepo.save(deliveryNote);
  }

  async findAll(companyId: number, page: number = 1, limit: number = 50): Promise<DeliveryNote[]> {
    const notes = await this.deliveryNoteRepo.find({
      where: { companyId },
      relations: ["items", "items.stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return Promise.all(notes.map((note) => this.addPresignedUrl(note)));
  }

  async findById(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepo.findOne({
      where: { id, companyId },
      relations: ["items", "items.stockItem"],
    });
    if (!note) {
      throw new NotFoundException("Delivery note not found");
    }
    return this.addPresignedUrl(note);
  }

  private async addPresignedUrl(note: DeliveryNote): Promise<DeliveryNote> {
    if (note.photoUrl) {
      try {
        note.photoUrl = await this.storageService.presignedUrl(note.photoUrl, 3600);
      } catch (error) {
        this.logger.warn(
          `Failed to generate presigned URL for ${note.photoUrl}: ${error?.message ?? error}`,
        );
      }
    }
    return note;
  }

  async remove(companyId: number, id: number): Promise<void> {
    const note = await this.findById(companyId, id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const movements = await queryRunner.manager.find(StockMovement, {
        where: {
          referenceType: ReferenceType.DELIVERY,
          referenceId: id,
          companyId,
        },
        relations: ["stockItem"],
      });

      await movements.reduce(async (prev, movement) => {
        await prev;
        if (movement.stockItem) {
          const stockItem = await queryRunner.manager.findOne(StockItem, {
            where: { id: movement.stockItem.id, companyId },
            lock: { mode: "pessimistic_write" },
          });
          if (stockItem) {
            stockItem.quantity = stockItem.quantity - movement.quantity;
            await queryRunner.manager.save(StockItem, stockItem);
            this.logger.log(`Reversed stock movement: ${stockItem.sku} -${movement.quantity}`);
          }
        }
        await queryRunner.manager.remove(StockMovement, movement);
      }, Promise.resolve());

      if (note.items && note.items.length > 0) {
        await queryRunner.manager.remove(DeliveryNoteItem, note.items);
      }

      await queryRunner.manager.remove(DeliveryNote, note);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Deleted delivery note ${id} and reversed ${movements.length} stock movements`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async uploadPhoto(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/deliveries");
    note.photoUrl = result.path;
    await this.deliveryNoteRepo.save(note);
    return this.findById(companyId, id);
  }

  async extractFromPhoto(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    await this.extractionService.extractFromPhoto(note);
    return this.findById(companyId, id);
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

  async linkExtractedItemsToStock(
    companyId: number,
    id: number,
    receivedBy?: string,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    await this.extractionService.linkExtractedItemsToStock(companyId, note, receivedBy);
    return this.findById(companyId, id);
  }

  async resolveOrCreateSupplier(
    companyId: number,
    supplierName: string,
    details?: {
      vatNumber?: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<import("../entities/stock-control-supplier.entity").StockControlSupplier> {
    return this.supplierService.resolveOrCreateSupplier(companyId, supplierName, details);
  }

  async createFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      toCompany?: { name?: string };
      lineItems?: Array<{
        description?: string;
        itemCode?: string;
        productCode?: string;
        quantity?: number;
        unitOfMeasure?: string;
        unitPrice?: number;
        lineTotal?: number;
        isReturned?: boolean;
        isPaint?: boolean;
        isTwoPack?: boolean;
        volumeLitersPerPack?: number;
        totalLiters?: number;
        costPerLiter?: number;
      }>;
    },
    receivedBy?: string,
  ): Promise<DeliveryNote> {
    this.logger.log(`Uploading file for delivery note, size: ${file.size} bytes`);
    const uploadResult = await this.storageService.upload(
      file,
      `${StorageArea.STOCK_CONTROL}/deliveries`,
    );
    this.logger.log(`File uploaded successfully, path: ${uploadResult.path}`);

    const receivedDate = analyzedData.deliveryDate
      ? fromISO(analyzedData.deliveryDate).toJSDate()
      : now().toJSDate();

    const deliveryNumber = analyzedData.deliveryNoteNumber || `DN-${nowMillis()}`;

    const existingNote = await this.deliveryNoteRepo.findOne({
      where: { companyId, deliveryNumber },
    });

    if (existingNote) {
      throw new ConflictException(`Delivery note ${deliveryNumber} has already been uploaded`);
    }

    const supplierName = analyzedData.fromCompany?.name || "Unknown Supplier";

    this.logger.log(
      `Creating delivery note: ${deliveryNumber}, supplier: ${supplierName}, date: ${receivedDate.toISOString()}`,
    );

    let supplierId: number | null = null;
    if (analyzedData.fromCompany?.name) {
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        analyzedData.fromCompany.name,
        {
          vatNumber: analyzedData.fromCompany.vatNumber,
          address: analyzedData.fromCompany.address,
          contactPerson: analyzedData.fromCompany.contactPerson,
          phone: analyzedData.fromCompany.phone,
          email: analyzedData.fromCompany.email,
        },
      );
      supplierId = supplier.id;
    }

    const hasLineItems = analyzedData.lineItems && analyzedData.lineItems.length > 0;

    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber,
      supplierName,
      supplierId,
      receivedDate,
      notes: null,
      photoUrl: uploadResult.path,
      receivedBy: receivedBy || null,
      companyId,
      extractionStatus: "completed",
      extractedData: analyzedData,
      sdnStatus: hasLineItems ? SdnStatus.STOCK_LINKED : SdnStatus.CONFIRMED,
    });

    const savedNote = await this.deliveryNoteRepo.save(deliveryNote);
    this.logger.log(`Delivery note saved with ID: ${savedNote.id}`);

    if (hasLineItems) {
      this.logger.log(
        `Auto-creating ${analyzedData.lineItems!.length} stock items from extracted data`,
      );
      await this.extractionService.createStockItemsFromExtracted(
        companyId,
        savedNote,
        analyzedData.lineItems!,
        receivedBy,
      );
    }

    this.cpoService.linkDeliveryToCalloffs(companyId, supplierName, savedNote.id).catch((err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`Failed to link DN ${savedNote.id} to calloffs: ${msg}`);
    });

    return this.findById(companyId, savedNote.id);
  }

  async createPendingFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      toCompany?: { name?: string };
      lineItems?: Array<{
        description?: string;
        itemCode?: string;
        productCode?: string;
        quantity?: number;
        unitOfMeasure?: string;
        unitPrice?: number;
        lineTotal?: number;
        isReturned?: boolean;
        isPaint?: boolean;
        isTwoPack?: boolean;
        volumeLitersPerPack?: number;
        totalLiters?: number;
        costPerLiter?: number;
      }>;
    },
    receivedBy?: string,
  ): Promise<DeliveryNote> {
    this.logger.log(`Saving pending delivery note, file size: ${file.size} bytes`);
    const uploadResult = await this.storageService.upload(
      file,
      `${StorageArea.STOCK_CONTROL}/deliveries`,
    );

    const receivedDate = analyzedData.deliveryDate
      ? fromISO(analyzedData.deliveryDate).toJSDate()
      : now().toJSDate();

    const deliveryNumber = analyzedData.deliveryNoteNumber || `DN-${nowMillis()}`;

    const existingNote = await this.deliveryNoteRepo.findOne({
      where: { companyId, deliveryNumber },
    });

    if (existingNote) {
      throw new ConflictException(`Delivery note ${deliveryNumber} has already been uploaded`);
    }

    const supplierName = analyzedData.fromCompany?.name || "Unknown Supplier";

    let supplierId: number | null = null;
    if (analyzedData.fromCompany?.name) {
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        analyzedData.fromCompany.name,
        {
          vatNumber: analyzedData.fromCompany.vatNumber,
          address: analyzedData.fromCompany.address,
          contactPerson: analyzedData.fromCompany.contactPerson,
          phone: analyzedData.fromCompany.phone,
          email: analyzedData.fromCompany.email,
        },
      );
      supplierId = supplier.id;
    }

    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber,
      supplierName,
      supplierId,
      receivedDate,
      notes: null,
      photoUrl: uploadResult.path,
      receivedBy: receivedBy || null,
      companyId,
      extractionStatus: "completed",
      extractedData: analyzedData,
      sdnStatus: SdnStatus.PENDING_REVIEW,
    });

    const savedNote = await this.deliveryNoteRepo.save(deliveryNote);
    this.logger.log(`Pending delivery note saved with ID: ${savedNote.id}`);

    return this.findById(companyId, savedNote.id);
  }

  async confirmDeliveryNote(
    companyId: number,
    id: number,
    confirmedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      lineItems?: Array<Record<string, unknown>>;
    },
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);

    if (confirmedData.deliveryNoteNumber) {
      note.deliveryNumber = confirmedData.deliveryNoteNumber;
    }
    if (confirmedData.deliveryDate) {
      note.receivedDate = fromISO(confirmedData.deliveryDate).toJSDate();
    }
    if (confirmedData.fromCompany?.name) {
      note.supplierName = confirmedData.fromCompany.name;
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        confirmedData.fromCompany.name,
        {
          vatNumber: confirmedData.fromCompany.vatNumber,
          address: confirmedData.fromCompany.address,
          contactPerson: confirmedData.fromCompany.contactPerson,
          phone: confirmedData.fromCompany.phone,
          email: confirmedData.fromCompany.email,
        },
      );
      note.supplierId = supplier.id;
    }

    const merged = { ...(note.extractedData as Record<string, unknown>), ...confirmedData };
    note.extractedData = merged as typeof note.extractedData;
    note.sdnStatus = SdnStatus.CONFIRMED;

    await this.deliveryNoteRepo.save(note);
    this.logger.log(`Delivery note ${id} confirmed`);

    return this.findById(companyId, id);
  }

  async createInvoiceFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      invoiceNumber?: string;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      totals?: {
        subtotalExclVat?: number;
        vatTotal?: number;
        grandTotalInclVat?: number;
      };
    },
  ): Promise<SupplierInvoice> {
    return this.invoiceService.createFromAnalyzedData(companyId, file, analyzedData);
  }
}
