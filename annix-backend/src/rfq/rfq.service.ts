import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rfq, RfqStatus } from './entities/rfq.entity';
import { RfqItem, RfqItemType } from './entities/rfq-item.entity';
import { StraightPipeRfq, LengthUnit, QuantityType, ScheduleType } from './entities/straight-pipe-rfq.entity';
import { BendRfq } from './entities/bend-rfq.entity';
import { RfqDocument } from './entities/rfq-document.entity';
import { User } from '../user/entities/user.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';
import { BoltMass } from '../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../nut-mass/entities/nut-mass.entity';
import { LocalStorageService } from '../storage/local-storage.service';
import { CreateStraightPipeRfqWithItemDto } from './dto/create-rfq-item.dto';
import { CreateBendRfqWithItemDto } from './dto/create-bend-rfq-with-item.dto';
import { CreateBendRfqDto } from './dto/create-bend-rfq.dto';
import { StraightPipeCalculationResultDto, RfqResponseDto } from './dto/rfq-response.dto';
import { BendCalculationResultDto } from './dto/bend-calculation-result.dto';
import { RfqDocumentResponseDto } from './dto/rfq-document.dto';

// Maximum number of documents allowed per RFQ
const MAX_DOCUMENTS_PER_RFQ = 10;
// Maximum file size in bytes (50 MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class RfqService {
  constructor(
    @InjectRepository(Rfq)
    private rfqRepository: Repository<Rfq>,
    @InjectRepository(RfqItem)
    private rfqItemRepository: Repository<RfqItem>,
    @InjectRepository(StraightPipeRfq)
    private straightPipeRfqRepository: Repository<StraightPipeRfq>,
    @InjectRepository(BendRfq)
    private bendRfqRepository: Repository<BendRfq>,
    @InjectRepository(RfqDocument)
    private rfqDocumentRepository: Repository<RfqDocument>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SteelSpecification)
    private steelSpecRepository: Repository<SteelSpecification>,
    @InjectRepository(PipeDimension)
    private pipeDimensionRepository: Repository<PipeDimension>,
    @InjectRepository(NbNpsLookup)
    private nbNpsLookupRepository: Repository<NbNpsLookup>,
    @InjectRepository(FlangeDimension)
    private flangeDimensionRepository: Repository<FlangeDimension>,
    @InjectRepository(BoltMass)
    private boltMassRepository: Repository<BoltMass>,
    @InjectRepository(NutMass)
    private nutMassRepository: Repository<NutMass>,
    private storageService: LocalStorageService,
  ) {}

  async calculateStraightPipeRequirements(
    dto: CreateStraightPipeRfqWithItemDto['straightPipe'],
  ): Promise<StraightPipeCalculationResultDto> {
    // Find pipe dimensions based on NB and schedule/wall thickness
    let pipeDimension: PipeDimension | null = null;
    let steelSpec: SteelSpecification | null = null;

    // Get steel specification if provided
    if (dto.steelSpecificationId) {
      steelSpec = await this.steelSpecRepository.findOne({
        where: { id: dto.steelSpecificationId },
      });
      if (!steelSpec) {
        throw new NotFoundException(`Steel specification with ID ${dto.steelSpecificationId} not found`);
      }
    }

    // Normalize schedule number format (convert "Sch40" to "40", etc.)
    const normalizeScheduleNumber = (scheduleNumber: string): string => {
      if (!scheduleNumber) return scheduleNumber;
      
      // Convert "Sch40" -> "40", "Sch80" -> "80", etc.
      const schMatch = scheduleNumber.match(/^[Ss]ch(\d+)$/);
      if (schMatch) {
        return schMatch[1];
      }
      
      // Return as-is for other formats (STD, XS, XXS, MEDIUM, HEAVY, etc.)
      return scheduleNumber;
    };

    // Find pipe dimension based on schedule type
    if (dto.scheduleType === ScheduleType.SCHEDULE && dto.scheduleNumber) {
      const normalizedSchedule = normalizeScheduleNumber(dto.scheduleNumber);
      
      pipeDimension = await this.pipeDimensionRepository.findOne({
        where: {
          nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalBoreMm },
          schedule_designation: normalizedSchedule,
          ...(steelSpec && { steelSpecification: { id: steelSpec.id } }),
        },
        relations: ['nominalOutsideDiameter', 'steelSpecification'],
      });
    } else if (dto.scheduleType === ScheduleType.WALL_THICKNESS && dto.wallThicknessMm) {
      pipeDimension = await this.pipeDimensionRepository.findOne({
        where: {
          nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalBoreMm },
          wall_thickness_mm: dto.wallThicknessMm,
          ...(steelSpec && { steelSpecification: { id: steelSpec.id } }),
        },
        relations: ['nominalOutsideDiameter', 'steelSpecification'],
      });
    }

    if (!pipeDimension) {
      const scheduleInfo = dto.scheduleType === ScheduleType.SCHEDULE && dto.scheduleNumber
        ? `schedule ${dto.scheduleNumber}${dto.scheduleNumber !== normalizeScheduleNumber(dto.scheduleNumber) ? ` (normalized to: ${normalizeScheduleNumber(dto.scheduleNumber)})` : ''}` 
        : `wall thickness ${dto.wallThicknessMm}mm`;
        
      throw new NotFoundException(
        `The combination of ${dto.nominalBoreMm}NB with ${scheduleInfo} is not available in the database.\n\nPlease select a different schedule (STD, XS, XXS, 40, 80, 120, 160, MEDIUM, or HEAVY) or use the automated calculation by setting working pressure.`
      );
    }

    // Get NB-NPS lookup for outside diameter
    const nbNpsLookup = await this.nbNpsLookupRepository.findOne({
      where: { nb_mm: dto.nominalBoreMm },
    });

    if (!nbNpsLookup) {
      throw new NotFoundException(`NB-NPS lookup not found for ${dto.nominalBoreMm}NB`);
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;
    const wallThicknessMm = pipeDimension.wall_thickness_mm;

    // Use the mass from database if available, otherwise calculate
    let pipeWeightPerMeter: number;
    if (pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0) {
      // Use the mass from database (already in kg/m)
      pipeWeightPerMeter = pipeDimension.mass_kgm;
    } else {
      // Fallback: Calculate pipe weight per meter using the formula
      // Weight (kg/m) = π × WT × (OD - WT) × Density / 1,000,000
      const steelDensity = 7.85; // kg/dm³ (default for carbon steel)
      pipeWeightPerMeter = 
        Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * steelDensity / 1000;
    }

    // Convert length to meters if needed
    let individualPipeLengthM = dto.individualPipeLength;
    if (dto.lengthUnit === LengthUnit.FEET) {
      individualPipeLengthM = dto.individualPipeLength * 0.3048;
    }

    // Calculate quantities based on type
    let calculatedPipeCount: number;
    let calculatedTotalLengthM: number;

    if (dto.quantityType === QuantityType.TOTAL_LENGTH) {
      let totalLengthM = dto.quantityValue;
      if (dto.lengthUnit === LengthUnit.FEET) {
        totalLengthM = dto.quantityValue * 0.3048;
      }
      calculatedTotalLengthM = totalLengthM;
      calculatedPipeCount = Math.ceil(totalLengthM / individualPipeLengthM);
    } else {
      calculatedPipeCount = dto.quantityValue;
      calculatedTotalLengthM = calculatedPipeCount * individualPipeLengthM;
    }

    const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLengthM;

    // Calculate welding requirements based on the business rules
    // From your handover doc:
    // - Pipes > 2.5m get flange welds (FWP) - 2 welds per pipe
    // - Pipes <= 2.5m get flange welds (FWF) - 2 welds per pipe
    // Each pipe gets flanges on both ends, so 2 flanges per pipe
    const numberOfFlanges = calculatedPipeCount * 2;
    const numberOfFlangeWelds = numberOfFlanges;

    // Calculate weld length - circumference of pipe
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * circumferenceM;

    // No butt welds for straight pipes in standard lengths
    const numberOfButtWelds = 0;
    const totalButtWeldLength = 0;

    // Calculate flange, bolt, and nut weights
    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        // Find the appropriate flange dimension
        const flangeDimension = await this.flangeDimensionRepository.findOne({
          where: {
            nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalBoreMm },
            standard: { id: dto.flangeStandardId },
            pressureClass: { id: dto.flangePressureClassId }
          },
          relations: ['bolt', 'nominalOutsideDiameter']
        });

        if (flangeDimension) {
          // Calculate flange weight
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          // Calculate bolt weight if bolt information is available
          if (flangeDimension.bolt) {
            // Find the closest bolt mass for reasonable length (typically 3-4 times flange thickness)
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3); // Minimum 50mm, or 3x flange thickness
            
            // Find the closest available bolt length
            const boltMass = await this.boltMassRepository
              .createQueryBuilder('bm')
              .where('bm.bolt = :boltId', { boltId: flangeDimension.bolt.id })
              .andWhere('bm.length_mm >= :minLength', { minLength: estimatedBoltLengthMm })
              .orderBy('bm.length_mm', 'ASC')
              .getOne();

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            // Calculate nut weight
            const nutMass = await this.nutMassRepository.findOne({
              where: {
                bolt: { id: flangeDimension.bolt.id }
              }
            });

            if (nutMass) {
              const totalNuts = numberOfFlanges * flangeDimension.num_holes;
              totalNutWeight = totalNuts * nutMass.mass_kg;
            }
          }
        }
      } catch (error) {
        // If flange weight calculation fails, log it but don't break the calculation
        console.warn('Flange weight calculation failed:', error.message);
        console.warn('Flange Standard ID:', dto.flangeStandardId, 'Pressure Class ID:', dto.flangePressureClassId, 'Nominal Bore:', dto.nominalBoreMm);
      }
    }

    const totalSystemWeight = totalPipeWeight + totalFlangeWeight + totalBoltWeight + totalNutWeight;

    return {
      outsideDiameterMm,
      wallThicknessMm,
      pipeWeightPerMeter: Math.round(pipeWeightPerMeter * 100) / 100,
      totalPipeWeight: Math.round(totalPipeWeight),
      totalFlangeWeight: Math.round(totalFlangeWeight * 100) / 100,
      totalBoltWeight: Math.round(totalBoltWeight * 100) / 100,
      totalNutWeight: Math.round(totalNutWeight * 100) / 100,
      totalSystemWeight: Math.round(totalSystemWeight),
      calculatedPipeCount,
      calculatedTotalLength: Math.round(calculatedTotalLengthM * 100) / 100,
      numberOfFlanges,
      numberOfButtWelds,
      totalButtWeldLength,
      numberOfFlangeWelds,
      totalFlangeWeldLength: Math.round(totalFlangeWeldLength * 100) / 100,
    };
  }

  async createStraightPipeRfq(
    dto: CreateStraightPipeRfqWithItemDto,
    userId: number,
  ): Promise<{ rfq: Rfq; calculation: StraightPipeCalculationResultDto }> {
    // Find user (optional - for when authentication is implemented)
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch(() => null);

    // Calculate requirements first
    const calculation = await this.calculateStraightPipeRequirements(dto.straightPipe);

    // Generate RFQ number
    const rfqCount = await this.rfqRepository.count();
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(rfqCount + 1).padStart(4, '0')}`;

    // Create RFQ
    const rfq = this.rfqRepository.create({
      ...dto.rfq,
      rfqNumber,
      status: dto.rfq.status || RfqStatus.DRAFT,
      totalWeightKg: calculation.totalSystemWeight,
      ...(user && { createdBy: user }),
    });

    const savedRfq: Rfq = await this.rfqRepository.save(rfq);

    // Create RFQ Item
    const rfqItem = this.rfqItemRepository.create({
      lineNumber: 1,
      description: dto.itemDescription,
      itemType: RfqItemType.STRAIGHT_PIPE,
      quantity: calculation.calculatedPipeCount,
      weightPerUnitKg: calculation.totalSystemWeight / calculation.calculatedPipeCount,
      totalWeightKg: calculation.totalSystemWeight,
      notes: dto.itemNotes,
      rfq: savedRfq,
    });

    const savedRfqItem: RfqItem = await this.rfqItemRepository.save(rfqItem);

    // Create Straight Pipe RFQ with calculated values
    const straightPipeRfq = this.straightPipeRfqRepository.create({
      ...dto.straightPipe,
      rfqItem: savedRfqItem,
      calculatedOdMm: calculation.outsideDiameterMm,
      calculatedWtMm: calculation.wallThicknessMm,
      pipeWeightPerMeterKg: calculation.pipeWeightPerMeter,
      totalPipeWeightKg: calculation.totalPipeWeight,
      calculatedPipeCount: calculation.calculatedPipeCount,
      calculatedTotalLengthM: calculation.calculatedTotalLength,
      numberOfFlanges: calculation.numberOfFlanges,
      numberOfButtWelds: calculation.numberOfButtWelds,
      totalButtWeldLengthM: calculation.totalButtWeldLength,
      numberOfFlangeWelds: calculation.numberOfFlangeWelds,
      totalFlangeWeldLengthM: calculation.totalFlangeWeldLength,
    });

    // Set relationships if provided
    if (dto.straightPipe.steelSpecificationId) {
      const steelSpec = await this.steelSpecRepository.findOne({
        where: { id: dto.straightPipe.steelSpecificationId },
      });
      if (steelSpec) {
        straightPipeRfq.steelSpecification = steelSpec;
      }
    }

    await this.straightPipeRfqRepository.save(straightPipeRfq);

    // Reload RFQ with relations
    const finalRfq = await this.rfqRepository.findOne({
      where: { id: savedRfq.id },
      relations: ['items', 'items.straightPipeDetails'],
    });

    return { rfq: finalRfq!, calculation };
  }

  async findAllRfqs(userId?: number): Promise<RfqResponseDto[]> {
    // For now, ignore userId filtering since created_by_id column doesn't exist
    const rfqs = await this.rfqRepository.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return rfqs.map(rfq => ({
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      projectName: rfq.projectName,
      description: rfq.description,
      customerName: rfq.customerName,
      customerEmail: rfq.customerEmail,
      customerPhone: rfq.customerPhone,
      requiredDate: rfq.requiredDate,
      status: rfq.status,
      notes: rfq.notes,
      totalWeightKg: rfq.totalWeightKg,
      totalCost: rfq.totalCost,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      itemCount: rfq.items?.length || 0,
    }));
  }

  async findRfqById(id: number): Promise<Rfq> {
    const rfq = await this.rfqRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.straightPipeDetails',
        'items.straightPipeDetails.steelSpecification',
        'drawings',
        'boqs',
      ],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    return rfq;
  }

  async calculateBendRequirements(
    dto: CreateBendRfqDto,
  ): Promise<BendCalculationResultDto> {
    // For now, use a comprehensive calculation based on the bend specifications
    // This would integrate with proper bend tables and pricing in a full implementation
    
    const approximateWeight = this.calculateBendWeight(dto);
    const centerToFace = this.calculateCenterToFace(dto);

    return {
      totalWeight: approximateWeight,
      centerToFaceDimension: centerToFace,
      bendWeight: approximateWeight * 0.7,
      tangentWeight: approximateWeight * 0.2,
      flangeWeight: approximateWeight * 0.1,
      numberOfFlanges: dto.numberOfTangents + 1,
      numberOfFlangeWelds: dto.numberOfTangents,
      totalFlangeWeldLength: (dto.numberOfTangents * Math.PI * dto.nominalBoreMm) / 1000,
      numberOfButtWelds: dto.numberOfTangents > 0 ? 1 : 0,
      totalButtWeldLength: dto.numberOfTangents > 0 ? (Math.PI * dto.nominalBoreMm) / 1000 : 0,
      outsideDiameterMm: dto.nominalBoreMm + 20, // Simplified OD calculation
      wallThicknessMm: this.getWallThicknessFromSchedule(dto.scheduleNumber),
    };
  }

  private calculateBendWeight(dto: CreateBendRfqDto): number {
    // Simplified weight calculation based on nominal bore and bend specifications
    const baseWeight = Math.pow(dto.nominalBoreMm / 25, 2) * 2; // Base bend weight
    const tangentWeight = dto.tangentLengths.reduce((total, length) => {
      return total + (length / 1000) * (dto.nominalBoreMm / 25) * 7.85; // Steel density approximation
    }, 0);
    return baseWeight + tangentWeight;
  }

  private calculateCenterToFace(dto: CreateBendRfqDto): number {
    // Simplified center-to-face calculation
    // This should use proper bend tables in production
    const radius = this.getBendRadius(dto.bendType, dto.nominalBoreMm);
    return radius * Math.sin(dto.bendDegrees * Math.PI / 180 / 2);
  }

  private getBendRadius(bendType: string, nominalBoreMm: number): number {
    const multiplier = parseFloat(bendType.replace('D', ''));
    return nominalBoreMm * multiplier;
  }

  private getWallThicknessFromSchedule(scheduleNumber: string): number {
    // Simplified wall thickness lookup
    const scheduleMap: { [key: string]: number } = {
      'Sch10': 2.77,
      'Sch20': 3.91,
      'Sch30': 5.54,
      'Sch40': 6.35,
      'Sch80': 8.74,
      'Sch160': 14.27,
    };
    return scheduleMap[scheduleNumber] || 6.35; // Default to Sch40
  }

  async createBendRfq(
    dto: CreateBendRfqWithItemDto,
    userId: number,
  ): Promise<{ rfq: Rfq; calculation: BendCalculationResultDto }> {
    // Find user (optional - for when authentication is implemented)
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch(() => null);

    // Calculate bend requirements first
    const calculation = await this.calculateBendRequirements(dto.bend);

    // Generate RFQ number
    const rfqCount = await this.rfqRepository.count();
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(rfqCount + 1).padStart(4, '0')}`;

    // Create RFQ
    const rfq = this.rfqRepository.create({
      ...dto.rfq,
      rfqNumber,
      status: dto.rfq.status || RfqStatus.DRAFT,
      totalWeightKg: calculation.totalWeight,
      totalCost: 0, // Cost calculations removed
      ...(user && { createdBy: user }),
    });

    const savedRfq: Rfq = await this.rfqRepository.save(rfq);

    // Create RFQ Item
    const rfqItem = this.rfqItemRepository.create({
      lineNumber: 1,
      description: dto.itemDescription,
      itemType: RfqItemType.BEND,
      quantity: dto.bend.quantityValue,
      weightPerUnitKg: calculation.totalWeight / dto.bend.quantityValue,
      totalWeightKg: calculation.totalWeight,
      totalPrice: 0, // Cost calculations removed
      notes: dto.itemNotes,
      rfq: savedRfq,
    });

    const savedRfqItem: RfqItem = await this.rfqItemRepository.save(rfqItem);

    // Create Bend RFQ details
    const bendRfq = this.bendRfqRepository.create({
      ...dto.bend,
      rfqItem: savedRfqItem,
      totalWeightKg: calculation.totalWeight,
      centerToFaceMm: calculation.centerToFaceDimension,
      totalCost: 0, // Cost calculations removed
    });

    await this.bendRfqRepository.save(bendRfq);

    return {
      rfq: savedRfq,
      calculation,
    };
  }

  // ==================== Document Management Methods ====================

  async uploadDocument(
    rfqId: number,
    file: Express.Multer.File,
    user?: User,
  ): Promise<RfqDocumentResponseDto> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of 50MB`);
    }

    // Find the RFQ
    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ['documents'],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    // Check document count limit
    const currentDocCount = rfq.documents?.length || 0;
    if (currentDocCount >= MAX_DOCUMENTS_PER_RFQ) {
      throw new BadRequestException(
        `Maximum number of documents (${MAX_DOCUMENTS_PER_RFQ}) reached for this RFQ`
      );
    }

    // Upload file to storage
    const subPath = `rfq-documents/${rfqId}`;
    const storageResult = await this.storageService.upload(file, subPath);

    // Create document record
    const document = this.rfqDocumentRepository.create({
      rfq,
      filename: file.originalname,
      filePath: storageResult.path,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedBy: user,
    });

    const savedDocument = await this.rfqDocumentRepository.save(document);

    return this.mapDocumentToResponse(savedDocument);
  }

  async getDocuments(rfqId: number): Promise<RfqDocumentResponseDto[]> {
    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    const documents = await this.rfqDocumentRepository.find({
      where: { rfq: { id: rfqId } },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });

    return documents.map(doc => this.mapDocumentToResponse(doc));
  }

  async getDocumentById(documentId: number): Promise<RfqDocument> {
    const document = await this.rfqDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['rfq', 'uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return document;
  }

  async downloadDocument(documentId: number): Promise<{ buffer: Buffer; document: RfqDocument }> {
    const document = await this.getDocumentById(documentId);
    const buffer = await this.storageService.download(document.filePath);

    return { buffer, document };
  }

  async deleteDocument(documentId: number, user?: User): Promise<void> {
    const document = await this.getDocumentById(documentId);

    // Delete file from storage
    await this.storageService.delete(document.filePath);

    // Delete database record
    await this.rfqDocumentRepository.remove(document);
  }

  private mapDocumentToResponse(document: RfqDocument): RfqDocumentResponseDto {
    return {
      id: document.id,
      rfqId: document.rfq?.id,
      filename: document.filename,
      mimeType: document.mimeType,
      fileSizeBytes: Number(document.fileSizeBytes),
      downloadUrl: `/api/rfq/documents/${document.id}/download`,
      uploadedBy: document.uploadedBy?.username,
      createdAt: document.createdAt,
    };
  }
}
