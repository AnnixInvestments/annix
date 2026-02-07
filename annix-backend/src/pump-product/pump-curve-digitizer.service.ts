import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PumpCurveData } from "./pump-datasheet.service";

export interface DigitizedPoint {
  x: number;
  y: number;
}

export interface CurveDigitizationInput {
  imageWidth: number;
  imageHeight: number;
  axisCalibration: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    xPixelMin: number;
    xPixelMax: number;
    yPixelMin: number;
    yPixelMax: number;
  };
  headCurvePoints: DigitizedPoint[];
  efficiencyCurvePoints?: DigitizedPoint[];
  npshCurvePoints?: DigitizedPoint[];
  powerCurvePoints?: DigitizedPoint[];
  speed?: number;
  impellerDiameter?: number;
}

export interface CurveAnalysis {
  bepFlow: number;
  bepHead: number;
  bepEfficiency?: number;
  shutoffHead: number;
  maxFlow: number;
  operatingRange: {
    minFlow: number;
    maxFlow: number;
    minHead: number;
    maxHead: number;
  };
  specificSpeed: number;
  suctionSpecificSpeed?: number;
  curveType: "flat" | "steep" | "normal";
}

export interface ManualCurveEntry {
  flowPoints: number[];
  headPoints: number[];
  efficiencyPoints?: number[];
  npshPoints?: number[];
  powerPoints?: number[];
  speed?: number;
  impellerDiameter?: number;
}

@Injectable()
export class PumpCurveDigitizerService {
  private readonly logger = new Logger(PumpCurveDigitizerService.name);

  digitizeCurve(input: CurveDigitizationInput): PumpCurveData {
    const { axisCalibration, headCurvePoints, speed, impellerDiameter } = input;

    if (headCurvePoints.length < 3) {
      throw new BadRequestException("At least 3 points are required for the head curve");
    }

    const flowPoints = headCurvePoints.map((p) =>
      this.pixelToValue(
        p.x,
        axisCalibration.xPixelMin,
        axisCalibration.xPixelMax,
        axisCalibration.xMin,
        axisCalibration.xMax,
      ),
    );

    const headPoints = headCurvePoints.map((p) =>
      this.pixelToValue(
        p.y,
        axisCalibration.yPixelMax,
        axisCalibration.yPixelMin,
        axisCalibration.yMin,
        axisCalibration.yMax,
      ),
    );

    const sortedIndices = flowPoints.map((_, i) => i).sort((a, b) => flowPoints[a] - flowPoints[b]);

    const sortedFlow = sortedIndices.map((i) => flowPoints[i]);
    const sortedHead = sortedIndices.map((i) => headPoints[i]);

    let efficiencyPoints: number[] | undefined;
    if (input.efficiencyCurvePoints && input.efficiencyCurvePoints.length >= 3) {
      const effFlow = input.efficiencyCurvePoints.map((p) =>
        this.pixelToValue(
          p.x,
          axisCalibration.xPixelMin,
          axisCalibration.xPixelMax,
          axisCalibration.xMin,
          axisCalibration.xMax,
        ),
      );
      const effValues = input.efficiencyCurvePoints.map((p) =>
        this.pixelToValue(p.y, axisCalibration.yPixelMax, axisCalibration.yPixelMin, 0, 100),
      );

      efficiencyPoints = sortedFlow.map((flow) => this.interpolate(flow, effFlow, effValues));
    }

    let npshPoints: number[] | undefined;
    if (input.npshCurvePoints && input.npshCurvePoints.length >= 3) {
      const npshFlow = input.npshCurvePoints.map((p) =>
        this.pixelToValue(
          p.x,
          axisCalibration.xPixelMin,
          axisCalibration.xPixelMax,
          axisCalibration.xMin,
          axisCalibration.xMax,
        ),
      );
      const npshValues = input.npshCurvePoints.map((p) =>
        this.pixelToValue(p.y, axisCalibration.yPixelMax, axisCalibration.yPixelMin, 0, 20),
      );

      npshPoints = sortedFlow.map((flow) => this.interpolate(flow, npshFlow, npshValues));
    }

    let powerPoints: number[] | undefined;
    if (input.powerCurvePoints && input.powerCurvePoints.length >= 3) {
      const powerFlow = input.powerCurvePoints.map((p) =>
        this.pixelToValue(
          p.x,
          axisCalibration.xPixelMin,
          axisCalibration.xPixelMax,
          axisCalibration.xMin,
          axisCalibration.xMax,
        ),
      );
      const powerValues = input.powerCurvePoints.map((p) =>
        this.pixelToValue(
          p.y,
          axisCalibration.yPixelMax,
          axisCalibration.yPixelMin,
          0,
          axisCalibration.yMax * 0.1,
        ),
      );

      powerPoints = sortedFlow.map((flow) => this.interpolate(flow, powerFlow, powerValues));
    }

    const analysis = this.analyzeCurve(sortedFlow, sortedHead, efficiencyPoints, speed);

    const curveData: PumpCurveData = {
      flowPoints: sortedFlow.map((f) => Math.round(f * 100) / 100),
      headPoints: sortedHead.map((h) => Math.round(h * 100) / 100),
      efficiencyPoints: efficiencyPoints?.map((e) => Math.round(e * 10) / 10),
      npshPoints: npshPoints?.map((n) => Math.round(n * 100) / 100),
      powerPoints: powerPoints?.map((p) => Math.round(p * 100) / 100),
      bepFlow: analysis.bepFlow,
      bepHead: analysis.bepHead,
      bepEfficiency: analysis.bepEfficiency,
      shutoffHead: analysis.shutoffHead,
      maxFlow: analysis.maxFlow,
      speed,
      impellerDiameter,
    };

    this.logger.log(
      `Digitized pump curve: ${sortedFlow.length} points, BEP at ${analysis.bepFlow} m³/h`,
    );

    return curveData;
  }

  createFromManualEntry(entry: ManualCurveEntry): PumpCurveData {
    if (entry.flowPoints.length !== entry.headPoints.length) {
      throw new BadRequestException("Flow and head arrays must have the same length");
    }

    if (entry.flowPoints.length < 3) {
      throw new BadRequestException("At least 3 points are required");
    }

    const sortedIndices = entry.flowPoints
      .map((_, i) => i)
      .sort((a, b) => entry.flowPoints[a] - entry.flowPoints[b]);

    const flowPoints = sortedIndices.map((i) => entry.flowPoints[i]);
    const headPoints = sortedIndices.map((i) => entry.headPoints[i]);
    const efficiencyPoints = entry.efficiencyPoints
      ? sortedIndices.map((i) => entry.efficiencyPoints![i])
      : undefined;
    const npshPoints = entry.npshPoints
      ? sortedIndices.map((i) => entry.npshPoints![i])
      : undefined;
    const powerPoints = entry.powerPoints
      ? sortedIndices.map((i) => entry.powerPoints![i])
      : undefined;

    const analysis = this.analyzeCurve(flowPoints, headPoints, efficiencyPoints, entry.speed);

    return {
      flowPoints,
      headPoints,
      efficiencyPoints,
      npshPoints,
      powerPoints,
      bepFlow: analysis.bepFlow,
      bepHead: analysis.bepHead,
      bepEfficiency: analysis.bepEfficiency,
      shutoffHead: analysis.shutoffHead,
      maxFlow: analysis.maxFlow,
      speed: entry.speed,
      impellerDiameter: entry.impellerDiameter,
    };
  }

  analyzeCurve(
    flowPoints: number[],
    headPoints: number[],
    efficiencyPoints?: number[],
    speed?: number,
  ): CurveAnalysis {
    const shutoffHead = headPoints[0];
    const maxFlow = flowPoints[flowPoints.length - 1];

    let bepFlow: number;
    let bepHead: number;
    let bepEfficiency: number | undefined;

    if (efficiencyPoints && efficiencyPoints.length === flowPoints.length) {
      const maxEffIdx = efficiencyPoints.reduce(
        (maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx),
        0,
      );
      bepFlow = flowPoints[maxEffIdx];
      bepHead = headPoints[maxEffIdx];
      bepEfficiency = efficiencyPoints[maxEffIdx];
    } else {
      const bepIdx = Math.floor(flowPoints.length * 0.6);
      bepFlow = flowPoints[bepIdx];
      bepHead = headPoints[bepIdx];
    }

    const headDrop = ((shutoffHead - headPoints[headPoints.length - 1]) / shutoffHead) * 100;
    const curveType: "flat" | "steep" | "normal" =
      headDrop < 15 ? "flat" : headDrop > 35 ? "steep" : "normal";

    const n = speed || 1450;
    const Q = bepFlow / 3.6;
    const H = bepHead;
    const specificSpeed = (n * Math.sqrt(Q)) / H ** 0.75;

    const minFlowRecommended = bepFlow * 0.7;
    const maxFlowRecommended = bepFlow * 1.2;

    return {
      bepFlow: Math.round(bepFlow * 100) / 100,
      bepHead: Math.round(bepHead * 100) / 100,
      bepEfficiency: bepEfficiency ? Math.round(bepEfficiency * 10) / 10 : undefined,
      shutoffHead: Math.round(shutoffHead * 100) / 100,
      maxFlow: Math.round(maxFlow * 100) / 100,
      operatingRange: {
        minFlow: Math.round(minFlowRecommended * 100) / 100,
        maxFlow: Math.round(maxFlowRecommended * 100) / 100,
        minHead:
          Math.round(this.interpolate(maxFlowRecommended, flowPoints, headPoints) * 100) / 100,
        maxHead:
          Math.round(this.interpolate(minFlowRecommended, flowPoints, headPoints) * 100) / 100,
      },
      specificSpeed: Math.round(specificSpeed),
      curveType,
    };
  }

  interpolateHead(flow: number, curveData: PumpCurveData): number {
    return this.interpolate(flow, curveData.flowPoints, curveData.headPoints);
  }

  interpolateEfficiency(flow: number, curveData: PumpCurveData): number | null {
    if (!curveData.efficiencyPoints) return null;
    return this.interpolate(flow, curveData.flowPoints, curveData.efficiencyPoints);
  }

  interpolateNpsh(flow: number, curveData: PumpCurveData): number | null {
    if (!curveData.npshPoints) return null;
    return this.interpolate(flow, curveData.flowPoints, curveData.npshPoints);
  }

  interpolatePower(flow: number, curveData: PumpCurveData): number | null {
    if (!curveData.powerPoints) return null;
    return this.interpolate(flow, curveData.flowPoints, curveData.powerPoints);
  }

  generateSystemCurveIntersection(
    curveData: PumpCurveData,
    staticHead: number,
    systemK: number,
  ): { flow: number; head: number } | null {
    for (let i = 0; i < curveData.flowPoints.length - 1; i++) {
      const flow1 = curveData.flowPoints[i];
      const flow2 = curveData.flowPoints[i + 1];
      const head1 = curveData.headPoints[i];
      const head2 = curveData.headPoints[i + 1];

      const sysHead1 = staticHead + systemK * flow1 ** 2;
      const sysHead2 = staticHead + systemK * flow2 ** 2;

      const diff1 = head1 - sysHead1;
      const diff2 = head2 - sysHead2;

      if (diff1 * diff2 <= 0) {
        const t = diff1 / (diff1 - diff2);
        const intersectFlow = flow1 + t * (flow2 - flow1);
        const intersectHead = staticHead + systemK * intersectFlow ** 2;

        return {
          flow: Math.round(intersectFlow * 100) / 100,
          head: Math.round(intersectHead * 100) / 100,
        };
      }
    }

    return null;
  }

  private pixelToValue(
    pixel: number,
    pixelMin: number,
    pixelMax: number,
    valueMin: number,
    valueMax: number,
  ): number {
    const ratio = (pixel - pixelMin) / (pixelMax - pixelMin);
    return valueMin + ratio * (valueMax - valueMin);
  }

  private interpolate(x: number, xPoints: number[], yPoints: number[]): number {
    if (x <= xPoints[0]) return yPoints[0];
    if (x >= xPoints[xPoints.length - 1]) return yPoints[yPoints.length - 1];

    for (let i = 0; i < xPoints.length - 1; i++) {
      if (x >= xPoints[i] && x <= xPoints[i + 1]) {
        const t = (x - xPoints[i]) / (xPoints[i + 1] - xPoints[i]);
        return yPoints[i] + t * (yPoints[i + 1] - yPoints[i]);
      }
    }

    return yPoints[yPoints.length - 1];
  }
}
