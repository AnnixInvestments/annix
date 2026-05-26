import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CalculatePvcFittingCostDto } from "./dto/calculate-fitting-cost.dto";
import { CalculatePvcPipeCostDto } from "./dto/calculate-pipe-cost.dto";
import { CalculatePvcTotalTransportDto } from "./dto/calculate-total-transport.dto";
import { PvcFittingCostResponseDto } from "./dto/fitting-cost-response.dto";
import { PvcPipeCostResponseDto } from "./dto/pipe-cost-response.dto";
import {
  PvcTransportItemWeightDto,
  PvcTransportWeightResponseDto,
} from "./dto/transport-weight-response.dto";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";
import { PvcStandard } from "./entities/pvc-standard.entity";
import { PvcCementPriceRepository } from "./pvc-cement-price.repository";
import { PvcFittingTypeRepository } from "./pvc-fitting-type.repository";
import { PvcFittingWeightRepository } from "./pvc-fitting-weight.repository";
import { PvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository";
import { PvcStandardRepository } from "./pvc-standard.repository";

const PVC_DENSITIES: { [key: string]: number } = {
  "PVC-U": 1400,
  CPVC: 1520,
  "PVC-O": 1420,
  "PVC-M": 1400,
};

const PVC_U_WALL_THICKNESS: { [dn: number]: { [pn: number]: number } } = {
  12: { 6: 1.5, 8: 0, 10: 0, 12.5: 0, 16: 0, 20: 0, 25: 0 },
  16: { 6: 1.5, 8: 0, 10: 0, 12.5: 0, 16: 0, 20: 0, 25: 0 },
  20: { 6: 1.5, 8: 0, 10: 0, 12.5: 0, 16: 1.9, 20: 0, 25: 0 },
  25: { 6: 1.5, 8: 0, 10: 0, 12.5: 0, 16: 2.3, 20: 0, 25: 0 },
  32: { 6: 1.5, 8: 0, 10: 0, 12.5: 1.6, 16: 2.9, 20: 0, 25: 0 },
  40: { 6: 1.5, 8: 0, 10: 1.9, 12.5: 2.4, 16: 3.7, 20: 0, 25: 0 },
  50: { 6: 1.6, 8: 0, 10: 2.4, 12.5: 3.0, 16: 4.6, 20: 0, 25: 0 },
  63: { 6: 2.0, 8: 0, 10: 3.0, 12.5: 3.8, 16: 5.8, 20: 0, 25: 0 },
  75: { 6: 2.3, 8: 0, 10: 3.6, 12.5: 4.5, 16: 6.8, 20: 0, 25: 0 },
  90: { 6: 2.8, 8: 0, 10: 4.3, 12.5: 5.4, 16: 8.2, 20: 0, 25: 0 },
  110: { 6: 2.7, 8: 3.4, 10: 4.2, 12.5: 5.3, 16: 6.6, 20: 8.1, 25: 10.0 },
  125: { 6: 3.1, 8: 3.9, 10: 4.8, 12.5: 6.0, 16: 7.4, 20: 9.2, 25: 11.4 },
  140: { 6: 3.5, 8: 4.3, 10: 5.4, 12.5: 6.7, 16: 8.3, 20: 10.3, 25: 12.7 },
  160: { 6: 4.0, 8: 4.9, 10: 6.2, 12.5: 7.7, 16: 9.5, 20: 11.8, 25: 14.6 },
  180: { 6: 4.4, 8: 5.5, 10: 6.9, 12.5: 8.6, 16: 10.7, 20: 13.3, 25: 16.4 },
  200: { 6: 4.9, 8: 6.2, 10: 7.7, 12.5: 9.6, 16: 11.9, 20: 14.7, 25: 18.2 },
  225: { 6: 5.5, 8: 6.9, 10: 8.6, 12.5: 10.8, 16: 13.4, 20: 16.6, 25: 0 },
  250: { 6: 6.2, 8: 7.7, 10: 9.6, 12.5: 11.9, 16: 14.8, 20: 18.4, 25: 0 },
  280: { 6: 6.9, 8: 8.6, 10: 10.7, 12.5: 13.4, 16: 16.6, 20: 20.6, 25: 0 },
  315: { 6: 7.7, 8: 9.7, 10: 12.1, 12.5: 15.0, 16: 18.7, 20: 23.2, 25: 0 },
  355: { 6: 8.7, 8: 10.9, 10: 13.6, 12.5: 16.9, 16: 21.1, 20: 26.1, 25: 0 },
  400: { 6: 9.8, 8: 12.3, 10: 15.3, 12.5: 19.1, 16: 23.7, 20: 29.4, 25: 0 },
  450: { 6: 11.0, 8: 13.8, 10: 17.2, 12.5: 21.5, 16: 26.7, 20: 33.1, 25: 0 },
  500: { 6: 12.3, 8: 15.3, 10: 19.1, 12.5: 23.9, 16: 29.7, 20: 36.8, 25: 0 },
  560: { 6: 13.7, 8: 17.2, 10: 21.4, 12.5: 26.7, 16: 0, 20: 0, 25: 0 },
  630: { 6: 15.4, 8: 19.3, 10: 24.1, 12.5: 30.0, 16: 0, 20: 0, 25: 0 },
  710: { 6: 17.4, 8: 21.8, 10: 27.2, 12.5: 0, 16: 0, 20: 0, 25: 0 },
  800: { 6: 19.6, 8: 24.5, 10: 30.6, 12.5: 0, 16: 0, 20: 0, 25: 0 },
  900: { 6: 22.0, 8: 27.6, 10: 0, 12.5: 0, 16: 0, 20: 0, 25: 0 },
  1000: { 6: 24.5, 8: 30.6, 10: 0, 12.5: 0, 16: 0, 20: 0, 25: 0 },
};

const PVC_U_SIZES = Object.keys(PVC_U_WALL_THICKNESS).map(Number);
const PN_LIST = [6, 8, 10, 12.5, 16, 20, 25];

@Injectable()
export class PvcService {
  constructor(
    private readonly pipeSpecRepo: PvcPipeSpecificationRepository,
    private readonly fittingTypeRepo: PvcFittingTypeRepository,
    private readonly fittingWeightRepo: PvcFittingWeightRepository,
    private readonly cementPriceRepo: PvcCementPriceRepository,
    private readonly standardRepo: PvcStandardRepository,
  ) {}

  private calculateWeightKgPerM(dn: number, pn: number, pvcType: string = "PVC-U"): number {
    const wall = this.getWallThickness(dn, pn, pvcType);
    if (wall === 0) return 0;

    const od = dn;
    const id = od - 2 * wall;
    const density = PVC_DENSITIES[pvcType] || PVC_DENSITIES["PVC-U"];

    const area = (Math.PI / 4) * (od ** 2 - id ** 2) * 1e-6;
    return Math.round(area * density * 100) / 100;
  }

  private getWallThickness(dn: number, pn: number, pvcType: string = "PVC-U"): number {
    if (pvcType === "PVC-U" && PVC_U_WALL_THICKNESS[dn]) {
      return PVC_U_WALL_THICKNESS[dn][pn] || 0;
    }
    return 0;
  }

  async getAllStandards(): Promise<PvcStandard[]> {
    return this.standardRepo.findActive();
  }

  async getStandardByCode(code: string): Promise<PvcStandard> {
    const standard = await this.standardRepo.findByCode(code);
    if (!standard) {
      throw new NotFoundException(`Standard with code ${code} not found`);
    }
    return standard;
  }

  async getAllPipeSpecifications(): Promise<PvcPipeSpecification[]> {
    return this.pipeSpecRepo.findActive();
  }

  async getPipeSpecificationsByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]> {
    return this.pipeSpecRepo.findByDN(nominalDiameter);
  }

  async getPipeSpecification(
    nominalDiameter: number,
    pressureRating: number,
    pvcType: string = "PVC-U",
  ): Promise<
    | PvcPipeSpecification
    | {
        nominalDiameter: number;
        outerDiameter: number;
        pressureRating: number;
        wallThickness: number;
        innerDiameter: number;
        weightKgPerM: number;
        pvcType: string;
        standard: string;
      }
  > {
    const spec = await this.pipeSpecRepo.findByDNAndPN(nominalDiameter, pressureRating, pvcType);

    if (spec) return spec;

    const wallThickness = this.getWallThickness(nominalDiameter, pressureRating, pvcType);
    if (wallThickness === 0) {
      throw new NotFoundException(
        `Pipe specification for DN ${nominalDiameter} and PN ${pressureRating} (${pvcType}) is not available`,
      );
    }

    const innerDiameter = nominalDiameter - 2 * wallThickness;
    const weightKgPerM = this.calculateWeightKgPerM(nominalDiameter, pressureRating, pvcType);

    return {
      nominalDiameter,
      outerDiameter: nominalDiameter,
      pressureRating,
      wallThickness,
      innerDiameter,
      weightKgPerM,
      pvcType,
      standard: "EN_1452",
    };
  }

  async getAllFittingTypes(): Promise<PvcFittingType[]> {
    return this.fittingTypeRepo.findActive();
  }

  async getFittingTypeByCode(code: string): Promise<PvcFittingType> {
    const fittingType = await this.fittingTypeRepo.findByCode(code);
    if (!fittingType) {
      throw new NotFoundException(`Fitting type with code ${code} not found`);
    }
    return fittingType;
  }

  async getFittingWeights(fittingTypeId: number): Promise<PvcFittingWeight[]> {
    return this.fittingWeightRepo.findByFittingTypeId(fittingTypeId);
  }

  async getFittingWeight(
    fittingTypeCode: string,
    nominalDiameter: number,
    pressureRating?: number,
  ): Promise<PvcFittingWeight> {
    const fittingType = await this.getFittingTypeByCode(fittingTypeCode);

    const weight = await this.fittingWeightRepo.findByFittingTypeIdAndDN(
      fittingType.id,
      nominalDiameter,
      pressureRating,
    );

    if (!weight) {
      throw new NotFoundException(
        `Weight data for ${fittingTypeCode} at DN ${nominalDiameter} not found`,
      );
    }
    return weight;
  }

  async getCementJointPrice(nominalDiameter: number): Promise<number> {
    const price = await this.cementPriceRepo.findActiveByDN(nominalDiameter);
    if (!price) {
      return 2 + nominalDiameter / 50;
    }
    return Number(price.pricePerJoint);
  }

  async calculatePipeCost(dto: CalculatePvcPipeCostDto): Promise<PvcPipeCostResponseDto> {
    const pvcType = dto.pvcType || "PVC-U";
    const spec = await this.getPipeSpecification(dto.nominalDiameter, dto.pressureRating, pvcType);
    const cementJointPrice =
      dto.cementJointPrice ?? (await this.getCementJointPrice(dto.nominalDiameter));

    const weightKgPerM = Number(spec.weightKgPerM);
    const totalWeight = weightKgPerM * dto.length;
    const numJoints = 0;
    const materialCost = totalWeight * dto.pricePerKg;
    const cementJointCost = numJoints * cementJointPrice;
    const totalCost = materialCost + cementJointCost;

    return {
      nominalDiameter: spec.nominalDiameter,
      pressureRating: dto.pressureRating,
      pvcType,
      length: dto.length,
      outerDiameter: Number(spec.outerDiameter),
      wallThickness: Number(spec.wallThickness),
      innerDiameter: Number(spec.innerDiameter),
      weightKgPerM,
      totalWeight,
      numJoints,
      materialCost,
      cementJointCost,
      totalCost,
      pricePerKg: dto.pricePerKg,
      cementJointPrice,
    };
  }

  async calculateFittingCost(dto: CalculatePvcFittingCostDto): Promise<PvcFittingCostResponseDto> {
    const fittingType = await this.getFittingTypeByCode(dto.fittingTypeCode);
    const weightData = await this.getFittingWeight(
      dto.fittingTypeCode,
      dto.nominalDiameter,
      dto.pressureRating,
    );
    const cementJointPrice =
      dto.cementJointPrice ?? (await this.getCementJointPrice(dto.nominalDiameter));

    const weightKg = Number(weightData.weightKg);
    const numJoints = fittingType.numJoints;
    const materialCost = weightKg * dto.pricePerKg;
    const cementJointCost = numJoints * cementJointPrice;
    const totalCost = materialCost + cementJointCost;

    return {
      fittingType: fittingType.name,
      fittingTypeCode: fittingType.code,
      nominalDiameter: dto.nominalDiameter,
      weightKg,
      numJoints,
      isSocket: fittingType.isSocket,
      isFlanged: fittingType.isFlanged,
      isThreaded: fittingType.isThreaded,
      materialCost,
      cementJointCost,
      totalCost,
      pricePerKg: dto.pricePerKg,
      cementJointPrice,
    };
  }

  async calculateTotalTransportWeight(
    dto: CalculatePvcTotalTransportDto,
  ): Promise<PvcTransportWeightResponseDto> {
    const items: PvcTransportItemWeightDto[] = [];
    let totalWeight = 0;

    for (const item of dto.items) {
      let weightKg = 0;
      const quantity = item.quantity || 1;

      if (item.type === "straight_pipe") {
        if (!item.pressureRating || !item.length) {
          throw new BadRequestException(
            "pressureRating and length are required for straight_pipe items",
          );
        }
        const spec = await this.getPipeSpecification(item.nominalDiameter, item.pressureRating);
        weightKg = Number(spec.weightKgPerM) * item.length * quantity;
      } else {
        const weightData = await this.getFittingWeight(
          item.type,
          item.nominalDiameter,
          item.pressureRating,
        );
        weightKg = Number(weightData.weightKg) * quantity;
      }

      items.push({
        type: item.type,
        nominalDiameter: item.nominalDiameter,
        pressureRating: item.pressureRating,
        length: item.length,
        quantity,
        weightKg,
      });

      totalWeight += weightKg;
    }

    return {
      items,
      totalWeight,
      itemCount: items.length,
    };
  }

  async getAvailableNominalDiameters(): Promise<number[]> {
    const dbDNs = await this.pipeSpecRepo.findDistinctActiveDNs();
    const allDNs = [...new Set([...PVC_U_SIZES, ...dbDNs])].sort((a, b) => a - b);
    return allDNs;
  }

  async getAvailablePressureRatings(nominalDiameter: number): Promise<number[]> {
    const pns: number[] = [];

    if (PVC_U_WALL_THICKNESS[nominalDiameter]) {
      for (const pn of PN_LIST) {
        if (PVC_U_WALL_THICKNESS[nominalDiameter][pn] > 0) {
          pns.push(pn);
        }
      }
    }

    const dbPipes = await this.pipeSpecRepo.findActiveByDN(nominalDiameter);
    const dbPNs = dbPipes.map((p) => Number(p.pressureRating));
    return [...new Set([...pns, ...dbPNs])].sort((a, b) => a - b);
  }

  getEN1452Specification(dn: number, pn: number) {
    const wallThickness = this.getWallThickness(dn, pn, "PVC-U");
    if (wallThickness === 0) {
      return null;
    }

    const innerDiameter = dn - 2 * wallThickness;
    const weightKgPerM = this.calculateWeightKgPerM(dn, pn, "PVC-U");

    return {
      nominalDiameter: dn,
      outerDiameter: dn,
      pressureRating: pn,
      wallThickness,
      innerDiameter,
      weightKgPerM,
      pvcType: "PVC-U",
      standard: "EN_1452",
    };
  }

  getAllEN1452Specifications() {
    const specs: ReturnType<typeof this.getEN1452Specification>[] = [];

    for (const dn of PVC_U_SIZES) {
      for (const pn of PN_LIST) {
        const spec = this.getEN1452Specification(dn, pn);
        if (spec) {
          specs.push(spec);
        }
      }
    }

    return specs;
  }
}
