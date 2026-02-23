import { useQuery } from "@tanstack/react-query";
import {
  type MaterialLimit,
  type MaterialSuitabilityResult,
  materialValidationApi,
} from "@/app/lib/api/client";
import { materialValidationKeys } from "../../keys";

export type { MaterialLimit, MaterialSuitabilityResult };

export function useAllMaterialLimits() {
  return useQuery<MaterialLimit[]>({
    queryKey: materialValidationKeys.allLimits(),
    queryFn: () => materialValidationApi.getAllMaterialLimits(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useMaterialSuitability(specName: string, temperature?: number, pressure?: number) {
  return useQuery<MaterialSuitabilityResult>({
    queryKey: materialValidationKeys.suitability(specName, temperature, pressure),
    queryFn: () => materialValidationApi.checkMaterialSuitability(specName, temperature, pressure),
    enabled: !!specName,
  });
}

export function useSuitableMaterials(temperature?: number, pressure?: number) {
  return useQuery<string[]>({
    queryKey: materialValidationKeys.suitableMaterials(temperature, pressure),
    queryFn: () => materialValidationApi.getSuitableMaterials(temperature, pressure),
    enabled: temperature !== undefined || pressure !== undefined,
  });
}

export function findMaterialLimits(
  allLimits: MaterialLimit[],
  specName: string,
): MaterialLimit | null {
  if (!specName) return null;
  const match = allLimits.find((limit) => specName.includes(limit.steelSpecName));
  return match ?? null;
}

export interface CachedSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: MaterialLimit;
}

export function checkSuitabilityFromCache(
  allLimits: MaterialLimit[],
  specName: string,
  temperatureC?: number,
  pressureBar?: number,
): CachedSuitabilityResult {
  const limits = findMaterialLimits(allLimits, specName);
  const warnings: string[] = [];

  if (!limits) {
    return { isSuitable: true, warnings: [], limits: undefined };
  }

  let isSuitable = true;

  if (limits.maxPressureBar === 0) {
    warnings.push(
      `WARNING: ${specName} is NOT rated for pressure service. This material is designed for wear/abrasion resistance only and requires specific engineering analysis for any pressure containment applications.`,
    );
    if (pressureBar !== undefined && pressureBar > 0) {
      isSuitable = false;
      warnings.push(
        `${specName} cannot be used for pressure applications (${pressureBar} bar specified). Use carbon steel or alloy steel for pressure service.`,
      );
    }
  }

  if (temperatureC !== undefined) {
    if (temperatureC < limits.minTemperatureCelsius) {
      isSuitable = false;
      warnings.push(
        `Temperature ${temperatureC}°C is below minimum ${limits.minTemperatureCelsius}°C for ${specName}`,
      );
    }
    if (temperatureC > limits.maxTemperatureCelsius) {
      isSuitable = false;
      warnings.push(
        `Temperature ${temperatureC}°C exceeds maximum ${limits.maxTemperatureCelsius}°C for ${specName}`,
      );
      if (limits.maxPressureBar === 0) {
        warnings.push(
          `${specName} will soften and lose hardness above ${limits.maxTemperatureCelsius}°C due to tempering effects.`,
        );
      }
    }
  }

  if (
    limits.maxPressureBar > 0 &&
    pressureBar !== undefined &&
    pressureBar > limits.maxPressureBar
  ) {
    warnings.push(
      `Pressure ${pressureBar} bar may require special consideration for ${specName} (typical max: ${limits.maxPressureBar} bar)`,
    );
  }

  let recommendation: string | undefined;
  if (!isSuitable) {
    if (limits.maxPressureBar === 0 && pressureBar !== undefined && pressureBar > 0) {
      recommendation =
        "For pressure service, use ASTM A106 Grade B (carbon steel), ASTM A335 P11/P22 (alloy steel), or ASTM A312 TP304/TP316 (stainless steel)";
    } else if (temperatureC !== undefined && temperatureC > 400) {
      recommendation =
        "Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)";
    } else if (temperatureC !== undefined && temperatureC < -29) {
      recommendation =
        "Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)";
    }
  }

  return { isSuitable, warnings, recommendation, limits };
}

export function isWearResistant(allLimits: MaterialLimit[], specName: string): boolean {
  const limits = findMaterialLimits(allLimits, specName);
  return limits?.maxPressureBar === 0;
}
