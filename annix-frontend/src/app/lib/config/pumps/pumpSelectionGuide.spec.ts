import { describe, it, expect } from 'vitest';
import {
  APPLICATION_PROFILES,
  PUMP_TYPE_PROFILES,
  selectPumpType,
  pumpTypeLabel,
  applicationLabel,
  SelectionCriteria,
} from './pumpSelectionGuide';

describe('Pump Selection Guide', () => {
  describe('APPLICATION_PROFILES', () => {
    it('should have at least 10 application profiles', () => {
      expect(APPLICATION_PROFILES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique values for each profile', () => {
      const values = APPLICATION_PROFILES.map((p) => p.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have characteristics for each profile', () => {
      APPLICATION_PROFILES.forEach((profile) => {
        expect(profile.characteristics).toBeDefined();
        expect(profile.characteristics.flowRange).toBeDefined();
        expect(profile.characteristics.headRange).toBeDefined();
      });
    });

    it('should have recommended pump types for each profile', () => {
      APPLICATION_PROFILES.forEach((profile) => {
        expect(profile.recommendedPumpTypes).toBeDefined();
        expect(profile.recommendedPumpTypes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PUMP_TYPE_PROFILES', () => {
    it('should have at least 10 pump type profiles', () => {
      expect(PUMP_TYPE_PROFILES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique values for each profile', () => {
      const values = PUMP_TYPE_PROFILES.map((p) => p.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have valid category for each profile', () => {
      const validCategories = ['centrifugal', 'positive_displacement', 'special'];
      PUMP_TYPE_PROFILES.forEach((profile) => {
        expect(validCategories).toContain(profile.category);
      });
    });

    it('should have operating ranges for each profile', () => {
      PUMP_TYPE_PROFILES.forEach((profile) => {
        expect(profile.operatingRange).toBeDefined();
        expect(profile.operatingRange.flowM3h).toBeDefined();
        expect(profile.operatingRange.headM).toBeDefined();
        expect(profile.operatingRange.viscosityCp).toBeDefined();
        expect(profile.operatingRange.temperatureC).toBeDefined();
        expect(profile.operatingRange.pressureBar).toBeDefined();
      });
    });

    it('should have valid cost and maintenance levels', () => {
      const validLevels = ['low', 'medium', 'high'];
      PUMP_TYPE_PROFILES.forEach((profile) => {
        expect(validLevels).toContain(profile.maintenanceLevel);
        expect(validLevels).toContain(profile.capitalCost);
        expect(validLevels).toContain(profile.operatingCost);
      });
    });

    it('should have efficiency ranges between 0 and 100', () => {
      PUMP_TYPE_PROFILES.forEach((profile) => {
        expect(profile.efficiencyRange.min).toBeGreaterThanOrEqual(0);
        expect(profile.efficiencyRange.max).toBeLessThanOrEqual(100);
        expect(profile.efficiencyRange.min).toBeLessThan(profile.efficiencyRange.max);
      });
    });
  });

  describe('selectPumpType', () => {
    it('should return top 5 recommendations', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
      });
      expect(result.recommendedTypes.length).toBe(5);
    });

    it('should return recommendations sorted by score (descending)', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
      });
      const scores = result.recommendedTypes.map((r) => r.score);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores);
    });

    it('should penalize pumps when flow exceeds maximum', () => {
      const normalResult = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
      });
      const highFlowResult = selectPumpType({
        flowRateM3h: 50000,
        headM: 30,
      });
      const endSuctionNormal = normalResult.recommendedTypes.find((r) => r.type.value === 'end_suction');
      const endSuctionHigh = highFlowResult.recommendedTypes.find((r) => r.type.value === 'end_suction');
      if (endSuctionNormal && endSuctionHigh) {
        expect(endSuctionHigh.score).toBeLessThan(endSuctionNormal.score);
      }
    });

    it('should recommend positive displacement for high viscosity', () => {
      const result = selectPumpType({
        flowRateM3h: 50,
        headM: 30,
        viscosityCp: 5000,
      });
      const topRecommendation = result.recommendedTypes[0];
      expect(topRecommendation.type.category).toBe('positive_displacement');
    });

    it('should recommend slurry pump for high solids content', () => {
      const result = selectPumpType({
        flowRateM3h: 500,
        headM: 30,
        solidsPercent: 40,
      });
      const slurryRecommendation = result.recommendedTypes.find((r) => r.type.value === 'slurry');
      expect(slurryRecommendation).toBeDefined();
      expect(slurryRecommendation?.score).toBeGreaterThan(50);
    });

    it('should add application notes for high viscosity', () => {
      const result = selectPumpType({
        flowRateM3h: 50,
        headM: 30,
        viscosityCp: 500,
      });
      const hasViscosityNote = result.applicationNotes.some((note) =>
        note.toLowerCase().includes('viscosity')
      );
      expect(hasViscosityNote).toBe(true);
    });

    it('should add application notes for high solids', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        solidsPercent: 10,
      });
      const hasSolidsNote = result.applicationNotes.some((note) =>
        note.toLowerCase().includes('solids')
      );
      expect(hasSolidsNote).toBe(true);
    });

    it('should add considerations for variable flow operation', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        operatingMode: 'variable',
      });
      const hasVfdNote = result.considerations.some((note) =>
        note.toLowerCase().includes('vfd') || note.toLowerCase().includes('variable')
      );
      expect(hasVfdNote).toBe(true);
    });

    it('should add considerations for high temperature', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        temperatureC: 150,
      });
      const hasTemperatureNote = result.considerations.some((note) =>
        note.toLowerCase().includes('temperature')
      );
      expect(hasTemperatureNote).toBe(true);
    });

    it('should add considerations for chemical fluids', () => {
      const result = selectPumpType({
        flowRateM3h: 50,
        headM: 30,
        fluidType: 'chemical',
      });
      const hasChemicalNote = result.considerations.some((note) =>
        note.toLowerCase().includes('material') || note.toLowerCase().includes('sealless')
      );
      expect(hasChemicalNote).toBe(true);
    });

    it('should prioritize efficiency when specified', () => {
      const withoutPriority = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
      });
      const withEfficiencyPriority = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        priorities: ['efficiency'],
      });
      const highEfficiencyPump = PUMP_TYPE_PROFILES.find((p) => p.value === 'split_case');
      if (highEfficiencyPump) {
        const splitCaseWithPriority = withEfficiencyPriority.recommendedTypes.find(
          (r) => r.type.value === 'split_case'
        );
        const splitCaseWithout = withoutPriority.recommendedTypes.find(
          (r) => r.type.value === 'split_case'
        );
        if (splitCaseWithPriority && splitCaseWithout) {
          expect(splitCaseWithPriority.score).toBeGreaterThanOrEqual(splitCaseWithout.score);
        }
      }
    });

    it('should prioritize low cost when specified', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        priorities: ['cost'],
      });
      const topRecommendation = result.recommendedTypes[0];
      const hasLowCostReason = topRecommendation.reasons.some((r) =>
        r.toLowerCase().includes('cost')
      );
      expect(topRecommendation.type.capitalCost === 'low' || hasLowCostReason).toBe(true);
    });

    it('should prioritize low maintenance when specified', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        priorities: ['maintenance'],
      });
      const topRecommendations = result.recommendedTypes.slice(0, 3);
      const hasLowMaintenancePump = topRecommendations.some(
        (r) => r.type.maintenanceLevel === 'low'
      );
      expect(hasLowMaintenancePump).toBe(true);
    });

    it('should boost score when application matches recommended types', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        application: 'water_supply',
      });
      const endSuction = result.recommendedTypes.find((r) => r.type.value === 'end_suction');
      const hasApplicationReason = endSuction?.reasons.some((r) =>
        r.toLowerCase().includes('application')
      );
      expect(hasApplicationReason).toBe(true);
    });

    it('should add warnings for out-of-range conditions', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        temperatureC: 250,
      });
      const hasTemperatureWarning = result.recommendedTypes.some((r) =>
        r.warnings.some((w) => w.toLowerCase().includes('temperature'))
      );
      expect(hasTemperatureWarning).toBe(true);
    });

    it('should generate warnings for centrifugal pumps when solids present', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        solidsPercent: 5,
      });
      const centrifugalPumps = result.recommendedTypes.filter(
        (r) => r.type.category === 'centrifugal' && r.type.value !== 'slurry' && r.type.value !== 'submersible'
      );
      const hasAnyWarning = centrifugalPumps.some((pump) =>
        pump.warnings.some((w) =>
          w.toLowerCase().includes('solids') || w.toLowerCase().includes('wear')
        )
      );
      expect(hasAnyWarning || centrifugalPumps.length === 0).toBe(true);
    });

    it('should clamp scores between 0 and 100', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        viscosityCp: 1000000,
        temperatureC: 500,
        solidsPercent: 80,
      });
      result.recommendedTypes.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('pumpTypeLabel', () => {
    it('should return label for valid pump type value', () => {
      const label = pumpTypeLabel('end_suction');
      expect(label).toBe('End Suction Centrifugal');
    });

    it('should return value itself for unknown pump type', () => {
      const label = pumpTypeLabel('unknown_pump');
      expect(label).toBe('unknown_pump');
    });
  });

  describe('applicationLabel', () => {
    it('should return label for valid application value', () => {
      const label = applicationLabel('water_supply');
      expect(label).toBe('Water Supply & Distribution');
    });

    it('should return value itself for unknown application', () => {
      const label = applicationLabel('unknown_app');
      expect(label).toBe('unknown_app');
    });
  });

  describe('Selection Algorithm Edge Cases', () => {
    it('should handle zero flow rate', () => {
      const result = selectPumpType({
        flowRateM3h: 0,
        headM: 30,
      });
      expect(result.recommendedTypes).toBeDefined();
      expect(result.recommendedTypes.length).toBe(5);
    });

    it('should handle very low flow rate (metering applications)', () => {
      const result = selectPumpType({
        flowRateM3h: 0.01,
        headM: 30,
      });
      const peristaltic = result.recommendedTypes.find((r) => r.type.value === 'peristaltic');
      expect(peristaltic).toBeDefined();
    });

    it('should handle extreme head requirements', () => {
      const result = selectPumpType({
        flowRateM3h: 50,
        headM: 1000,
      });
      const multistage = result.recommendedTypes.find((r) => r.type.value === 'multistage');
      expect(multistage).toBeDefined();
    });

    it('should handle all priorities simultaneously', () => {
      const result = selectPumpType({
        flowRateM3h: 100,
        headM: 30,
        priorities: ['efficiency', 'cost', 'reliability', 'maintenance', 'footprint'],
      });
      expect(result.recommendedTypes).toBeDefined();
      expect(result.recommendedTypes.length).toBe(5);
    });

    it('should handle undefined optional parameters', () => {
      const criteria: SelectionCriteria = {
        flowRateM3h: 100,
        headM: 30,
      };
      const result = selectPumpType(criteria);
      expect(result.recommendedTypes).toBeDefined();
    });
  });
});
