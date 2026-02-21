import { describe, expect, it } from "vitest";
import type {
  ExternalEnvironmentProfile,
  MaterialTransferProfile,
} from "./coatingLiningRecommendations";
import {
  classifyDamageMechanisms,
  classifyExternalDamageMechanisms,
  recommendExternalCoating,
  recommendLining,
} from "./coatingLiningRecommendations";

describe("coatingLiningRecommendations", () => {
  describe("classifyDamageMechanisms", () => {
    it("should classify low severity for benign conditions", () => {
      const profile: MaterialTransferProfile = {
        material: {
          hardnessClass: "Low",
          particleSize: "Fine",
          particleShape: "Rounded",
          silicaContent: "Low",
        },
        chemistry: {
          phRange: "Neutral",
          chlorides: "Low",
          temperatureRange: "Ambient",
        },
        flow: {
          velocity: "Low",
          impactAngle: "Low",
        },
        equipment: {
          impactZones: false,
        },
      };

      const result = classifyDamageMechanisms(profile);

      expect(result.abrasion).toBe("Low");
      expect(result.impact).toBe("Low");
      expect(result.corrosion).toBe("Low");
    });

    it("should classify severe abrasion for hard particles at high velocity", () => {
      const profile: MaterialTransferProfile = {
        material: {
          hardnessClass: "High",
          silicaContent: "High",
        },
        flow: {
          velocity: "High",
        },
        chemistry: {},
        equipment: {},
      };

      const result = classifyDamageMechanisms(profile);

      expect(result.abrasion).toBe("Severe");
    });

    it("should classify severe impact for high angle with impact zones", () => {
      const profile: MaterialTransferProfile = {
        material: {},
        chemistry: {},
        flow: {
          impactAngle: "High",
        },
        equipment: {
          impactZones: true,
        },
      };

      const result = classifyDamageMechanisms(profile);

      expect(result.impact).toBe("Severe");
      expect(result.dominantMechanism).toBe("Impact Abrasion");
    });

    it("should classify high corrosion for acidic or high chloride conditions", () => {
      const acidicProfile: MaterialTransferProfile = {
        material: {},
        chemistry: {
          phRange: "Acidic",
        },
        flow: {},
        equipment: {},
      };

      const chlorideProfile: MaterialTransferProfile = {
        material: {},
        chemistry: {
          chlorides: "High",
        },
        flow: {},
        equipment: {},
      };

      expect(classifyDamageMechanisms(acidicProfile).corrosion).toBe("High");
      expect(classifyDamageMechanisms(chlorideProfile).corrosion).toBe("High");
    });

    it("should identify dominant mechanism correctly", () => {
      const severeImpactProfile: MaterialTransferProfile = {
        material: {},
        chemistry: {},
        flow: { impactAngle: "High" },
        equipment: { impactZones: true },
      };

      const severeAbrasionProfile: MaterialTransferProfile = {
        material: { hardnessClass: "High", silicaContent: "High" },
        chemistry: {},
        flow: { velocity: "High" },
        equipment: {},
      };

      const highCorrosionProfile: MaterialTransferProfile = {
        material: {},
        chemistry: { phRange: "Acidic" },
        flow: {},
        equipment: {},
      };

      expect(classifyDamageMechanisms(severeImpactProfile).dominantMechanism).toBe(
        "Impact Abrasion",
      );
      expect(classifyDamageMechanisms(severeAbrasionProfile).dominantMechanism).toBe(
        "Sliding Abrasion",
      );
      expect(classifyDamageMechanisms(highCorrosionProfile).dominantMechanism).toBe("Corrosion");
    });

    it("should classify mixed mechanism when no single dominant", () => {
      const mixedProfile: MaterialTransferProfile = {
        material: {
          hardnessClass: "Medium",
          particleSize: "Medium",
        },
        chemistry: {
          phRange: "Neutral",
          chlorides: "Moderate",
        },
        flow: {
          velocity: "Medium",
          impactAngle: "Mixed",
        },
        equipment: {},
      };

      const result = classifyDamageMechanisms(mixedProfile);

      expect(result.dominantMechanism).toBe("Mixed");
    });
  });

  describe("classifyExternalDamageMechanisms", () => {
    it("should classify low atmospheric corrosion for C1/C2", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {},
        atmosphere: {
          iso12944Category: "C1",
        },
        soil: {},
        operating: {},
      };

      const result = classifyExternalDamageMechanisms(profile);

      expect(result.atmosphericCorrosion).toBe("Low");
    });

    it("should classify severe atmospheric corrosion for CX with marine/industrial", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {},
        atmosphere: {
          iso12944Category: "CX",
          marineInfluence: "Offshore",
          industrialPollution: "Heavy",
        },
        soil: {},
        operating: {},
      };

      const result = classifyExternalDamageMechanisms(profile);

      expect(["High", "Severe"]).toContain(result.atmosphericCorrosion);
    });

    it("should classify high soil corrosion for buried in aggressive soil", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {
          type: "Buried",
        },
        atmosphere: {},
        soil: {
          resistivity: "VeryLow",
          moisture: "Saturated",
        },
        operating: {},
      };

      const result = classifyExternalDamageMechanisms(profile);

      expect(["High", "Severe"]).toContain(result.soilCorrosion);
    });

    it("should classify mechanical damage based on risk level", () => {
      const highRiskProfile: ExternalEnvironmentProfile = {
        installation: {
          mechanicalRisk: "High",
        },
        atmosphere: {},
        soil: {},
        operating: {},
      };

      const lowRiskProfile: ExternalEnvironmentProfile = {
        installation: {
          mechanicalRisk: "Low",
        },
        atmosphere: {},
        soil: {},
        operating: {},
      };

      expect(classifyExternalDamageMechanisms(highRiskProfile).mechanicalDamage).toBe("High");
      expect(classifyExternalDamageMechanisms(lowRiskProfile).mechanicalDamage).toBe("Low");
    });

    it("should identify correct dominant mechanism", () => {
      const buriedProfile: ExternalEnvironmentProfile = {
        installation: { type: "Buried" },
        atmosphere: {},
        soil: { resistivity: "VeryLow" },
        operating: {},
      };

      const offshoreProfile: ExternalEnvironmentProfile = {
        installation: { type: "Submerged" },
        atmosphere: { marineInfluence: "Offshore" },
        soil: {},
        operating: {},
      };

      expect(classifyExternalDamageMechanisms(buriedProfile).dominantMechanism).toBe("Soil/Buried");
      expect(classifyExternalDamageMechanisms(offshoreProfile).dominantMechanism).toBe("Marine");
    });
  });

  describe("recommendLining", () => {
    it("should recommend ceramic-based lining for severe abrasion", () => {
      const profile: MaterialTransferProfile = {
        material: {
          hardnessClass: "High",
          silicaContent: "High",
          particleShape: "Angular",
        },
        chemistry: {
          phRange: "Neutral",
        },
        flow: {
          velocity: "High",
          solidsPercent: "VeryHigh",
        },
        equipment: {
          equipmentType: "Pipe",
        },
      };

      const damage = classifyDamageMechanisms(profile);
      const recommendation = recommendLining(profile, damage);

      expect(recommendation).toBeDefined();
      expect(recommendation.lining).toBeDefined();
      expect(recommendation.thicknessRange).toBeDefined();
    });

    it("should recommend rubber-ceramic composite for severe impact", () => {
      const profile: MaterialTransferProfile = {
        material: {
          particleSize: "Coarse",
        },
        chemistry: {},
        flow: {
          impactAngle: "High",
        },
        equipment: {
          impactZones: true,
          equipmentType: "Chute",
        },
      };

      const damage = classifyDamageMechanisms(profile);
      const recommendation = recommendLining(profile, damage);

      expect(recommendation).toBeDefined();
      expect(recommendation.liningType.toLowerCase()).toContain("ceramic");
    });

    it("should include engineering notes", () => {
      const profile: MaterialTransferProfile = {
        material: {
          hardnessClass: "High",
        },
        chemistry: {
          phRange: "Acidic",
        },
        flow: {
          velocity: "High",
        },
        equipment: {
          equipmentType: "Pipe",
        },
      };

      const damage = classifyDamageMechanisms(profile);
      const recommendation = recommendLining(profile, damage);

      expect(Array.isArray(recommendation.engineeringNotes)).toBe(true);
      expect(recommendation.engineeringNotes.length).toBeGreaterThan(0);
    });

    it("should include standards basis", () => {
      const profile: MaterialTransferProfile = {
        material: { hardnessClass: "Medium" },
        chemistry: {},
        flow: {},
        equipment: {
          equipmentType: "Pipe",
        },
      };

      const damage = classifyDamageMechanisms(profile);
      const recommendation = recommendLining(profile, damage);

      expect(Array.isArray(recommendation.standardsBasis)).toBe(true);
      expect(recommendation.standardsBasis.length).toBeGreaterThan(0);
    });
  });

  describe("recommendExternalCoating", () => {
    it("should recommend coating for C5 atmospheric exposure", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {
          type: "AboveGround",
          uvExposure: "High",
        },
        atmosphere: {
          iso12944Category: "C5",
          marineInfluence: "Coastal",
        },
        soil: {},
        operating: {
          serviceLife: "Long",
        },
      };

      const damage = classifyExternalDamageMechanisms(profile);
      const recommendation = recommendExternalCoating(profile, damage);

      expect(recommendation).toBeDefined();
      expect(recommendation.coating).toBeDefined();
      expect(recommendation.system).toBeDefined();
    });

    it("should recommend appropriate system for buried pipelines", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {
          type: "Buried",
        },
        atmosphere: {},
        soil: {
          soilType: "Clay",
          resistivity: "Low",
        },
        operating: {
          cathodicProtection: true,
          serviceLife: "Extended",
        },
      };

      const damage = classifyExternalDamageMechanisms(profile);
      const recommendation = recommendExternalCoating(profile, damage);

      expect(recommendation).toBeDefined();
      expect(recommendation.thicknessRange).toBeDefined();
    });

    it("should consider cathodic protection compatibility", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {
          type: "Submerged",
        },
        atmosphere: {},
        soil: {},
        operating: {
          cathodicProtection: true,
        },
      };

      const damage = classifyExternalDamageMechanisms(profile);
      const recommendation = recommendExternalCoating(profile, damage);

      expect(recommendation).toBeDefined();
      expect(recommendation.engineeringNotes).toBeDefined();
    });

    it("should include thickness ranges", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {
          type: "AboveGround",
        },
        atmosphere: {
          iso12944Category: "C4",
        },
        soil: {},
        operating: {
          serviceLife: "Long",
        },
      };

      const damage = classifyExternalDamageMechanisms(profile);
      const recommendation = recommendExternalCoating(profile, damage);

      expect(recommendation.thicknessRange).toBeDefined();
      expect(recommendation.thicknessRange.length).toBeGreaterThan(0);
    });

    it("should provide rationale for recommendations", () => {
      const profile: ExternalEnvironmentProfile = {
        installation: {
          type: "AboveGround",
          mechanicalRisk: "High",
        },
        atmosphere: {
          iso12944Category: "C3",
        },
        soil: {},
        operating: {},
      };

      const damage = classifyExternalDamageMechanisms(profile);
      const recommendation = recommendExternalCoating(profile, damage);

      expect(recommendation.rationale).toBeDefined();
      expect(recommendation.rationale.length).toBeGreaterThan(0);
    });
  });

  describe("UI Integration Scenarios", () => {
    describe("Form state transitions", () => {
      it("should handle progressive profile completion", () => {
        const emptyProfile: MaterialTransferProfile = {
          material: {},
          chemistry: {},
          flow: {},
          equipment: {},
        };

        const partialProfile: MaterialTransferProfile = {
          material: { hardnessClass: "Medium" },
          chemistry: {},
          flow: {},
          equipment: { equipmentType: "Pipe" },
        };

        const completeProfile: MaterialTransferProfile = {
          material: {
            hardnessClass: "High",
            particleSize: "Coarse",
            particleShape: "Angular",
            silicaContent: "High",
          },
          chemistry: {
            phRange: "Acidic",
            chlorides: "Moderate",
            temperatureRange: "Elevated",
          },
          flow: {
            velocity: "High",
            solidsPercent: "High",
            impactAngle: "High",
          },
          equipment: {
            equipmentType: "Pipe",
            impactZones: true,
          },
        };

        const emptyResult = classifyDamageMechanisms(emptyProfile);
        const partialResult = classifyDamageMechanisms(partialProfile);
        const completeResult = classifyDamageMechanisms(completeProfile);

        expect(emptyResult).toBeDefined();
        expect(partialResult).toBeDefined();
        expect(completeResult).toBeDefined();

        expect(completeResult.abrasion).toBe("Severe");
        expect(completeResult.impact).toBe("Severe");
        expect(completeResult.corrosion).toBe("High");
      });

      it("should produce consistent results for same inputs", () => {
        const profile: MaterialTransferProfile = {
          material: { hardnessClass: "High" },
          chemistry: { phRange: "Acidic" },
          flow: { velocity: "High" },
          equipment: { equipmentType: "Pipe" },
        };

        const result1 = classifyDamageMechanisms(profile);
        const result2 = classifyDamageMechanisms(profile);

        expect(result1).toEqual(result2);
      });
    });

    describe("External coating form scenarios", () => {
      it("should handle installation type changes", () => {
        const baseAtmosphere = { iso12944Category: "C4" as const };
        const baseOperating = { serviceLife: "Long" as const };

        const aboveGroundProfile: ExternalEnvironmentProfile = {
          installation: { type: "AboveGround" },
          atmosphere: baseAtmosphere,
          soil: {},
          operating: baseOperating,
        };

        const buriedProfile: ExternalEnvironmentProfile = {
          installation: { type: "Buried" },
          atmosphere: baseAtmosphere,
          soil: {},
          operating: baseOperating,
        };

        const submergedProfile: ExternalEnvironmentProfile = {
          installation: { type: "Submerged" },
          atmosphere: baseAtmosphere,
          soil: {},
          operating: baseOperating,
        };

        const aboveGroundDamage = classifyExternalDamageMechanisms(aboveGroundProfile);
        const buriedDamage = classifyExternalDamageMechanisms(buriedProfile);
        const submergedDamage = classifyExternalDamageMechanisms(submergedProfile);

        const aboveGroundRec = recommendExternalCoating(aboveGroundProfile, aboveGroundDamage);
        const buriedRec = recommendExternalCoating(buriedProfile, buriedDamage);
        const submergedRec = recommendExternalCoating(submergedProfile, submergedDamage);

        expect(aboveGroundRec).toBeDefined();
        expect(buriedRec).toBeDefined();
        expect(submergedRec).toBeDefined();

        expect(buriedRec.system).not.toBe(aboveGroundRec.system);
      });

      it("should adjust recommendations based on dominant mechanism", () => {
        const atmosphericProfile: ExternalEnvironmentProfile = {
          installation: { type: "AboveGround" },
          atmosphere: { iso12944Category: "C5", industrialPollution: "Heavy" },
          soil: {},
          operating: {},
        };

        const buriedProfile: ExternalEnvironmentProfile = {
          installation: { type: "Buried" },
          atmosphere: {},
          soil: { resistivity: "VeryLow" },
          operating: {},
        };

        const atmosphericDamage = classifyExternalDamageMechanisms(atmosphericProfile);
        const buriedDamage = classifyExternalDamageMechanisms(buriedProfile);

        expect(atmosphericDamage.dominantMechanism).toBe("Atmospheric");
        expect(buriedDamage.dominantMechanism).toBe("Soil/Buried");
      });
    });

    describe("Internal lining form scenarios", () => {
      it("should handle equipment type selection", () => {
        const equipmentTypes = ["Pipe", "Tank", "Chute", "Hopper", "Launder"] as const;

        equipmentTypes.forEach((equipmentType) => {
          const profile: MaterialTransferProfile = {
            material: { hardnessClass: "High" },
            chemistry: {},
            flow: { velocity: "High" },
            equipment: { equipmentType },
          };

          const damage = classifyDamageMechanisms(profile);
          const recommendation = recommendLining(profile, damage);

          expect(recommendation).toBeDefined();
          expect(recommendation.lining).toBeDefined();
        });
      });

      it("should prioritize recommendations based on dominant mechanism", () => {
        const impactDominant: MaterialTransferProfile = {
          material: { particleSize: "VeryCoarse" },
          chemistry: {},
          flow: { impactAngle: "High" },
          equipment: { impactZones: true, equipmentType: "Chute" },
        };

        const abrasionDominant: MaterialTransferProfile = {
          material: { hardnessClass: "High", silicaContent: "High" },
          chemistry: {},
          flow: { velocity: "High" },
          equipment: { equipmentType: "Pipe" },
        };

        const corrosionDominant: MaterialTransferProfile = {
          material: {},
          chemistry: { phRange: "Acidic", chlorides: "High" },
          flow: {},
          equipment: { equipmentType: "Tank" },
        };

        const impactDamage = classifyDamageMechanisms(impactDominant);
        const abrasionDamage = classifyDamageMechanisms(abrasionDominant);
        const corrosionDamage = classifyDamageMechanisms(corrosionDominant);

        const impactRec = recommendLining(impactDominant, impactDamage);
        const abrasionRec = recommendLining(abrasionDominant, abrasionDamage);
        const corrosionRec = recommendLining(corrosionDominant, corrosionDamage);

        expect(impactRec.lining).toBeDefined();
        expect(abrasionRec.lining).toBeDefined();
        expect(corrosionRec.lining).toBeDefined();
      });
    });

    describe("Edge cases and validation", () => {
      it("should handle undefined optional fields gracefully in classification", () => {
        const minimalProfile: MaterialTransferProfile = {
          material: {},
          chemistry: {},
          flow: {},
          equipment: {},
        };

        expect(() => classifyDamageMechanisms(minimalProfile)).not.toThrow();
      });

      it("should handle partial external profile in classification", () => {
        const minimalProfile: ExternalEnvironmentProfile = {
          installation: {},
          atmosphere: {},
          soil: {},
          operating: {},
        };

        expect(() => classifyExternalDamageMechanisms(minimalProfile)).not.toThrow();
      });

      it("should produce valid damage classifications for minimal profiles", () => {
        const minimalProfile: MaterialTransferProfile = {
          material: {},
          chemistry: {},
          flow: {},
          equipment: {},
        };

        const damage = classifyDamageMechanisms(minimalProfile);

        expect(damage.abrasion).toBeDefined();
        expect(damage.impact).toBeDefined();
        expect(damage.corrosion).toBeDefined();
        expect(damage.dominantMechanism).toBeDefined();
      });
    });
  });
});
