import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Drawing, DrawingStatus, DrawingFileType } from './entities/drawing.entity';
import { DrawingVersion } from './entities/drawing-version.entity';
import { DrawingComment, CommentType } from './entities/drawing-comment.entity';
import { CreateDrawingDto } from './dto/create-drawing.dto';
import { UpdateDrawingDto } from './dto/update-drawing.dto';
import { UploadVersionDto } from './dto/upload-version.dto';
import { CreateDrawingCommentDto } from './dto/create-drawing-comment.dto';
import { DrawingQueryDto } from './dto/drawing-query.dto';
import { User } from '../user/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { LocalStorageService } from '../storage/local-storage.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ALLOWED_MIME_TYPES: Record<string, DrawingFileType> = {
  'application/pdf': DrawingFileType.PDF,
  'image/png': DrawingFileType.PNG,
  'image/jpeg': DrawingFileType.JPG,
  'image/jpg': DrawingFileType.JPG,
  'application/acad': DrawingFileType.DWG,
  'application/x-acad': DrawingFileType.DWG,
  'application/dxf': DrawingFileType.DXF,
  'application/x-dxf': DrawingFileType.DXF,
  'application/octet-stream': DrawingFileType.DWG, // CAD files often come as this
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class DrawingsService {
  constructor(
    @InjectRepository(Drawing)
    private drawingRepository: Repository<Drawing>,
    @InjectRepository(DrawingVersion)
    private versionRepository: Repository<DrawingVersion>,
    @InjectRepository(DrawingComment)
    private commentRepository: Repository<DrawingComment>,
    private storageService: LocalStorageService,
    private auditService: AuditService,
  ) {}

  private validateFile(file: Express.Multer.File): DrawingFileType {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    // Check by extension if mime type is generic
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (file.mimetype === 'application/octet-stream') {
      if (ext === 'dwg') return DrawingFileType.DWG;
      if (ext === 'dxf') return DrawingFileType.DXF;
    }

    const fileType = ALLOWED_MIME_TYPES[file.mimetype];
    if (!fileType) {
      // Try by extension
      const extTypes: Record<string, DrawingFileType> = {
        'pdf': DrawingFileType.PDF,
        'png': DrawingFileType.PNG,
        'jpg': DrawingFileType.JPG,
        'jpeg': DrawingFileType.JPEG,
        'dwg': DrawingFileType.DWG,
        'dxf': DrawingFileType.DXF,
      };

      if (ext && extTypes[ext]) {
        return extTypes[ext];
      }

      throw new BadRequestException(
        'Invalid file type. Supported: PDF, DWG, DXF, PNG, JPG',
      );
    }

    return fileType;
  }

  private async generateDrawingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DRW-${year}-`;

    const lastDrawing = await this.drawingRepository
      .createQueryBuilder('drawing')
      .where('drawing.drawing_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('drawing.drawing_number', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastDrawing) {
      const lastNumber = parseInt(lastDrawing.drawingNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async uploadDrawing(
    file: Express.Multer.File,
    dto: CreateDrawingDto,
    user: User,
  ): Promise<Drawing> {
    const fileType = this.validateFile(file);
    const drawingNumber = await this.generateDrawingNumber();

    // Upload file
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const subPath = `drawings/${year}/${month}`;
    const storageResult = await this.storageService.upload(file, subPath);

    // Create drawing entity
    const drawing = this.drawingRepository.create({
      drawingNumber,
      title: dto.title,
      description: dto.description,
      fileType,
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      mimeType: storageResult.mimeType,
      currentVersion: 1,
      status: DrawingStatus.DRAFT,
      uploadedBy: user,
      rfq: dto.rfqId ? { id: dto.rfqId } as any : undefined,
    });

    const savedDrawing = await this.drawingRepository.save(drawing);

    // Create initial version record
    const version = this.versionRepository.create({
      drawing: savedDrawing,
      versionNumber: 1,
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      changeNotes: 'Initial upload',
      uploadedBy: user,
    });
    await this.versionRepository.save(version);

    // Audit log
    await this.auditService.log({
      entityType: 'drawing',
      entityId: savedDrawing.id,
      action: AuditAction.CREATE,
      newValues: {
        drawingNumber,
        title: dto.title,
        fileType,
        fileSizeBytes: file.size,
      },
      performedBy: user,
    });

    return this.findOne(savedDrawing.id);
  }

  async uploadNewVersion(
    drawingId: number,
    file: Express.Multer.File,
    dto: UploadVersionDto,
    user: User,
  ): Promise<DrawingVersion> {
    const drawing = await this.findOne(drawingId);

    if (drawing.status === DrawingStatus.APPROVED) {
      throw new BadRequestException('Cannot upload new version for approved drawing');
    }

    this.validateFile(file);

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const subPath = `drawings/${year}/${month}`;
    const storageResult = await this.storageService.upload(file, subPath);

    const newVersionNumber = drawing.currentVersion + 1;

    // Create version record
    const version = this.versionRepository.create({
      drawing,
      versionNumber: newVersionNumber,
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      changeNotes: dto.changeNotes,
      uploadedBy: user,
    });
    const savedVersion = await this.versionRepository.save(version);

    // Update drawing with new version
    drawing.currentVersion = newVersionNumber;
    drawing.filePath = storageResult.path;
    drawing.originalFilename = storageResult.originalFilename;
    drawing.fileSizeBytes = storageResult.size;
    drawing.mimeType = storageResult.mimeType;
    drawing.status = DrawingStatus.DRAFT; // Reset to draft on new version
    await this.drawingRepository.save(drawing);

    // Audit log
    await this.auditService.log({
      entityType: 'drawing',
      entityId: drawing.id,
      action: AuditAction.UPLOAD,
      newValues: {
        version: newVersionNumber,
        changeNotes: dto.changeNotes,
        fileSizeBytes: file.size,
      },
      performedBy: user,
    });

    return savedVersion;
  }

  async findAll(query: DrawingQueryDto): Promise<PaginatedResult<Drawing>> {
    const where: FindOptionsWhere<Drawing> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.rfqId) {
      where.rfq = { id: query.rfqId };
    }

    if (query.uploadedByUserId) {
      where.uploadedBy = { id: query.uploadedByUserId };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    let queryBuilder = this.drawingRepository
      .createQueryBuilder('drawing')
      .leftJoinAndSelect('drawing.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('drawing.rfq', 'rfq');

    if (query.status) {
      queryBuilder = queryBuilder.andWhere('drawing.status = :status', { status: query.status });
    }

    if (query.rfqId) {
      queryBuilder = queryBuilder.andWhere('drawing.rfq_id = :rfqId', { rfqId: query.rfqId });
    }

    if (query.uploadedByUserId) {
      queryBuilder = queryBuilder.andWhere('drawing.uploaded_by_user_id = :userId', {
        userId: query.uploadedByUserId,
      });
    }

    if (query.search) {
      queryBuilder = queryBuilder.andWhere(
        '(drawing.title ILIKE :search OR drawing.description ILIKE :search OR drawing.drawing_number ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('drawing.updated_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Drawing> {
    const drawing = await this.drawingRepository.findOne({
      where: { id },
      relations: ['uploadedBy', 'rfq', 'versions', 'versions.uploadedBy'],
    });

    if (!drawing) {
      throw new NotFoundException(`Drawing with ID ${id} not found`);
    }

    return drawing;
  }

  async update(id: number, dto: UpdateDrawingDto, user: User): Promise<Drawing> {
    const drawing = await this.findOne(id);

    if (drawing.status === DrawingStatus.APPROVED) {
      throw new BadRequestException('Cannot modify approved drawing');
    }

    const oldValues = {
      title: drawing.title,
      description: drawing.description,
    };

    if (dto.title) drawing.title = dto.title;
    if (dto.description !== undefined) drawing.description = dto.description;
    if (dto.rfqId !== undefined) {
      drawing.rfq = dto.rfqId ? { id: dto.rfqId } as any : undefined;
    }

    await this.drawingRepository.save(drawing);

    await this.auditService.log({
      entityType: 'drawing',
      entityId: drawing.id,
      action: AuditAction.UPDATE,
      oldValues,
      newValues: dto,
      performedBy: user,
    });

    return this.findOne(id);
  }

  async remove(id: number, user: User): Promise<void> {
    const drawing = await this.findOne(id);

    if (drawing.status === DrawingStatus.APPROVED) {
      throw new BadRequestException('Cannot delete approved drawing');
    }

    await this.auditService.log({
      entityType: 'drawing',
      entityId: drawing.id,
      action: AuditAction.DELETE,
      oldValues: {
        drawingNumber: drawing.drawingNumber,
        title: drawing.title,
      },
      performedBy: user,
    });

    await this.drawingRepository.remove(drawing);
  }

  async getVersionHistory(id: number): Promise<DrawingVersion[]> {
    const drawing = await this.findOne(id);

    return this.versionRepository.find({
      where: { drawing: { id: drawing.id } },
      relations: ['uploadedBy'],
      order: { versionNumber: 'DESC' },
    });
  }

  async downloadFile(id: number, version?: number, user?: User): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const drawing = await this.findOne(id);

    let filePath = drawing.filePath;
    let filename = drawing.originalFilename;

    if (version) {
      const versionRecord = await this.versionRepository.findOne({
        where: { drawing: { id }, versionNumber: version },
      });

      if (!versionRecord) {
        throw new NotFoundException(`Version ${version} not found`);
      }

      filePath = versionRecord.filePath;
      filename = versionRecord.originalFilename;
    }

    const buffer = await this.storageService.download(filePath);

    if (user) {
      await this.auditService.log({
        entityType: 'drawing',
        entityId: id,
        action: AuditAction.DOWNLOAD,
        newValues: { version: version || drawing.currentVersion },
        performedBy: user,
      });
    }

    return { buffer, filename, mimeType: drawing.mimeType };
  }

  // Comments
  async addComment(
    drawingId: number,
    dto: CreateDrawingCommentDto,
    user: User,
  ): Promise<DrawingComment> {
    const drawing = await this.findOne(drawingId);

    const comment = this.commentRepository.create({
      drawing,
      user,
      commentText: dto.commentText,
      commentType: dto.commentType || CommentType.GENERAL,
      positionX: dto.positionX,
      positionY: dto.positionY,
      pageNumber: dto.pageNumber,
      parentComment: dto.parentCommentId ? { id: dto.parentCommentId } as any : undefined,
    });

    const savedComment = await this.commentRepository.save(comment);

    await this.auditService.log({
      entityType: 'drawing',
      entityId: drawingId,
      action: AuditAction.ADD_COMMENT,
      newValues: {
        commentId: savedComment.id,
        commentType: dto.commentType,
      },
      performedBy: user,
    });

    return savedComment;
  }

  async getComments(drawingId: number): Promise<DrawingComment[]> {
    await this.findOne(drawingId); // Validate drawing exists

    return this.commentRepository.find({
      where: { drawing: { id: drawingId } },
      relations: ['user', 'parentComment'],
      order: { createdAt: 'ASC' },
    });
  }

  async resolveComment(commentId: number, user: User): Promise<DrawingComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['drawing'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    comment.isResolved = true;
    const updatedComment = await this.commentRepository.save(comment);

    await this.auditService.log({
      entityType: 'drawing',
      entityId: comment.drawing.id,
      action: AuditAction.RESOLVE_COMMENT,
      newValues: { commentId },
      performedBy: user,
    });

    return updatedComment;
  }

  // Workflow status updates
  async updateStatus(id: number, status: DrawingStatus): Promise<Drawing> {
    const drawing = await this.findOne(id);
    drawing.status = status;
    return this.drawingRepository.save(drawing);
  }
}
