import { describe, it, expect } from 'vitest'
import {
  calculateVisualWallThickness,
  calculateArrowSize,
  calculateSteinmetzWeldLength,
  calculateEffectiveWeldLength,
  nbToOd,
  GEOMETRY_CONSTANTS,
  DIMENSION_STANDARDS,
  WELD_CONSTANTS,
  NB_TO_OD_LOOKUP,
  PIPE_MATERIALS,
  WELD_MATERIALS,
  FLANGE_MATERIALS,
  STEELWORK_MATERIALS
} from './rendering3DStandards'

describe('rendering3DStandards', () => {
  describe('calculateVisualWallThickness', () => {
    it('should return actual wall thickness when above minimum visual ratio', () => {
      const od = 100
      const actualWt = 15
      const result = calculateVisualWallThickness(od, actualWt)
      expect(result).toBe(15)
    })

    it('should return minimum visual thickness when actual is too thin', () => {
      const od = 100
      const actualWt = 2
      const minVisual = od * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO
      const result = calculateVisualWallThickness(od, actualWt)
      expect(result).toBe(minVisual)
      expect(result).toBeGreaterThan(actualWt)
    })

    it('should handle edge case where actual equals minimum', () => {
      const od = 100
      const minVisual = od * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO
      const result = calculateVisualWallThickness(od, minVisual)
      expect(result).toBe(minVisual)
    })

    it('should scale proportionally with different OD values', () => {
      const smallOd = 50
      const largeOd = 500
      const thinWall = 1

      const smallResult = calculateVisualWallThickness(smallOd, thinWall)
      const largeResult = calculateVisualWallThickness(largeOd, thinWall)

      expect(largeResult).toBeGreaterThan(smallResult)
      expect(smallResult).toBe(smallOd * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO)
      expect(largeResult).toBe(largeOd * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO)
    })
  })

  describe('calculateArrowSize', () => {
    it('should return minimum arrow length for very short dimensions', () => {
      const shortDimension = 0.1
      const result = calculateArrowSize(shortDimension)
      expect(result.length).toBe(DIMENSION_STANDARDS.arrowMinLength)
      expect(result.width).toBe(result.length * DIMENSION_STANDARDS.arrowWidthRatio)
    })

    it('should return maximum arrow length for very long dimensions', () => {
      const longDimension = 10
      const result = calculateArrowSize(longDimension)
      expect(result.length).toBe(DIMENSION_STANDARDS.arrowMaxLength)
      expect(result.width).toBe(result.length * DIMENSION_STANDARDS.arrowWidthRatio)
    })

    it('should scale proportionally for mid-range dimensions', () => {
      const midDimension = 0.8
      const expectedLength = midDimension * DIMENSION_STANDARDS.arrowLengthRatio
      const result = calculateArrowSize(midDimension)
      expect(result.length).toBe(expectedLength)
      expect(result.width).toBe(expectedLength * DIMENSION_STANDARDS.arrowWidthRatio)
    })

    it('should always return positive values', () => {
      const dimensions = [0.01, 0.5, 1, 5, 20]
      dimensions.forEach((dim) => {
        const result = calculateArrowSize(dim)
        expect(result.length).toBeGreaterThan(0)
        expect(result.width).toBeGreaterThan(0)
      })
    })

    it('should maintain width-to-length ratio consistently', () => {
      const dimensions = [0.1, 0.5, 1, 2, 5]
      dimensions.forEach((dim) => {
        const result = calculateArrowSize(dim)
        expect(result.width / result.length).toBeCloseTo(DIMENSION_STANDARDS.arrowWidthRatio, 5)
      })
    })
  })

  describe('calculateSteinmetzWeldLength', () => {
    it('should calculate weld length using Steinmetz factor', () => {
      const odMm = 100
      const result = calculateSteinmetzWeldLength(odMm)
      expect(result).toBe(WELD_CONSTANTS.STEINMETZ_FACTOR * odMm)
    })

    it('should scale linearly with OD', () => {
      const od1 = 200
      const od2 = 400
      const result1 = calculateSteinmetzWeldLength(od1)
      const result2 = calculateSteinmetzWeldLength(od2)
      expect(result2).toBe(result1 * 2)
    })

    it('should produce expected values for common pipe sizes', () => {
      const testCases = [
        { nb: 100, expectedOd: 114.3 },
        { nb: 200, expectedOd: 219.1 },
        { nb: 300, expectedOd: 323.9 }
      ]

      testCases.forEach(({ expectedOd }) => {
        const result = calculateSteinmetzWeldLength(expectedOd)
        expect(result).toBeCloseTo(WELD_CONSTANTS.STEINMETZ_FACTOR * expectedOd, 1)
      })
    })
  })

  describe('calculateEffectiveWeldLength', () => {
    it('should apply AWS D1.1 effective factor', () => {
      const totalLength = 150
      const result = calculateEffectiveWeldLength(totalLength)
      expect(result).toBe(totalLength * WELD_CONSTANTS.AWS_EFFECTIVE_FACTOR)
    })

    it('should return approximately 66.7% of total length (AWS factor 1/1.5)', () => {
      const totalLength = 300
      const result = calculateEffectiveWeldLength(totalLength)
      expect(result).toBeCloseTo(200, 1)
    })

    it('should handle zero length', () => {
      const result = calculateEffectiveWeldLength(0)
      expect(result).toBe(0)
    })

    it('should scale linearly', () => {
      const length1 = 100
      const length2 = 200
      const result1 = calculateEffectiveWeldLength(length1)
      const result2 = calculateEffectiveWeldLength(length2)
      expect(result2).toBe(result1 * 2)
    })
  })

  describe('nbToOd', () => {
    it('should return correct OD for known NB values', () => {
      expect(nbToOd(100)).toBe(114.3)
      expect(nbToOd(200)).toBe(219.1)
      expect(nbToOd(300)).toBe(323.9)
      expect(nbToOd(400)).toBe(406.4)
      expect(nbToOd(500)).toBe(508.0)
    })

    it('should return all standard NB to OD mappings correctly', () => {
      Object.entries(NB_TO_OD_LOOKUP).forEach(([nb, expectedOd]) => {
        expect(nbToOd(Number(nb))).toBe(expectedOd)
      })
    })

    it('should return fallback value for unknown NB', () => {
      const unknownNb = 999
      const result = nbToOd(unknownNb)
      expect(result).toBe(unknownNb * 1.05)
    })

    it('should handle small NB values', () => {
      expect(nbToOd(15)).toBe(21.3)
      expect(nbToOd(20)).toBe(26.7)
      expect(nbToOd(25)).toBe(33.4)
    })

    it('should handle large NB values', () => {
      expect(nbToOd(800)).toBe(812.8)
      expect(nbToOd(850)).toBe(863.6)
      expect(nbToOd(900)).toBe(914.4)
    })
  })

  describe('Material Constants Validation', () => {
    it('should have valid PBR values for pipe materials', () => {
      Object.entries(PIPE_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0)
        expect(material.metalness).toBeLessThanOrEqual(1)
        expect(material.roughness).toBeGreaterThanOrEqual(0)
        expect(material.roughness).toBeLessThanOrEqual(1)
        expect(material.envMapIntensity).toBeGreaterThan(0)
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('should have valid PBR values for weld materials', () => {
      Object.entries(WELD_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0)
        expect(material.metalness).toBeLessThanOrEqual(1)
        expect(material.roughness).toBeGreaterThanOrEqual(0)
        expect(material.roughness).toBeLessThanOrEqual(1)
        expect(material.envMapIntensity).toBeGreaterThan(0)
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('should have valid PBR values for flange materials', () => {
      Object.entries(FLANGE_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0)
        expect(material.metalness).toBeLessThanOrEqual(1)
        expect(material.roughness).toBeGreaterThanOrEqual(0)
        expect(material.roughness).toBeLessThanOrEqual(1)
        expect(material.envMapIntensity).toBeGreaterThan(0)
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('should have valid PBR values for steelwork materials', () => {
      Object.entries(STEELWORK_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0)
        expect(material.metalness).toBeLessThanOrEqual(1)
        expect(material.roughness).toBeGreaterThanOrEqual(0)
        expect(material.roughness).toBeLessThanOrEqual(1)
        expect(material.envMapIntensity).toBeGreaterThan(0)
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('weld materials should have higher roughness than pipe materials (matte weld bead)', () => {
      expect(WELD_MATERIALS.standard.roughness).toBeGreaterThan(PIPE_MATERIALS.outer.roughness)
    })

    it('flange materials should have high metalness for polished look', () => {
      expect(FLANGE_MATERIALS.standard.metalness).toBeGreaterThanOrEqual(0.85)
      expect(FLANGE_MATERIALS.bolt.metalness).toBeGreaterThanOrEqual(0.85)
    })
  })
})
