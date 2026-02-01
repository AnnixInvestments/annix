import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { calculateAutoSpacing, AutoDimensionSpacingConfig } from './DimensionComponents'

describe('DimensionComponents', () => {
  describe('calculateAutoSpacing', () => {
    it('should return dimensions with calculated offsets', () => {
      const dimensions = [
        {
          start: new THREE.Vector3(0, 0, 0),
          end: new THREE.Vector3(1, 0, 0),
          label: '1000mm'
        }
      ]

      const result = calculateAutoSpacing(dimensions, 'y')

      expect(result).toHaveLength(1)
      expect(result[0].calculatedOffset).toBe(0.4)
      expect(result[0].direction).toBe('y')
      expect(result[0].label).toBe('1000mm')
    })

    it('should stack overlapping dimensions at different offsets', () => {
      const dimensions = [
        {
          start: new THREE.Vector3(0, 0, 0),
          end: new THREE.Vector3(1, 0, 0),
          label: 'A'
        },
        {
          start: new THREE.Vector3(0.5, 0, 0),
          end: new THREE.Vector3(1.5, 0, 0),
          label: 'B'
        }
      ]

      const result = calculateAutoSpacing(dimensions, 'y')

      expect(result).toHaveLength(2)
      expect(result[0].calculatedOffset).toBeCloseTo(0.4, 5)
      expect(result[1].calculatedOffset).toBeCloseTo(0.6, 5)
    })

    it('should place non-overlapping dimensions at the same offset level', () => {
      const dimensions = [
        {
          start: new THREE.Vector3(0, 0, 0),
          end: new THREE.Vector3(1, 0, 0),
          label: 'A'
        },
        {
          start: new THREE.Vector3(2, 0, 0),
          end: new THREE.Vector3(3, 0, 0),
          label: 'B'
        }
      ]

      const result = calculateAutoSpacing(dimensions, 'y')

      expect(result).toHaveLength(2)
      expect(result[0].calculatedOffset).toBe(0.4)
      expect(result[1].calculatedOffset).toBe(0.4)
    })

    it('should handle multiple overlapping dimensions', () => {
      const dimensions = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(5, 0, 0), label: 'Total' },
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(2, 0, 0), label: 'A' },
        { start: new THREE.Vector3(2.5, 0, 0), end: new THREE.Vector3(5, 0, 0), label: 'B' }
      ]

      const result = calculateAutoSpacing(dimensions, 'y')

      expect(result).toHaveLength(3)
      expect(result[0].calculatedOffset).toBeCloseTo(0.4, 5)
      expect(result[1].calculatedOffset).toBeCloseTo(0.6, 5)
      expect(result[2].calculatedOffset).toBeCloseTo(0.6, 5)
    })

    it('should respect custom spacing configuration', () => {
      const dimensions = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(1, 0, 0), label: 'A' },
        { start: new THREE.Vector3(0.5, 0, 0), end: new THREE.Vector3(1.5, 0, 0), label: 'B' }
      ]

      const config: Partial<AutoDimensionSpacingConfig> = {
        baseOffset: 0.5,
        incrementStep: 0.3
      }

      const result = calculateAutoSpacing(dimensions, 'y', config)

      expect(result[0].calculatedOffset).toBe(0.5)
      expect(result[1].calculatedOffset).toBe(0.8)
    })

    it('should respect maxOffset limit', () => {
      const dimensions = Array.from({ length: 10 }, (_, i) => ({
        start: new THREE.Vector3(i * 0.1, 0, 0),
        end: new THREE.Vector3(i * 0.1 + 1, 0, 0),
        label: `Dim ${i}`
      }))

      const config: Partial<AutoDimensionSpacingConfig> = {
        baseOffset: 0.4,
        incrementStep: 0.2,
        maxOffset: 1.0
      }

      const result = calculateAutoSpacing(dimensions, 'y', config)

      result.forEach((dim) => {
        expect(dim.calculatedOffset).toBeLessThanOrEqual(1.0)
      })
    })

    it('should work with different offset directions', () => {
      const dimensions = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(0, 1, 0), label: 'A' }
      ]

      const resultX = calculateAutoSpacing(dimensions, 'x')
      const resultZ = calculateAutoSpacing(dimensions, 'z')

      expect(resultX[0].direction).toBe('x')
      expect(resultZ[0].direction).toBe('z')
    })

    it('should handle empty dimensions array', () => {
      const result = calculateAutoSpacing([], 'y')
      expect(result).toHaveLength(0)
    })

    it('should handle dimensions in z direction', () => {
      const dimensions = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(0, 0, 1), label: 'Z-Dim' }
      ]

      const result = calculateAutoSpacing(dimensions, 'x')

      expect(result).toHaveLength(1)
      expect(result[0].direction).toBe('x')
    })

    it('should correctly identify overlap with minSpacing consideration', () => {
      const dimensions = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(1, 0, 0), label: 'A' },
        { start: new THREE.Vector3(1.5, 0, 0), end: new THREE.Vector3(2.5, 0, 0), label: 'B' }
      ]

      const config: Partial<AutoDimensionSpacingConfig> = {
        minSpacing: 0.15
      }

      const result = calculateAutoSpacing(dimensions, 'y', config)

      expect(result[0].calculatedOffset).toBeCloseTo(result[1].calculatedOffset, 5)
    })

    it('should stack three overlapping dimensions correctly', () => {
      const dimensions = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(3, 0, 0), label: 'Total' },
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(1.5, 0, 0), label: 'First half' },
        { start: new THREE.Vector3(0.5, 0, 0), end: new THREE.Vector3(2.5, 0, 0), label: 'Middle' }
      ]

      const result = calculateAutoSpacing(dimensions, 'y')

      const offsets = result.map((r) => r.calculatedOffset)
      expect(new Set(offsets).size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('LeaderLine geometry calculations', () => {
    it('should calculate elbow point correctly for 45 degree angle', () => {
      const attachPoint = new THREE.Vector3(0, 0, 0)
      const leaderLength = 1
      const angleRad = (45 * Math.PI) / 180
      const direction = 1

      const elbowX = attachPoint.x + direction * leaderLength * Math.cos(angleRad)
      const elbowY = attachPoint.y + leaderLength * Math.sin(angleRad)

      expect(elbowX).toBeCloseTo(0.707, 2)
      expect(elbowY).toBeCloseTo(0.707, 2)
    })

    it('should calculate elbow point correctly for 30 degree angle', () => {
      const attachPoint = new THREE.Vector3(0, 0, 0)
      const leaderLength = 1
      const angleRad = (30 * Math.PI) / 180
      const direction = 1

      const elbowX = attachPoint.x + direction * leaderLength * Math.cos(angleRad)
      const elbowY = attachPoint.y + leaderLength * Math.sin(angleRad)

      expect(elbowX).toBeCloseTo(0.866, 2)
      expect(elbowY).toBeCloseTo(0.5, 2)
    })

    it('should calculate elbow point correctly for 60 degree angle', () => {
      const attachPoint = new THREE.Vector3(0, 0, 0)
      const leaderLength = 1
      const angleRad = (60 * Math.PI) / 180
      const direction = 1

      const elbowX = attachPoint.x + direction * leaderLength * Math.cos(angleRad)
      const elbowY = attachPoint.y + leaderLength * Math.sin(angleRad)

      expect(elbowX).toBeCloseTo(0.5, 2)
      expect(elbowY).toBeCloseTo(0.866, 2)
    })

    it('should flip elbow direction for left alignment', () => {
      const attachPoint = new THREE.Vector3(0, 0, 0)
      const leaderLength = 1
      const angleRad = (45 * Math.PI) / 180
      const direction = -1

      const elbowX = attachPoint.x + direction * leaderLength * Math.cos(angleRad)

      expect(elbowX).toBeCloseTo(-0.707, 2)
    })
  })

  describe('Chain dimension calculations', () => {
    it('should calculate total length correctly', () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(3, 0, 0),
        new THREE.Vector3(6, 0, 0)
      ]

      const segments = []
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({
          start: points[i],
          end: points[i + 1],
          length: points[i].distanceTo(points[i + 1])
        })
      }

      const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0)

      expect(totalLength).toBe(6)
    })

    it('should calculate segment lengths correctly', () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(3, 0, 0)
      ]

      const length1 = points[0].distanceTo(points[1])
      const length2 = points[1].distanceTo(points[2])

      expect(length1).toBe(1)
      expect(length2).toBe(2)
    })
  })

  describe('Baseline dimension calculations', () => {
    it('should sort points by distance from baseline', () => {
      const baseline = new THREE.Vector3(0, 0, 0)
      const points = [
        { position: new THREE.Vector3(3, 0, 0), label: 'C' },
        { position: new THREE.Vector3(1, 0, 0), label: 'A' },
        { position: new THREE.Vector3(2, 0, 0), label: 'B' }
      ]

      const sorted = [...points].sort((a, b) => {
        const distA = baseline.distanceTo(a.position)
        const distB = baseline.distanceTo(b.position)
        return distA - distB
      })

      expect(sorted[0].label).toBe('A')
      expect(sorted[1].label).toBe('B')
      expect(sorted[2].label).toBe('C')
    })

    it('should calculate correct offset for each level', () => {
      const baseOffset = 0.5
      const spacingIncrement = 0.25

      const offsets = [0, 1, 2].map((idx) => baseOffset + idx * spacingIncrement)

      expect(offsets[0]).toBe(0.5)
      expect(offsets[1]).toBe(0.75)
      expect(offsets[2]).toBe(1.0)
    })
  })
})
