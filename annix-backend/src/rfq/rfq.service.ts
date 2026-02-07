import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { BoltMass } from "../bolt-mass/entities/bolt-mass.entity";
import { Boq } from "../boq/entities/boq.entity";
import { BoqSupplierAccess, SupplierBoqStatus } from "../boq/entities/boq-supplier-access.entity";
import { EmailService } from "../email/email.service";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { fromISO, now } from "../lib/datetime";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { User } from "../user/entities/user.entity";
import { BendCalculationResultDto } from "./dto/bend-calculation-result.dto";
import { CreateBendRfqDto } from "./dto/create-bend-rfq.dto";
import { CreateBendRfqWithItemDto } from "./dto/create-bend-rfq-with-item.dto";
import { CreateStraightPipeRfqWithItemDto } from "./dto/create-rfq-item.dto";
import { CreateUnifiedRfqDto } from "./dto/create-unified-rfq.dto";
import { RfqDocumentResponseDto } from "./dto/rfq-document.dto";
import { RfqDraftFullResponseDto, RfqDraftResponseDto, SaveRfqDraftDto } from "./dto/rfq-draft.dto";
import { RfqResponseDto, StraightPipeCalculationResultDto } from "./dto/rfq-response.dto";
import { BendRfq } from "./entities/bend-rfq.entity";
import {
  BellowsJointType,
  BellowsMaterial,
  ExpansionJointRfq,
  ExpansionJointType,
  FabricatedLoopType,
} from "./entities/expansion-joint-rfq.entity";
import { FittingRfq } from "./entities/fitting-rfq.entity";
import { InstrumentCategory, InstrumentRfq } from "./entities/instrument-rfq.entity";
import {
  PumpCategory,
  PumpMotorType,
  PumpRfq,
  PumpSealType,
  PumpServiceType,
} from "./entities/pump-rfq.entity";
import { Rfq, RfqStatus } from "./entities/rfq.entity";
import { RfqDocument } from "./entities/rfq-document.entity";
import { RfqDraft } from "./entities/rfq-draft.entity";
import { RfqItem, RfqItemType } from "./entities/rfq-item.entity";
import { RfqSequence } from "./entities/rfq-sequence.entity";
import {
  LengthUnit,
  QuantityType,
  ScheduleType,
  StraightPipeRfq,
} from "./entities/straight-pipe-rfq.entity";
import {
  ValveActuatorType,
  ValveCategory,
  ValveFailPosition,
  ValveRfq,
} from "./entities/valve-rfq.entity";

// Maximum number of documents allowed per RFQ
const MAX_DOCUMENTS_PER_RFQ = 10;
// Maximum file size in bytes (50 MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    @InjectRepository(Rfq)
    private rfqRepository: Repository<Rfq>,
    @InjectRepository(RfqItem)
    private rfqItemRepository: Repository<RfqItem>,
    @InjectRepository(StraightPipeRfq)
    private straightPipeRfqRepository: Repository<StraightPipeRfq>,
    @InjectRepository(BendRfq)
    private bendRfqRepository: Repository<BendRfq>,
    @InjectRepository(FittingRfq)
    private fittingRfqRepository: Repository<FittingRfq>,
    @InjectRepository(ExpansionJointRfq)
    private expansionJointRfqRepository: Repository<ExpansionJointRfq>,
    @InjectRepository(ValveRfq)
    private valveRfqRepository: Repository<ValveRfq>,
    @InjectRepository(InstrumentRfq)
    private instrumentRfqRepository: Repository<InstrumentRfq>,
    @InjectRepository(PumpRfq)
    private pumpRfqRepository: Repository<PumpRfq>,
    @InjectRepository(RfqDocument)
    private rfqDocumentRepository: Repository<RfqDocument>,
    @InjectRepository(RfqDraft)
    private rfqDraftRepository: Repository<RfqDraft>,
    @InjectRepository(RfqSequence)
    private rfqSequenceRepository: Repository<RfqSequence>,
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
    @InjectRepository(Boq)
    private boqRepository: Repository<Boq>,
    @InjectRepository(BoqSupplierAccess)
    private boqSupplierAccessRepository: Repository<BoqSupplierAccess>,
    @InjectRepository(SupplierProfile)
    private supplierProfileRepository: Repository<SupplierProfile>,
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
    private emailService: EmailService,
  ) {}

  async nextRfqNumber(): Promise<string> {
    const currentYear = now().year;

    let sequence = await this.rfqSequenceRepository.findOne({
      where: { year: currentYear },
    });

    if (!sequence) {
      sequence = this.rfqSequenceRepository.create({
        year: currentYear,
        lastSequence: 0,
      });
    }

    sequence.lastSequence += 1;
    await this.rfqSequenceRepository.save(sequence);

    return `RFQ-${currentYear}-${String(sequence.lastSequence).padStart(4, "0")}`;
  }

  async rfqStatistics(): Promise<{
    currentYear: number;
    currentYearCount: number;
    yearlyStats: Array<{ year: number; count: number }>;
  }> {
    const currentYear = now().year;

    const sequences = await this.rfqSequenceRepository.find({
      order: { year: "DESC" },
    });

    const currentYearSequence = sequences.find((s) => s.year === currentYear);

    return {
      currentYear,
      currentYearCount: currentYearSequence?.lastSequence || 0,
      yearlyStats: sequences.map((s) => ({
        year: s.year,
        count: s.lastSequence,
      })),
    };
  }

  async calculateStraightPipeRequirements(
    dto: CreateStraightPipeRfqWithItemDto["straightPipe"],
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
        throw new NotFoundException(
          `Steel specification with ID ${dto.steelSpecificationId} not found`,
        );
      }
    }

    // Normalize schedule number format (convert "Sch40", "Sch 10", "Sch 40/STD" to "40", etc.)
    const normalizeScheduleNumber = (scheduleNumber: string): string => {
      if (!scheduleNumber) return scheduleNumber;

      // Handle formats like "Sch10", "Sch 10", "Sch 40/STD", "Sch 80/XS"
      const schMatch = scheduleNumber.match(/^[Ss]ch\s*(\d+)(?:\/\w+)?$/);
      if (schMatch) {
        return schMatch[1];
      }

      // Handle just the number like "40" or "40/STD"
      const numMatch = scheduleNumber.match(/^(\d+)(?:\/\w+)?$/);
      if (numMatch) {
        return numMatch[1];
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
        relations: ["nominalOutsideDiameter", "steelSpecification"],
      });
    } else if (dto.scheduleType === ScheduleType.WALL_THICKNESS && dto.wallThicknessMm) {
      pipeDimension = await this.pipeDimensionRepository.findOne({
        where: {
          nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalBoreMm },
          wall_thickness_mm: dto.wallThicknessMm,
          ...(steelSpec && { steelSpecification: { id: steelSpec.id } }),
        },
        relations: ["nominalOutsideDiameter", "steelSpecification"],
      });
    }

    if (!pipeDimension) {
      const scheduleInfo =
        dto.scheduleType === ScheduleType.SCHEDULE && dto.scheduleNumber
          ? `schedule ${dto.scheduleNumber}${dto.scheduleNumber !== normalizeScheduleNumber(dto.scheduleNumber) ? ` (normalized to: ${normalizeScheduleNumber(dto.scheduleNumber)})` : ""}`
          : `wall thickness ${dto.wallThicknessMm}mm`;

      throw new NotFoundException(
        `The combination of ${dto.nominalBoreMm}NB with ${scheduleInfo} is not available in the database.\n\nPlease select a different schedule (STD, XS, XXS, 40, 80, 120, 160, MEDIUM, or HEAVY) or use the automated calculation by setting working pressure.`,
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
        (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * steelDensity) / 1000;
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

    // Calculate weld length - circumference of pipe × 2 welds per flange (inside + outside)
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * 2 * circumferenceM;

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
            pressureClass: { id: dto.flangePressureClassId },
          },
          relations: ["bolt", "nominalOutsideDiameter"],
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
              .createQueryBuilder("bm")
              .where("bm.bolt = :boltId", { boltId: flangeDimension.bolt.id })
              .andWhere("bm.length_mm >= :minLength", {
                minLength: estimatedBoltLengthMm,
              })
              .orderBy("bm.length_mm", "ASC")
              .getOne();

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            // Calculate nut weight
            const nutMass = await this.nutMassRepository.findOne({
              where: {
                bolt: { id: flangeDimension.bolt.id },
              },
            });

            if (nutMass) {
              const totalNuts = numberOfFlanges * flangeDimension.num_holes;
              totalNutWeight = totalNuts * nutMass.mass_kg;
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Flange weight calculation failed: ${error.message}. ` +
            `Flange Standard ID: ${dto.flangeStandardId}, ` +
            `Pressure Class ID: ${dto.flangePressureClassId}, ` +
            `Nominal Bore: ${dto.nominalBoreMm}`,
        );
      }
    }

    const totalSystemWeight =
      totalPipeWeight + totalFlangeWeight + totalBoltWeight + totalNutWeight;

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
    const rfqNumber = await this.nextRfqNumber();

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
      relations: ["items", "items.straightPipeDetails"],
    });

    return { rfq: finalRfq!, calculation };
  }

  async createUnifiedRfq(
    dto: CreateUnifiedRfqDto,
    userId: number,
  ): Promise<{ rfq: Rfq; itemsCreated: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch(() => null);

    const rfqNumber = await this.nextRfqNumber();

    let totalWeight = 0;
    dto.items.forEach((item) => {
      if (item.totalWeightKg) {
        totalWeight += item.totalWeightKg;
      }
    });

    const rfq = this.rfqRepository.create({
      ...dto.rfq,
      rfqNumber,
      status: dto.rfq.status || RfqStatus.SUBMITTED,
      totalWeightKg: totalWeight,
      ...(user && { createdBy: user }),
    });

    const savedRfq = await this.rfqRepository.save(rfq);
    this.logger.log(`Created unified RFQ ${rfqNumber} with ${dto.items.length} items`);

    let lineNumber = 0;
    for (const item of dto.items) {
      lineNumber++;

      if (item.itemType === "straight_pipe" && item.straightPipe) {
        const calculation = await this.calculateStraightPipeRequirements(item.straightPipe as any);

        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.STRAIGHT_PIPE,
          quantity: calculation.calculatedPipeCount,
          weightPerUnitKg: calculation.totalSystemWeight / calculation.calculatedPipeCount,
          totalWeightKg: calculation.totalSystemWeight,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const straightPipeRfq = this.straightPipeRfqRepository.create({
          nominalBoreMm: item.straightPipe.nominalBoreMm,
          scheduleType: item.straightPipe.scheduleType as ScheduleType,
          scheduleNumber: item.straightPipe.scheduleNumber,
          wallThicknessMm: item.straightPipe.wallThicknessMm,
          pipeEndConfiguration: item.straightPipe.pipeEndConfiguration,
          individualPipeLength: item.straightPipe.individualPipeLength,
          lengthUnit: item.straightPipe.lengthUnit as LengthUnit,
          quantityType: item.straightPipe.quantityType as QuantityType,
          quantityValue: item.straightPipe.quantityValue,
          workingPressureBar: item.straightPipe.workingPressureBar,
          workingTemperatureC: item.straightPipe.workingTemperatureC,
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

        if (item.straightPipe.steelSpecificationId) {
          const steelSpec = await this.steelSpecRepository.findOne({
            where: { id: item.straightPipe.steelSpecificationId },
          });
          if (steelSpec) {
            straightPipeRfq.steelSpecification = steelSpec;
          }
        }

        await this.straightPipeRfqRepository.save(straightPipeRfq);
        this.logger.log(`Created straight pipe item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "bend" && item.bend) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.BEND,
          quantity: item.bend.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const bendRfq = this.bendRfqRepository.create({
          nominalBoreMm: item.bend.nominalBoreMm,
          scheduleNumber: item.bend.scheduleNumber,
          wallThicknessMm: item.bend.wallThicknessMm,
          bendType: item.bend.bendType,
          bendRadiusType: item.bend.bendRadiusType,
          bendDegrees: item.bend.bendDegrees,
          bendEndConfiguration: item.bend.bendEndConfiguration,
          numberOfTangents: item.bend.numberOfTangents || 0,
          tangentLengths: item.bend.tangentLengths || [],
          numberOfSegments: item.bend.numberOfSegments,
          centerToFaceMm: item.bend.centerToFaceMm,
          calculationData: item.bend.calculationData,
          quantityValue: item.bend.quantityValue || 1,
          quantityType: item.bend.quantityType || "number_of_items",
          workingPressureBar: item.bend.workingPressureBar || 10,
          workingTemperatureC: item.bend.workingTemperatureC || 20,
          steelSpecificationId: item.bend.steelSpecificationId || 2,
          useGlobalFlangeSpecs: item.bend.useGlobalFlangeSpecs ?? true,
          flangeStandardId: item.bend.flangeStandardId,
          flangePressureClassId: item.bend.flangePressureClassId,
          totalWeightKg: item.totalWeightKg,
          rfqItem: savedRfqItem,
        });

        await this.bendRfqRepository.save(bendRfq);
        this.logger.log(`Created bend item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "fitting" && item.fitting) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.FITTING,
          quantity: item.fitting.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const fittingRfq = this.fittingRfqRepository.create({
          nominalDiameterMm: item.fitting.nominalDiameterMm,
          scheduleNumber: item.fitting.scheduleNumber,
          wallThicknessMm: item.fitting.wallThicknessMm,
          fittingType: item.fitting.fittingType,
          fittingStandard: item.fitting.fittingStandard,
          pipeLengthAMm: item.fitting.pipeLengthAMm,
          pipeLengthBMm: item.fitting.pipeLengthBMm,
          pipeEndConfiguration: item.fitting.pipeEndConfiguration,
          addBlankFlange: item.fitting.addBlankFlange || false,
          blankFlangeCount: item.fitting.blankFlangeCount,
          blankFlangePositions: item.fitting.blankFlangePositions,
          quantityValue: item.fitting.quantityValue || 1,
          quantityType: item.fitting.quantityType || "number_of_items",
          workingPressureBar: item.fitting.workingPressureBar,
          workingTemperatureC: item.fitting.workingTemperatureC,
          totalWeightKg: item.totalWeightKg,
          calculationData: item.fitting.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.fittingRfqRepository.save(fittingRfq);
        this.logger.log(`Created fitting item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "expansion_joint" && item.expansionJoint) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.EXPANSION_JOINT,
          quantity: item.expansionJoint.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const expansionJointRfq = this.expansionJointRfqRepository.create({
          expansionJointType: item.expansionJoint.expansionJointType as ExpansionJointType,
          nominalDiameterMm: item.expansionJoint.nominalDiameterMm,
          scheduleNumber: item.expansionJoint.scheduleNumber,
          wallThicknessMm: item.expansionJoint.wallThicknessMm,
          outsideDiameterMm: item.expansionJoint.outsideDiameterMm,
          quantityValue: item.expansionJoint.quantityValue || 1,
          bellowsJointType: item.expansionJoint.bellowsJointType as BellowsJointType,
          bellowsMaterial: item.expansionJoint.bellowsMaterial as BellowsMaterial,
          axialMovementMm: item.expansionJoint.axialMovementMm,
          lateralMovementMm: item.expansionJoint.lateralMovementMm,
          angularMovementDeg: item.expansionJoint.angularMovementDeg,
          supplierReference: item.expansionJoint.supplierReference,
          catalogNumber: item.expansionJoint.catalogNumber,
          unitCostFromSupplier: item.expansionJoint.unitCostFromSupplier,
          markupPercentage: item.expansionJoint.markupPercentage || 15,
          loopType: item.expansionJoint.loopType as FabricatedLoopType,
          loopHeightMm: item.expansionJoint.loopHeightMm,
          loopWidthMm: item.expansionJoint.loopWidthMm,
          pipeLengthTotalMm: item.expansionJoint.pipeLengthTotalMm,
          numberOfElbows: item.expansionJoint.numberOfElbows,
          endConfiguration: item.expansionJoint.endConfiguration,
          totalWeightKg: item.totalWeightKg,
          calculationData: item.expansionJoint.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.expansionJointRfqRepository.save(expansionJointRfq);
        this.logger.log(`Created expansion joint item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "valve" && item.valve) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.VALVE,
          quantity: item.valve.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const valveRfq = this.valveRfqRepository.create({
          valveType: item.valve.valveType,
          valveCategory: item.valve.valveCategory as ValveCategory,
          size: item.valve.size,
          pressureClass: item.valve.pressureClass,
          connectionType: item.valve.connectionType,
          bodyMaterial: item.valve.bodyMaterial,
          trimMaterial: item.valve.trimMaterial,
          seatMaterial: item.valve.seatMaterial,
          portType: item.valve.portType,
          actuatorType: item.valve.actuatorType as ValveActuatorType,
          airSupply: item.valve.airSupply,
          voltage: item.valve.voltage,
          failPosition: item.valve.failPosition as ValveFailPosition,
          positioner: item.valve.positioner,
          limitSwitches: item.valve.limitSwitches || false,
          solenoidValve: item.valve.solenoidValve || false,
          media: item.valve.media,
          operatingPressure: item.valve.operatingPressure,
          operatingTemp: item.valve.operatingTemp,
          hazardousArea: item.valve.hazardousArea,
          cv: item.valve.cv,
          flowRate: item.valve.flowRate,
          seatLeakageClass: item.valve.seatLeakageClass,
          fireSafeStandard: item.valve.fireSafeStandard,
          cryogenicService: item.valve.cryogenicService,
          fugitiveEmissions: item.valve.fugitiveEmissions,
          extendedBonnet: item.valve.extendedBonnet,
          certifications: item.valve.certifications || [],
          quantityValue: item.valve.quantityValue || 1,
          supplierReference: item.valve.supplierReference,
          unitCostFromSupplier: item.valve.unitCostFromSupplier,
          markupPercentage: item.valve.markupPercentage || 15,
          calculationData: item.valve.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.valveRfqRepository.save(valveRfq);
        this.logger.log(`Created valve item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "instrument" && item.instrument) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.INSTRUMENT,
          quantity: item.instrument.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const instrumentRfq = this.instrumentRfqRepository.create({
          instrumentType: item.instrument.instrumentType,
          instrumentCategory: item.instrument.instrumentCategory as InstrumentCategory,
          size: item.instrument.size,
          processConnection: item.instrument.processConnection,
          wettedMaterial: item.instrument.wettedMaterial,
          rangeMin: item.instrument.rangeMin,
          rangeMax: item.instrument.rangeMax,
          rangeUnit: item.instrument.rangeUnit,
          outputSignal: item.instrument.outputSignal,
          communicationProtocol: item.instrument.communicationProtocol,
          displayType: item.instrument.displayType,
          powerSupply: item.instrument.powerSupply,
          cableEntry: item.instrument.cableEntry,
          explosionProof: item.instrument.explosionProof,
          ipRating: item.instrument.ipRating,
          accuracyClass: item.instrument.accuracyClass,
          calibration: item.instrument.calibration,
          processMedia: item.instrument.processMedia,
          operatingPressure: item.instrument.operatingPressure,
          operatingTemp: item.instrument.operatingTemp,
          quantityValue: item.instrument.quantityValue || 1,
          supplierReference: item.instrument.supplierReference,
          modelNumber: item.instrument.modelNumber,
          unitCostFromSupplier: item.instrument.unitCostFromSupplier,
          markupPercentage: item.instrument.markupPercentage || 15,
          calculationData: item.instrument.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.instrumentRfqRepository.save(instrumentRfq);
        this.logger.log(`Created instrument item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "pump" && item.pump) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.PUMP,
          quantity: item.pump.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const pumpRfq = this.pumpRfqRepository.create({
          serviceType: item.pump.serviceType as PumpServiceType,
          pumpType: item.pump.pumpType,
          pumpCategory: item.pump.pumpCategory as PumpCategory,
          flowRate: item.pump.flowRate,
          totalHead: item.pump.totalHead,
          suctionHead: item.pump.suctionHead,
          npshAvailable: item.pump.npshAvailable,
          dischargePressure: item.pump.dischargePressure,
          operatingTemp: item.pump.operatingTemp,
          fluidType: item.pump.fluidType,
          specificGravity: item.pump.specificGravity,
          viscosity: item.pump.viscosity,
          solidsContent: item.pump.solidsContent,
          solidsSize: item.pump.solidsSize,
          ph: item.pump.ph,
          isAbrasive: item.pump.isAbrasive || false,
          isCorrosive: item.pump.isCorrosive || false,
          casingMaterial: item.pump.casingMaterial,
          impellerMaterial: item.pump.impellerMaterial,
          shaftMaterial: item.pump.shaftMaterial,
          sealType: item.pump.sealType as PumpSealType,
          sealPlan: item.pump.sealPlan,
          suctionSize: item.pump.suctionSize,
          dischargeSize: item.pump.dischargeSize,
          connectionType: item.pump.connectionType,
          motorType: item.pump.motorType as PumpMotorType,
          motorPower: item.pump.motorPower,
          voltage: item.pump.voltage,
          frequency: item.pump.frequency,
          motorEfficiency: item.pump.motorEfficiency,
          enclosure: item.pump.enclosure,
          hazardousArea: item.pump.hazardousArea || "none",
          certifications: item.pump.certifications || [],
          sparePartCategory: item.pump.sparePartCategory,
          spareParts: item.pump.spareParts,
          existingPumpModel: item.pump.existingPumpModel,
          existingPumpSerial: item.pump.existingPumpSerial,
          rentalDurationDays: item.pump.rentalDurationDays,
          quantityValue: item.pump.quantityValue || 1,
          supplierReference: item.pump.supplierReference,
          unitCostFromSupplier: item.pump.unitCostFromSupplier,
          markupPercentage: item.pump.markupPercentage || 15,
          calculationData: item.pump.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.pumpRfqRepository.save(pumpRfq);
        this.logger.log(`Created pump item #${lineNumber}: ${item.description}`);
      }
    }

    const finalRfq = await this.rfqRepository.findOne({
      where: { id: savedRfq.id },
      relations: [
        "items",
        "items.straightPipeDetails",
        "items.bendDetails",
        "items.fittingDetails",
        "items.expansionJointDetails",
        "items.valveDetails",
        "items.instrumentDetails",
        "items.pumpDetails",
      ],
    });

    return { rfq: finalRfq!, itemsCreated: lineNumber };
  }

  async updateUnifiedRfq(
    id: number,
    dto: CreateUnifiedRfqDto,
    userId: number,
  ): Promise<{ rfq: Rfq; itemsUpdated: number }> {
    const existingRfq = await this.rfqRepository.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!existingRfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    if (existingRfq.items && existingRfq.items.length > 0) {
      await this.rfqItemRepository.delete({ rfq: { id } });
      this.logger.log(`Deleted ${existingRfq.items.length} existing items from RFQ ${id}`);
    }

    let totalWeight = 0;
    dto.items.forEach((item) => {
      if (item.totalWeightKg) {
        totalWeight += item.totalWeightKg;
      }
    });

    existingRfq.projectName = dto.rfq.projectName;
    existingRfq.description = dto.rfq.description;
    existingRfq.customerName = dto.rfq.customerName;
    existingRfq.customerEmail = dto.rfq.customerEmail;
    existingRfq.customerPhone = dto.rfq.customerPhone;
    existingRfq.requiredDate = dto.rfq.requiredDate
      ? fromISO(dto.rfq.requiredDate).toJSDate()
      : undefined;
    existingRfq.notes = dto.rfq.notes;
    existingRfq.totalWeightKg = totalWeight;
    existingRfq.status = RfqStatus.SUBMITTED;

    const savedRfq = await this.rfqRepository.save(existingRfq);
    this.logger.log(`Updated RFQ ${existingRfq.rfqNumber} with ${dto.items.length} new items`);

    let lineNumber = 0;
    for (const item of dto.items) {
      lineNumber++;

      if (item.itemType === "straight_pipe" && item.straightPipe) {
        const calculation = await this.calculateStraightPipeRequirements(item.straightPipe as any);

        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.STRAIGHT_PIPE,
          quantity: calculation.calculatedPipeCount,
          weightPerUnitKg: calculation.totalSystemWeight / calculation.calculatedPipeCount,
          totalWeightKg: calculation.totalSystemWeight,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const straightPipeRfq = this.straightPipeRfqRepository.create({
          nominalBoreMm: item.straightPipe.nominalBoreMm,
          scheduleType: item.straightPipe.scheduleType as ScheduleType,
          scheduleNumber: item.straightPipe.scheduleNumber,
          wallThicknessMm: item.straightPipe.wallThicknessMm,
          pipeEndConfiguration: item.straightPipe.pipeEndConfiguration,
          individualPipeLength: item.straightPipe.individualPipeLength,
          lengthUnit: item.straightPipe.lengthUnit as LengthUnit,
          quantityType: item.straightPipe.quantityType as QuantityType,
          quantityValue: item.straightPipe.quantityValue,
          workingPressureBar: item.straightPipe.workingPressureBar,
          workingTemperatureC: item.straightPipe.workingTemperatureC,
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

        if (item.straightPipe.steelSpecificationId) {
          const steelSpec = await this.steelSpecRepository.findOne({
            where: { id: item.straightPipe.steelSpecificationId },
          });
          if (steelSpec) {
            straightPipeRfq.steelSpecification = steelSpec;
          }
        }

        await this.straightPipeRfqRepository.save(straightPipeRfq);
      } else if (item.itemType === "bend" && item.bend) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.BEND,
          quantity: item.bend.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const bendRfq = this.bendRfqRepository.create({
          nominalBoreMm: item.bend.nominalBoreMm,
          scheduleNumber: item.bend.scheduleNumber,
          wallThicknessMm: item.bend.wallThicknessMm,
          bendType: item.bend.bendType,
          bendRadiusType: item.bend.bendRadiusType,
          bendDegrees: item.bend.bendDegrees,
          bendEndConfiguration: item.bend.bendEndConfiguration,
          numberOfTangents: item.bend.numberOfTangents || 0,
          tangentLengths: item.bend.tangentLengths || [],
          numberOfSegments: item.bend.numberOfSegments,
          centerToFaceMm: item.bend.centerToFaceMm,
          calculationData: item.bend.calculationData,
          quantityValue: item.bend.quantityValue || 1,
          quantityType: item.bend.quantityType || "number_of_items",
          workingPressureBar: item.bend.workingPressureBar || 10,
          workingTemperatureC: item.bend.workingTemperatureC || 20,
          steelSpecificationId: item.bend.steelSpecificationId || 2,
          useGlobalFlangeSpecs: item.bend.useGlobalFlangeSpecs ?? true,
          flangeStandardId: item.bend.flangeStandardId,
          flangePressureClassId: item.bend.flangePressureClassId,
          totalWeightKg: item.totalWeightKg,
          rfqItem: savedRfqItem,
        });

        await this.bendRfqRepository.save(bendRfq);
      } else if (item.itemType === "fitting" && item.fitting) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.FITTING,
          quantity: item.fitting.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const fittingRfq = this.fittingRfqRepository.create({
          nominalDiameterMm: item.fitting.nominalDiameterMm,
          scheduleNumber: item.fitting.scheduleNumber,
          wallThicknessMm: item.fitting.wallThicknessMm,
          fittingType: item.fitting.fittingType,
          fittingStandard: item.fitting.fittingStandard,
          pipeLengthAMm: item.fitting.pipeLengthAMm,
          pipeLengthBMm: item.fitting.pipeLengthBMm,
          pipeEndConfiguration: item.fitting.pipeEndConfiguration,
          addBlankFlange: item.fitting.addBlankFlange || false,
          blankFlangeCount: item.fitting.blankFlangeCount,
          blankFlangePositions: item.fitting.blankFlangePositions,
          quantityValue: item.fitting.quantityValue || 1,
          quantityType: item.fitting.quantityType || "number_of_items",
          workingPressureBar: item.fitting.workingPressureBar,
          workingTemperatureC: item.fitting.workingTemperatureC,
          totalWeightKg: item.totalWeightKg,
          calculationData: item.fitting.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.fittingRfqRepository.save(fittingRfq);
      } else if (item.itemType === "expansion_joint" && item.expansionJoint) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.EXPANSION_JOINT,
          quantity: item.expansionJoint.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const expansionJointRfq = this.expansionJointRfqRepository.create({
          expansionJointType: item.expansionJoint.expansionJointType as ExpansionJointType,
          nominalDiameterMm: item.expansionJoint.nominalDiameterMm,
          scheduleNumber: item.expansionJoint.scheduleNumber,
          wallThicknessMm: item.expansionJoint.wallThicknessMm,
          outsideDiameterMm: item.expansionJoint.outsideDiameterMm,
          quantityValue: item.expansionJoint.quantityValue || 1,
          bellowsJointType: item.expansionJoint.bellowsJointType as BellowsJointType,
          bellowsMaterial: item.expansionJoint.bellowsMaterial as BellowsMaterial,
          axialMovementMm: item.expansionJoint.axialMovementMm,
          lateralMovementMm: item.expansionJoint.lateralMovementMm,
          angularMovementDeg: item.expansionJoint.angularMovementDeg,
          supplierReference: item.expansionJoint.supplierReference,
          catalogNumber: item.expansionJoint.catalogNumber,
          unitCostFromSupplier: item.expansionJoint.unitCostFromSupplier,
          markupPercentage: item.expansionJoint.markupPercentage || 15,
          loopType: item.expansionJoint.loopType as FabricatedLoopType,
          loopHeightMm: item.expansionJoint.loopHeightMm,
          loopWidthMm: item.expansionJoint.loopWidthMm,
          pipeLengthTotalMm: item.expansionJoint.pipeLengthTotalMm,
          numberOfElbows: item.expansionJoint.numberOfElbows,
          endConfiguration: item.expansionJoint.endConfiguration,
          totalWeightKg: item.totalWeightKg,
          calculationData: item.expansionJoint.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.expansionJointRfqRepository.save(expansionJointRfq);
      } else if (item.itemType === "valve" && item.valve) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.VALVE,
          quantity: item.valve.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const valveRfq = this.valveRfqRepository.create({
          valveType: item.valve.valveType,
          valveCategory: item.valve.valveCategory as ValveCategory,
          size: item.valve.size,
          pressureClass: item.valve.pressureClass,
          connectionType: item.valve.connectionType,
          bodyMaterial: item.valve.bodyMaterial,
          trimMaterial: item.valve.trimMaterial,
          seatMaterial: item.valve.seatMaterial,
          portType: item.valve.portType,
          actuatorType: item.valve.actuatorType as ValveActuatorType,
          airSupply: item.valve.airSupply,
          voltage: item.valve.voltage,
          failPosition: item.valve.failPosition as ValveFailPosition,
          positioner: item.valve.positioner,
          limitSwitches: item.valve.limitSwitches || false,
          solenoidValve: item.valve.solenoidValve || false,
          media: item.valve.media,
          operatingPressure: item.valve.operatingPressure,
          operatingTemp: item.valve.operatingTemp,
          hazardousArea: item.valve.hazardousArea,
          cv: item.valve.cv,
          flowRate: item.valve.flowRate,
          seatLeakageClass: item.valve.seatLeakageClass,
          fireSafeStandard: item.valve.fireSafeStandard,
          cryogenicService: item.valve.cryogenicService,
          fugitiveEmissions: item.valve.fugitiveEmissions,
          extendedBonnet: item.valve.extendedBonnet,
          certifications: item.valve.certifications || [],
          quantityValue: item.valve.quantityValue || 1,
          supplierReference: item.valve.supplierReference,
          unitCostFromSupplier: item.valve.unitCostFromSupplier,
          markupPercentage: item.valve.markupPercentage || 15,
          calculationData: item.valve.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.valveRfqRepository.save(valveRfq);
      } else if (item.itemType === "instrument" && item.instrument) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.INSTRUMENT,
          quantity: item.instrument.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const instrumentRfq = this.instrumentRfqRepository.create({
          instrumentType: item.instrument.instrumentType,
          instrumentCategory: item.instrument.instrumentCategory as InstrumentCategory,
          size: item.instrument.size,
          processConnection: item.instrument.processConnection,
          wettedMaterial: item.instrument.wettedMaterial,
          rangeMin: item.instrument.rangeMin,
          rangeMax: item.instrument.rangeMax,
          rangeUnit: item.instrument.rangeUnit,
          outputSignal: item.instrument.outputSignal,
          communicationProtocol: item.instrument.communicationProtocol,
          displayType: item.instrument.displayType,
          powerSupply: item.instrument.powerSupply,
          cableEntry: item.instrument.cableEntry,
          explosionProof: item.instrument.explosionProof,
          ipRating: item.instrument.ipRating,
          accuracyClass: item.instrument.accuracyClass,
          calibration: item.instrument.calibration,
          processMedia: item.instrument.processMedia,
          operatingPressure: item.instrument.operatingPressure,
          operatingTemp: item.instrument.operatingTemp,
          quantityValue: item.instrument.quantityValue || 1,
          supplierReference: item.instrument.supplierReference,
          modelNumber: item.instrument.modelNumber,
          unitCostFromSupplier: item.instrument.unitCostFromSupplier,
          markupPercentage: item.instrument.markupPercentage || 15,
          calculationData: item.instrument.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.instrumentRfqRepository.save(instrumentRfq);
      } else if (item.itemType === "pump" && item.pump) {
        const rfqItem = this.rfqItemRepository.create({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.PUMP,
          quantity: item.pump.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const savedRfqItem = await this.rfqItemRepository.save(rfqItem);

        const pumpRfq = this.pumpRfqRepository.create({
          serviceType: item.pump.serviceType as PumpServiceType,
          pumpType: item.pump.pumpType,
          pumpCategory: item.pump.pumpCategory as PumpCategory,
          flowRate: item.pump.flowRate,
          totalHead: item.pump.totalHead,
          suctionHead: item.pump.suctionHead,
          npshAvailable: item.pump.npshAvailable,
          dischargePressure: item.pump.dischargePressure,
          operatingTemp: item.pump.operatingTemp,
          fluidType: item.pump.fluidType,
          specificGravity: item.pump.specificGravity,
          viscosity: item.pump.viscosity,
          solidsContent: item.pump.solidsContent,
          solidsSize: item.pump.solidsSize,
          ph: item.pump.ph,
          isAbrasive: item.pump.isAbrasive || false,
          isCorrosive: item.pump.isCorrosive || false,
          casingMaterial: item.pump.casingMaterial,
          impellerMaterial: item.pump.impellerMaterial,
          shaftMaterial: item.pump.shaftMaterial,
          sealType: item.pump.sealType as PumpSealType,
          sealPlan: item.pump.sealPlan,
          suctionSize: item.pump.suctionSize,
          dischargeSize: item.pump.dischargeSize,
          connectionType: item.pump.connectionType,
          motorType: item.pump.motorType as PumpMotorType,
          motorPower: item.pump.motorPower,
          voltage: item.pump.voltage,
          frequency: item.pump.frequency,
          motorEfficiency: item.pump.motorEfficiency,
          enclosure: item.pump.enclosure,
          hazardousArea: item.pump.hazardousArea || "none",
          certifications: item.pump.certifications || [],
          sparePartCategory: item.pump.sparePartCategory,
          spareParts: item.pump.spareParts,
          existingPumpModel: item.pump.existingPumpModel,
          existingPumpSerial: item.pump.existingPumpSerial,
          rentalDurationDays: item.pump.rentalDurationDays,
          quantityValue: item.pump.quantityValue || 1,
          supplierReference: item.pump.supplierReference,
          unitCostFromSupplier: item.pump.unitCostFromSupplier,
          markupPercentage: item.pump.markupPercentage || 15,
          calculationData: item.pump.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.pumpRfqRepository.save(pumpRfq);
      }
    }

    const finalRfq = await this.rfqRepository.findOne({
      where: { id: savedRfq.id },
      relations: [
        "items",
        "items.straightPipeDetails",
        "items.bendDetails",
        "items.fittingDetails",
        "items.expansionJointDetails",
        "items.valveDetails",
        "items.instrumentDetails",
        "items.pumpDetails",
      ],
    });

    return { rfq: finalRfq!, itemsUpdated: lineNumber };
  }

  async findAllRfqs(userId?: number): Promise<RfqResponseDto[]> {
    // For now, ignore userId filtering since created_by_id column doesn't exist
    const rfqs = await this.rfqRepository.find({
      relations: ["items"],
      order: { createdAt: "DESC" },
    });

    return rfqs.map((rfq) => ({
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
        "items",
        "items.straightPipeDetails",
        "items.straightPipeDetails.steelSpecification",
        "items.bendDetails",
        "items.fittingDetails",
        "items.expansionJointDetails",
        "items.valveDetails",
        "items.instrumentDetails",
        "items.pumpDetails",
        "drawings",
        "boqs",
      ],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    return rfq;
  }

  async calculateBendRequirements(dto: CreateBendRfqDto): Promise<BendCalculationResultDto> {
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
    const baseWeight = (dto.nominalBoreMm / 25) ** 2 * 2; // Base bend weight
    const tangentWeight = dto.tangentLengths.reduce((total, length) => {
      return total + (length / 1000) * (dto.nominalBoreMm / 25) * 7.85; // Steel density approximation
    }, 0);
    return baseWeight + tangentWeight;
  }

  private calculateCenterToFace(dto: CreateBendRfqDto): number {
    if (!dto.bendType) {
      return dto.nominalBoreMm * 1.5;
    }
    const radius = this.getBendRadius(dto.bendType, dto.nominalBoreMm);
    return radius * Math.sin((dto.bendDegrees * Math.PI) / 180 / 2);
  }

  private getBendRadius(bendType: string, nominalBoreMm: number): number {
    const multiplier = parseFloat(bendType.replace("D", "")) || 1.5;
    return nominalBoreMm * multiplier;
  }

  private getWallThicknessFromSchedule(scheduleNumber: string): number {
    // Simplified wall thickness lookup
    const scheduleMap: { [key: string]: number } = {
      Sch10: 2.77,
      Sch20: 3.91,
      Sch30: 5.54,
      Sch40: 6.35,
      Sch80: 8.74,
      Sch160: 14.27,
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
    const rfqNumber = await this.nextRfqNumber();

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
      throw new BadRequestException("File size exceeds maximum allowed size of 50MB");
    }

    // Find the RFQ
    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["documents"],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    // Check document count limit
    const currentDocCount = rfq.documents?.length || 0;
    if (currentDocCount >= MAX_DOCUMENTS_PER_RFQ) {
      throw new BadRequestException(
        `Maximum number of documents (${MAX_DOCUMENTS_PER_RFQ}) reached for this RFQ`,
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
      relations: ["uploadedBy"],
      order: { createdAt: "DESC" },
    });

    return documents.map((doc) => this.mapDocumentToResponse(doc));
  }

  async getDocumentById(documentId: number): Promise<RfqDocument> {
    const document = await this.rfqDocumentRepository.findOne({
      where: { id: documentId },
      relations: ["rfq", "uploadedBy"],
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

  // ============================================
  // RFQ Draft Management Methods
  // ============================================

  /**
   * Generate a unique draft number
   */
  private async generateDraftNumber(): Promise<string> {
    const year = now().year;
    const draftCount = await this.rfqDraftRepository.count();
    return `DRAFT-${year}-${String(draftCount + 1).padStart(4, "0")}`;
  }

  private readonly stepPercentages: Record<number, number> = {
    1: 20,
    2: 40,
    3: 60,
    4: 80,
    5: 95,
  };

  private completionPercentageForStep(step: number): number {
    return this.stepPercentages[step] || 0;
  }

  private calculateCompletionPercentage(dto: SaveRfqDraftDto): number {
    return this.completionPercentageForStep(dto.currentStep);
  }

  /**
   * Save or update an RFQ draft
   */
  async saveDraft(dto: SaveRfqDraftDto, userId: number): Promise<RfqDraftResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let draft: RfqDraft;

    if (dto.draftId) {
      // Update existing draft
      const existingDraft = await this.rfqDraftRepository.findOne({
        where: { id: dto.draftId, createdBy: { id: userId } },
      });
      if (!existingDraft) {
        throw new NotFoundException(`Draft with ID ${dto.draftId} not found or access denied`);
      }
      if (existingDraft.isConverted) {
        throw new BadRequestException("Cannot update a draft that has been converted to an RFQ");
      }
      draft = existingDraft;
    } else {
      // Create new draft
      draft = new RfqDraft();
      draft.draftNumber = await this.generateDraftNumber();
      draft.createdBy = user;
    }

    // Update draft fields
    draft.customerRfqReference = dto.customerRfqReference || dto.formData.customerRfqReference;
    draft.projectName = dto.projectName || dto.formData.projectName || "Untitled Draft";
    draft.currentStep = dto.currentStep;
    draft.formData = dto.formData;
    draft.globalSpecs = dto.globalSpecs;
    draft.requiredProducts = dto.requiredProducts;
    draft.straightPipeEntries = dto.straightPipeEntries;
    draft.pendingDocuments = dto.pendingDocuments;
    draft.completionPercentage = this.calculateCompletionPercentage(dto);

    const savedDraft = await this.rfqDraftRepository.save(draft);

    return this.mapDraftToResponse(savedDraft);
  }

  async getDrafts(userId: number): Promise<RfqDraftResponseDto[]> {
    const drafts = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .leftJoinAndSelect("draft.convertedRfq", "rfq")
      .where("draft.created_by_user_id = :userId", { userId })
      .orderBy("draft.updated_at", "DESC")
      .getMany();

    const convertedRfqIds = drafts
      .filter((draft) => draft.isConverted && draft.convertedRfqId)
      .map((draft) => draft.convertedRfqId as number);

    const supplierCountsMap =
      convertedRfqIds.length > 0
        ? await this.batchSupplierCountsForRfqs(convertedRfqIds)
        : new Map<
            number,
            {
              pending: number;
              declined: number;
              intendToQuote: number;
              quoted: number;
            }
          >();

    return drafts.map((draft) => {
      const response = this.mapDraftToResponse(draft);
      if (draft.isConverted && draft.convertedRfqId) {
        response.supplierCounts = supplierCountsMap.get(draft.convertedRfqId) || {
          pending: 0,
          declined: 0,
          intendToQuote: 0,
          quoted: 0,
        };
      }
      return response;
    });
  }

  private async batchSupplierCountsForRfqs(rfqIds: number[]): Promise<
    Map<
      number,
      {
        pending: number;
        declined: number;
        intendToQuote: number;
        quoted: number;
      }
    >
  > {
    const boqs = await this.boqRepository
      .createQueryBuilder("boq")
      .select(["boq.id", "boq.rfq"])
      .innerJoin("boq.rfq", "rfq")
      .addSelect("rfq.id")
      .where("rfq.id IN (:...rfqIds)", { rfqIds })
      .getMany();

    if (boqs.length === 0) {
      return new Map();
    }

    const boqIdToRfqId = new Map(boqs.map((b) => [b.id, b.rfq?.id as number]));
    const boqIds = boqs.map((b) => b.id);

    const counts = await this.boqSupplierAccessRepository
      .createQueryBuilder("access")
      .select("access.boq_id", "boqId")
      .addSelect("access.status", "status")
      .addSelect("COUNT(DISTINCT access.supplier_profile_id)", "count")
      .where("access.boq_id IN (:...boqIds)", { boqIds })
      .groupBy("access.boq_id")
      .addGroupBy("access.status")
      .getRawMany<{ boqId: number; status: string; count: string }>();

    const resultMap = new Map<
      number,
      {
        pending: number;
        declined: number;
        intendToQuote: number;
        quoted: number;
      }
    >();

    rfqIds.forEach((rfqId) => {
      resultMap.set(rfqId, {
        pending: 0,
        declined: 0,
        intendToQuote: 0,
        quoted: 0,
      });
    });

    counts.forEach((row) => {
      const rfqId = boqIdToRfqId.get(row.boqId);
      if (rfqId === undefined) return;

      const result = resultMap.get(rfqId);
      if (!result) return;

      const count = parseInt(row.count, 10);
      switch (row.status) {
        case SupplierBoqStatus.PENDING:
          result.pending += count;
          break;
        case SupplierBoqStatus.DECLINED:
          result.declined += count;
          break;
        case SupplierBoqStatus.VIEWED:
          result.intendToQuote += count;
          break;
        case SupplierBoqStatus.QUOTED:
          result.quoted += count;
          break;
      }
    });

    return resultMap;
  }

  /**
   * Get supplier response counts for an RFQ
   */
  private async supplierCountsForRfq(rfqId: number): Promise<{
    pending: number;
    declined: number;
    intendToQuote: number;
    quoted: number;
  }> {
    const boqs = await this.boqRepository.find({
      where: { rfq: { id: rfqId } },
      select: ["id"],
    });

    if (boqs.length === 0) {
      return { pending: 0, declined: 0, intendToQuote: 0, quoted: 0 };
    }

    const boqIds = boqs.map((b) => b.id);

    const counts = await this.boqSupplierAccessRepository
      .createQueryBuilder("access")
      .select("access.status", "status")
      .addSelect("COUNT(DISTINCT access.supplier_profile_id)", "count")
      .where("access.boq_id IN (:...boqIds)", { boqIds })
      .groupBy("access.status")
      .getRawMany();

    const result = { pending: 0, declined: 0, intendToQuote: 0, quoted: 0 };

    counts.forEach((row: { status: string; count: string }) => {
      const count = parseInt(row.count, 10);
      switch (row.status) {
        case SupplierBoqStatus.PENDING:
          result.pending = count;
          break;
        case SupplierBoqStatus.DECLINED:
          result.declined = count;
          break;
        case SupplierBoqStatus.VIEWED:
          result.intendToQuote = count;
          break;
        case SupplierBoqStatus.QUOTED:
          result.quoted = count;
          break;
      }
    });

    return result;
  }

  /**
   * Get a single draft with full data
   */
  async getDraftById(draftId: number, userId: number): Promise<RfqDraftFullResponseDto> {
    const draft = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .where("draft.id = :draftId", { draftId })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found or access denied`);
    }

    return this.mapDraftToFullResponse(draft);
  }

  /**
   * Get a draft by draft number
   */
  async getDraftByNumber(draftNumber: string, userId: number): Promise<RfqDraftFullResponseDto> {
    const draft = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .where("draft.draft_number = :draftNumber", { draftNumber })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();

    if (!draft) {
      throw new NotFoundException(`Draft ${draftNumber} not found or access denied`);
    }

    return this.mapDraftToFullResponse(draft);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: number, userId: number): Promise<void> {
    const draft = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .where("draft.id = :draftId", { draftId })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found or access denied`);
    }

    if (draft.isConverted) {
      throw new BadRequestException("Cannot delete a draft that has been converted to an RFQ");
    }

    await this.rfqDraftRepository.remove(draft);
  }

  /**
   * Mark a draft as converted to RFQ
   */
  async markDraftAsConverted(draftId: number, rfqId: number, userId: number): Promise<void> {
    const draft = await this.rfqDraftRepository.findOne({
      where: { id: draftId, createdBy: { id: userId } },
    });

    if (draft) {
      draft.isConverted = true;
      draft.convertedRfqId = rfqId;
      await this.rfqDraftRepository.save(draft);
    }
  }

  /**
   * Map draft entity to response DTO
   */
  private mapDraftToResponse(draft: RfqDraft): RfqDraftResponseDto {
    const rfqStatus = draft.convertedRfq?.status;
    const status = draft.isConverted ? rfqStatus || RfqStatus.SUBMITTED : RfqStatus.DRAFT;

    return {
      id: draft.id,
      draftNumber: draft.draftNumber,
      rfqNumber: draft.convertedRfq?.rfqNumber,
      customerRfqReference: draft.customerRfqReference,
      projectName: draft.projectName,
      currentStep: draft.currentStep,
      completionPercentage: draft.isConverted
        ? 100
        : this.completionPercentageForStep(draft.currentStep),
      status,
      createdAt: draft.createdAt,
      updatedAt: draft.convertedRfq?.updatedAt || draft.updatedAt,
      isConverted: draft.isConverted,
      convertedRfqId: draft.convertedRfqId,
    };
  }

  /**
   * Map draft entity to full response DTO
   */
  private mapDraftToFullResponse(draft: RfqDraft): RfqDraftFullResponseDto {
    return {
      ...this.mapDraftToResponse(draft),
      formData: draft.formData,
      globalSpecs: draft.globalSpecs,
      requiredProducts: draft.requiredProducts,
      straightPipeEntries: draft.straightPipeEntries,
      pendingDocuments: draft.pendingDocuments,
    };
  }

  async notifySuppliersOfRfqUpdate(rfqId: number): Promise<{
    suppliersNotified: number;
    suppliersSkipped: number;
  }> {
    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["boqs"],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    this.logger.log(`Notifying suppliers of RFQ update for ${rfq.rfqNumber}`);

    let suppliersNotified = 0;
    let suppliersSkipped = 0;

    const boqs = await this.boqRepository.find({
      where: { rfq: { id: rfqId } },
    });

    if (boqs.length === 0) {
      this.logger.log(`No BOQs found for RFQ ${rfq.rfqNumber}`);
      return { suppliersNotified: 0, suppliersSkipped: 0 };
    }

    const boqIds = boqs.map((boq) => boq.id);

    const allSupplierAccessRecords = await this.boqSupplierAccessRepository.find({
      where: {
        boqId: In(boqIds),
        status: Not(SupplierBoqStatus.DECLINED),
      },
    });

    if (allSupplierAccessRecords.length === 0) {
      this.logger.log(`No supplier access records found for RFQ ${rfq.rfqNumber}`);
      return { suppliersNotified: 0, suppliersSkipped: 0 };
    }

    const supplierProfileIds = [
      ...new Set(allSupplierAccessRecords.map((access) => access.supplierProfileId)),
    ];

    const supplierProfiles = await this.supplierProfileRepository.find({
      where: { id: In(supplierProfileIds) },
      relations: ["user", "company"],
    });

    const supplierProfileMap = new Map(supplierProfiles.map((profile) => [profile.id, profile]));

    for (const access of allSupplierAccessRecords) {
      try {
        const supplierProfile = supplierProfileMap.get(access.supplierProfileId);

        if (!supplierProfile?.user?.email) {
          this.logger.warn(`Supplier profile ${access.supplierProfileId} has no email - skipping`);
          suppliersSkipped++;
          continue;
        }

        const supplierName =
          supplierProfile.company?.tradingName ||
          supplierProfile.company?.legalName ||
          `${supplierProfile.firstName} ${supplierProfile.lastName}`;

        const success = await this.emailService.sendRfqUpdateNotification(
          supplierProfile.user.email,
          supplierName,
          rfq.projectName,
          rfq.rfqNumber,
        );

        if (success) {
          suppliersNotified++;
          this.logger.log(`Notified supplier ${supplierProfile.user.email} of RFQ update`);
        } else {
          suppliersSkipped++;
        }
      } catch (error) {
        this.logger.error(`Failed to notify supplier ${access.supplierProfileId}:`, error);
        suppliersSkipped++;
      }
    }

    this.logger.log(
      `RFQ update notification complete: ${suppliersNotified} notified, ${suppliersSkipped} skipped`,
    );

    return { suppliersNotified, suppliersSkipped };
  }
}
