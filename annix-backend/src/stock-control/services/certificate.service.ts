import { Readable } from "node:stream";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PDFDocument } from "pdf-lib";
import { In, IsNull, Not, Repository } from "typeorm";
import { fromISO, now } from "../../lib/datetime";
import {
  type IStorageService,
  STORAGE_SERVICE,
  StorageArea,
} from "../../storage/storage.interface";
import { type CoatRole, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockItem } from "../entities/stock-item.entity";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import { STOCK_ITEM_MATCH_SELECT } from "../lib/stock-item-select";
import { CalibrationCertificate } from "../qc/entities/calibration-certificate.entity";
import { QcControlPlan } from "../qc/entities/qc-control-plan.entity";
import { QcDefelskoBatch } from "../qc/entities/qc-defelsko-batch.entity";
import { QcReleaseCertificate } from "../qc/entities/qc-release-certificate.entity";
import { PositectorUploadService } from "../qc/services/positector-upload.service";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";
import { generateBrandedCoverPage } from "./branded-cover-page";
import { CoatingAnalysisService } from "./coating-analysis.service";
import { DataBookPdfService } from "./data-book-pdf.service";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface UploadCertificateDto {
  supplierId: number;
  stockItemId?: number | null;
  jobCardId?: number | null;
  certificateType: string;
  batchNumber: string;
  description?: string | null;
  expiryDate?: string | null;
  pageNumbers?: number[] | null;
}

export interface CertificateFilters {
  supplierId?: number;
  stockItemId?: number;
  jobCardId?: number;
  batchNumber?: string;
  certificateType?: string;
}

export interface DataBookStatus {
  exists: boolean;
  isStale: boolean;
  certificateCount: number;
  generatedAt: Date | null;
  dataBookId: number | null;
}

export interface SectionStatus {
  key: string;
  label: string;
  status: "complete" | "partial" | "missing";
  count: number;
  warnings: string[];
  group: string | null;
}

export interface DataBookCompleteness {
  overallPercent: number;
  readyToCompile: boolean;
  blockingReasons: string[];
  sections: SectionStatus[];
  warnings: string[];
}

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(SupplierCertificate)
    private readonly certRepo: Repository<SupplierCertificate>,
    @InjectRepository(IssuanceBatchRecord)
    private readonly batchRecordRepo: Repository<IssuanceBatchRecord>,
    @InjectRepository(JobCardDataBook)
    private readonly dataBookRepo: Repository<JobCardDataBook>,
    @InjectRepository(StockControlSupplier)
    private readonly supplierRepo: Repository<StockControlSupplier>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(CalibrationCertificate)
    private readonly calCertRepo: Repository<CalibrationCertificate>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(QcControlPlan)
    private readonly controlPlanRepo: Repository<QcControlPlan>,
    @InjectRepository(QcReleaseCertificate)
    private readonly releaseCertRepo: Repository<QcReleaseCertificate>,
    @InjectRepository(QcDefelskoBatch)
    private readonly defelskoBatchRepo: Repository<QcDefelskoBatch>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly dataBookPdfService: DataBookPdfService,
    private readonly qcMeasurementService: QcMeasurementService,
    private readonly positectorUploadService: PositectorUploadService,
  ) {}

  async uploadCertificate(
    companyId: number,
    dto: UploadCertificateDto,
    file: Express.Multer.File,
    user: UserContext,
  ): Promise<SupplierCertificate> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId, companyId },
    });

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    if (!["COA", "COC"].includes(dto.certificateType.toUpperCase())) {
      throw new BadRequestException("Certificate type must be COA or COC");
    }

    if (!dto.batchNumber || dto.batchNumber.trim().length === 0) {
      throw new BadRequestException("Batch number is required");
    }

    if (dto.stockItemId) {
      const stockItem = await this.stockItemRepo.findOne({
        where: { id: dto.stockItemId, companyId },
      });

      if (!stockItem) {
        throw new NotFoundException("Stock item not found");
      }
    }

    const existing = await this.certRepo.findOne({
      where: {
        companyId,
        supplierId: dto.supplierId,
        batchNumber: dto.batchNumber.trim(),
        certificateType: dto.certificateType.toUpperCase(),
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A ${dto.certificateType.toUpperCase()} already exists for batch ${dto.batchNumber} from this supplier`,
      );
    }

    const uploadFile =
      dto.pageNumbers && dto.pageNumbers.length > 0 && file.mimetype === "application/pdf"
        ? await this.extractPdfPages(file, dto.pageNumbers)
        : file;

    const subPath = `${StorageArea.STOCK_CONTROL}/certificates/${companyId}/${dto.supplierId}/${dto.batchNumber.trim()}`;
    const storageResult = await this.storageService.upload(uploadFile, subPath);

    const certificate = this.certRepo.create({
      companyId,
      supplierId: dto.supplierId,
      stockItemId: dto.stockItemId ?? null,
      jobCardId: dto.jobCardId ?? null,
      certificateType: dto.certificateType.toUpperCase(),
      batchNumber: dto.batchNumber.trim(),
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      mimeType: storageResult.mimeType,
      description: dto.description ?? null,
      expiryDate: dto.expiryDate ?? null,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.certRepo.save(certificate);
    this.logger.log(
      `Certificate uploaded: ${dto.certificateType} batch=${dto.batchNumber} supplier=${supplier.name} by ${user.name}`,
    );

    this.linkUnlinkedBatchRecords(companyId, saved.id).catch((err) =>
      this.logger.error(`Auto-link batch records failed for cert ${saved.id}: ${err.message}`),
    );

    return this.findById(companyId, saved.id);
  }

  async createFromInboundEmail(
    companyId: number,
    supplierId: number,
    s3Path: string,
    originalFilename: string,
    fileSizeBytes: number,
    mimeType: string,
    certificateType: string,
    batchNumber: string,
  ): Promise<SupplierCertificate> {
    const certificate = this.certRepo.create({
      companyId,
      supplierId,
      stockItemId: null,
      jobCardId: null,
      certificateType: certificateType.toUpperCase(),
      batchNumber,
      filePath: s3Path,
      originalFilename,
      fileSizeBytes,
      mimeType,
      description: null,
      expiryDate: null,
      uploadedById: null,
      uploadedByName: "Email Import",
    });

    const saved = await this.certRepo.save(certificate);
    this.logger.log(
      `Certificate created from email: ${certificateType} batch=${batchNumber} supplier=${supplierId}`,
    );

    this.linkUnlinkedBatchRecords(companyId, saved.id).catch((err) =>
      this.logger.error(`Auto-link batch records failed for cert ${saved.id}: ${err.message}`),
    );

    return saved;
  }

  async updateExtractedFields(
    certId: number,
    productDescription: string | null,
    batchNumber: string | null,
    stockItemId: number | null,
  ): Promise<void> {
    const updates: Record<string, string | number> = {};
    if (productDescription) {
      updates.description = productDescription;
    }
    if (batchNumber) {
      updates.batchNumber = batchNumber;
    }
    if (stockItemId !== null) {
      updates.stockItemId = stockItemId;
    }
    if (Object.keys(updates).length === 0) {
      return;
    }
    await this.certRepo.update(certId, updates);
    this.logger.log(
      `Updated cert ${certId}: product="${productDescription}" batch="${batchNumber}"${stockItemId ? ` stockItemId=${stockItemId}` : ""}`,
    );
  }

  async stockItemsForCompany(companyId: number): Promise<StockItem[]> {
    return this.stockItemRepo.find({ where: { companyId }, select: STOCK_ITEM_MATCH_SELECT });
  }

  async findAll(companyId: number, filters?: CertificateFilters): Promise<SupplierCertificate[]> {
    const qb = this.certRepo
      .createQueryBuilder("cert")
      .leftJoinAndSelect("cert.supplier", "supplier")
      .leftJoinAndSelect("cert.stockItem", "stockItem")
      .leftJoinAndSelect("cert.jobCard", "jobCard")
      .where("cert.companyId = :companyId", { companyId })
      .orderBy("cert.createdAt", "DESC");

    if (filters?.supplierId) {
      qb.andWhere("cert.supplierId = :supplierId", { supplierId: filters.supplierId });
    }

    if (filters?.stockItemId) {
      qb.andWhere("cert.stockItemId = :stockItemId", { stockItemId: filters.stockItemId });
    }

    if (filters?.jobCardId) {
      qb.andWhere("cert.jobCardId = :jobCardId", { jobCardId: filters.jobCardId });
    }

    if (filters?.batchNumber) {
      qb.andWhere("LOWER(cert.batchNumber) LIKE LOWER(:batchNumber)", {
        batchNumber: `%${filters.batchNumber}%`,
      });
    }

    if (filters?.certificateType) {
      qb.andWhere("cert.certificateType = :certificateType", {
        certificateType: filters.certificateType.toUpperCase(),
      });
    }

    return qb.getMany();
  }

  async findById(companyId: number, id: number): Promise<SupplierCertificate> {
    const cert = await this.certRepo.findOne({
      where: { id, companyId },
      relations: ["supplier", "stockItem", "jobCard"],
    });

    if (!cert) {
      throw new NotFoundException("Certificate not found");
    }

    return cert;
  }

  async presignedUrl(companyId: number, id: number): Promise<string> {
    const cert = await this.findById(companyId, id);
    return this.storageService.presignedUrl(cert.filePath, 3600);
  }

  async deleteCertificate(companyId: number, id: number): Promise<void> {
    const cert = await this.findById(companyId, id);

    await this.storageService.delete(cert.filePath);
    await this.certRepo.remove(cert);

    this.logger.log(`Certificate deleted: id=${id} batch=${cert.batchNumber}`);
  }

  async findByBatchNumber(companyId: number, batchNumber: string): Promise<SupplierCertificate[]> {
    return this.certRepo.find({
      where: { companyId, batchNumber: batchNumber.trim() },
      relations: ["supplier", "stockItem"],
      order: { createdAt: "DESC" },
    });
  }

  async certificatesForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<SupplierCertificate[]> {
    const directCerts = await this.certRepo.find({
      where: { companyId, jobCardId },
      relations: ["supplier", "stockItem"],
    });

    const batchRecords = await this.batchRecordRepo.find({
      where: { companyId, jobCardId },
      relations: [
        "supplierCertificate",
        "supplierCertificate.supplier",
        "supplierCertificate.stockItem",
      ],
    });

    const linkedCerts = batchRecords
      .filter((br) => br.supplierCertificate !== null)
      .map((br) => br.supplierCertificate as SupplierCertificate);

    const materialBatches = await this.defelskoBatchRepo.find({
      where: {
        companyId,
        jobCardId,
        supplierCertificateId: Not(IsNull()) as any,
      },
      relations: [
        "supplierCertificate",
        "supplierCertificate.supplier",
        "supplierCertificate.stockItem",
      ],
    });

    const materialCerts = materialBatches
      .filter((b) => b.supplierCertificate !== null)
      .map((b) => b.supplierCertificate as SupplierCertificate);

    const certMap = new Map<number, SupplierCertificate>();
    [...directCerts, ...linkedCerts, ...materialCerts].forEach((cert) => {
      certMap.set(cert.id, cert);
    });

    return Array.from(certMap.values());
  }

  async batchRecordsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<IssuanceBatchRecord[]> {
    return this.batchRecordRepo.find({
      where: { companyId, jobCardId },
      relations: ["stockItem", "supplierCertificate", "supplierCertificate.supplier"],
      order: { createdAt: "DESC" },
    });
  }

  async dataBookStatus(companyId: number, jobCardId: number): Promise<DataBookStatus> {
    const dataBook = await this.dataBookRepo.findOne({
      where: { companyId, jobCardId },
      order: { generatedAt: "DESC" },
    });

    const certs = await this.certificatesForJobCard(companyId, jobCardId);

    if (!dataBook) {
      return {
        exists: false,
        isStale: false,
        certificateCount: certs.length,
        generatedAt: null,
        dataBookId: null,
      };
    }

    return {
      exists: true,
      isStale: dataBook.isStale,
      certificateCount: certs.length,
      generatedAt: dataBook.generatedAt,
      dataBookId: dataBook.id,
    };
  }

  async compileDataBook(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    force = false,
  ): Promise<JobCardDataBook> {
    if (!force) {
      const completeness = await this.dataBookCompleteness(companyId, jobCardId);
      if (!completeness.readyToCompile) {
        throw new BadRequestException(
          `Data book not ready: ${completeness.blockingReasons.join("; ")}`,
        );
      }
    }

    const [certs, calCerts, jobCard, company, coatingAnalysis] = await Promise.all([
      this.certificatesForJobCard(companyId, jobCardId),
      this.calCertRepo.find({
        where: { companyId, isActive: true },
        order: { equipmentName: "ASC" },
      }),
      this.jobCardRepo.findOne({ where: { id: jobCardId, companyId } }),
      this.companyRepo.findOne({ where: { id: companyId } }),
      this.coatingRepo.findOne({ where: { companyId, jobCardId } }),
    ]);

    const qcEnabled = company?.qcEnabled ?? false;

    const [controlPlans, releaseCerts] = qcEnabled
      ? await Promise.all([
          this.controlPlanRepo.find({
            where: { companyId, jobCardId },
            order: { createdAt: "ASC" },
          }),
          this.releaseCertRepo.find({
            where: { companyId, jobCardId },
            order: { createdAt: "ASC" },
          }),
        ])
      : [[], []];

    const structuredBuffer = await this.dataBookPdfService.generateStructuredSections(
      companyId,
      jobCardId,
    );

    if (certs.length === 0 && calCerts.length === 0 && !structuredBuffer) {
      throw new BadRequestException("No certificates or QC data found for this job card");
    }

    const PDFKit = (await import("pdfkit")).default;
    const { default: pdfLib } = await import("pdf-lib");

    const mergedPdf = await pdfLib.PDFDocument.create();

    const fetchLogo = async (logoUrl: string): Promise<Buffer> => {
      if (logoUrl.startsWith("http")) {
        return Buffer.from(await (await fetch(logoUrl)).arrayBuffer());
      }
      return this.storageService.download(logoUrl);
    };

    const totalCertCount = certs.length + calCerts.length;

    const coverBuffer = await generateBrandedCoverPage(
      PDFKit,
      company ?? null,
      jobCard ?? null,
      coatingAnalysis ?? null,
      controlPlans,
      releaseCerts,
      certs,
      calCerts,
      user,
      { fetchLogo },
    );

    const coverPdf = await pdfLib.PDFDocument.load(coverBuffer);
    const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
    coverPages.forEach((page) => mergedPdf.addPage(page));

    if (structuredBuffer) {
      const structuredPdf = await pdfLib.PDFDocument.load(structuredBuffer);
      const structuredPages = await mergedPdf.copyPages(
        structuredPdf,
        structuredPdf.getPageIndices(),
      );
      structuredPages.forEach((page) => mergedPdf.addPage(page));
    }

    for (const cert of certs) {
      try {
        const certBuffer = await this.storageService.download(cert.filePath);

        if (cert.mimeType === "application/pdf") {
          const certPdf = await pdfLib.PDFDocument.load(certBuffer);
          const certPages = await mergedPdf.copyPages(certPdf, certPdf.getPageIndices());
          certPages.forEach((page) => mergedPdf.addPage(page));
        } else {
          const imagePage = mergedPdf.addPage();
          let image: Awaited<ReturnType<typeof mergedPdf.embedJpg>>;

          if (cert.mimeType === "image/png") {
            image = await mergedPdf.embedPng(certBuffer);
          } else {
            image = await mergedPdf.embedJpg(certBuffer);
          }

          const { width, height } = imagePage.getSize();
          const imgDims = image.scaleToFit(width - 100, height - 100);
          imagePage.drawImage(image, {
            x: (width - imgDims.width) / 2,
            y: (height - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height,
          });
        }
      } catch (err) {
        this.logger.warn(
          `Failed to include certificate ${cert.id} (${cert.originalFilename}) in data book: ${err}`,
        );
      }
    }

    for (const cal of calCerts) {
      try {
        const calBuffer = await this.storageService.download(cal.filePath);

        if (cal.mimeType === "application/pdf") {
          const calPdf = await pdfLib.PDFDocument.load(calBuffer);
          const calPages = await mergedPdf.copyPages(calPdf, calPdf.getPageIndices());
          calPages.forEach((page) => mergedPdf.addPage(page));
        } else {
          const imagePage = mergedPdf.addPage();
          let image: Awaited<ReturnType<typeof mergedPdf.embedJpg>>;

          if (cal.mimeType === "image/png") {
            image = await mergedPdf.embedPng(calBuffer);
          } else {
            image = await mergedPdf.embedJpg(calBuffer);
          }

          const { width, height } = imagePage.getSize();
          const imgDims = image.scaleToFit(width - 100, height - 100);
          imagePage.drawImage(image, {
            x: (width - imgDims.width) / 2,
            y: (height - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height,
          });
        }
      } catch (err) {
        this.logger.warn(
          `Failed to include calibration cert ${cal.id} (${cal.originalFilename}) in data book: ${err}`,
        );
      }
    }

    const positectorUploads = await this.positectorUploadService.uploadsForJobCard(
      companyId,
      jobCardId,
    );
    const positectorPdfs = positectorUploads.filter(
      (u) => u.s3FilePath && u.detectedFormat === "posisoft_pdf",
    );

    for (const upload of positectorPdfs) {
      try {
        const pdfBuffer = await this.storageService.download(upload.s3FilePath);
        const uploadPdf = await pdfLib.PDFDocument.load(pdfBuffer);
        const uploadPages = await mergedPdf.copyPages(uploadPdf, uploadPdf.getPageIndices());
        uploadPages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        this.logger.warn(
          `Failed to include PosiTector PDF ${upload.id} (${upload.originalFilename}) in data book: ${err}`,
        );
      }
    }

    const mergedBuffer = Buffer.from(await mergedPdf.save());

    const filename = `DataBook-JC${jobCardId}-${now().toFormat("yyyyMMdd-HHmmss")}.pdf`;
    const subPath = `${StorageArea.STOCK_CONTROL}/data-books/${companyId}/${jobCardId}`;

    const multerFile = {
      buffer: mergedBuffer,
      originalname: filename,
      mimetype: "application/pdf",
      size: mergedBuffer.length,
      fieldname: "file",
      encoding: "7bit",
      stream: Readable.from(mergedBuffer),
      destination: "",
      filename,
      path: "",
    } as Express.Multer.File;

    const storageResult = await this.storageService.upload(multerFile, subPath);

    const existing = await this.dataBookRepo.findOne({
      where: { companyId, jobCardId },
      order: { generatedAt: "DESC" },
    });

    if (existing) {
      try {
        await this.storageService.delete(existing.filePath);
      } catch (err) {
        this.logger.warn(`Failed to delete old data book: ${err}`);
      }
      await this.dataBookRepo.remove(existing);
    }

    const dataBook = this.dataBookRepo.create({
      companyId,
      jobCardId,
      filePath: storageResult.path,
      originalFilename: filename,
      fileSizeBytes: mergedBuffer.length,
      generatedAt: now().toJSDate(),
      generatedByName: user.name,
      certificateCount: totalCertCount,
      isStale: false,
    });

    const saved = await this.dataBookRepo.save(dataBook);
    this.logger.log(
      `Data book compiled for job card ${jobCardId}: ${totalCertCount} certificates (${certs.length} supplier + ${calCerts.length} calibration), ${mergedBuffer.length} bytes`,
    );

    return saved;
  }

  async compileCpoDataBook(
    companyId: number,
    cpoId: number,
    user: UserContext,
    force = false,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const childJcs = await this.jobCardRepo.find({
      where: { cpoId, companyId },
      order: { createdAt: "ASC" },
    });

    if (childJcs.length === 0) {
      throw new NotFoundException("No child job cards found for this CPO");
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const qcEnabled = company?.qcEnabled ?? false;
    const { default: pdfLib } = await import("pdf-lib");
    const PDFKit = (await import("pdfkit")).default;
    const mergedPdf = await pdfLib.PDFDocument.create();

    const fetchLogo = async (logoUrl: string): Promise<Buffer> => {
      if (logoUrl.startsWith("http")) {
        return Buffer.from(await (await fetch(logoUrl)).arrayBuffer());
      }
      return this.storageService.download(logoUrl);
    };

    let totalCertCount = 0;

    for (const jc of childJcs) {
      const [certs, calCerts, coatingAnalysis] = await Promise.all([
        this.certificatesForJobCard(companyId, jc.id),
        this.calCertRepo.find({
          where: { companyId, isActive: true },
          order: { equipmentName: "ASC" },
        }),
        this.coatingRepo.findOne({ where: { companyId, jobCardId: jc.id } }),
      ]);

      const [controlPlans, releaseCerts] = qcEnabled
        ? await Promise.all([
            this.controlPlanRepo.find({
              where: { companyId, jobCardId: jc.id },
              order: { createdAt: "ASC" },
            }),
            this.releaseCertRepo.find({
              where: { companyId, jobCardId: jc.id },
              order: { createdAt: "ASC" },
            }),
          ])
        : [[], []];

      totalCertCount += certs.length + calCerts.length;

      const coverBuffer = await generateBrandedCoverPage(
        PDFKit,
        company ?? null,
        jc,
        coatingAnalysis ?? null,
        controlPlans,
        releaseCerts,
        certs,
        calCerts,
        user,
        { fetchLogo },
      );

      const coverPdf = await pdfLib.PDFDocument.load(coverBuffer);
      const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
      coverPages.forEach((page) => mergedPdf.addPage(page));

      const structuredBuffer = await this.dataBookPdfService.generateStructuredSections(
        companyId,
        jc.id,
      );

      if (structuredBuffer) {
        const structuredPdf = await pdfLib.PDFDocument.load(structuredBuffer);
        const structuredPages = await mergedPdf.copyPages(
          structuredPdf,
          structuredPdf.getPageIndices(),
        );
        structuredPages.forEach((page) => mergedPdf.addPage(page));
      }

      for (const cert of certs) {
        try {
          const certBuffer = await this.storageService.download(cert.filePath);
          if (cert.mimeType === "application/pdf") {
            const certPdf = await pdfLib.PDFDocument.load(certBuffer);
            const certPages = await mergedPdf.copyPages(certPdf, certPdf.getPageIndices());
            certPages.forEach((page) => mergedPdf.addPage(page));
          } else {
            const imagePage = mergedPdf.addPage();
            let image: Awaited<ReturnType<typeof mergedPdf.embedJpg>>;
            if (cert.mimeType === "image/png") {
              image = await mergedPdf.embedPng(certBuffer);
            } else {
              image = await mergedPdf.embedJpg(certBuffer);
            }
            const { width, height } = imagePage.getSize();
            const imgDims = image.scaleToFit(width - 100, height - 100);
            imagePage.drawImage(image, {
              x: (width - imgDims.width) / 2,
              y: (height - imgDims.height) / 2,
              width: imgDims.width,
              height: imgDims.height,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to include certificate ${cert.id} in CPO data book: ${err}`);
        }
      }

      for (const cal of calCerts) {
        try {
          const calBuffer = await this.storageService.download(cal.filePath);
          if (cal.mimeType === "application/pdf") {
            const calPdf = await pdfLib.PDFDocument.load(calBuffer);
            const calPages = await mergedPdf.copyPages(calPdf, calPdf.getPageIndices());
            calPages.forEach((page) => mergedPdf.addPage(page));
          } else {
            const imagePage = mergedPdf.addPage();
            let image: Awaited<ReturnType<typeof mergedPdf.embedJpg>>;
            if (cal.mimeType === "image/png") {
              image = await mergedPdf.embedPng(calBuffer);
            } else {
              image = await mergedPdf.embedJpg(calBuffer);
            }
            const { width, height } = imagePage.getSize();
            const imgDims = image.scaleToFit(width - 100, height - 100);
            imagePage.drawImage(image, {
              x: (width - imgDims.width) / 2,
              y: (height - imgDims.height) / 2,
              width: imgDims.width,
              height: imgDims.height,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to include calibration cert ${cal.id} in CPO data book: ${err}`);
        }
      }

      const positectorUploads = await this.positectorUploadService.uploadsForJobCard(
        companyId,
        jc.id,
      );
      const positectorPdfs = positectorUploads.filter(
        (u) => u.s3FilePath && u.detectedFormat === "posisoft_pdf",
      );

      for (const upload of positectorPdfs) {
        try {
          const pdfBuffer = await this.storageService.download(upload.s3FilePath);
          const uploadPdf = await pdfLib.PDFDocument.load(pdfBuffer);
          const uploadPages = await mergedPdf.copyPages(uploadPdf, uploadPdf.getPageIndices());
          uploadPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          this.logger.warn(
            `Failed to include PosiTector PDF ${upload.id} in CPO data book: ${err}`,
          );
        }
      }
    }

    const mergedBuffer = Buffer.from(await mergedPdf.save());
    const filename = `DataBook-CPO${cpoId}-${now().toFormat("yyyyMMdd-HHmmss")}.pdf`;

    this.logger.log(
      `CPO data book compiled for CPO ${cpoId}: ${childJcs.length} child JCs, ${totalCertCount} certificates, ${mergedBuffer.length} bytes`,
    );

    return { buffer: mergedBuffer, filename };
  }

  async downloadDataBook(
    companyId: number,
    jobCardId: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const dataBook = await this.dataBookRepo.findOne({
      where: { companyId, jobCardId },
      order: { generatedAt: "DESC" },
    });

    if (!dataBook) {
      throw new NotFoundException("No data book has been compiled for this job card");
    }

    const buffer = await this.storageService.download(dataBook.filePath);
    return { buffer, filename: dataBook.originalFilename };
  }

  async markDataBookStale(companyId: number, jobCardId: number): Promise<void> {
    const dataBook = await this.dataBookRepo.findOne({
      where: { companyId, jobCardId },
      order: { generatedAt: "DESC" },
    });

    if (dataBook && !dataBook.isStale) {
      dataBook.isStale = true;
      await this.dataBookRepo.save(dataBook);
    }
  }

  async dataBookStatusBulk(
    companyId: number,
    jobCardIds: number[],
  ): Promise<Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>> {
    if (jobCardIds.length === 0) return {};

    const dataBooks = await this.dataBookRepo
      .createQueryBuilder("db")
      .where("db.companyId = :companyId", { companyId })
      .andWhere("db.jobCardId IN (:...jobCardIds)", { jobCardIds })
      .getMany();

    const certCounts = await this.batchRecordRepo
      .createQueryBuilder("br")
      .select("br.job_card_id", "jobCardId")
      .addSelect("COUNT(DISTINCT br.supplier_certificate_id)", "certCount")
      .where("br.company_id = :companyId", { companyId })
      .andWhere("br.job_card_id IN (:...jobCardIds)", { jobCardIds })
      .andWhere("br.supplier_certificate_id IS NOT NULL")
      .groupBy("br.job_card_id")
      .getRawMany<{ jobCardId: number; certCount: string }>();

    const certCountMap = new Map(certCounts.map((r) => [r.jobCardId, parseInt(r.certCount, 10)]));
    const dataBookMap = new Map(dataBooks.map((db) => [db.jobCardId, db]));

    return jobCardIds.reduce(
      (acc, id) => {
        const db = dataBookMap.get(id);
        acc[id] = {
          exists: !!db,
          isStale: db?.isStale ?? false,
          certificateCount: certCountMap.get(id) ?? 0,
        };
        return acc;
      },
      {} as Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>,
    );
  }

  async batchRecordsByBatchNumber(
    companyId: number,
    batchNumber: string,
  ): Promise<IssuanceBatchRecord[]> {
    return this.batchRecordRepo.find({
      where: { companyId, batchNumber: batchNumber.trim() },
      relations: ["stockItem", "supplierCertificate", "supplierCertificate.supplier"],
      order: { createdAt: "DESC" },
    });
  }

  async recentBatches(companyId: number, stockItemId: number, limit = 10): Promise<string[]> {
    const records = await this.batchRecordRepo
      .createQueryBuilder("br")
      .select("DISTINCT br.batch_number", "batchNumber")
      .where("br.company_id = :companyId", { companyId })
      .andWhere("br.stock_item_id = :stockItemId", { stockItemId })
      .orderBy("br.batch_number", "ASC")
      .limit(limit)
      .getRawMany<{ batchNumber: string }>();

    return records.map((r) => r.batchNumber);
  }

  async dataBookCompleteness(companyId: number, jobCardId: number): Promise<DataBookCompleteness> {
    const perfStart = Date.now();
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const qcEnabled = company?.qcEnabled ?? false;

    const t1 = Date.now();
    const [certs, calCerts, batchRecords, coatingAnalysis] = await Promise.all([
      this.certificatesForJobCard(companyId, jobCardId),
      this.calCertRepo.find({ where: { companyId, isActive: true } }),
      this.batchRecordsForJobCard(companyId, jobCardId),
      this.coatingRepo.findOne({ where: { companyId, jobCardId } }),
    ]);
    const tAfterMain = Date.now();

    const hasRubber = coatingAnalysis?.hasInternalLining === true;
    const hasPaint = (coatingAnalysis?.coats ?? []).length > 0;

    const qcResult = qcEnabled
      ? await (async () => {
          const tQcStart = Date.now();
          const [qcData, itemsReleases] = await Promise.all([
            this.qcMeasurementService.allMeasurementsForJobCard(companyId, jobCardId),
            this.qcMeasurementService.itemsReleasesForJobCard(companyId, jobCardId),
          ]);
          const tQcData = Date.now();
          const sections = this.qcSections(
            qcData,
            itemsReleases,
            hasRubber,
            hasPaint,
            coatingAnalysis || null,
          );
          this.logger.log(
            `[perf] dataBookCompleteness qc JC=${jobCardId} qcData=${tQcData - tQcStart}ms sections=${Date.now() - tQcData}ms`,
          );
          return sections;
        })()
      : { sections: [], warnings: [] };

    const unlinkedBatches = batchRecords.filter((r) => !r.supplierCertificate);
    const unlinkedMsg =
      unlinkedBatches.length > 0
        ? `${unlinkedBatches.length} batch record(s) without linked certificate`
        : null;

    const supplierCertSection = {
      ...this.sectionFromCount("supplierCerts", "Supplier Certificates", certs.length),
      ...(unlinkedMsg ? { warnings: [unlinkedMsg] } : {}),
    };

    const expiredCals = calCerts.filter((c) => fromISO(c.expiryDate) < now());
    const expiredMsg =
      expiredCals.length > 0 ? `${expiredCals.length} calibration certificate(s) expired` : null;

    const calCertSection = {
      ...this.sectionFromCount("calibrationCerts", "Calibration Certificates", calCerts.length),
      ...(expiredMsg ? { warnings: [expiredMsg] } : {}),
    };

    const sections: SectionStatus[] = [...qcResult.sections, calCertSection, supplierCertSection];

    const warnings: string[] = [
      ...qcResult.warnings,
      ...(unlinkedMsg ? [unlinkedMsg] : []),
      ...(expiredMsg ? [expiredMsg] : []),
    ];

    const completeSections = sections.filter((s) => s.status === "complete").length;
    const overallPercent = Math.round((completeSections / sections.length) * 100);

    const hasAnyCerts = certs.length > 0 || calCerts.length > 0;

    const blockingReasons: string[] = [
      ...(!hasAnyCerts && !qcEnabled ? ["No certificates found"] : []),
      ...(qcEnabled
        ? (() => {
            const qcSectionKeys = [
              "controlPlans",
              "blastProfiles",
              "shoreHardness",
              "itemsRelease",
              "releaseCertificates",
              ...sections.filter((s) => s.key.endsWith("Dft")).map((s) => s.key),
            ];
            const hasAnyQcData = sections
              .filter((s) => qcSectionKeys.includes(s.key))
              .some((s) => s.count > 0);

            const releaseCertSection = sections.find((s) => s.key === "releaseCertificates");
            const itemsReleaseSection = sections.find((s) => s.key === "itemsRelease");

            return [
              ...(!hasAnyCerts && !hasAnyQcData ? ["No certificates or QC data found"] : []),
              ...(!releaseCertSection || releaseCertSection.count === 0
                ? ["No QC Release Certificate created"]
                : []),
              ...(!itemsReleaseSection || itemsReleaseSection.count === 0
                ? ["No Items Release created"]
                : []),
            ];
          })()
        : []),
    ];

    this.logger.log(
      `[perf] dataBookCompleteness JC=${jobCardId} company=${t1 - perfStart}ms mainParallel=${tAfterMain - t1}ms total=${Date.now() - perfStart}ms`,
    );

    return {
      overallPercent,
      readyToCompile: blockingReasons.length === 0,
      blockingReasons,
      sections,
      warnings,
    };
  }

  private qcSections(
    qcData: Awaited<ReturnType<QcMeasurementService["allMeasurementsForJobCard"]>>,
    itemsReleases: Awaited<ReturnType<QcMeasurementService["itemsReleasesForJobCard"]>>,
    hasRubber: boolean,
    hasPaint: boolean,
    coatingAnalysis: JobCardCoatingAnalysis | null,
  ): { sections: SectionStatus[]; warnings: string[] } {
    const qcpWarnings = qcData.controlPlans.flatMap((plan) =>
      plan.approvalSignatures
        .filter((sig) => !sig.name)
        .map((sig) => `${plan.planType} QCP: ${sig.party} signature missing`),
    );

    const releaseWarnings = itemsReleases.flatMap((release) => {
      const failItems = release.items.filter((i) => i.result === "fail");
      const missingSignOff = [
        { label: "PLS", signOff: release.plsSignOff },
        { label: "MPS", signOff: release.mpsSignOff },
        { label: "Client", signOff: release.clientSignOff },
      ]
        .filter((p) => !p.signOff?.name)
        .map((p) => `Items Release: ${p.label} sign-off missing`);
      return [
        ...(failItems.length > 0 ? [`Items Release: ${failItems.length} item(s) marked FAIL`] : []),
        ...missingSignOff,
      ];
    });

    const releaseCertWarnings = qcData.releaseCertificates.flatMap((cert) => [
      ...(!cert.finalApprovalName ? ["Release Certificate: final approval signature missing"] : []),
      ...(cert.finalInspection &&
      [
        cert.finalInspection.linedAsPerDrawing,
        cert.finalInspection.visualInspection,
        cert.finalInspection.testPlate,
        cert.finalInspection.sparkTest,
      ].some((r) => r === "fail")
        ? ["Release Certificate: final inspection has failure(s)"]
        : []),
    ]);

    const shoreWarnings = qcData.shoreHardness
      .filter(
        (rec) =>
          rec.averages.overall !== null && Math.abs(rec.averages.overall - rec.requiredShore) > 5,
      )
      .map(
        (rec) =>
          `Shore Hardness: avg ${rec.averages.overall?.toFixed(1)} vs required ${rec.requiredShore} (out of spec)`,
      );

    const COAT_ROLE_ORDER: CoatRole[] = ["primer", "intermediate", "final"];
    const COAT_ROLE_LABELS: Record<CoatRole, string> = {
      primer: "Primer",
      intermediate: "Intermediate",
      final: "Final",
    };

    const rawCoats = coatingAnalysis?.coats || [];
    const rawNotes = coatingAnalysis?.rawNotes || "";
    const notesUpper = rawNotes.toUpperCase();
    const bandingIdx = notesUpper.indexOf("BANDING");
    const preBanding = bandingIdx >= 0 ? notesUpper.substring(0, bandingIdx) : notesUpper;
    const postBanding = bandingIdx >= 0 ? notesUpper.substring(bandingIdx) : "";

    const nonBandingCoats = rawCoats.filter((coat) => {
      const productUpper = coat.product ? coat.product.toUpperCase() : "";
      if (postBanding.length === 0 || productUpper.length === 0) return true;
      return !(postBanding.includes(productUpper) && !preBanding.includes(productUpper));
    });

    const coatsWithoutRoles = nonBandingCoats.map((c) => ({ ...c, coatRole: undefined }));
    const coatsWithRoles = CoatingAnalysisService.inferCoatRoles(coatsWithoutRoles);
    const distinctCoatRoles: CoatRole[] =
      coatsWithRoles.length > 0
        ? COAT_ROLE_ORDER.filter((role) => coatsWithRoles.some((c) => c.coatRole === role))
        : COAT_ROLE_ORDER.filter((role) => qcData.dftReadings.some((r) => r.coatType === role));

    const normalizeProduct = (value: string | null | undefined): string =>
      (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const coatSections: Array<{
      key: string;
      label: string;
      role: CoatRole;
      product: string | null;
    }> =
      coatsWithRoles.length > 0
        ? coatsWithRoles.map((c, idx) => {
            const product = (c as { product?: string }).product || null;
            const role = c.coatRole || "primer";
            const roleLabel = COAT_ROLE_LABELS[role];
            const label = product ? `${roleLabel} DFT - ${product}` : `${roleLabel} DFT Reports`;
            return { key: `dft_coat_${idx}`, label, role, product };
          })
        : distinctCoatRoles.map((role) => ({
            key: `${role}Dft`,
            label: `${COAT_ROLE_LABELS[role]} DFT Reports`,
            role,
            product: null,
          }));

    const dftReadingCountForSection = (cs: { role: CoatRole; product: string | null }): number => {
      if (cs.product) {
        const normalizedCoatProduct = normalizeProduct(cs.product);
        const productMatches = qcData.dftReadings.filter(
          (r) => normalizeProduct(r.paintProduct) === normalizedCoatProduct,
        );
        if (productMatches.length > 0) return productMatches.length;
      }
      return qcData.dftReadings.filter((r) => r.coatType === cs.role).length;
    };

    const dftByRole = distinctCoatRoles.reduce<Record<string, typeof qcData.dftReadings>>(
      (acc, role) => ({
        ...acc,
        [role]: qcData.dftReadings.filter((r) => r.coatType === role),
      }),
      {},
    );

    const dftWarnings = qcData.dftReadings
      .filter(
        (rec) =>
          rec.averageMicrons !== null &&
          (Number(rec.averageMicrons) < Number(rec.specMinMicrons) ||
            Number(rec.averageMicrons) > Number(rec.specMaxMicrons)),
      )
      .map(
        (rec) =>
          `${COAT_ROLE_LABELS[rec.coatType as CoatRole] || rec.coatType} DFT: avg ${Number(rec.averageMicrons).toFixed(1)} μm outside spec ${rec.specMinMicrons}-${rec.specMaxMicrons} μm`,
      );

    const blastWarnings = qcData.blastProfiles
      .filter(
        (rec) =>
          rec.averageMicrons !== null && Number(rec.averageMicrons) < Number(rec.specMicrons),
      )
      .map(
        (rec) =>
          `Blast Profile: avg ${Number(rec.averageMicrons).toFixed(1)} μm below spec ${rec.specMicrons} μm`,
      );

    const sectionWithWarnings = (
      section: SectionStatus,
      sectionWarnings: string[],
    ): SectionStatus =>
      sectionWarnings.length > 0 ? { ...section, warnings: sectionWarnings } : section;

    const rubberQcps = qcData.controlPlans.filter((p) => p.planType === "rubber");
    const paintQcps = qcData.controlPlans.filter(
      (p) => p.planType === "paint_external" || p.planType === "paint_internal",
    );

    const sharedItemsRelease = sectionWithWarnings(
      this.sectionFromCount("itemsRelease", "Items Release", itemsReleases.length),
      releaseWarnings,
    );
    const sharedReleaseCerts = sectionWithWarnings(
      this.sectionFromCount(
        "releaseCertificates",
        "QC Release Certificates",
        qcData.releaseCertificates.length,
      ),
      releaseCertWarnings,
    );

    const sections: SectionStatus[] = [];

    if (hasRubber) {
      const rubberGroup = hasRubber && hasPaint ? "Rubber" : null;
      sections.push(
        {
          ...sectionWithWarnings(
            this.sectionFromCount("rubberQcp", "Quality Control Plans", rubberQcps.length),
            qcpWarnings.filter((w) => w.startsWith("rubber")),
          ),
          group: rubberGroup,
        },
        {
          ...sectionWithWarnings(
            this.sectionFromCount(
              "blastProfiles",
              "Blast Profile Reports",
              qcData.blastProfiles.length,
            ),
            blastWarnings,
          ),
          group: rubberGroup,
        },
        {
          ...sectionWithWarnings(
            this.sectionFromCount(
              "shoreHardness",
              "Shore Hardness Reports",
              qcData.shoreHardness.length,
            ),
            shoreWarnings,
          ),
          group: rubberGroup,
        },
        { ...sharedItemsRelease, group: rubberGroup },
        { ...sharedReleaseCerts, group: rubberGroup },
      );
    }

    if (hasPaint) {
      const paintGroup = hasRubber && hasPaint ? "Paint" : null;
      sections.push(
        {
          ...sectionWithWarnings(
            this.sectionFromCount("paintQcp", "Quality Control Plans", paintQcps.length),
            qcpWarnings.filter(
              (w) => w.startsWith("paint_external") || w.startsWith("paint_internal"),
            ),
          ),
          group: paintGroup,
        },
        {
          ...sectionWithWarnings(
            this.sectionFromCount(
              "blastProfiles",
              "Blast Profile Reports",
              qcData.blastProfiles.length,
            ),
            blastWarnings,
          ),
          group: paintGroup,
        },
        ...coatSections.map((cs) => ({
          ...this.sectionFromCount(cs.key, cs.label, dftReadingCountForSection(cs)),
          group: paintGroup,
        })),
        { ...sharedItemsRelease, group: paintGroup },
        { ...sharedReleaseCerts, group: paintGroup },
      );
    }

    if (!hasRubber && !hasPaint) {
      sections.push(
        sectionWithWarnings(
          this.sectionFromCount(
            "controlPlans",
            "Quality Control Plans",
            qcData.controlPlans.length,
          ),
          qcpWarnings,
        ),
        sectionWithWarnings(
          this.sectionFromCount(
            "blastProfiles",
            "Blast Profile Reports",
            qcData.blastProfiles.length,
          ),
          blastWarnings,
        ),
        ...coatSections.map((cs) =>
          this.sectionFromCount(cs.key, cs.label, (dftByRole[cs.role] || []).length),
        ),
        sectionWithWarnings(
          this.sectionFromCount(
            "shoreHardness",
            "Shore Hardness Reports",
            qcData.shoreHardness.length,
          ),
          shoreWarnings,
        ),
        sharedItemsRelease,
        sharedReleaseCerts,
      );
    }

    const warnings = [
      ...qcpWarnings,
      ...blastWarnings,
      ...dftWarnings,
      ...shoreWarnings,
      ...releaseWarnings,
      ...releaseCertWarnings,
    ];

    return { sections, warnings };
  }

  private sectionFromCount(key: string, label: string, count: number): SectionStatus {
    if (count === 0) {
      return { key, label, status: "missing", count, warnings: [], group: null };
    }
    return { key, label, status: "complete", count, warnings: [], group: null };
  }

  private normalizeBatch(batch: string): string {
    return batch.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  }

  private baseBatchNumber(batch: string): string {
    return batch.replace(/[-_]\*[-_].*$/, "").trim();
  }

  private batchesMatch(batchA: string, batchB: string): boolean {
    if (batchA === batchB) return true;
    const baseA = this.baseBatchNumber(batchA);
    const baseB = this.baseBatchNumber(batchB);
    if (baseA === baseB) return true;
    const normA = this.normalizeBatch(baseA);
    const normB = this.normalizeBatch(baseB);
    return normA.length >= 4 && normA === normB;
  }

  async findMatchingCertificate(
    companyId: number,
    batchNumber: string,
  ): Promise<SupplierCertificate | null> {
    const exactMatch = await this.certRepo.findOne({
      where: { companyId, batchNumber },
    });

    if (exactMatch) {
      return exactMatch;
    }

    const baseBatch = this.baseBatchNumber(batchNumber);
    if (baseBatch !== batchNumber) {
      const baseMatch = await this.certRepo.findOne({
        where: { companyId, batchNumber: baseBatch },
      });
      if (baseMatch) return baseMatch;
    }

    const normalizedInput = this.normalizeBatch(baseBatch);
    if (normalizedInput.length < 4) {
      return null;
    }

    const candidates = await this.certRepo.find({
      where: { companyId },
      select: { id: true, batchNumber: true },
    });
    const match = candidates.find((cert) => this.batchesMatch(cert.batchNumber, batchNumber));

    if (match) {
      this.logger.log(
        `Fuzzy batch match: "${batchNumber}" matched cert="${match.batchNumber}" (id=${match.id})`,
      );
    }

    return match || null;
  }

  async linkUnlinkedBatchRecords(companyId: number, certificateId: number): Promise<void> {
    const cert = await this.certRepo.findOne({ where: { id: certificateId, companyId } });
    if (!cert) return;

    const unlinkedIssuanceBatches = await this.batchRecordRepo.find({
      where: { companyId, supplierCertificateId: IsNull() as any },
    });

    const matchedIssuanceBatches = unlinkedIssuanceBatches.filter((br) =>
      this.batchesMatch(br.batchNumber, cert.batchNumber),
    );

    const issuanceJobCardIds = new Set<number>();
    await matchedIssuanceBatches.reduce(async (prev, br) => {
      await prev;
      await this.batchRecordRepo.update(br.id, { supplierCertificateId: cert.id });
      if (br.jobCardId) issuanceJobCardIds.add(br.jobCardId);
      this.logger.log(
        `Linked issuance batch record ${br.id} (batch="${br.batchNumber}") to cert ${cert.id}`,
      );
    }, Promise.resolve());

    const materialCategories = ["material_paint", "material_rubber"];
    const unlinkedDefelskoBatches = await this.defelskoBatchRepo.find({
      where: {
        companyId,
        supplierCertificateId: IsNull() as any,
        category: In(materialCategories),
      },
    });

    const matchedDefelsko = unlinkedDefelskoBatches.filter(
      (db) => db.batchNumber !== null && this.batchesMatch(db.batchNumber, cert.batchNumber),
    );

    const defelskJobCardIds = new Set<number>();
    await matchedDefelsko.reduce(async (prev, db) => {
      await prev;
      await this.defelskoBatchRepo.update(db.id, { supplierCertificateId: cert.id });
      defelskJobCardIds.add(db.jobCardId);
      this.logger.log(
        `Linked defelsko batch ${db.id} (batch="${db.batchNumber}") to cert ${cert.id}`,
      );
    }, Promise.resolve());

    const allJobCardIds = new Set([...issuanceJobCardIds, ...defelskJobCardIds]);

    if (!cert.jobCardId && allJobCardIds.size > 0) {
      const firstJobCardId = allJobCardIds.values().next().value;
      await this.certRepo.update(cert.id, { jobCardId: firstJobCardId });
      this.logger.log(`Linked certificate ${cert.id} to job card ${firstJobCardId}`);
    }

    await [...allJobCardIds].reduce(async (prev, jcId) => {
      await prev;
      await this.markDataBookStale(companyId, jcId);
    }, Promise.resolve());

    const totalLinked = matchedIssuanceBatches.length + matchedDefelsko.length;
    if (totalLinked > 0) {
      this.logger.log(
        `Certificate ${cert.id} (batch="${cert.batchNumber}") auto-linked to ${totalLinked} batch record(s)`,
      );
    }
  }

  async linkMaterialBatchToCertificate(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
    batchNumber: string,
  ): Promise<void> {
    const cert = await this.findMatchingCertificate(companyId, batchNumber);
    if (!cert) return;

    const batch = await this.defelskoBatchRepo.findOne({
      where: { companyId, jobCardId, fieldKey },
    });

    if (!batch) return;

    await this.defelskoBatchRepo.update(batch.id, { supplierCertificateId: cert.id });
    this.logger.log(
      `Linked defelsko batch ${batch.id} (field="${fieldKey}", batch="${batchNumber}") to cert ${cert.id}`,
    );

    if (!cert.jobCardId) {
      await this.certRepo.update(cert.id, { jobCardId });
      this.logger.log(`Linked certificate ${cert.id} to job card ${jobCardId}`);
    }

    await this.markDataBookStale(companyId, jobCardId);
  }

  async certsNeedingProductExtraction(companyId: number): Promise<SupplierCertificate[]> {
    return this.certRepo
      .createQueryBuilder("cert")
      .where("cert.companyId = :companyId", { companyId })
      .andWhere(
        "(cert.description IS NULL OR LENGTH(cert.description) > 60 OR cert.uploadedByName = :emailImport)",
        { emailImport: "Email Import" },
      )
      .select(["cert.id", "cert.filePath", "cert.mimeType", "cert.companyId"])
      .getMany();
  }

  async downloadCertFile(cert: SupplierCertificate): Promise<Buffer> {
    return this.storageService.download(cert.filePath);
  }

  private async extractPdfPages(
    file: Express.Multer.File,
    pageNumbers: number[],
  ): Promise<Express.Multer.File> {
    const srcDoc = await PDFDocument.load(file.buffer);
    const newDoc = await PDFDocument.create();
    const pageIndices = pageNumbers.map((p) => p - 1);
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    const pdfBytes = await newDoc.save();

    return {
      ...file,
      buffer: Buffer.from(pdfBytes),
      size: pdfBytes.byteLength,
    };
  }
}
