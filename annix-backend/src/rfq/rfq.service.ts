import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, In, Not, Repository } from "typeorm";
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
import { CreatePumpRfqDto } from "./dto/create-pump-rfq.dto";
import { CreatePumpRfqWithItemDto } from "./dto/create-pump-rfq-with-item.dto";
import { CreateStraightPipeRfqWithItemDto } from "./dto/create-rfq-item.dto";
import { CreateUnifiedRfqDto, UnifiedStraightPipeDto } from "./dto/create-unified-rfq.dto";
import { PumpCalculationResultDto } from "./dto/pump-calculation-result.dto";
import {
  PaginatedRfqResponseDto,
  RfqPaginationQueryDto,
  RfqResponseDto,
  StraightPipeCalculationResultDto,
} from "./dto/rfq-response.dto";
import { BendRfq } from "./entities/bend-rfq.entity";
import {
  BellowsJointType,
  BellowsMaterial,
  ExpansionJointRfq,
  ExpansionJointType,
  FabricatedLoopType,
} from "./entities/expansion-joint-rfq.entity";
import { FastenerCategory, FastenerRfq } from "./entities/fastener-rfq.entity";
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
import { AssemblyType, LiningType, TankChuteRfq } from "./entities/tank-chute-rfq.entity";
import {
  ValveActuatorType,
  ValveCategory,
  ValveFailPosition,
  ValveRfq,
} from "./entities/valve-rfq.entity";
import { ReferenceDataCacheService } from "./services/reference-data-cache.service";
import { RfqCalculationService } from "./services/rfq-calculation.service";

const MAX_DOCUMENTS_PER_RFQ = 10;
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
    @InjectRepository(TankChuteRfq)
    private tankChuteRfqRepository: Repository<TankChuteRfq>,
    @InjectRepository(FastenerRfq)
    private fastenerRfqRepository: Repository<FastenerRfq>,
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
    private referenceDataCache: ReferenceDataCacheService,
    private rfqCalculationService: RfqCalculationService,
    private dataSource: DataSource,
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
    dto: UnifiedStraightPipeDto,
  ): Promise<StraightPipeCalculationResultDto> {
    return this.rfqCalculationService.calculateStraightPipeRequirements(dto);
  }

  async createStraightPipeRfq(
    dto: CreateStraightPipeRfqWithItemDto,
    userId: number,
  ): Promise<{ rfq: Rfq; calculation: StraightPipeCalculationResultDto }> {
    // Find user (optional - for when authentication is implemented)
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch((err) => {
      this.logger.warn("Failed to find user for RFQ creation", err.message);
      return null;
    });

    // Calculate requirements first (outside transaction as it doesn't modify DB)
    const calculation = await this.calculateStraightPipeRequirements(dto.straightPipe);

    // Generate RFQ number (outside transaction to avoid sequence issues)
    const rfqNumber = await this.nextRfqNumber();

    // Get steel spec from cache if needed
    const steelSpec = dto.straightPipe.steelSpecificationId
      ? this.referenceDataCache.steelSpecificationById(dto.straightPipe.steelSpecificationId)
      : null;

    // Use transaction for all RFQ creation steps
    const savedRfqId = await this.dataSource.transaction(async (manager) => {
      // Create RFQ
      const rfq = manager.create(Rfq, {
        ...dto.rfq,
        rfqNumber,
        status: dto.rfq.status || RfqStatus.DRAFT,
        totalWeightKg: calculation.totalSystemWeight,
        ...(user && { createdBy: user }),
      });

      const savedRfq = await manager.save(rfq);

      // Create RFQ Item
      const rfqItem = manager.create(RfqItem, {
        lineNumber: 1,
        description: dto.itemDescription,
        itemType: RfqItemType.STRAIGHT_PIPE,
        quantity: calculation.calculatedPipeCount,
        weightPerUnitKg: calculation.totalSystemWeight / calculation.calculatedPipeCount,
        totalWeightKg: calculation.totalSystemWeight,
        notes: dto.itemNotes,
        rfq: savedRfq,
      });

      const savedRfqItem = await manager.save(rfqItem);

      // Create Straight Pipe RFQ with calculated values
      const straightPipeRfq = manager.create(StraightPipeRfq, {
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
        ...(steelSpec && { steelSpecification: steelSpec }),
      });

      await manager.save(straightPipeRfq);

      return savedRfq.id;
    });

    // Reload RFQ with relations (outside transaction)
    const finalRfq = await this.rfqRepository.findOne({
      where: { id: savedRfqId },
      relations: ["items", "items.straightPipeDetails"],
    });

    return { rfq: finalRfq!, calculation };
  }

  async createUnifiedRfq(
    dto: CreateUnifiedRfqDto,
    userId: number,
  ): Promise<{ rfq: Rfq; itemsCreated: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch((err) => {
      this.logger.warn("Failed to find user for RFQ creation", err.message);
      return null;
    });

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

    await dto.items.reduce(async (prevPromise, item, index) => {
      await prevPromise;
      const lineNumber = index + 1;

      if (item.itemType === "straight_pipe" && item.straightPipe) {
        const calculation = await this.calculateStraightPipeRequirements(item.straightPipe);

        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.STRAIGHT_PIPE,
          quantity: calculation.calculatedPipeCount,
          weightPerUnitKg: calculation.totalSystemWeight / calculation.calculatedPipeCount,
          totalWeightKg: calculation.totalSystemWeight,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.BEND,
          quantity: item.bend.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.FITTING,
          quantity: item.fitting.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.EXPANSION_JOINT,
          quantity: item.expansionJoint.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.VALVE,
          quantity: item.valve.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.INSTRUMENT,
          quantity: item.instrument.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.PUMP,
          quantity: item.pump.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
      } else if (item.itemType === "tank_chute" && item.tankChute) {
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.TANK_CHUTE,
          quantity: item.tankChute.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const tankChuteRfq = this.tankChuteRfqRepository.create({
          assemblyType: item.tankChute.assemblyType as AssemblyType,
          drawingReference: item.tankChute.drawingReference,
          materialGrade: item.tankChute.materialGrade,
          overallLengthMm: item.tankChute.overallLengthMm,
          overallWidthMm: item.tankChute.overallWidthMm,
          overallHeightMm: item.tankChute.overallHeightMm,
          totalSteelWeightKg: item.tankChute.totalSteelWeightKg,
          weightSource: item.tankChute.weightSource,
          quantityValue: item.tankChute.quantityValue || 1,
          liningRequired: item.tankChute.liningRequired || false,
          liningType: item.tankChute.liningType as LiningType,
          liningThicknessMm: item.tankChute.liningThicknessMm,
          liningAreaM2: item.tankChute.liningAreaM2,
          liningWastagePercent: item.tankChute.liningWastagePercent,
          rubberGrade: item.tankChute.rubberGrade,
          rubberHardnessShore: item.tankChute.rubberHardnessShore,
          coatingRequired: item.tankChute.coatingRequired || false,
          coatingSystem: item.tankChute.coatingSystem,
          coatingAreaM2: item.tankChute.coatingAreaM2,
          coatingWastagePercent: item.tankChute.coatingWastagePercent,
          surfacePrepStandard: item.tankChute.surfacePrepStandard,
          plateBom: item.tankChute.plateBom,
          bomTotalWeightKg: item.tankChute.bomTotalWeightKg,
          bomTotalAreaM2: item.tankChute.bomTotalAreaM2,
          steelPricePerKg: item.tankChute.steelPricePerKg,
          liningPricePerM2: item.tankChute.liningPricePerM2,
          coatingPricePerM2: item.tankChute.coatingPricePerM2,
          fabricationCost: item.tankChute.fabricationCost,
          totalCost: item.tankChute.totalCost,
          calculationData: item.tankChute.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.tankChuteRfqRepository.save(tankChuteRfq);
        this.logger.log(`Created tank/chute item #${lineNumber}: ${item.description}`);
      } else if (item.itemType === "fastener" && item.fastener) {
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.FASTENER,
          quantity: item.fastener.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const fastenerRfq = this.fastenerRfqRepository.create({
          fastenerCategory: item.fastener.fastenerCategory as FastenerCategory,
          specificType: item.fastener.specificType,
          size: item.fastener.size,
          grade: item.fastener.grade || null,
          material: item.fastener.material || null,
          finish: item.fastener.finish || null,
          threadType: item.fastener.threadType || null,
          standard: item.fastener.standard || null,
          lengthMm: item.fastener.lengthMm || null,
          quantityValue: item.fastener.quantityValue || 1,
          rfqItem: savedRfqItem,
        });

        await this.fastenerRfqRepository.save(fastenerRfq);
        this.logger.log(`Created fastener item #${lineNumber}: ${item.description}`);
      }
    }, Promise.resolve());

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
        "items.tankChuteDetails",
        "items.fastenerDetails",
      ],
    });

    return { rfq: finalRfq!, itemsCreated: dto.items.length };
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
      : null;
    existingRfq.notes = dto.rfq.notes;
    existingRfq.totalWeightKg = totalWeight;
    existingRfq.status = RfqStatus.SUBMITTED;

    const savedRfq = await this.rfqRepository.save(existingRfq);
    this.logger.log(`Updated RFQ ${existingRfq.rfqNumber} with ${dto.items.length} new items`);

    await dto.items.reduce(async (prevPromise, item, index) => {
      await prevPromise;
      const lineNumber = index + 1;

      if (item.itemType === "straight_pipe" && item.straightPipe) {
        const calculation = await this.calculateStraightPipeRequirements(item.straightPipe);

        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.STRAIGHT_PIPE,
          quantity: calculation.calculatedPipeCount,
          weightPerUnitKg: calculation.totalSystemWeight / calculation.calculatedPipeCount,
          totalWeightKg: calculation.totalSystemWeight,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.BEND,
          quantity: item.bend.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.FITTING,
          quantity: item.fitting.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.EXPANSION_JOINT,
          quantity: item.expansionJoint.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.VALVE,
          quantity: item.valve.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.INSTRUMENT,
          quantity: item.instrument.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.PUMP,
          quantity: item.pump.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

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
      } else if (item.itemType === "tank_chute" && item.tankChute) {
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.TANK_CHUTE,
          quantity: item.tankChute.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const tankChuteRfq = this.tankChuteRfqRepository.create({
          assemblyType: item.tankChute.assemblyType as AssemblyType,
          drawingReference: item.tankChute.drawingReference,
          materialGrade: item.tankChute.materialGrade,
          overallLengthMm: item.tankChute.overallLengthMm,
          overallWidthMm: item.tankChute.overallWidthMm,
          overallHeightMm: item.tankChute.overallHeightMm,
          totalSteelWeightKg: item.tankChute.totalSteelWeightKg,
          weightSource: item.tankChute.weightSource,
          quantityValue: item.tankChute.quantityValue || 1,
          liningRequired: item.tankChute.liningRequired || false,
          liningType: item.tankChute.liningType as LiningType,
          liningThicknessMm: item.tankChute.liningThicknessMm,
          liningAreaM2: item.tankChute.liningAreaM2,
          liningWastagePercent: item.tankChute.liningWastagePercent,
          rubberGrade: item.tankChute.rubberGrade,
          rubberHardnessShore: item.tankChute.rubberHardnessShore,
          coatingRequired: item.tankChute.coatingRequired || false,
          coatingSystem: item.tankChute.coatingSystem,
          coatingAreaM2: item.tankChute.coatingAreaM2,
          coatingWastagePercent: item.tankChute.coatingWastagePercent,
          surfacePrepStandard: item.tankChute.surfacePrepStandard,
          plateBom: item.tankChute.plateBom,
          bomTotalWeightKg: item.tankChute.bomTotalWeightKg,
          bomTotalAreaM2: item.tankChute.bomTotalAreaM2,
          steelPricePerKg: item.tankChute.steelPricePerKg,
          liningPricePerM2: item.tankChute.liningPricePerM2,
          coatingPricePerM2: item.tankChute.coatingPricePerM2,
          fabricationCost: item.tankChute.fabricationCost,
          totalCost: item.tankChute.totalCost,
          calculationData: item.tankChute.calculationData,
          rfqItem: savedRfqItem,
        });

        await this.tankChuteRfqRepository.save(tankChuteRfq);
      } else if (item.itemType === "fastener" && item.fastener) {
        const savedRfqItem = await this.createRfqItem({
          lineNumber,
          description: item.description,
          itemType: RfqItemType.FASTENER,
          quantity: item.fastener.quantityValue || 1,
          totalWeightKg: item.totalWeightKg,
          notes: item.notes,
          rfq: savedRfq,
        });

        const fastenerRfq = this.fastenerRfqRepository.create({
          fastenerCategory: item.fastener.fastenerCategory as FastenerCategory,
          specificType: item.fastener.specificType,
          size: item.fastener.size,
          grade: item.fastener.grade || null,
          material: item.fastener.material || null,
          finish: item.fastener.finish || null,
          threadType: item.fastener.threadType || null,
          standard: item.fastener.standard || null,
          lengthMm: item.fastener.lengthMm || null,
          quantityValue: item.fastener.quantityValue || 1,
          rfqItem: savedRfqItem,
        });

        await this.fastenerRfqRepository.save(fastenerRfq);
      }
    }, Promise.resolve());

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
        "items.tankChuteDetails",
        "items.fastenerDetails",
      ],
    });

    return { rfq: finalRfq!, itemsUpdated: dto.items.length };
  }

  private async createRfqItem(params: {
    lineNumber: number;
    description: string;
    itemType: RfqItemType;
    quantity: number;
    weightPerUnitKg?: number;
    totalWeightKg?: number;
    notes?: string;
    rfq: Rfq;
  }): Promise<RfqItem> {
    const rfqItem = this.rfqItemRepository.create(params);
    return this.rfqItemRepository.save(rfqItem);
  }

  async findAllRfqsPaginated(
    query: RfqPaginationQueryDto,
    userId?: number,
  ): Promise<PaginatedRfqResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const whereConditions: Record<string, unknown> = {};

    if (query.status) {
      whereConditions.status = query.status;
    }

    if (query.search) {
      const searchConditions = [
        { ...whereConditions, projectName: ILike(`%${query.search}%`) },
        { ...whereConditions, rfqNumber: ILike(`%${query.search}%`) },
      ];

      const [rfqs, total] = await this.rfqRepository.findAndCount({
        where: searchConditions,
        relations: ["items"],
        order: { createdAt: "DESC" },
        skip,
        take: limit,
      });

      return this.buildPaginatedResponse(rfqs, total, page, limit);
    }

    const [rfqs, total] = await this.rfqRepository.findAndCount({
      where: whereConditions,
      relations: ["items"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return this.buildPaginatedResponse(rfqs, total, page, limit);
  }

  private buildPaginatedResponse(
    rfqs: Rfq[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedRfqResponseDto {
    const totalPages = Math.ceil(total / limit);

    return {
      items: rfqs.map((rfq) => ({
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
      })),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async findAllRfqs(userId?: number): Promise<RfqResponseDto[]> {
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
        "items.tankChuteDetails",
        "items.fastenerDetails",
        "drawings",
        "boqs",
      ],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    return rfq;
  }

  async verifyRfqOwnership(rfqId: number, userId: number): Promise<void> {
    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["createdBy"],
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
    }

    if (rfq.createdBy?.id !== userId) {
      throw new ForbiddenException("You do not have access to this RFQ");
    }
  }

  async verifyDocumentOwnership(documentId: number, userId: number): Promise<void> {
    const document = await this.rfqDocumentRepository.findOne({
      where: { id: documentId },
      relations: ["rfq", "rfq.createdBy"],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    if (document.rfq?.createdBy?.id !== userId) {
      throw new ForbiddenException("You do not have access to this document");
    }
  }

  async calculateBendRequirements(dto: CreateBendRfqDto): Promise<BendCalculationResultDto> {
    return this.rfqCalculationService.calculateBendRequirements(dto);
  }

  async createBendRfq(
    dto: CreateBendRfqWithItemDto,
    userId: number,
  ): Promise<{ rfq: Rfq; calculation: BendCalculationResultDto }> {
    // Find user (optional - for when authentication is implemented)
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch((err) => {
      this.logger.warn("Failed to find user for RFQ creation", err.message);
      return null;
    });

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

  // ==================== Pump RFQ Methods ====================

  async calculatePumpRequirements(dto: CreatePumpRfqDto): Promise<PumpCalculationResultDto> {
    return this.rfqCalculationService.calculatePumpRequirements(dto);
  }

  async createPumpRfq(
    dto: CreatePumpRfqWithItemDto,
    userId: number,
  ): Promise<{ rfq: Rfq; calculation: PumpCalculationResultDto }> {
    const user = await this.userRepository.findOne({ where: { id: userId } }).catch((err) => {
      this.logger.warn("Failed to find user for RFQ creation", err.message);
      return null;
    });

    const calculation = await this.calculatePumpRequirements(dto.pump);

    const rfqNumber = await this.nextRfqNumber();

    const rfq = this.rfqRepository.create({
      ...dto.rfq,
      rfqNumber,
      status: dto.rfq.status || RfqStatus.DRAFT,
      ...(user && { createdBy: user }),
    });

    const savedRfq: Rfq = await this.rfqRepository.save(rfq);

    const rfqItem = this.rfqItemRepository.create({
      lineNumber: 1,
      description: dto.itemDescription,
      itemType: RfqItemType.PUMP,
      quantity: dto.pump.quantityValue || 1,
      notes: dto.itemNotes,
      rfq: savedRfq,
    });

    const savedRfqItem: RfqItem = await this.rfqItemRepository.save(rfqItem);

    const pumpRfq = this.pumpRfqRepository.create({
      serviceType: dto.pump.serviceType || PumpServiceType.NEW_PUMP,
      pumpType: dto.pump.pumpType,
      pumpCategory: dto.pump.pumpCategory,
      flowRate: dto.pump.flowRate,
      totalHead: dto.pump.totalHead,
      suctionHead: dto.pump.suctionHead,
      npshAvailable: dto.pump.npshAvailable,
      dischargePressure: dto.pump.dischargePressure,
      operatingTemp: dto.pump.operatingTemp,
      fluidType: dto.pump.fluidType,
      specificGravity: dto.pump.specificGravity,
      viscosity: dto.pump.viscosity,
      solidsContent: dto.pump.solidsContent,
      solidsSize: dto.pump.solidsSize,
      ph: dto.pump.ph,
      isAbrasive: dto.pump.isAbrasive || false,
      isCorrosive: dto.pump.isCorrosive || false,
      casingMaterial: dto.pump.casingMaterial,
      impellerMaterial: dto.pump.impellerMaterial,
      shaftMaterial: dto.pump.shaftMaterial,
      sealType: dto.pump.sealType,
      sealPlan: dto.pump.sealPlan,
      suctionSize: dto.pump.suctionSize,
      dischargeSize: dto.pump.dischargeSize,
      connectionType: dto.pump.connectionType,
      motorType: dto.pump.motorType || PumpMotorType.ELECTRIC_AC,
      motorPower: dto.pump.motorPower || calculation.estimatedMotorPowerKw,
      voltage: dto.pump.voltage,
      frequency: dto.pump.frequency,
      motorEfficiency: dto.pump.motorEfficiency,
      enclosure: dto.pump.enclosure,
      hazardousArea: dto.pump.hazardousArea || "none",
      certifications: dto.pump.certifications || [],
      sparePartCategory: dto.pump.sparePartCategory,
      spareParts: dto.pump.spareParts,
      existingPumpModel: dto.pump.existingPumpModel,
      existingPumpSerial: dto.pump.existingPumpSerial,
      rentalDurationDays: dto.pump.rentalDurationDays,
      quantityValue: dto.pump.quantityValue || 1,
      supplierReference: dto.pump.supplierReference,
      unitCostFromSupplier: dto.pump.unitCostFromSupplier,
      markupPercentage: dto.pump.markupPercentage || 15,
      calculationData: {
        ...calculation,
        calculatedAt: now().toISO(),
      },
      rfqItem: savedRfqItem,
    });

    await this.pumpRfqRepository.save(pumpRfq);

    const finalRfq = await this.rfqRepository.findOne({
      where: { id: savedRfq.id },
      relations: ["items", "items.pumpDetails"],
    });

    return { rfq: finalRfq!, calculation };
  }

  // ==================== Document Management (delegated to RfqDocumentService) ====================

  // ============================================
  // RFQ Draft Management Methods
  // ============================================

  /**
   * Generate a unique draft number
   */
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

    const counts = await allSupplierAccessRecords.reduce(
      async (accPromise, access) => {
        const acc = await accPromise;
        try {
          const supplierProfile = supplierProfileMap.get(access.supplierProfileId);

          if (!supplierProfile?.user?.email) {
            this.logger.warn(
              `Supplier profile ${access.supplierProfileId} has no email - skipping`,
            );
            return { ...acc, skipped: acc.skipped + 1 };
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
            this.logger.log(`Notified supplier ${supplierProfile.user.email} of RFQ update`);
            return { ...acc, notified: acc.notified + 1 };
          }

          return { ...acc, skipped: acc.skipped + 1 };
        } catch (error) {
          this.logger.error(`Failed to notify supplier ${access.supplierProfileId}:`, error);
          return { ...acc, skipped: acc.skipped + 1 };
        }
      },
      Promise.resolve({ notified: 0, skipped: 0 }),
    );

    this.logger.log(
      `RFQ update notification complete: ${counts.notified} notified, ${counts.skipped} skipped`,
    );

    return { suppliersNotified: counts.notified, suppliersSkipped: counts.skipped };
  }
}
