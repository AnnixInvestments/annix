'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Environment, ContactShadows, Tube, Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import { log } from '@/app/lib/logger'
import { FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs'

type StubOrientation = 'top' | 'bottom' | 'inside' | 'outside'

interface StubData {
  nominalBoreMm?: number
  length?: number
  locationFromFlange?: number
  hasFlange?: boolean
  orientation?: StubOrientation
  angleDegrees?: number
}

interface Props {
  nominalBore: number
  outerDiameter?: number
  wallThickness: number
  bendAngle: number
  bendType?: string
  tangent1?: number
  tangent2?: number
  materialName?: string
  numberOfSegments?: number
  stubs?: StubData[]
  flangeConfig?: string
  closureLengthMm?: number
  addBlankFlange?: boolean
  blankFlangePositions?: string[]
  savedCameraPosition?: [number, number, number]
  savedCameraTarget?: [number, number, number]
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void
  selectedNotes?: string[]
  flangeSpecs?: FlangeSpecData | null
  flangeStandardName?: string
  pressureClassDesignation?: string
  flangeTypeCode?: string
  centerToFaceMm?: number
  bendRadiusMm?: number
  bendItemType?: string
  duckfootBasePlateXMm?: number
  duckfootBasePlateYMm?: number
  duckfootPlateThicknessT1Mm?: number
  duckfootRibThicknessT2Mm?: number
  duckfootGussetPointDDegrees?: number
  duckfootGussetPointCDegrees?: number
}

const SCALE = 200

const NB_TO_OD: Record<number, number> = {
  15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9,
  100: 114.3, 125: 139.7, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
  350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 550: 559.0, 600: 609.6
}

const nbToOd = (nb: number): number => NB_TO_OD[nb] || nb * 1.05

const visualWallThickness = (od: number, actualWt: number): number => {
  const minVisualWt = od * 0.08
  return Math.max(actualWt, minVisualWt)
}

const pipeOuterMat = { color: '#2E8B57', metalness: 0.3, roughness: 0.5 }
const pipeInnerMat = { color: '#1a3a1a', metalness: 0.2, roughness: 0.7 }
const pipeEndMat = { color: '#4ADE80', metalness: 0.5, roughness: 0.3 }
const weldColor = { color: '#1a1a1a', metalness: 0.2, roughness: 0.9 }
const flangeColor = { color: '#444444', metalness: 0.6, roughness: 0.4 }
const blankFlangeColor = { color: '#cc3300', metalness: 0.6, roughness: 0.4 }

const FLANGE_DATA: { [key: number]: { flangeOD: number; pcd: number; boltHoles: number; holeID: number; boltSize: number; boltLength: number; thickness: number } } = {
  15: { flangeOD: 95, pcd: 65, boltHoles: 4, holeID: 14, boltSize: 12, boltLength: 55, thickness: 14 },
  20: { flangeOD: 105, pcd: 75, boltHoles: 4, holeID: 14, boltSize: 12, boltLength: 55, thickness: 14 },
  25: { flangeOD: 115, pcd: 85, boltHoles: 4, holeID: 14, boltSize: 12, boltLength: 55, thickness: 14 },
  32: { flangeOD: 140, pcd: 100, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 65, thickness: 16 },
  40: { flangeOD: 150, pcd: 110, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 65, thickness: 16 },
  50: { flangeOD: 165, pcd: 125, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 70, thickness: 18 },
  65: { flangeOD: 185, pcd: 145, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 70, thickness: 18 },
  80: { flangeOD: 200, pcd: 160, boltHoles: 8, holeID: 18, boltSize: 16, boltLength: 70, thickness: 18 },
  100: { flangeOD: 220, pcd: 180, boltHoles: 8, holeID: 18, boltSize: 16, boltLength: 70, thickness: 18 },
  125: { flangeOD: 250, pcd: 210, boltHoles: 8, holeID: 18, boltSize: 16, boltLength: 75, thickness: 20 },
  150: { flangeOD: 285, pcd: 240, boltHoles: 8, holeID: 22, boltSize: 20, boltLength: 80, thickness: 20 },
  200: { flangeOD: 340, pcd: 295, boltHoles: 12, holeID: 22, boltSize: 20, boltLength: 85, thickness: 22 },
  250: { flangeOD: 405, pcd: 355, boltHoles: 12, holeID: 26, boltSize: 24, boltLength: 95, thickness: 24 },
  300: { flangeOD: 460, pcd: 410, boltHoles: 12, holeID: 26, boltSize: 24, boltLength: 95, thickness: 24 },
  350: { flangeOD: 520, pcd: 470, boltHoles: 16, holeID: 26, boltSize: 24, boltLength: 100, thickness: 26 },
  400: { flangeOD: 580, pcd: 525, boltHoles: 16, holeID: 30, boltSize: 27, boltLength: 110, thickness: 28 },
  450: { flangeOD: 640, pcd: 585, boltHoles: 20, holeID: 30, boltSize: 27, boltLength: 110, thickness: 28 },
  500: { flangeOD: 670, pcd: 620, boltHoles: 20, holeID: 26, boltSize: 24, boltLength: 115, thickness: 32 },
  600: { flangeOD: 780, pcd: 725, boltHoles: 20, holeID: 30, boltSize: 27, boltLength: 120, thickness: 32 },
}

const resolveFlangeData = (nb: number, apiSpecs?: FlangeSpecData | null): { specs: { flangeOD: number; pcd: number; boltHoles: number; holeID: number; boltSize: number; boltLength: number; thickness: number }; isFromApi: boolean } => {
  if (apiSpecs) {
    return {
      specs: {
        flangeOD: apiSpecs.flangeOdMm,
        pcd: apiSpecs.flangePcdMm,
        boltHoles: apiSpecs.flangeNumHoles,
        holeID: apiSpecs.flangeBoltHoleDiameterMm,
        boltSize: apiSpecs.boltDiameterMm || 16,
        boltLength: apiSpecs.boltLengthMm || 70,
        thickness: apiSpecs.flangeThicknessMm || 20,
      },
      isFromApi: true,
    }
  }
  return {
    specs: FLANGE_DATA[nb] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nb).pop() || 200],
    isFromApi: false,
  }
}

class ArcCurve extends THREE.Curve<THREE.Vector3> {
  center: THREE.Vector3
  radius: number
  startAngle: number
  endAngle: number

  constructor(center: THREE.Vector3, radius: number, startAngle: number, endAngle: number) {
    super()
    this.center = center
    this.radius = radius
    this.startAngle = startAngle
    this.endAngle = endAngle
  }

  getPoint(t: number): THREE.Vector3 {
    const angle = this.startAngle + t * (this.endAngle - this.startAngle)
    return new THREE.Vector3(
      this.center.x + this.radius * Math.cos(angle),
      this.center.y,
      this.center.z + this.radius * Math.sin(angle)
    )
  }
}

const HollowStraightPipe = ({
  start,
  end,
  outerR,
  innerR,
  capStart = true,
  capEnd = true
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  outerR: number
  innerR: number
  capStart?: boolean
  capEnd?: boolean
}) => {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dir = direction.clone().normalize()

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return q
  }, [dir.x, dir.y, dir.z])

  const euler = useMemo(() => new THREE.Euler().setFromQuaternion(quaternion), [quaternion])

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[outerR, outerR, length, 32, 1, true]} />
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[innerR, innerR, length, 32, 1, true]} />
        <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
      </mesh>
      {capEnd && (
        <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[innerR, outerR, 32]} />
          <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
        </mesh>
      )}
      {capStart && (
        <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[innerR, outerR, 32]} />
          <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

const HollowBendPipe = ({
  bendCenter,
  bendRadius,
  startAngle,
  endAngle,
  outerR,
  innerR
}: {
  bendCenter: THREE.Vector3
  bendRadius: number
  startAngle: number
  endAngle: number
  outerR: number
  innerR: number
}) => {
  const outerCurve = useMemo(() => {
    return new ArcCurve(bendCenter, bendRadius, startAngle, endAngle)
  }, [bendCenter, bendRadius, startAngle, endAngle])

  const innerCurve = useMemo(() => {
    return new ArcCurve(bendCenter, bendRadius, startAngle, endAngle)
  }, [bendCenter, bendRadius, startAngle, endAngle])

  const segments = 64

  return (
    <group>
      <Tube args={[outerCurve, segments, outerR, 32, false]}>
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </Tube>
      <Tube args={[innerCurve, segments, innerR, 32, false]}>
        <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
      </Tube>
    </group>
  )
}

const WeldRing = ({
  center,
  normal,
  radius,
  tube
}: {
  center: THREE.Vector3
  normal: THREE.Vector3
  radius: number
  tube: number
}) => {
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize())
    return q
  }, [normal.x, normal.y, normal.z])

  return (
    <mesh position={[center.x, center.y, center.z]} quaternion={quaternion}>
      <torusGeometry args={[radius, tube, 12, 32]} />
      <meshStandardMaterial {...weldColor} />
    </mesh>
  )
}

interface DimensionLineProps {
  start: THREE.Vector3
  end: THREE.Vector3
  label: string
  offset?: number
  color?: string
  hideEndExtension?: boolean
}

const DimensionLine = ({ start, end, label, offset = 0.5, color = '#333333', hideEndExtension = false }: DimensionLineProps) => {
  const offsetY = offset
  const startOffset = new THREE.Vector3(start.x, start.y + offsetY, start.z)
  const endOffset = new THREE.Vector3(end.x, end.y + offsetY, end.z)

  const midPoint = new THREE.Vector3().lerpVectors(startOffset, endOffset, 0.5)
  const direction = new THREE.Vector3().subVectors(endOffset, startOffset)
  const length = direction.length()

  if (length < 0.01) return null

  direction.normalize()

  const textRotationY = -Math.atan2(direction.z, direction.x)

  const arrowSize = Math.min(0.12, length * 0.15)
  const arrowAngle = Math.PI * 0.85

  const leftArrow1 = startOffset.clone().add(
    new THREE.Vector3(
      direction.x * Math.cos(arrowAngle) - direction.z * Math.sin(arrowAngle),
      0,
      direction.x * Math.sin(arrowAngle) + direction.z * Math.cos(arrowAngle)
    ).multiplyScalar(arrowSize)
  )
  const leftArrow2 = startOffset.clone().add(
    new THREE.Vector3(
      direction.x * Math.cos(-arrowAngle) - direction.z * Math.sin(-arrowAngle),
      0,
      direction.x * Math.sin(-arrowAngle) + direction.z * Math.cos(-arrowAngle)
    ).multiplyScalar(arrowSize)
  )

  const rightDir = direction.clone().negate()
  const rightArrow1 = endOffset.clone().add(
    new THREE.Vector3(
      rightDir.x * Math.cos(arrowAngle) - rightDir.z * Math.sin(arrowAngle),
      0,
      rightDir.x * Math.sin(arrowAngle) + rightDir.z * Math.cos(arrowAngle)
    ).multiplyScalar(arrowSize)
  )
  const rightArrow2 = endOffset.clone().add(
    new THREE.Vector3(
      rightDir.x * Math.cos(-arrowAngle) - rightDir.z * Math.sin(-arrowAngle),
      0,
      rightDir.x * Math.sin(-arrowAngle) + rightDir.z * Math.cos(-arrowAngle)
    ).multiplyScalar(arrowSize)
  )

  return (
    <group>
      <Line
        points={[[startOffset.x, startOffset.y, startOffset.z], [endOffset.x, endOffset.y, endOffset.z]]}
        color={color}
        lineWidth={3}
      />

      <Line
        points={[[startOffset.x, startOffset.y, startOffset.z], [leftArrow1.x, leftArrow1.y, leftArrow1.z]]}
        color={color}
        lineWidth={3}
      />
      <Line
        points={[[startOffset.x, startOffset.y, startOffset.z], [leftArrow2.x, leftArrow2.y, leftArrow2.z]]}
        color={color}
        lineWidth={3}
      />

      <Line
        points={[[endOffset.x, endOffset.y, endOffset.z], [rightArrow1.x, rightArrow1.y, rightArrow1.z]]}
        color={color}
        lineWidth={3}
      />
      <Line
        points={[[endOffset.x, endOffset.y, endOffset.z], [rightArrow2.x, rightArrow2.y, rightArrow2.z]]}
        color={color}
        lineWidth={3}
      />

      <Line
        points={[[start.x, start.y, start.z], [startOffset.x, startOffset.y, startOffset.z]]}
        color={color}
        lineWidth={2}
        dashed
        dashSize={0.03}
        gapSize={0.02}
      />
      {!hideEndExtension && (
        <Line
          points={[[end.x, end.y, end.z], [endOffset.x, endOffset.y, endOffset.z]]}
          color={color}
          lineWidth={2}
          dashed
          dashSize={0.03}
          gapSize={0.02}
        />
      )}

      <Text
        position={[midPoint.x, midPoint.y + 0.15, midPoint.z]}
        fontSize={0.18}
        color={color}
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
        rotation={[0, textRotationY, 0]}
      >
        {label}
      </Text>
    </group>
  )
}

class SaddleCurve extends THREE.Curve<THREE.Vector3> {
  stubRadius: number
  mainPipeRadius: number
  useXAxis: boolean

  constructor(stubRadius: number, mainPipeRadius: number, useXAxis: boolean = false) {
    super()
    this.stubRadius = stubRadius
    this.mainPipeRadius = mainPipeRadius
    this.useXAxis = useXAxis
  }

  getPoint(t: number): THREE.Vector3 {
    const theta = t * Math.PI * 2
    const r = this.stubRadius
    const R = this.mainPipeRadius

    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    const saddleCoord = this.useXAxis ? y : x
    const z = Math.sqrt(Math.max(0, R * R - saddleCoord * saddleCoord))

    return new THREE.Vector3(x, y, z)
  }
}

const SaddleWeld = ({
  stubRadius,
  mainPipeRadius,
  useXAxis,
  tube
}: {
  stubRadius: number
  mainPipeRadius: number
  useXAxis: boolean
  tube: number
}) => {
  const curve = useMemo(() => {
    return new SaddleCurve(stubRadius * 1.05, mainPipeRadius, useXAxis)
  }, [stubRadius, mainPipeRadius, useXAxis])

  return (
    <Tube args={[curve, 64, tube, 8, true]}>
      <meshStandardMaterial {...weldColor} />
    </Tube>
  )
}

const Flange = ({
  center,
  normal,
  pipeR,
  innerR,
  nb
}: {
  center: THREE.Vector3
  normal: THREE.Vector3
  pipeR: number
  innerR: number
  nb: number
}) => {
  const flangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nb).pop() || 200]
  const flangeR = (flangeSpecs.flangeOD / 2) / SCALE
  const thick = flangeR * 0.18
  const boltR = (flangeSpecs.pcd / 2) / SCALE
  const holeR = (flangeSpecs.holeID / 2) / SCALE
  const boltCount = flangeSpecs.boltHoles
  const boreR = pipeR * 1.02

  const faceGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, flangeR, 0, Math.PI * 2, false)

    const centerHole = new THREE.Path()
    centerHole.absarc(0, 0, boreR, 0, Math.PI * 2, true)
    shape.holes.push(centerHole)

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2
      const x = Math.cos(angle) * boltR
      const y = Math.sin(angle) * boltR
      const boltHole = new THREE.Path()
      boltHole.absarc(x, y, holeR, 0, Math.PI * 2, true)
      shape.holes.push(boltHole)
    }

    return new THREE.ShapeGeometry(shape, 32)
  }, [flangeR, boreR, boltR, holeR, boltCount])

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize())
    return q
  }, [normal.x, normal.y, normal.z])

  const euler = new THREE.Euler().setFromQuaternion(quaternion)

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[flangeR, flangeR, thick, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[boreR, boreR, thick, 32, 1, true]} />
        <meshStandardMaterial color="#111" side={THREE.BackSide} />
      </mesh>
      {Array.from({ length: boltCount }).map((_, i) => {
        const angle = (i / boltCount) * Math.PI * 2
        const hx = Math.cos(angle) * boltR
        const hz = Math.sin(angle) * boltR
        return (
          <mesh key={i} position={[hx, 0, hz]}>
            <cylinderGeometry args={[holeR, holeR, thick * 1.02, 16, 1, true]} />
            <meshStandardMaterial color="#000" side={THREE.BackSide} />
          </mesh>
        )
      })}
      <mesh geometry={faceGeometry} position={[0, thick / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={faceGeometry} position={[0, -thick / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const SaddleCutStubPipe = ({
  baseCenter,
  direction,
  length,
  outerR,
  innerR,
  mainPipeOuterR,
  nb,
  hasFlange = true
}: {
  baseCenter: THREE.Vector3
  direction: THREE.Vector3
  length: number
  outerR: number
  innerR: number
  mainPipeOuterR: number
  nb: number
  hasFlange?: boolean
}) => {
  const dir = direction.clone().normalize()
  const weldTube = outerR * 0.06
  const stubFlangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nb).pop() || 200]
  const stubFlangeThick = ((stubFlangeSpecs.flangeOD / 2) / SCALE) * 0.18
  const flangeOffset = stubFlangeThick / 2

  const saddleAxis = useMemo(() => {
    const isVertical = Math.abs(dir.y) > 0.7
    return isVertical ? 'y' : 'x'
  }, [dir.y])

  const outerTubeGeom = useMemo(() => {
    const segments = 32
    const radialSegments = 32
    const positions: number[] = []
    const indices: number[] = []

    const endZ = mainPipeOuterR + length

    for (let i = 0; i <= segments; i++) {
      const v = i / segments

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2
        const x = outerR * Math.cos(theta)
        const y = outerR * Math.sin(theta)

        const saddleCoord = saddleAxis === 'x' ? y : x
        const baseSaddleZ = Math.sqrt(Math.max(0, mainPipeOuterR * mainPipeOuterR - saddleCoord * saddleCoord))
        const z = baseSaddleZ + v * (endZ - baseSaddleZ)

        positions.push(x, y, z)
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j
        const b = a + radialSegments + 1
        const c = a + 1
        const d = b + 1

        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [outerR, mainPipeOuterR, length, saddleAxis])

  const innerTubeGeom = useMemo(() => {
    const segments = 32
    const radialSegments = 32
    const positions: number[] = []
    const indices: number[] = []

    const endZ = mainPipeOuterR + length

    for (let i = 0; i <= segments; i++) {
      const v = i / segments

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2
        const x = innerR * Math.cos(theta)
        const y = innerR * Math.sin(theta)

        const saddleCoord = saddleAxis === 'x' ? y : x
        const baseSaddleZ = Math.sqrt(Math.max(0, mainPipeOuterR * mainPipeOuterR - saddleCoord * saddleCoord))
        const z = baseSaddleZ + v * (endZ - baseSaddleZ)

        positions.push(x, y, z)
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j
        const b = a + radialSegments + 1
        const c = a + 1
        const d = b + 1

        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [innerR, mainPipeOuterR, length, saddleAxis])

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
    return q
  }, [dir.x, dir.y, dir.z])

  const endCenter = baseCenter.clone().add(dir.clone().multiplyScalar(length))

  return (
    <group position={[baseCenter.x, baseCenter.y, baseCenter.z]} quaternion={quaternion}>
      <mesh geometry={outerTubeGeom}>
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={innerTubeGeom}>
        <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
      </mesh>
      <SaddleWeld
        stubRadius={outerR}
        mainPipeRadius={mainPipeOuterR}
        useXAxis={saddleAxis === 'x'}
        tube={weldTube}
      />
      {hasFlange && (
        <Flange
          center={new THREE.Vector3(0, 0, mainPipeOuterR + length + flangeOffset)}
          normal={new THREE.Vector3(0, 0, 1)}
          pipeR={outerR}
          innerR={innerR}
          nb={nb}
        />
      )}
      {!hasFlange && (
        <mesh position={[0, 0, mainPipeOuterR + length]} rotation={[0, 0, 0]}>
          <ringGeometry args={[innerR, outerR, 32]} />
          <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

const StubPipe = ({
  baseCenter,
  direction,
  length,
  outerR,
  innerR,
  mainPipeOuterR,
  nb,
  hasFlange = true
}: {
  baseCenter: THREE.Vector3
  direction: THREE.Vector3
  length: number
  outerR: number
  innerR: number
  mainPipeOuterR?: number
  nb: number
  hasFlange?: boolean
}) => {
  if (mainPipeOuterR) {
    return (
      <SaddleCutStubPipe
        baseCenter={baseCenter}
        direction={direction}
        length={length}
        outerR={outerR}
        innerR={innerR}
        mainPipeOuterR={mainPipeOuterR}
        nb={nb}
        hasFlange={hasFlange}
      />
    )
  }

  const dir = direction.clone().normalize()
  const endCenter = baseCenter.clone().add(dir.clone().multiplyScalar(length))
  const weldTube = outerR * 0.06
  const stubFlangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nb).pop() || 200]
  const stubFlangeThick = ((stubFlangeSpecs.flangeOD / 2) / SCALE) * 0.18
  const flangeOffset = stubFlangeThick / 2

  return (
    <>
      <HollowStraightPipe
        start={baseCenter}
        end={endCenter}
        outerR={outerR}
        innerR={innerR}
        capStart={false}
        capEnd={!hasFlange}
      />
      <WeldRing center={baseCenter} normal={dir} radius={outerR * 1.05} tube={weldTube} />
      {hasFlange && (
        <Flange
          center={endCenter.clone().add(dir.clone().multiplyScalar(flangeOffset))}
          normal={dir}
          pipeR={outerR}
          innerR={innerR}
          nb={nb}
        />
      )}
    </>
  )
}

const CameraTracker = ({
  onCameraChange,
  onCameraUpdate,
  savedPosition,
  savedTarget
}: {
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void
  onCameraUpdate?: (position: [number, number, number], zoom: number) => void
  savedPosition?: [number, number, number]
  savedTarget?: [number, number, number]
}) => {
  const { camera, controls } = useThree()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')
  const pendingSaveKeyRef = useRef<string>('')
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    log.debug('CameraTracker useEffect', JSON.stringify({
      savedPosition,
      savedTarget,
      hasRestored: hasRestoredRef.current,
      hasControls: !!controls
    }))
    if (savedPosition && controls && !hasRestoredRef.current) {
      log.debug('CameraTracker restoring camera position', JSON.stringify({
        position: savedPosition,
        target: savedTarget
      }))
      camera.position.set(savedPosition[0], savedPosition[1], savedPosition[2])
      if (savedTarget) {
        const orbitControls = controls as any
        if (orbitControls.target) {
          orbitControls.target.set(savedTarget[0], savedTarget[1], savedTarget[2])
          orbitControls.update()
        }
      }
      hasRestoredRef.current = true
      const restoredKey = `${savedPosition[0].toFixed(2)},${savedPosition[1].toFixed(2)},${savedPosition[2].toFixed(2)}`
      lastSavedRef.current = restoredKey
      pendingSaveKeyRef.current = ''
    }
  }, [camera, controls, savedPosition, savedTarget])

  const frameCountRef = useRef(0)

  useFrame(() => {
    const distance = camera.position.length()
    if (onCameraUpdate) {
      onCameraUpdate(
        [camera.position.x, camera.position.y, camera.position.z],
        distance
      )
    }

    frameCountRef.current++
    if (frameCountRef.current % 60 === 0) {
      log.debug('CameraTracker useFrame check', JSON.stringify({
        hasOnCameraChange: !!onCameraChange,
        hasControls: !!controls,
        cameraPos: [camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2)],
        lastSaved: lastSavedRef.current
      }))
    }

    if (onCameraChange && controls) {
      const target = (controls as any).target
      if (target) {
        const currentKey = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`

        const needsNewSave = currentKey !== lastSavedRef.current && currentKey !== pendingSaveKeyRef.current

        if (needsNewSave) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }

          const posToSave = [camera.position.x, camera.position.y, camera.position.z] as [number, number, number]
          const targetToSave = [target.x, target.y, target.z] as [number, number, number]
          const keyToSave = currentKey
          pendingSaveKeyRef.current = keyToSave

          log.debug('CameraTracker setting timeout for', keyToSave)

          saveTimeoutRef.current = setTimeout(() => {
            log.debug('CameraTracker timeout fired, saving', JSON.stringify({
              position: posToSave,
              target: targetToSave,
              key: keyToSave
            }))
            lastSavedRef.current = keyToSave
            pendingSaveKeyRef.current = ''
            onCameraChange(posToSave, targetToSave)
          }, 500)
        }
      }
    }
  })

  return null
}

const BlankFlange = ({
  center,
  normal,
  pipeR,
  nb
}: {
  center: THREE.Vector3
  normal: THREE.Vector3
  pipeR: number
  nb: number
}) => {
  const flangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nb).pop() || 200]
  const flangeR = (flangeSpecs.flangeOD / 2) / SCALE
  const thick = flangeR * 0.18
  const boltR = (flangeSpecs.pcd / 2) / SCALE
  const holeR = (flangeSpecs.holeID / 2) / SCALE
  const boltCount = flangeSpecs.boltHoles

  const faceGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, flangeR, 0, Math.PI * 2, false)

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2
      const x = Math.cos(angle) * boltR
      const y = Math.sin(angle) * boltR
      const boltHole = new THREE.Path()
      boltHole.absarc(x, y, holeR, 0, Math.PI * 2, true)
      shape.holes.push(boltHole)
    }

    return new THREE.ShapeGeometry(shape, 32)
  }, [flangeR, boltR, holeR, boltCount])

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize())
    return q
  }, [normal.x, normal.y, normal.z])

  const euler = new THREE.Euler().setFromQuaternion(quaternion)

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[flangeR, flangeR, thick, 32, 1, true]} />
        <meshStandardMaterial {...blankFlangeColor} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: boltCount }).map((_, i) => {
        const angle = (i / boltCount) * Math.PI * 2
        const hx = Math.cos(angle) * boltR
        const hz = Math.sin(angle) * boltR
        return (
          <mesh key={i} position={[hx, 0, hz]}>
            <cylinderGeometry args={[holeR, holeR, thick * 1.02, 16, 1, true]} />
            <meshStandardMaterial color="#000" side={THREE.BackSide} />
          </mesh>
        )
      })}
      <mesh geometry={faceGeometry} position={[0, thick / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial {...blankFlangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={faceGeometry} position={[0, -thick / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial {...blankFlangeColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const Scene = (props: Props) => {
  const {
    nominalBore,
    outerDiameter,
    wallThickness,
    bendAngle,
    tangent1 = 0,
    tangent2 = 0,
    numberOfSegments,
    stubs = [],
    flangeConfig = 'PE',
    addBlankFlange = false,
    blankFlangePositions = [],
    centerToFaceMm,
    bendRadiusMm,
    bendItemType,
    duckfootBasePlateXMm,
    duckfootBasePlateYMm,
    duckfootPlateThicknessT1Mm,
    duckfootRibThicknessT2Mm,
    duckfootGussetPointDDegrees,
    duckfootGussetPointCDegrees
  } = props

  log.debug('CSGBend3DPreview Scene props', {
    nominalBore,
    outerDiameter,
    wallThickness,
    bendAngle,
    tangent1,
    tangent2,
    numberOfSegments,
    stubCount: stubs.length,
    flangeConfig
  })

  const odMm = outerDiameter || nbToOd(nominalBore)
  const wtMm = visualWallThickness(odMm, wallThickness || 6)

  const outerR = odMm / SCALE / 2
  const innerR = (odMm - 2 * wtMm) / SCALE / 2
  const bendR = (nominalBore * 1.5) / SCALE

  const angleRad = (bendAngle * Math.PI) / 180

  const t1 = tangent1 / SCALE
  const t2 = tangent2 / SCALE

  const config = flangeConfig.toUpperCase()
  const hasInletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(config)
  const hasOutletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(config)

  const flangeSpecs = FLANGE_DATA[nominalBore] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nominalBore).pop() || 200]
  const flangeThickScaled = ((flangeSpecs.flangeOD / 2) / SCALE) * 0.18
  const flangeOffset = flangeThickScaled / 2

  const weldTube = outerR * 0.05
  const isSegmentedBend = numberOfSegments !== undefined && numberOfSegments > 1

  const inletStart = new THREE.Vector3(0, 0, 0)
  const inletEnd = new THREE.Vector3(0, 0, t1)
  const inletDir = new THREE.Vector3(0, 0, 1)

  const bendCenter = new THREE.Vector3(-bendR, 0, t1)
  const bendStartAngle = 0
  const bendEndAngle = angleRad

  const bendEndPoint = new THREE.Vector3(
    bendCenter.x + bendR * Math.cos(bendEndAngle),
    0,
    bendCenter.z + bendR * Math.sin(bendEndAngle)
  )

  const outletDir = new THREE.Vector3(
    -Math.sin(angleRad),
    0,
    Math.cos(angleRad)
  )
  const outletEnd = bendEndPoint.clone().add(outletDir.clone().multiplyScalar(t2))

  const stubsData = useMemo(() => {
    return stubs
      .filter((s) => s.locationFromFlange != null && s.length != null && s.nominalBoreMm != null)
      .map((s) => {
        const sOd = nbToOd(s.nominalBoreMm!)
        const sWt = visualWallThickness(sOd, wtMm * 0.8)
        const distFromFlange = s.locationFromFlange! / SCALE

        return {
          distFromFlange,
          outerR: sOd / SCALE / 2,
          innerR: (sOd - 2 * sWt) / SCALE / 2,
          length: s.length! / SCALE,
          nb: s.nominalBoreMm!,
          orientation: s.orientation || 'outside',
          angleDegrees: s.angleDegrees ?? 0
        }
      })
  }, [stubs, wtMm])

  const isDuckfoot = bendItemType === 'DUCKFOOT_BEND'
  const duckfootRotation: [number, number, number] = isDuckfoot ? [Math.PI / 2, 0, -Math.PI / 2] : [0, 0, 0]

  const duckfootYOffset = isDuckfoot ? 4 : 0

  return (
    <Center>
      <group rotation={duckfootRotation} position={[0, duckfootYOffset, 0]}>
        {t1 > 0 && (
          <>
            <HollowStraightPipe
              start={inletStart}
              end={inletEnd}
              outerR={outerR}
              innerR={innerR}
              capStart={!hasInletFlange}
              capEnd={false}
            />
            {!isSegmentedBend && (
              <WeldRing center={inletEnd} normal={inletDir} radius={outerR * 1.02} tube={weldTube} />
            )}
          </>
        )}

        <HollowBendPipe
          bendCenter={bendCenter}
          bendRadius={bendR}
          startAngle={bendStartAngle}
          endAngle={bendEndAngle}
          outerR={outerR}
          innerR={innerR}
        />

        {/* Degree markers on extrados (outside radius) every 5 degrees - LOCKED for duckfoot bends only */}
        {isDuckfoot && Array.from({ length: 19 }).map((_, i) => {
          const degrees = i * 5;
          const markerAngleRad = (degrees * Math.PI) / 180;

          if (markerAngleRad > angleRad) return null;

          const tickInnerR = bendR + outerR * 1.05;
          const tickOuterR = bendR + outerR * 1.25;
          const textR = bendR + outerR * 1.45;

          const tickInnerPos = new THREE.Vector3(
            bendCenter.x + tickInnerR * Math.cos(markerAngleRad),
            0,
            bendCenter.z + tickInnerR * Math.sin(markerAngleRad)
          );
          const tickOuterPos = new THREE.Vector3(
            bendCenter.x + tickOuterR * Math.cos(markerAngleRad),
            0,
            bendCenter.z + tickOuterR * Math.sin(markerAngleRad)
          );
          const textPos = new THREE.Vector3(
            bendCenter.x + textR * Math.cos(markerAngleRad),
            0,
            bendCenter.z + textR * Math.sin(markerAngleRad)
          );

          return (
            <group key={`deg-${degrees}`}>
              <Line
                points={[[tickInnerPos.x, tickInnerPos.y, tickInnerPos.z], [tickOuterPos.x, tickOuterPos.y, tickOuterPos.z]]}
                color="#cc0000"
                lineWidth={3}
              />
              <Text
                position={[textPos.x, textPos.y, textPos.z]}
                fontSize={0.18}
                color="#cc0000"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                rotation={[Math.PI / 2, 0, markerAngleRad + Math.PI]}
              >
                {degrees}°
              </Text>
            </group>
          );
        })}

        {numberOfSegments && numberOfSegments > 1 && Array.from({ length: numberOfSegments - 1 }).map((_, i) => {
          const segAngle = angleRad / numberOfSegments
          const weldAngle = (i + 1) * segAngle
          const weldPos = new THREE.Vector3(
            bendCenter.x + bendR * Math.cos(weldAngle),
            0,
            bendCenter.z + bendR * Math.sin(weldAngle)
          )
          const tangentDir = new THREE.Vector3(
            -Math.sin(weldAngle),
            0,
            Math.cos(weldAngle)
          ).normalize()

          return (
            <WeldRing
              key={i}
              center={weldPos}
              normal={tangentDir}
              radius={outerR * 1.02}
              tube={weldTube}
            />
          )
        })}

        {!isSegmentedBend && (
          <WeldRing center={bendEndPoint} normal={outletDir} radius={outerR * 1.02} tube={weldTube} />
        )}

        {t2 > 0 && (
          <HollowStraightPipe
            start={bendEndPoint}
            end={outletEnd}
            outerR={outerR}
            innerR={innerR}
            capStart={false}
            capEnd={!hasOutletFlange}
          />
        )}

        {(() => {
          const cfMm = centerToFaceMm || 0;

          const ip = new THREE.Vector3(0, 0, t1 + bendR);

          return (
            <>
              {t1 > 0 && (
                <DimensionLine
                  start={inletStart}
                  end={inletEnd}
                  label={`T1: ${tangent1}mm`}
                  offset={outerR * 2.5}
                  color="#0066cc"
                />
              )}

              {t2 > 0 && (
                <DimensionLine
                  start={bendEndPoint}
                  end={outletEnd}
                  label={`T2: ${tangent2}mm`}
                  offset={outerR * 2.5}
                  color="#cc0000"
                />
              )}

              {cfMm > 0 && (
                <DimensionLine
                  start={inletStart}
                  end={ip}
                  label={`C/F: ${cfMm}mm`}
                  offset={outerR * 3.5}
                  color="#cc6600"
                  hideEndExtension
                />
              )}

              {cfMm > 0 && (
                <DimensionLine
                  start={outletEnd}
                  end={ip}
                  label={`C/F: ${cfMm}mm`}
                  offset={outerR * 3.5}
                  color="#cc6600"
                  hideEndExtension
                />
              )}
            </>
          );
        })()}

        {stubsData.map((stub, i) => {
          const isOutletStub = i === 1
          const tangentLength = isOutletStub ? t2 : t1

          if (tangentLength <= 0) return null

          const tangentStart = isOutletStub ? bendEndPoint : inletStart
          const tangentDir = isOutletStub ? outletDir : inletDir
          const stubCenterOnAxis = tangentStart.clone().add(tangentDir.clone().multiplyScalar(stub.distFromFlange))

          const orientationDir = (() => {
            const angleRad = (stub.angleDegrees * Math.PI) / 180

            const yUp = new THREE.Vector3(0, 1, 0)
            const perpHorizontal = new THREE.Vector3().crossVectors(tangentDir, yUp).normalize()

            if (perpHorizontal.length() < 0.01) {
              perpHorizontal.set(1, 0, 0)
            }

            const baseUp = yUp.clone()
            const rotatedDir = baseUp.clone()
              .multiplyScalar(Math.cos(angleRad))
              .add(perpHorizontal.clone().multiplyScalar(Math.sin(angleRad)))
              .normalize()

            return rotatedDir
          })()

          const stubEnd = stubCenterOnAxis.clone().add(orientationDir.clone().multiplyScalar(stub.length))
          const distFromFlangeScaled = stub.distFromFlange
          const stubLengthMm = Math.round(stub.length * SCALE)
          const distFromFlangeMm = Math.round(distFromFlangeScaled * SCALE)

          const stubSideOffset = (() => {
            const perpDir = new THREE.Vector3().crossVectors(orientationDir, tangentDir).normalize()
            if (perpDir.length() < 0.01) {
              return new THREE.Vector3(1, 0, 0).multiplyScalar(stub.outerR * 3)
            }
            return perpDir.multiplyScalar(stub.outerR * 3)
          })()

          const weldPoint = stubCenterOnAxis.clone()
          const flangePoint = stubEnd.clone()
          const dimLineWeld = weldPoint.clone().add(stubSideOffset)
          const dimLineFlange = flangePoint.clone().add(stubSideOffset)

          return (
            <group key={i}>
              <StubPipe
                baseCenter={stubCenterOnAxis}
                direction={orientationDir}
                length={stub.length}
                outerR={stub.outerR}
                innerR={stub.innerR}
                mainPipeOuterR={outerR}
                nb={stub.nb}
              />

              <DimensionLine
                start={tangentStart}
                end={stubCenterOnAxis}
                label={`Stub${i + 1} dist: ${distFromFlangeMm}mm`}
                offset={outerR * 1.5}
                color="#009900"
              />

              <Line
                points={[[dimLineFlange.x, dimLineFlange.y, dimLineFlange.z], [dimLineWeld.x, dimLineWeld.y, dimLineWeld.z]]}
                color="#990099"
                lineWidth={3}
              />
              <Line
                points={[[flangePoint.x, flangePoint.y, flangePoint.z], [dimLineFlange.x, dimLineFlange.y, dimLineFlange.z]]}
                color="#990099"
                lineWidth={2}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              <Line
                points={[[weldPoint.x, weldPoint.y, weldPoint.z], [dimLineWeld.x, dimLineWeld.y, dimLineWeld.z]]}
                color="#990099"
                lineWidth={2}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              <Text
                position={[
                  (dimLineFlange.x + dimLineWeld.x) / 2 + stubSideOffset.x * 0.3,
                  (dimLineFlange.y + dimLineWeld.y) / 2 + stubSideOffset.y * 0.3,
                  (dimLineFlange.z + dimLineWeld.z) / 2 + stubSideOffset.z * 0.3
                ]}
                fontSize={0.18}
                color="#990099"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                rotation={[0, -Math.atan2(orientationDir.z, orientationDir.x), 0]}
              >
                {`${stubLengthMm}mm`}
              </Text>
            </group>
          )
        })}

        {hasInletFlange && (
          <Flange
            center={new THREE.Vector3(0, 0, -flangeOffset)}
            normal={new THREE.Vector3(0, 0, -1)}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        )}

        {hasOutletFlange && (
          <Flange
            center={t2 > 0
              ? outletEnd.clone().add(outletDir.clone().multiplyScalar(flangeOffset))
              : bendEndPoint.clone().add(outletDir.clone().multiplyScalar(flangeOffset))
            }
            normal={outletDir}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        )}

        {addBlankFlange && blankFlangePositions.includes('inlet') && hasInletFlange && (() => {
          const blankOffset = flangeOffset + flangeThickScaled * 2 + 0.05
          return (
            <BlankFlange
              center={new THREE.Vector3(0, 0, -blankOffset)}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              nb={nominalBore}
            />
          )
        })()}

        {addBlankFlange && blankFlangePositions.includes('outlet') && hasOutletFlange && (() => {
          const blankOffset = flangeOffset + flangeThickScaled * 2 + 0.05
          const basePoint = t2 > 0 ? outletEnd : bendEndPoint
          return (
            <BlankFlange
              center={basePoint.clone().add(outletDir.clone().multiplyScalar(blankOffset))}
              normal={outletDir}
              pipeR={outerR}
              nb={nominalBore}
            />
          )
        })()}


        <axesHelper args={[1]} />
      </group>

      {/* Duckfoot Base Plate and Gusset Ribs - OUTSIDE rotation group to stay horizontal */}
      {isDuckfoot && (() => {
        const duckfootDefaults: Record<number, { x: number; y: number; t1: number; t2: number; h: number }> = {
          200: { x: 355, y: 230, t1: 6, t2: 10, h: 255 },
          250: { x: 405, y: 280, t1: 6, t2: 10, h: 280 },
          300: { x: 460, y: 330, t1: 6, t2: 10, h: 305 },
          350: { x: 510, y: 380, t1: 8, t2: 12, h: 330 },
          400: { x: 560, y: 430, t1: 8, t2: 12, h: 355 },
          450: { x: 610, y: 485, t1: 8, t2: 12, h: 380 },
          500: { x: 660, y: 535, t1: 10, t2: 14, h: 405 },
          550: { x: 710, y: 585, t1: 10, t2: 14, h: 430 },
          600: { x: 760, y: 635, t1: 10, t2: 14, h: 460 },
          650: { x: 815, y: 693, t1: 12, t2: 16, h: 485 },
          700: { x: 865, y: 733, t1: 12, t2: 16, h: 510 },
          750: { x: 915, y: 793, t1: 12, t2: 16, h: 535 },
          800: { x: 970, y: 833, t1: 14, t2: 18, h: 560 },
          850: { x: 1020, y: 883, t1: 14, t2: 18, h: 585 },
          900: { x: 1070, y: 933, t1: 14, t2: 18, h: 610 }
        };
        const defaults = duckfootDefaults[nominalBore] || { x: 500, y: 400, t1: 10, t2: 12, h: 400 };

        const basePlateXDim = (duckfootBasePlateXMm || defaults.x) / SCALE;
        const basePlateYDim = (duckfootBasePlateYMm || defaults.y) / SCALE;
        const ribThickness = (duckfootPlateThicknessT1Mm || defaults.t1) / SCALE;
        const plateThickness = (duckfootRibThicknessT2Mm || defaults.t2) / SCALE;
        const ribHeightH = defaults.h / SCALE;

        const basePlateColor = { color: '#555555', metalness: 0.6, roughness: 0.4 };
        const ribColor = { color: '#666666', metalness: 0.5, roughness: 0.5 };

        const steelworkX = 0;
        const steelworkY = -ribHeightH;
        const steelworkZ = 0;


        return (
          <group position={[steelworkX, steelworkY, steelworkZ]}>
            {/* Base Plate - horizontal at bottom (X and Y swapped) */}
            <mesh position={[0, -plateThickness / 2, 0]}>
              <boxGeometry args={[basePlateYDim, plateThickness, basePlateXDim]} />
              <meshStandardMaterial {...basePlateColor} />
            </mesh>

            {/* Base plate dimension labels - all 4 sides labeled */}
            <Text
              position={[0, 0.02, basePlateXDim / 2 + 0.1]}
              fontSize={0.3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[-Math.PI / 2, 0, 0]}
            >
              Y
            </Text>
            <Text
              position={[0, 0.02, -basePlateXDim / 2 - 0.1]}
              fontSize={0.3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[-Math.PI / 2, 0, Math.PI]}
            >
              W
            </Text>
            <Text
              position={[basePlateYDim / 2 + 0.1, 0.02, 0]}
              fontSize={0.3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            >
              X
            </Text>
            <Text
              position={[-basePlateYDim / 2 - 0.1, 0.02, 0]}
              fontSize={0.3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
            >
              Z
            </Text>

            {/* Rib running X direction - uses Y dimension for width */}
            <mesh position={[0, ribHeightH / 2, 0]}>
              <boxGeometry args={[basePlateYDim, ribHeightH, ribThickness]} />
              <meshStandardMaterial {...ribColor} />
            </mesh>



            {/* Gusset plate 2 (blue) - extends from base plate to top, spans full width along X */}
            {(() => {
              const gusset2Shape = new THREE.Shape();
              const gusset2Width = basePlateYDim;
              const gusset2Height = ribHeightH + bendR * 0.9;

              gusset2Shape.moveTo(0, 0);
              gusset2Shape.lineTo(-gusset2Width, 0);
              gusset2Shape.lineTo(-gusset2Width, gusset2Height);
              gusset2Shape.lineTo(0, gusset2Height);
              gusset2Shape.lineTo(0, 0);

              return (
                <mesh
                  position={[-basePlateYDim / 2, 0, 0]}
                  rotation={[0, Math.PI, 0]}
                >
                  <extrudeGeometry args={[gusset2Shape, { depth: ribThickness, bevelEnabled: false }]} />
                  <meshStandardMaterial color="#0066cc" metalness={0.5} roughness={0.5} />
                </mesh>
              );
            })()}

            {/* Yellow saddle support plate - simple 4-sided plate */}
            {/* A side: bottom at W, top at 15°. B side: bottom at Y, top at 75° */}
            {(() => {
              const yellowThickness = 30 / SCALE;
              const plateWidth = basePlateXDim;

              const extradosR = bendR + outerR;
              const pipeBottomY = ribHeightH;

              const aTopAngleDegrees = duckfootGussetPointDDegrees || 15;
              const bTopAngleDegrees = duckfootGussetPointCDegrees || 75;

              // World Z positions for the degree markers
              const aMarkerZ = extradosR * Math.sin((aTopAngleDegrees * Math.PI) / 180);
              const bMarkerZ = extradosR * Math.sin((bTopAngleDegrees * Math.PI) / 180);
              const markerMidZ = (aMarkerZ + bMarkerZ) / 2;
              const markerSpan = bMarkerZ - aMarkerZ;

              // The plate has width = plateWidth, we'll scale the top edge to span from 15° to 75°
              // Bottom stays at base plate edges, top is scaled to match markers

              // Bottom corners at base plate edges (in shape X coordinates)
              const aBottomX = plateWidth / 2; // W side
              const bBottomX = -plateWidth / 2; // Y side

              // Top corners: map marker Z positions back to shape X
              // After rotation [0, π/2, 0]: shape X → world -Z, so shape X = -world Z
              // But we need to account for plate position offset
              const plateZOffset = markerMidZ; // Position plate at midpoint of markers

              // Shape X = -(world Z - plateZOffset) = plateZOffset - world Z
              const aTopX = plateZOffset - aMarkerZ; // 15° position in shape coords
              const bTopX = plateZOffset - bMarkerZ; // 75° position in shape coords

              // Compute Y positions (height) at the degree positions
              const aTopY = pipeBottomY + extradosR * (1 - Math.cos((aTopAngleDegrees * Math.PI) / 180));
              const bTopY = pipeBottomY + extradosR * (1 - Math.cos((bTopAngleDegrees * Math.PI) / 180));

              // Simple 4-sided shape: quadrilateral
              const yellowShape = new THREE.Shape();

              // Start at A bottom (W side of base plate)
              yellowShape.moveTo(aBottomX, 0);

              // Go to A top (15° marker)
              yellowShape.lineTo(aTopX, Math.max(0.1, aTopY));

              // Straight line to B top (75° marker)
              yellowShape.lineTo(bTopX, Math.max(0.1, bTopY));

              // Go to B bottom (Y side of base plate)
              yellowShape.lineTo(bBottomX, 0);

              // Close back to A bottom
              yellowShape.closePath();

              const labelHeight = 0.15;

              return (
                <group>
                  <mesh
                    position={[0, 0, 0]}
                    rotation={[0, (3 * Math.PI) / 2, 0]}
                  >
                    <extrudeGeometry args={[yellowShape, { depth: yellowThickness, bevelEnabled: false }]} />
                    <meshStandardMaterial color="#cc8800" metalness={0.5} roughness={0.5} />
                  </mesh>
                  {/* Side labels for yellow gusset - positioned outside base plate area */}
                  <Text
                    position={[yellowThickness + 0.1, labelHeight, -plateWidth / 2 - 0.3]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                    rotation={[0, Math.PI / 2, 0]}
                  >
                    A
                  </Text>
                  <Text
                    position={[yellowThickness + 0.1, labelHeight, plateWidth / 2 + 0.3]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                    rotation={[0, -Math.PI / 2, 0]}
                  >
                    B
                  </Text>
                  {/* C label - top corner above A (15° marker) */}
                  <Text
                    position={[yellowThickness + 0.1, aTopY + 0.3, aTopX]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                    rotation={[0, Math.PI / 2, 0]}
                  >
                    C
                  </Text>
                  {/* D label - top corner above B (75° marker) */}
                  <Text
                    position={[yellowThickness + 0.1, bTopY + 0.3, bTopX]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                    rotation={[0, -Math.PI / 2, 0]}
                  >
                    D
                  </Text>
                </group>
              );
            })()}

          </group>
        );
      })()}
    </Center>
  )
}

export default function CSGBend3DPreview(props: Props) {
  const [hidden, setHidden] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(0)
  const [liveCamera, setLiveCamera] = useState<[number, number, number]>([0, 0, 0])

  if (hidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border px-3 py-2 flex justify-between">
        <span className="text-sm text-gray-600">3D Preview</span>
        <button onClick={() => setHidden(false)} className="text-xs text-blue-600">Show</button>
      </div>
    )
  }

  const odMm = props.outerDiameter || nbToOd(props.nominalBore)
  const bendR = (props.nominalBore * 1.5) / SCALE
  const t1 = (props.tangent1 || 0) / SCALE
  const t2 = (props.tangent2 || 0) / SCALE
  const angleRad = (props.bendAngle * Math.PI) / 180
  const isDuckfootBend = props.bendItemType === 'DUCKFOOT_BEND'

  const bendEndX = -bendR + bendR * Math.cos(angleRad)
  const bendEndZ = t1 + bendR * Math.sin(angleRad)
  const outletEndZ = bendEndZ + Math.cos(angleRad) * t2
  const outletEndX = bendEndX + (-Math.sin(angleRad)) * t2

  const minX = Math.min(0, bendEndX, outletEndX, -bendR)
  const maxX = Math.max(0, bendEndX, outletEndX, odMm / SCALE)
  const minZ = Math.min(0, bendEndZ, outletEndZ)
  const maxZ = Math.max(t1, bendEndZ, outletEndZ)

  const boundingWidth = maxX - minX
  const boundingDepth = maxZ - minZ
  const diagonalExtent = Math.sqrt(boundingWidth ** 2 + boundingDepth ** 2)

  let autoCameraPosition: [number, number, number]

  if (isDuckfootBend) {
    const verticalExtent = boundingDepth + bendR
    const horizontalExtent = Math.max(boundingWidth, bendR * 2)
    const extent = Math.sqrt(horizontalExtent ** 2 + verticalExtent ** 2)
    const autoCameraDistance = Math.max(extent * 2.5, 6)
    autoCameraPosition = [0.01, -extent * 1.5, autoCameraDistance]
  } else {
    const autoCameraDistance = Math.max(diagonalExtent * 2, 5)
    const autoCameraHeight = autoCameraDistance * 0.6
    const autoCameraZ = autoCameraDistance * 1.2
    autoCameraPosition = [autoCameraDistance * 0.5, autoCameraHeight, autoCameraZ]
  }

  const cameraPosition = props.savedCameraPosition || autoCameraPosition

  return (
    <div className="w-full h-[500px] bg-slate-50 rounded-md border overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: cameraPosition, fov: 45 }}>
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Environment preset="city" />
        <Scene {...props} />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={15} />
        <OrbitControls makeDefault enablePan />
        <CameraTracker
          onCameraChange={props.onCameraChange}
          onCameraUpdate={(pos, zoom) => {
            setLiveCamera(pos)
            setCurrentZoom(zoom)
          }}
          savedPosition={props.savedCameraPosition}
          savedTarget={props.savedCameraTarget}
        />
      </Canvas>

      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded">
        <span className="text-purple-700 font-medium">Hollow Pipe Preview</span>
      </div>

      {props.numberOfSegments && props.numberOfSegments > 1 && (() => {
        const bendRadius = props.nominalBore * 1.5;
        const degreesPerSeg = props.bendAngle / props.numberOfSegments;
        const arcLengthPerSeg = (bendRadius * Math.PI * degreesPerSeg) / 180;
        const totalArcLength = (bendRadius * Math.PI * props.bendAngle) / 180;
        return (
          <div className="absolute top-10 left-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-orange-200 leading-snug max-w-[180px]">
            <div className="font-bold text-orange-800 mb-0.5">SEGMENTED BEND</div>
            <div className="text-gray-900 font-medium">Total: {props.bendAngle}° / {totalArcLength.toFixed(0)}mm arc</div>
            <div className="text-gray-700">Segments: {props.numberOfSegments}</div>
            <div className="text-gray-700">Per segment: {degreesPerSeg.toFixed(1)}°</div>
            <div className="text-gray-700">Seg length: {arcLengthPerSeg.toFixed(0)}mm</div>
            <div className="text-orange-700 font-medium mt-0.5">Mitre welds: {props.numberOfSegments - 1}</div>
          </div>
        );
      })()}

      <div className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-gray-200 leading-snug">
        <div className="font-bold text-blue-800 mb-0.5">BEND</div>
        <div className="text-gray-900 font-medium">OD: {odMm.toFixed(0)}mm | ID: {(odMm - 2 * props.wallThickness).toFixed(0)}mm</div>
        <div className="text-gray-700">WT: {props.wallThickness}mm | {props.bendAngle}°</div>
        <div className="text-gray-700">T1: {props.tangent1 || 0}mm | T2: {props.tangent2 || 0}mm</div>
        {props.stubs && props.stubs.length > 0 && (
          <div className="text-gray-700">
            Stubs: {props.stubs.map((stub, i) => `${stub.length}mm`).join(' | ')}
          </div>
        )}
        {props.flangeConfig && props.flangeConfig !== 'PE' && (() => {
          const { specs: flangeSpecs, isFromApi } = resolveFlangeData(props.nominalBore, props.flangeSpecs);
          const config = (props.flangeConfig || 'PE').toUpperCase();
          const standardName = props.flangeStandardName || 'SABS 1123';
          const isNonSabsStandard = !standardName.toLowerCase().includes('sabs') && !standardName.toLowerCase().includes('sans');
          const showFallbackWarning = !isFromApi && isNonSabsStandard;
          return (
            <>
              <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE ({config})</div>
              {showFallbackWarning && (
                <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                  Data not available for {standardName} - showing SABS 1123 reference values
                </div>
              )}
              {flangeSpecs && (
                <>
                  <div className="text-gray-900 font-medium">OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm</div>
                  <div className="text-gray-700">Holes: {flangeSpecs.boltHoles} × Ø{flangeSpecs.holeID}mm</div>
                  <div className="text-gray-700">Bolts: {flangeSpecs.boltHoles} × M{flangeSpecs.boltSize} × {flangeSpecs.boltLength}mm</div>
                  <div className="text-gray-700">Thickness: {flangeSpecs.thickness}mm</div>
                  <div className={showFallbackWarning ? "text-orange-600 font-medium" : "text-green-700 font-medium"}>
                    {(() => {
                      const designation = props.pressureClassDesignation || '';
                      const flangeType = props.flangeTypeCode || '';
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
                      return `${standardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
            </>
          );
        })()}
        {props.stubs && props.stubs.length > 0 && (
          <div className="text-purple-700 font-medium mt-0.5">{props.stubs.length} stub(s)</div>
        )}
      </div>

      {/* Notes Section - bottom left */}
      {props.selectedNotes && props.selectedNotes.length > 0 && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-slate-200 max-w-[300px] max-h-[120px] overflow-y-auto">
          <div className="font-bold text-slate-700 mb-1">NOTES</div>
          <ol className="list-decimal list-inside space-y-0.5">
            {props.selectedNotes.map((note, i) => (
              <li key={i} className="text-gray-700 leading-tight">{note}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {showDebug && (
          <div className="text-[10px] text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm font-mono">
            z:{currentZoom.toFixed(1)}, cam:[{liveCamera[0].toFixed(1)},{liveCamera[1].toFixed(1)},{liveCamera[2].toFixed(1)}], bbox:{boundingWidth.toFixed(1)}x{boundingDepth.toFixed(1)}
          </div>
        )}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-[10px] text-slate-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-slate-100"
          title={showDebug ? 'Hide debug info' : 'Show debug info'}
        >
          dbg
        </button>
        <button onClick={() => setExpanded(true)} className="text-xs text-blue-600 bg-white px-2 py-1 rounded shadow">Expand</button>
        <button onClick={() => setHidden(true)} className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">Hide</button>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div className="relative w-full h-full max-w-[95vw] max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setExpanded(false)} className="absolute top-4 right-4 z-[10001] bg-white p-2 rounded-full shadow">✕</button>
            <Canvas shadows dpr={[1, 2]} camera={{ position: cameraPosition, fov: 40 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[10, 10, 10]} intensity={1} castShadow />
              <pointLight position={[-5, 5, -5]} intensity={0.5} />
              <Environment preset="city" />
              <Scene {...props} />
              <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={15} />
              <OrbitControls makeDefault enablePan />
              <CameraTracker
                onCameraChange={props.onCameraChange}
                onCameraUpdate={(pos, zoom) => {
                  setLiveCamera(pos)
                  setCurrentZoom(zoom)
                }}
                savedPosition={props.savedCameraPosition}
                savedTarget={props.savedCameraTarget}
              />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg">
              <div className="font-bold text-blue-800 mb-1">BEND</div>
              <div className="text-gray-900 font-medium">OD: {odMm.toFixed(0)}mm | ID: {(odMm - 2 * props.wallThickness).toFixed(0)}mm</div>
              <div className="text-gray-700">WT: {props.wallThickness}mm | {props.bendAngle}°</div>
              <div className="text-gray-700">T1: {props.tangent1 || 0}mm | T2: {props.tangent2 || 0}mm</div>
              {props.stubs && props.stubs.length > 0 && (
                <div className="text-gray-700">
                  Stubs: {props.stubs.map((stub) => `${stub.length}mm`).join(' | ')}
                </div>
              )}
              {props.flangeConfig && props.flangeConfig !== 'PE' && (() => {
                const { specs: flangeSpecs, isFromApi } = resolveFlangeData(props.nominalBore, props.flangeSpecs);
                const config = (props.flangeConfig || 'PE').toUpperCase();
                const standardName = props.flangeStandardName || 'SABS 1123';
                const isNonSabsStandard = !standardName.toLowerCase().includes('sabs') && !standardName.toLowerCase().includes('sans');
                const showFallbackWarning = !isFromApi && isNonSabsStandard;
                return (
                  <>
                    <div className="font-bold text-blue-800 mt-2 mb-1">FLANGE ({config})</div>
                    {showFallbackWarning && (
                      <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                        Data not available for {standardName} - showing SABS 1123 reference values
                      </div>
                    )}
                    {flangeSpecs && (
                      <>
                        <div className="text-gray-900 font-medium">OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm</div>
                        <div className="text-gray-700">Holes: {flangeSpecs.boltHoles} × Ø{flangeSpecs.holeID}mm</div>
                        <div className="text-gray-700">Bolts: {flangeSpecs.boltHoles} × M{flangeSpecs.boltSize} × {flangeSpecs.boltLength}mm</div>
                        <div className="text-gray-700">Thickness: {flangeSpecs.thickness}mm</div>
                        <div className={showFallbackWarning ? "text-orange-600 font-medium" : "text-green-700 font-medium"}>
                          {(() => {
                            const designation = props.pressureClassDesignation || '';
                            const flangeType = props.flangeTypeCode || '';
                            const pressureMatch = designation.match(/^(\d+)/);
                            const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
                            return `${standardName} T${pressureValue}${flangeType}`;
                          })()}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Segmented bend info in expanded view */}
            {props.numberOfSegments && props.numberOfSegments > 1 && (() => {
              const bendRadius = props.nominalBore * 1.5;
              const degreesPerSeg = props.bendAngle / props.numberOfSegments;
              const arcLengthPerSeg = (bendRadius * Math.PI * degreesPerSeg) / 180;
              const totalArcLength = (bendRadius * Math.PI * props.bendAngle) / 180;
              return (
                <div className="absolute top-4 left-[280px] text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg border border-orange-200">
                  <div className="font-bold text-orange-800 mb-1">SEGMENTED BEND</div>
                  <div className="text-gray-900 font-medium">Total: {props.bendAngle}° / {totalArcLength.toFixed(0)}mm arc</div>
                  <div className="text-gray-700">Segments: {props.numberOfSegments}</div>
                  <div className="text-gray-700">Per segment: {degreesPerSeg.toFixed(1)}°</div>
                  <div className="text-gray-700">Seg length: {arcLengthPerSeg.toFixed(0)}mm</div>
                  <div className="text-orange-700 font-medium mt-1">Mitre welds: {props.numberOfSegments - 1}</div>
                </div>
              );
            })()}

            {/* Controls hint */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-white/80 bg-black/50 px-4 py-2 rounded-full">
              Drag to rotate • Scroll to zoom • Right-click to pan
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
