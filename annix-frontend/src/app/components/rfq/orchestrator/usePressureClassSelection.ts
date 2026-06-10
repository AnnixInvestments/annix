import { log } from "@/app/lib/logger";
import type { RfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { browserBaseUrl } from "@/lib/api-config";
import { getFallbackPressureClasses, getRecommendedPressureClass } from "./pressure-class-utils";

type PressureClassSelectionDeps = Pick<
  RfqWizardStore,
  "masterData" | "setAvailablePressureClasses" | "setPressureClassesByStandard"
>;

export function usePressureClassSelection(deps: PressureClassSelectionDeps) {
  const { masterData, setAvailablePressureClasses, setPressureClassesByStandard } = deps;

  const fetchAndSelectPressureClass = async (
    standardId: number,
    workingPressureBar?: number,
    temperatureCelsius?: number,
    materialGroup?: string,
  ) => {
    log.debug("[PT-DEBUG] fetchAndSelectPressureClass called with:", {
      standardId,
      workingPressureBar,
      temperatureCelsius,
      materialGroup,
    });
    try {
      const { masterDataApi } = await import("@/app/lib/api/client");
      const classes = await masterDataApi.getFlangePressureClassesByStandard(standardId);
      log.debug("[PT-DEBUG] Fetched classes:", classes);

      const rawCode2 = masterData.flangeStandards?.find((s: any) => s.id === standardId)?.code;

      // Log what we got from the API
      const standardName = rawCode2 || standardId;
      log.debug(
        `Fetched ${classes.length} pressure classes for ${standardName}:`,
        classes.map((c: any) => `${c.designation}(id=${c.id})`).join(", "),
      );

      setAvailablePressureClasses(classes);
      setPressureClassesByStandard((prev) => ({ ...prev, [standardId]: classes }));

      // Auto-select recommended pressure class if working pressure is available
      if (workingPressureBar && classes.length > 0) {
        const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
        const rawCode3 = standard?.code;
        const standardCode = rawCode3 || String(standardId);
        const isBs4504 = standardCode === "BS 4504" || standardCode.includes("BS 4504");
        const isSabs1123 = standardCode === "SABS 1123" || standardCode.includes("SABS 1123");

        // Try P/T rating API FIRST for temperature-based selection - works for all standards with P-T data
        // The API will return null if no P-T data exists for this standard, triggering fallback
        if (temperatureCelsius !== undefined) {
          try {
            const ptMaterialGroup = materialGroup || "Carbon Steel A105 (Group 1.1)";
            const apiUrl = `${browserBaseUrl()}/flange-pt-ratings/recommended-class?standardId=${standardId}&workingPressureBar=${workingPressureBar}&temperatureCelsius=${temperatureCelsius}&materialGroup=${encodeURIComponent(ptMaterialGroup)}`;
            log.debug(`P/T API call for ${standardCode}:`, apiUrl);
            const response = await fetch(apiUrl);
            if (response.ok) {
              const text = await response.text();
              log.debug(`P/T API response for ${standardCode}:`, text);
              if (text?.trim()) {
                try {
                  const recommendedClassId = JSON.parse(text);
                  // Validate the returned class ID is in our fetched classes for this standard
                  const matchingClass = classes.find((c: any) => c.id === recommendedClassId);
                  if (recommendedClassId && matchingClass) {
                    log.debug(
                      `P/T rating: Selected ${matchingClass.designation} (ID ${recommendedClassId}) for ${standardCode} at ${workingPressureBar} bar, ${temperatureCelsius}°C`,
                    );
                    return recommendedClassId;
                  } else if (recommendedClassId) {
                    log.debug(
                      `P/T rating returned ID ${recommendedClassId} but it's not in the classes for ${standardCode} (available: ${classes.map((c: any) => `${c.id}:${c.designation}`).join(", ")}), falling back to calculation`,
                    );
                  } else {
                    log.debug(
                      `P/T API returned null for ${standardCode}, falling back to calculation`,
                    );
                  }
                } catch {
                  log.debug(`P/T API returned invalid JSON for ${standardCode}, falling back`);
                }
              } else {
                log.debug(`P/T API returned empty response for ${standardCode}, falling back`);
              }
            } else {
              log.debug(
                `P/T API returned status ${response.status} for ${standardCode}, falling back`,
              );
            }
          } catch (ptError) {
            // Silently fall back to pressure-based calculation if P/T API fails
            log.debug(`[PT-DEBUG] P/T API error for ${standardCode}:`, ptError);
            log.debug(
              `P/T rating API failed for ${standardCode}, using pressure-based calculation:`,
              ptError,
            );
          }
        }

        // Use pressure-based calculation for all standards (with temperature derating if applicable)
        log.debug(
          `[PT-DEBUG] Running fallback calculation for ${standardCode} with ${classes.length} classes:`,
          classes.map((c: any) => c.designation),
        );
        log.debug(
          `Running fallback calculation for ${standardCode} with ${classes.length} classes:`,
          classes.map((c: any) => c.designation).join(", "),
        );
        const recommended = getRecommendedPressureClass(
          workingPressureBar,
          classes,
          temperatureCelsius,
        );
        if (recommended) {
          log.debug(
            `[PT-DEBUG] SELECTED: ${recommended.designation} (ID ${recommended.id}) for ${workingPressureBar} bar`,
          );
          log.debug(
            `Pressure calculation: Selected ${recommended.designation} (ID ${recommended.id}) for ${standardCode} at ${workingPressureBar} bar - capacity: ${recommended.barRating?.toFixed(1) || recommended.ambientRating} bar`,
          );
          return recommended.id;
        } else {
          log.debug(`[PT-DEBUG] Fallback calculation returned null for ${standardCode}`);
          log.warn(`Fallback calculation returned null for ${standardCode}`);

          // LAST RESORT: If calculation failed but we have classes, pick one based on working pressure
          if (classes.length > 0) {
            const targetPressure = workingPressureBar || 10;
            // Extract numeric value from designations and find suitable class
            const withRatings = classes
              .map((c: any) => {
                const match = c.designation?.match(/^(\d+)/);
                const rating = match ? parseInt(match[1], 10) : 0;
                const barRating = rating >= 500 ? rating / 100 : rating;
                return { ...c, barRating };
              })
              .filter((c: any) => c.barRating > 0);

            if (withRatings.length > 0) {
              withRatings.sort((a: any, b: any) => a.barRating - b.barRating);
              const suitable = withRatings.find((c: any) => c.barRating >= targetPressure);
              const selected = suitable || withRatings[withRatings.length - 1];
              log.debug(
                `[PT-DEBUG] LAST RESORT: Selected ${selected.designation} (ID ${selected.id})`,
              );
              return selected.id;
            }
          }
        }
      }

      log.debug(`[PT-DEBUG] No recommendation found for standardId=${standardId}, returning null`);
      log.debug(`No recommendation found for standardId=${standardId}, returning null`);
      return null;
    } catch (error) {
      // Use fallback pressure classes when backend is unavailable
      const fallbackClasses = getFallbackPressureClasses(standardId, masterData.flangeStandards);
      setAvailablePressureClasses(fallbackClasses);
      setPressureClassesByStandard((prev) => ({ ...prev, [standardId]: fallbackClasses }));

      if (error instanceof Error && error.message !== "Backend unavailable") {
        log.error("Error fetching pressure classes:", error);
      }

      // Auto-select recommended from fallback classes with temperature derating
      if (workingPressureBar && fallbackClasses.length > 0) {
        const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
        const rawCode4 = standard?.code;
        const standardCode = rawCode4 || String(standardId);
        const recommended = getRecommendedPressureClass(
          workingPressureBar,
          fallbackClasses,
          temperatureCelsius,
        );
        if (recommended) {
          log.debug(
            `Fallback calculation: Selected ${recommended.designation} (ID ${recommended.id}) for ${standardCode} at ${workingPressureBar} bar - capacity: ${recommended.barRating?.toFixed(1) || recommended.ambientRating} bar`,
          );
          return recommended.id;
        }
      }

      return null;
    }
  };

  return fetchAndSelectPressureClass;
}
