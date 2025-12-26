import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import { StreamableFile } from '@nestjs/common';

import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqItem } from '../rfq/entities/rfq-item.entity';
import { RfqDocument } from '../rfq/entities/rfq-document.entity';
import {
  RfqQueryDto,
  RfqListItemDto,
  RfqListResponseDto,
  RfqDetailDto,
  RfqItemDetailDto,
  RfqDocumentDto,
} from './dto/admin-rfq.dto';

@Injectable()
export class AdminRfqService {
  private readonly logger = new Logger(AdminRfqService.name);

  constructor(
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(RfqItem)
    private readonly rfqItemRepo: Repository<RfqItem>,
    @InjectRepository(RfqDocument)
    private readonly rfqDocumentRepo: Repository<RfqDocument>,
  ) {}

  /**
   * Get all RFQs with filtering and pagination (VIEW-ONLY)
   */
  async getAllRfqs(queryDto: RfqQueryDto): Promise<RfqListResponseDto> {
    const {
      search,
      status,
      customerId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = queryDto;

    const queryBuilder = this.rfqRepo
      .createQueryBuilder('rfq')
      .leftJoinAndSelect('rfq.createdBy', 'user')
      .leftJoin('rfq.items', 'items');

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(rfq.projectName LIKE :search OR rfq.customerName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply status filter
    if (status) {
      queryBuilder.andWhere('rfq.status = :status', { status });
    }

    // Apply customer filter
    if (customerId) {
      queryBuilder.andWhere('user.id = :customerId', { customerId });
    }

    // Apply date range filter
    if (dateFrom && dateTo) {
      queryBuilder.andWhere('rfq.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      });
    }

    // Apply sorting
    const sortField = sortBy === 'projectName' ? 'rfq.projectName' : 'rfq.createdAt';
    queryBuilder.orderBy(sortField, sortOrder as 'ASC' | 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const rfqs = await queryBuilder.getMany();

    // Get item counts for each RFQ
    const itemCounts = await Promise.all(
      rfqs.map(async (rfq) => {
        const count = await this.rfqItemRepo.count({ where: { rfqId: rfq.id } });
        return { rfqId: rfq.id, count };
      }),
    );

    // Map to DTOs
    const items: RfqListItemDto[] = rfqs.map((rfq) => ({
      id: rfq.id,
      projectName: rfq.projectName,
      customerName: rfq.customerName,
      customerEmail: rfq.customerEmail,
      status: rfq.status,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      itemCount: itemCounts.find((ic) => ic.rfqId === rfq.id)?.count || 0,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get RFQ detail by ID (VIEW-ONLY)
   */
  async getRfqDetail(rfqId: number): Promise<RfqDetailDto> {
    const rfq = await this.rfqRepo.findOne({
      where: { id: rfqId },
      relations: ['createdBy'],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    return {
      id: rfq.id,
      projectName: rfq.projectName,
      description: rfq.description,
      requiredDate: rfq.requiredDate,
      customerName: rfq.customerName,
      customerEmail: rfq.customerEmail,
      customerPhone: rfq.customerPhone,
      status: rfq.status,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      createdBy: rfq.createdBy
        ? {
            id: rfq.createdBy.id,
            email: rfq.createdBy.email,
            name: rfq.createdBy.username || '',
          }
        : undefined,
    };
  }

  /**
   * Get RFQ items with specifications (VIEW-ONLY)
   */
  async getRfqItems(rfqId: number): Promise<RfqItemDetailDto[]> {
    const items = await this.rfqItemRepo.find({
      where: { rfqId },
      relations: ['straightPipeRfq', 'bendRfq'],
      order: { id: 'ASC' },
    });

    return items.map((item) => ({
      id: item.id,
      type: item.type,
      quantity: item.quantity,
      weightPerUnit: item.weightPerUnit,
      totalWeight: item.totalWeight,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      specifications: item.straightPipeRfq || item.bendRfq || null,
    }));
  }

  /**
   * Get RFQ documents (VIEW-ONLY)
   */
  async getRfqDocuments(rfqId: number): Promise<RfqDocumentDto[]> {
    const documents = await this.rfqDocumentRepo.find({
      where: { rfqId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedAt: doc.createdAt,
      uploadedBy: doc.uploadedBy
        ? {
            id: doc.uploadedBy.id,
            email: doc.uploadedBy.email,
            name: doc.uploadedBy.username || '',
          }
        : undefined,
    }));
  }

  /**
   * Download RFQ document (VIEW-ONLY)
   */
  async downloadDocument(documentId: number): Promise<{
    file: StreamableFile;
    fileName: string;
    mimeType: string;
  }> {
    const document = await this.rfqDocumentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    if (!fs.existsSync(document.filePath)) {
      this.logger.error(`File not found at path: ${document.filePath}`);
      throw new NotFoundException('Document file not found on server');
    }

    const fileStream = createReadStream(document.filePath);

    return {
      file: new StreamableFile(fileStream),
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }
}
