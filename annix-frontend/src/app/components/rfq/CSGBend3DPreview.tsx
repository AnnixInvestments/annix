'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Environment, ContactShadows, Tube, Text } from '@react-three/drei'
import * as THREE from 'three'
import { log } from '@/app/lib/logger'
import { FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs'

interface SimpleLineProps {
  points: Array<[number, number, number]>
  color?: string
  lineWidth?: number
  dashed?: boolean
  dashSize?: number
  gapSize?: number
}

function CaptureHelper({ captureRef }: { captureRef: React.MutableRefObject<(() => string | null) | null> }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    captureRef.current = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    return () => { captureRef.current = null }
  }, [gl, scene, camera, captureRef])

  return null
}

const Line = ({ points, color = '#000000', lineWidth = 1, dashed = false, dashSize = 0.1, gapSize = 0.1 }: SimpleLineProps) => {
  const tubeGeo = useMemo(() => {
    if (points.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p[0], p[1], p[2])),
      false,
      'catmullrom',
      0
    )
    const tubeRadius = lineWidth * 0.01
    return new THREE.TubeGeometry(curve, Math.max(points.length * 4, 8), tubeRadius, 6, false)
  }, [points, lineWidth])

  if (!tubeGeo) return null

  return (
    <mesh geometry={tubeGeo} renderOrder={999}>
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  )
}

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
  isSegmented?: boolean
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
  sweepTeePipeALengthMm?: number
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
const flangeColor = { color: '#888888', metalness: 0.6, roughness: 0.4 }
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
  700: { flangeOD: 895, pcd: 840, boltHoles: 24, holeID: 30, boltSize: 27, boltLength: 125, thickness: 34 },
  750: { flangeOD: 960, pcd: 900, boltHoles: 24, holeID: 33, boltSize: 30, boltLength: 130, thickness: 36 },
  800: { flangeOD: 1015, pcd: 950, boltHoles: 24, holeID: 33, boltSize: 30, boltLength: 135, thickness: 38 },
  850: { flangeOD: 1075, pcd: 1010, boltHoles: 28, holeID: 33, boltSize: 30, boltLength: 140, thickness: 40 },
  900: { flangeOD: 1130, pcd: 1060, boltHoles: 28, holeID: 36, boltSize: 33, boltLength: 145, thickness: 42 },
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

const SegmentedBendPipe = ({
  bendCenter,
  bendRadius,
  startAngle,
  endAngle,
  outerR,
  innerR,
  numberOfSegments
}: {
  bendCenter: THREE.Vector3
  bendRadius: number
  startAngle: number
  endAngle: number
  outerR: number
  innerR: number
  numberOfSegments: number
}) => {
  const weldTube = outerR * 0.06

  const segmentsData = useMemo(() => {
    const totalAngle = endAngle - startAngle
    const segmentAngle = totalAngle / numberOfSegments
    const data: Array<{
      startPos: THREE.Vector3
      endPos: THREE.Vector3
      midAngle: number
      weldPos?: THREE.Vector3
      weldNormal?: THREE.Vector3
    }> = []

    for (let i = 0; i < numberOfSegments; i++) {
      const segStart = startAngle + i * segmentAngle
      const segEnd = startAngle + (i + 1) * segmentAngle
      const segMid = (segStart + segEnd) / 2

      const startPos = new THREE.Vector3(
        bendCenter.x + bendRadius * Math.cos(segStart),
        bendCenter.y,
        bendCenter.z + bendRadius * Math.sin(segStart)
      )
      const endPos = new THREE.Vector3(
        bendCenter.x + bendRadius * Math.cos(segEnd),
        bendCenter.y,
        bendCenter.z + bendRadius * Math.sin(segEnd)
      )

      const segment: {
        startPos: THREE.Vector3
        endPos: THREE.Vector3
        midAngle: number
        weldPos?: THREE.Vector3
        weldNormal?: THREE.Vector3
      } = { startPos, endPos, midAngle: segMid }

      if (i < numberOfSegments - 1) {
        segment.weldPos = endPos.clone()
        const weldAngle = segEnd
        segment.weldNormal = new THREE.Vector3(
          -Math.sin(weldAngle),
          0,
          Math.cos(weldAngle)
        ).normalize()
      }

      data.push(segment)
    }

    return data
  }, [bendCenter, bendRadius, startAngle, endAngle, numberOfSegments])

  return (
    <group>
      {segmentsData.map((seg, i) => {
        const direction = seg.endPos.clone().sub(seg.startPos)
        const length = direction.length()
        const midPoint = seg.startPos.clone().add(direction.clone().multiplyScalar(0.5))

        const quaternion = new THREE.Quaternion()
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())

        const weldQuaternion = seg.weldNormal ? (() => {
          const q = new THREE.Quaternion()
          q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), seg.weldNormal)
          return q
        })() : undefined

        return (
          <group key={i}>
            <mesh position={[midPoint.x, midPoint.y, midPoint.z]} quaternion={quaternion}>
              <cylinderGeometry args={[outerR, outerR, length, 32, 1, true]} />
              <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[midPoint.x, midPoint.y, midPoint.z]} quaternion={quaternion}>
              <cylinderGeometry args={[innerR, innerR, length, 32, 1, true]} />
              <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
            </mesh>
            {seg.weldPos && seg.weldNormal && weldQuaternion && (
              <mesh position={[seg.weldPos.x, seg.weldPos.y, seg.weldPos.z]} quaternion={weldQuaternion}>
                <torusGeometry args={[outerR * 1.02, weldTube, 12, 32]} />
                <meshStandardMaterial {...weldColor} />
              </mesh>
            )}
          </group>
        )
      })}
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
  const boreR = innerR * 1.02
  const weldTube = pipeR * 0.06

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
        <meshStandardMaterial color="#555" side={THREE.BackSide} />
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
      {/* Outer weld ring - where flange meets pipe on outside */}
      <mesh position={[0, -thick / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pipeR * 1.02, weldTube, 12, 32]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      {/* Inner weld ring - where flange bore meets pipe inside */}
      <mesh position={[0, -thick / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[innerR * 0.98, weldTube, 12, 32]} />
        <meshStandardMaterial {...weldColor} />
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
  mainPipeDirection,
  stubAngleDegrees = 0,
  nb,
  hasFlange = true
}: {
  baseCenter: THREE.Vector3
  direction: THREE.Vector3
  length: number
  outerR: number
  innerR: number
  mainPipeOuterR: number
  mainPipeDirection?: THREE.Vector3
  stubAngleDegrees?: number
  nb: number
  hasFlange?: boolean
}) => {
  const dir = direction.clone().normalize()
  const weldTube = outerR * 0.06
  const stubFlangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nb).pop() || 200]
  const stubFlangeThick = ((stubFlangeSpecs.flangeOD / 2) / SCALE) * 0.18
  const flangeOffset = stubFlangeThick / 2

  const saddleAxis = useMemo(() => {
    const normalizedAngle = ((stubAngleDegrees % 360) + 360) % 360
    const isNear0or180 = normalizedAngle < 22.5 || normalizedAngle > 337.5 ||
                         (normalizedAngle > 157.5 && normalizedAngle < 202.5)
    const isNear90or270 = (normalizedAngle > 67.5 && normalizedAngle < 112.5) ||
                          (normalizedAngle > 247.5 && normalizedAngle < 292.5)
    if (isNear0or180) return 'x'
    if (isNear90or270) return 'x'
    return 'x'
  }, [stubAngleDegrees])

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
  mainPipeDirection,
  stubAngleDegrees = 0,
  nb,
  hasFlange = true
}: {
  baseCenter: THREE.Vector3
  direction: THREE.Vector3
  length: number
  outerR: number
  innerR: number
  mainPipeOuterR?: number
  mainPipeDirection?: THREE.Vector3
  stubAngleDegrees?: number
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
        mainPipeDirection={mainPipeDirection}
        stubAngleDegrees={stubAngleDegrees}
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
    const hasValidPosition = savedPosition &&
      typeof savedPosition[0] === 'number' &&
      typeof savedPosition[1] === 'number' &&
      typeof savedPosition[2] === 'number'
    if (hasValidPosition && controls && !hasRestoredRef.current) {
      log.debug('CameraTracker restoring camera position', JSON.stringify({
        position: savedPosition,
        target: savedTarget
      }))
      camera.position.set(savedPosition[0], savedPosition[1], savedPosition[2])
      if (savedTarget && typeof savedTarget[0] === 'number' && typeof savedTarget[1] === 'number' && typeof savedTarget[2] === 'number') {
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

const RetainingRing = ({
  center,
  normal,
  pipeR,
  innerR,
  wallThickness
}: {
  center: THREE.Vector3
  normal: THREE.Vector3
  pipeR: number
  innerR: number
  wallThickness: number
}) => {
  const ringOuterR = pipeR * 1.15
  const ringInnerR = pipeR
  const ringThick = wallThickness
  const tubeRadius = (ringOuterR - ringInnerR) / 2
  const torusRadius = ringInnerR + tubeRadius

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize())
    return q
  }, [normal.x, normal.y, normal.z])

  const euler = new THREE.Euler().setFromQuaternion(quaternion)

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <torusGeometry args={[torusRadius, tubeRadius, 16, 32]} />
        <meshStandardMaterial color="#b0b0b0" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  )
}

const RotatingFlange = ({
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
  const boreR = innerR * 1.05

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
  }, [flangeR, boltR, holeR, boltCount, boreR])

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

const Scene = (props: Props) => {
  const {
    nominalBore,
    outerDiameter,
    wallThickness,
    bendAngle,
    tangent1 = 0,
    tangent2 = 0,
    numberOfSegments,
    isSegmented = false,
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
    duckfootGussetPointCDegrees,
    sweepTeePipeALengthMm,
    closureLengthMm = 0
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
  // Use bendRadiusMm prop if provided, otherwise default to 1.5 * NB
  const bendR = (bendRadiusMm || nominalBore * 1.5) / SCALE

  const angleRad = (bendAngle * Math.PI) / 180

  const t1 = tangent1 / SCALE
  const t2 = tangent2 / SCALE

  const config = flangeConfig.toUpperCase()
  const hasInletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(config)
  const hasOutletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(config)

  const hasLooseInletFlange = config === 'FOE_LF' || config === '2XLF'
  const hasLooseOutletFlange = config === '2XLF'

  const hasRotatingInletFlange = config === 'FOE_RF' || config === '2X_RF'
  const hasRotatingOutletFlange = config === '2X_RF'

  const rotatingFlangeOffset = 80 / SCALE
  const wtScaled = (wallThickness || 6) / SCALE

  const fittingHasInletFlange = ['FAE', 'F2E', 'F2E_LF', 'F2E_RF', '3X_RF', '2X_RF_FOE'].includes(config)
  const fittingHasOutletFlange = ['FAE', 'F2E', 'F2E_LF', 'F2E_RF', '3X_RF', '2X_RF_FOE'].includes(config)
  const fittingHasBranchFlange = ['FAE', 'F2E_LF', 'F2E_RF', '3X_RF', '2X_RF_FOE'].includes(config)

  const fittingHasLooseInletFlange = config === 'F2E_LF'
  const fittingHasLooseOutletFlange = config === 'F2E_LF'
  const fittingHasRotatingInletFlange = ['F2E_RF', '3X_RF', '2X_RF_FOE'].includes(config)
  const fittingHasRotatingOutletFlange = ['F2E_RF', '3X_RF', '2X_RF_FOE'].includes(config)
  const fittingHasRotatingBranchFlange = config === '3X_RF'

  const closureLength = (closureLengthMm || 150) / SCALE
  const gapLength = 100 / SCALE

  const flangeSpecs = FLANGE_DATA[nominalBore] || FLANGE_DATA[Object.keys(FLANGE_DATA).map(Number).filter(k => k <= nominalBore).pop() || 200]
  const flangeThickScaled = ((flangeSpecs.flangeOD / 2) / SCALE) * 0.18
  const flangeOffset = flangeThickScaled / 2 * 0.8

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
  const isSweepTee = bendItemType === 'SWEEP_TEE'
  const defaultPipeALengthMm = nominalBore * 3
  const effectivePipeALengthMm = sweepTeePipeALengthMm || (isSweepTee ? defaultPipeALengthMm : 0)
  const pipeALength = effectivePipeALengthMm / SCALE
  const duckfootRotation: [number, number, number] = isDuckfoot ? [Math.PI / 2, 0, -Math.PI / 2] : [0, 0, 0]

  const duckfootYOffset = isDuckfoot ? 4 : 0
  const bendPositionAdjustY = isDuckfoot ? -2.3 : 0
  const bendPositionAdjustZ = isDuckfoot ? -2.2 : 0

  return (
    <Center>
      <group rotation={duckfootRotation} position={[0, duckfootYOffset + bendPositionAdjustY, bendPositionAdjustZ]}>
        {/* Inlet tangent section - hide for sweep tees since Pipe A replaces it */}
        {t1 > 0 && !isSweepTee && (
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

        {/* Standard bend - hide for sweep tees which have their own geometry */}
        {!isSweepTee && (
          <HollowBendPipe
            bendCenter={bendCenter}
            bendRadius={bendR}
            startAngle={bendStartAngle}
            endAngle={bendEndAngle}
            outerR={outerR}
            innerR={innerR}
          />
        )}

        {/* Degree markers on extrados (outside radius) every 5 degrees - LOCKED for duckfoot bends only */}
        {/* Hide markers when C/F dimension lines are shown to avoid duplicate angle labels */}
        {isDuckfoot && !centerToFaceMm && Array.from({ length: 19 }).map((_, i) => {
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

        {/* Segment welds - hide for sweep tees */}
        {!isSweepTee && numberOfSegments && numberOfSegments > 1 && Array.from({ length: numberOfSegments - 1 }).map((_, i) => {
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

        {/* Outlet weld - hide for sweep tees */}
        {!isSweepTee && !isSegmentedBend && (
          <WeldRing center={bendEndPoint} normal={outletDir} radius={outerR * 1.02} tube={weldTube} />
        )}

        {/* Outlet tangent - hide for sweep tees */}
        {!isSweepTee && t2 > 0 && (
          <HollowStraightPipe
            start={bendEndPoint}
            end={outletEnd}
            outerR={outerR}
            innerR={innerR}
            capStart={false}
            capEnd={!hasOutletFlange}
          />
        )}

        {/* ========== SWEEP TEE GEOMETRY ==========
            Based on MPS Technical Manual page 32:
            - Pipe A is the HORIZONTAL main run with FLANGES ON BOTH ENDS
            - The sweep/bend emerges from the TOP of Pipe A (saddle connection)
            - The EXTRADOS (outside of bend curve) connects to Pipe A for smooth material flow
            - The bend curves from horizontal (parallel to Pipe A) to vertical (pointing up)
            - The outlet flange is at the top, pointing straight up */}
        {isSweepTee && (() => {
          const pipeAHalfLength = pipeALength / 2
          const pipeALeftEnd = new THREE.Vector3(0, 0, -pipeAHalfLength)
          const pipeARightEnd = new THREE.Vector3(0, 0, pipeAHalfLength)

          // Bend geometry calculation:
          // HollowBendPipe creates bends in the XZ plane by default.
          // At angle 0: centerline at (bendR, 0, 0) from center, tangent +Z
          // At angle 90: centerline at (0, 0, bendR) from center, tangent -X
          //
          // We need a bend in the YZ plane: tangent +Z at start, tangent +Y at end
          // Rotating -90° around Z transforms: (x, y, z) → (y, -x, z)
          //
          // For a proper saddle connection where the bend MERGES into Pipe A:
          // - The extrados (outer curve) merges into the top of Pipe A
          // - The bend curves TOWARD the viewer (-Z direction)
          // - Adding 180° Y rotation flips the bend to curve in -Z direction
          //
          // Position the bend at the right end of Pipe A, against the flange
          const bendZOffset = pipeAHalfLength
          //
          // For -90° Z rotation: local (x, y, z) → world (y, -x, z)
          const localBendCenter = new THREE.Vector3(-bendR, 0, 0)

          // End of bend position in world coordinates:
          // With 180° Y rotation, the bend curves toward -Z, so end is at z = bendZOffset - bendR
          const sweepEndPos = new THREE.Vector3(0, bendR, bendZOffset - bendR)
          const sweepEndDir = new THREE.Vector3(0, 1, 0)

          return (
            <>
              {/* Pipe A - horizontal main run along Z axis */}
              <HollowStraightPipe
                start={pipeALeftEnd}
                end={pipeARightEnd}
                outerR={outerR}
                innerR={innerR}
                capStart={!fittingHasInletFlange}
                capEnd={!fittingHasOutletFlange}
              />

              {/* Left flange on Pipe A (inlet) */}
              {fittingHasInletFlange && (
                fittingHasLooseInletFlange ? (
                  <>
                    {/* Black closure piece connected directly to pipe end */}
                    <mesh position={[0, 0, -pipeAHalfLength - closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                      <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 0, -pipeAHalfLength - closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
                      <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                    </mesh>
                    <Flange
                      center={new THREE.Vector3(0, 0, -pipeAHalfLength - closureLength - gapLength)}
                      normal={new THREE.Vector3(0, 0, -1)}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  </>
                ) : fittingHasRotatingInletFlange ? (
                  <>
                    <RetainingRing
                      center={pipeALeftEnd}
                      normal={new THREE.Vector3(0, 0, -1)}
                      pipeR={outerR}
                      innerR={innerR}
                      wallThickness={wtScaled}
                    />
                    <RotatingFlange
                      center={pipeALeftEnd.clone().add(new THREE.Vector3(0, 0, rotatingFlangeOffset))}
                      normal={new THREE.Vector3(0, 0, -1)}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  </>
                ) : (
                  <Flange
                    center={pipeALeftEnd.clone().add(new THREE.Vector3(0, 0, -flangeOffset))}
                    normal={new THREE.Vector3(0, 0, -1)}
                    pipeR={outerR}
                    innerR={innerR}
                    nb={nominalBore}
                  />
                )
              )}

              {/* Right flange on Pipe A (outlet) */}
              {fittingHasOutletFlange && (
                fittingHasLooseOutletFlange ? (
                  <>
                    {/* Black closure piece connected directly to pipe end */}
                    <mesh position={[0, 0, pipeAHalfLength + closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                      <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 0, pipeAHalfLength + closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
                      <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                    </mesh>
                    <Flange
                      center={new THREE.Vector3(0, 0, pipeAHalfLength + closureLength + gapLength)}
                      normal={new THREE.Vector3(0, 0, 1)}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  </>
                ) : fittingHasRotatingOutletFlange ? (
                  <>
                    <RetainingRing
                      center={pipeARightEnd}
                      normal={new THREE.Vector3(0, 0, 1)}
                      pipeR={outerR}
                      innerR={innerR}
                      wallThickness={wtScaled}
                    />
                    <RotatingFlange
                      center={pipeARightEnd.clone().add(new THREE.Vector3(0, 0, -rotatingFlangeOffset))}
                      normal={new THREE.Vector3(0, 0, 1)}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  </>
                ) : (
                  <Flange
                    center={pipeARightEnd.clone().add(new THREE.Vector3(0, 0, flangeOffset))}
                    normal={new THREE.Vector3(0, 0, 1)}
                    pipeR={outerR}
                    innerR={innerR}
                    nb={nominalBore}
                  />
                )
              )}

              {/* Sweep branch - 90° bend with extrados connecting to top of Pipe A */}
              {/* Position shifts bend right, 180° Y flips to curve toward viewer, -90° Z puts in YZ plane */}
              <group position={[0, 0, bendZOffset]} rotation={[0, Math.PI, -Math.PI / 2]}>
                {isSegmented && numberOfSegments && numberOfSegments > 1 ? (
                  <SegmentedBendPipe
                    bendCenter={localBendCenter}
                    bendRadius={bendR}
                    startAngle={0}
                    endAngle={Math.PI / 2}
                    outerR={outerR}
                    innerR={innerR}
                    numberOfSegments={numberOfSegments}
                  />
                ) : (
                  <HollowBendPipe
                    bendCenter={localBendCenter}
                    bendRadius={bendR}
                    startAngle={0}
                    endAngle={Math.PI / 2}
                    outerR={outerR}
                    innerR={innerR}
                  />
                )}
              </group>

              {/* Branch flange at top of sweep - pointing straight up */}
              {fittingHasBranchFlange && (
                fittingHasRotatingBranchFlange ? (
                  <>
                    <RetainingRing
                      center={sweepEndPos}
                      normal={sweepEndDir}
                      pipeR={outerR}
                      innerR={innerR}
                      wallThickness={wtScaled}
                    />
                    <RotatingFlange
                      center={sweepEndPos.clone().sub(sweepEndDir.clone().multiplyScalar(rotatingFlangeOffset))}
                      normal={sweepEndDir}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  </>
                ) : (
                  <Flange
                    center={sweepEndPos.clone().add(sweepEndDir.clone().multiplyScalar(flangeOffset))}
                    normal={sweepEndDir}
                    pipeR={outerR}
                    innerR={innerR}
                    nb={nominalBore}
                  />
                )
              )}

              {/* Saddle weld at junction where sweep bend meets Pipe A */}
              {/* Positioned at the top of Pipe A where the bend emerges */}
              <group position={[0, outerR, bendZOffset]} rotation={[Math.PI / 2, 0, 0]}>
                <SaddleWeld
                  stubRadius={outerR}
                  mainPipeRadius={outerR}
                  useXAxis={false}
                  tube={weldTube}
                />
              </group>

              {/* Dimension line for Pipe A length (B dimension in MPS table) */}
              <DimensionLine
                start={pipeALeftEnd}
                end={pipeARightEnd}
                label={`B: ${effectivePipeALengthMm}mm`}
                offset={outerR * 2.5}
                color="#009900"
              />

              {/* Dimension lines - L-shape with horizontal at top and vertical on right */}
              {(() => {
                const cfValue = centerToFaceMm || Math.round(bendR * SCALE)
                const cfScaled = cfValue / SCALE
                const aLineZ = pipeAHalfLength + outerR * 1.2
                const aLineBottom = 0
                const aLineTop = cfScaled
                const cornerPos: [number, number, number] = [0, aLineBottom, aLineZ]
                const arcRadius = 30
                const sweepAngleRad = Math.PI / 2

                return (
                  <>
                    {/* Horizontal line at top (from left flange to corner) */}
                    <Line
                      points={[
                        [0, aLineTop, -pipeAHalfLength],
                        [0, aLineTop, aLineZ]
                      ]}
                      color="#cc6600"
                      lineWidth={3}
                    />
                    {/* Vertical line on right (from corner to top) */}
                    <Line
                      points={[
                        [0, aLineBottom, aLineZ],
                        [0, aLineTop, aLineZ]
                      ]}
                      color="#cc6600"
                      lineWidth={3}
                    />
                    {/* C/F label on horizontal line */}
                    <Text
                      position={[outerR * 0.3, aLineTop, 0]}
                      fontSize={outerR * 0.35}
                      color="#cc6600"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                      rotation={[0, -Math.PI / 2, 0]}
                    >
                      {`C/F: ${cfValue}mm`}
                    </Text>
                    {/* 3D 90° angle arc at corner */}
                    {(() => {
                      const arcRadius3D = outerR * 0.8
                      const arcSegments = 32
                      const arcPoints: [number, number, number][] = []

                      for (let i = 0; i <= arcSegments; i++) {
                        const t = i / arcSegments
                        const currentAngle = t * (Math.PI / 2)
                        arcPoints.push([
                          0,
                          arcRadius3D * Math.sin(currentAngle),
                          aLineZ - arcRadius3D * (1 - Math.cos(currentAngle))
                        ])
                      }

                      const textPos = new THREE.Vector3(
                        0,
                        arcRadius3D * 0.4,
                        aLineZ - arcRadius3D * 0.4
                      )

                      return (
                        <>
                          <Line
                            points={arcPoints}
                            color="#cc6600"
                            lineWidth={2}
                          />
                          <Text
                            position={[textPos.x + 0.01, textPos.y, textPos.z]}
                            fontSize={outerR * 0.4}
                            color="#cc6600"
                            anchorX="center"
                            anchorY="middle"
                            fontWeight="bold"
                            rotation={[0, -Math.PI / 2, 0]}
                          >
                            90°
                          </Text>
                        </>
                      )
                    })()}
                  </>
                )
              })()}
            </>
          )
        })()}

        {/* Standard bend dimension lines - hide for sweep tees */}
        {!isSweepTee && (() => {
          const cfMm = centerToFaceMm || 0;
          const bendDegrees = Math.round(angleRad * 180 / Math.PI);

          const inletFlangePoint = new THREE.Vector3(0, 0, 0);
          const outletFlangePoint = t2 > 0 ? outletEnd.clone() : bendEndPoint.clone();

          const insideCorner = new THREE.Vector3(bendCenter.x, 0, t1);

          return (
            <>
              {t1 > 0 && (() => {
                const dimX = -outerR - outerR * 0.5;
                return (
                  <group>
                    {/* Extension lines */}
                    <Line points={[[-outerR, 0, 0], [dimX, 0, 0]]} color="#0066cc" lineWidth={2} />
                    <Line points={[[-outerR, 0, t1], [dimX, 0, t1]]} color="#0066cc" lineWidth={2} />
                    {/* Main dimension line */}
                    <Line points={[[dimX, 0, 0], [dimX, 0, t1]]} color="#0066cc" lineWidth={3} />
                    {/* Arrow heads */}
                    <Line points={[[dimX + 0.05, 0, 0.1], [dimX, 0, 0], [dimX - 0.05, 0, 0.1]]} color="#0066cc" lineWidth={2} />
                    <Line points={[[dimX + 0.05, 0, t1 - 0.1], [dimX, 0, t1], [dimX - 0.05, 0, t1 - 0.1]]} color="#0066cc" lineWidth={2} />
                    {/* Label */}
                    <Text
                      position={[dimX - outerR * 0.3, 0, t1 / 2]}
                      fontSize={outerR * 0.4}
                      color="#0066cc"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                      rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                    >
                      {`T1: ${tangent1}mm`}
                    </Text>
                  </group>
                );
              })()}

              {t2 > 0 && (() => {
                const dimOffset = outerR * 1.5;
                const t2Dir = new THREE.Vector3().subVectors(outletEnd, bendEndPoint).normalize();
                const perpDir = new THREE.Vector3(-t2Dir.z, 0, t2Dir.x).multiplyScalar(dimOffset);
                const dimStart = bendEndPoint.clone().add(perpDir);
                const dimEnd = outletEnd.clone().add(perpDir);
                return (
                  <group>
                    {/* Extension lines */}
                    <Line points={[[bendEndPoint.x, bendEndPoint.y, bendEndPoint.z], [dimStart.x, dimStart.y, dimStart.z]]} color="#cc0000" lineWidth={2} />
                    <Line points={[[outletEnd.x, outletEnd.y, outletEnd.z], [dimEnd.x, dimEnd.y, dimEnd.z]]} color="#cc0000" lineWidth={2} />
                    {/* Main dimension line */}
                    <Line points={[[dimStart.x, dimStart.y, dimStart.z], [dimEnd.x, dimEnd.y, dimEnd.z]]} color="#cc0000" lineWidth={3} />
                    {/* Label */}
                    <Text
                      position={[(dimStart.x + dimEnd.x) / 2 + perpDir.x * outerR * 0.3, 0.01, (dimStart.z + dimEnd.z) / 2 + perpDir.z * outerR * 0.3]}
                      fontSize={outerR * 0.35}
                      color="#cc0000"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                      rotation={[-Math.PI / 2, Math.PI, Math.atan2(t2Dir.x, t2Dir.z)]}
                    >
                      {`T2: ${tangent2}mm`}
                    </Text>
                  </group>
                );
              })()}

              {cfMm > 0 && (
                <>
                  {/* Line from bend start to inside corner */}
                  <Line
                    points={[
                      [inletEnd.x, inletEnd.y, inletEnd.z],
                      [insideCorner.x, insideCorner.y, insideCorner.z]
                    ]}
                    color="#cc6600"
                    lineWidth={3}
                  />
                  {/* Line from inside corner to bend end */}
                  <Line
                    points={[
                      [insideCorner.x, insideCorner.y, insideCorner.z],
                      [bendEndPoint.x, bendEndPoint.y, bendEndPoint.z]
                    ]}
                    color="#cc6600"
                    lineWidth={3}
                  />
                  {/* C/F label on the top line */}
                  {(() => {
                    const cfLineDir = new THREE.Vector3().subVectors(bendEndPoint, insideCorner).normalize();
                    const cfLineAngle = Math.atan2(cfLineDir.x, cfLineDir.z);
                    const labelOffset = new THREE.Vector3(-cfLineDir.z, 0, cfLineDir.x).multiplyScalar(outerR * 0.4);
                    return (
                      <Text
                        position={[
                          (insideCorner.x + bendEndPoint.x) / 2 + labelOffset.x,
                          0.01,
                          (insideCorner.z + bendEndPoint.z) / 2 + labelOffset.z
                        ]}
                        fontSize={outerR * 0.35}
                        color="#cc6600"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        rotation={[-Math.PI / 2, Math.PI, cfLineAngle - Math.PI / 2]}
                      >
                        {`C/F: ${cfMm}mm`}
                      </Text>
                    );
                  })()}
                  {/* 3D Arc showing angle at inside corner - scales with bend angle */}
                  {(() => {
                    const arcRadius3D = outerR * 0.8;
                    const arcSegments = 32;
                    const arcPoints: [number, number, number][] = [];

                    for (let i = 0; i <= arcSegments; i++) {
                      const t = i / arcSegments;
                      const currentAngle = t * angleRad;
                      arcPoints.push([
                        insideCorner.x + arcRadius3D * Math.sin(currentAngle),
                        0,
                        insideCorner.z + arcRadius3D * Math.cos(currentAngle)
                      ]);
                    }

                    const midAngle = angleRad / 2;
                    const textRadius = arcRadius3D * 0.6;
                    const textPos = new THREE.Vector3(
                      insideCorner.x + textRadius * Math.sin(midAngle),
                      0,
                      insideCorner.z + textRadius * Math.cos(midAngle)
                    );

                    return (
                      <>
                        <Line
                          points={arcPoints}
                          color="#cc6600"
                          lineWidth={2}
                        />
                        <Text
                          position={[textPos.x, textPos.y + 0.01, textPos.z]}
                          fontSize={outerR * 0.4}
                          color="#cc6600"
                          anchorX="center"
                          anchorY="middle"
                          fontWeight="bold"
                          rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                        >
                          {bendDegrees}°
                        </Text>
                      </>
                    );
                  })()}
                </>
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
            const angleRad = ((stub.angleDegrees + 90) * Math.PI) / 180

            const globalDown = new THREE.Vector3(0, -1, 0)
            const tangentDotDown = tangentDir.dot(globalDown)
            const tangentComponent = tangentDir.clone().multiplyScalar(tangentDotDown)
            const perpDown = globalDown.clone().sub(tangentComponent)

            if (perpDown.length() < 0.01) {
              perpDown.set(-1, 0, 0)
            } else {
              perpDown.normalize()
            }

            const perpHorizontal = new THREE.Vector3().crossVectors(tangentDir, perpDown).normalize()

            if (perpHorizontal.length() < 0.01) {
              perpHorizontal.set(1, 0, 0)
            }

            const rotatedDir = perpDown.clone()
              .multiplyScalar(Math.cos(angleRad))
              .add(perpHorizontal.clone().multiplyScalar(Math.sin(angleRad)))
              .normalize()

            return rotatedDir
          })()

          const stubEnd = stubCenterOnAxis.clone().add(orientationDir.clone().multiplyScalar(stub.length))
          const distFromFlangeScaled = stub.distFromFlange
          const stubLengthMm = Math.round(stub.length * SCALE)
          const distFromFlangeMm = Math.round(distFromFlangeScaled * SCALE)

          const weldPoint = stubCenterOnAxis.clone()
          const flangePoint = stubEnd.clone()

          const stubRightOffset = new THREE.Vector3(stub.outerR + 0.05, 0, 0)
          const dimLineWeld = weldPoint.clone().add(stubRightOffset)
          const dimLineFlange = flangePoint.clone().add(stubRightOffset)

          const distLineY = weldPoint.y - outerR * 3
          const distLineStart = new THREE.Vector3(tangentStart.x, distLineY, tangentStart.z)
          const distLineEnd = new THREE.Vector3(weldPoint.x, distLineY, weldPoint.z)
          const distLineOffset = new THREE.Vector3(stub.outerR + 0.1, 0, 0)

          return (
            <group key={i}>
              <StubPipe
                baseCenter={stubCenterOnAxis}
                direction={orientationDir}
                length={stub.length}
                outerR={stub.outerR}
                innerR={stub.innerR}
                mainPipeOuterR={outerR}
                mainPipeDirection={tangentDir}
                stubAngleDegrees={stub.angleDegrees}
                nb={stub.nb}
              />

              {/* Green line - distance from flange to stub (below pipe) */}
              <Line
                points={[
                  [tangentStart.x, distLineY, tangentStart.z],
                  [stubCenterOnAxis.x, distLineY, stubCenterOnAxis.z]
                ]}
                color="#009900"
                lineWidth={3}
              />
              <Line
                points={[
                  [tangentStart.x, tangentStart.y - outerR, tangentStart.z],
                  [tangentStart.x, distLineY, tangentStart.z]
                ]}
                color="#009900"
                lineWidth={2}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              <Line
                points={[
                  [stubCenterOnAxis.x, stubCenterOnAxis.y - outerR, stubCenterOnAxis.z],
                  [stubCenterOnAxis.x, distLineY, stubCenterOnAxis.z]
                ]}
                color="#009900"
                lineWidth={2}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              <Text
                position={[
                  (distLineStart.x + distLineEnd.x) / 2,
                  distLineY - 0.1,
                  (distLineStart.z + distLineEnd.z) / 2
                ]}
                fontSize={0.15}
                color="#009900"
                anchorX="center"
                anchorY="top"
                fontWeight="bold"
                rotation={[-Math.PI / 2, 0, 0]}
              >
                {`${distFromFlangeMm}mm`}
              </Text>

              {/* Purple line - stub length (vertical beside stub) */}
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
                  dimLineWeld.x + 0.1,
                  (dimLineFlange.y + dimLineWeld.y) / 2,
                  dimLineWeld.z
                ]}
                fontSize={0.15}
                color="#990099"
                anchorX="left"
                anchorY="middle"
                fontWeight="bold"
                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
              >
                {`${stubLengthMm}mm`}
              </Text>
            </group>
          )
        })}

        {/* Inlet flange - hide for sweep tees which have their own flanges */}
        {hasInletFlange && !isSweepTee && (
          hasLooseInletFlange ? (
            <>
              {/* Black closure piece connected directly to pipe end */}
              <mesh position={[0, 0, -closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 0, -closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
                <meshStandardMaterial color="#333333" side={THREE.BackSide} />
              </mesh>
              {/* Loose flange positioned after closure + 100mm gap */}
              <Flange
                center={new THREE.Vector3(0, 0, -closureLength - gapLength)}
                normal={new THREE.Vector3(0, 0, -1)}
                pipeR={outerR}
                innerR={innerR}
                nb={nominalBore}
              />
              {/* L/F dimension lines - at bottom of pipe */}
              {(() => {
                const dimX = -outerR - outerR * 0.3;
                const dimXOuter = -outerR - outerR * 0.8;
                return (
                  <>
                    {/* Extension line from pipe end */}
                    <Line points={[[dimX, 0, 0], [dimXOuter, 0, 0]]} color="#cc6600" lineWidth={2} />
                    {/* Extension line from closure end */}
                    <Line points={[[dimX, 0, -closureLength], [dimXOuter, 0, -closureLength]]} color="#cc6600" lineWidth={2} />
                    {/* Dimension line connecting */}
                    <Line points={[[dimXOuter, 0, 0], [dimXOuter, 0, -closureLength]]} color="#cc6600" lineWidth={3} />
                    {/* Arrow heads */}
                    <Line points={[[dimXOuter + 0.05, 0, 0.05], [dimXOuter, 0, 0], [dimXOuter - 0.05, 0, 0.05]]} color="#cc6600" lineWidth={2} />
                    <Line points={[[dimXOuter + 0.05, 0, -closureLength - 0.05], [dimXOuter, 0, -closureLength], [dimXOuter - 0.05, 0, -closureLength - 0.05]]} color="#cc6600" lineWidth={2} />
                    {/* Closure length text - large font, rotated to align with pipe */}
                    <Text
                      position={[dimXOuter - outerR * 0.3, 0, -closureLength / 2]}
                      fontSize={outerR * 0.5}
                      color="#cc6600"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                      rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                    >
                      {`${closureLengthMm || 150}mm`}
                    </Text>
                  </>
                );
              })()}
            </>
          ) : hasRotatingInletFlange ? (
            <>
              {/* Retaining ring welded to pipe end */}
              <RetainingRing
                center={new THREE.Vector3(0, 0, 0)}
                normal={new THREE.Vector3(0, 0, -1)}
                pipeR={outerR}
                innerR={innerR}
                wallThickness={wtScaled}
              />
              {/* Rotating flange positioned 80mm back from ring (into the pipe) */}
              <RotatingFlange
                center={new THREE.Vector3(0, 0, rotatingFlangeOffset)}
                normal={new THREE.Vector3(0, 0, -1)}
                pipeR={outerR}
                innerR={innerR}
                nb={nominalBore}
              />
              {/* R/F dimension line */}
              <Line points={[[0, -outerR - 0.15, 0], [0, -outerR - 0.15, rotatingFlangeOffset]]} color="#ea580c" lineWidth={2} />
              <Line points={[[0, -outerR - 0.1, 0], [0, -outerR - 0.2, 0]]} color="#ea580c" lineWidth={1} />
              <Line points={[[0, -outerR - 0.1, rotatingFlangeOffset], [0, -outerR - 0.2, rotatingFlangeOffset]]} color="#ea580c" lineWidth={1} />
              <Text position={[0, -outerR - 0.28, rotatingFlangeOffset / 2]} fontSize={0.12} color="#ea580c" anchorX="center" anchorY="top">
                R/F
              </Text>
            </>
          ) : (
            <Flange
              center={new THREE.Vector3(0, 0, -flangeOffset)}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          )
        )}

        {/* Outlet flange - hide for sweep tees which have their own flanges */}
        {hasOutletFlange && !isSweepTee && (() => {
          const outletBase = t2 > 0 ? outletEnd : bendEndPoint
          const outletFlangePos = outletBase.clone().add(outletDir.clone().multiplyScalar(flangeOffset))

          return hasLooseOutletFlange ? (
            <>
              {/* Black closure piece connected directly to pipe end */}
              {(() => {
                const closureCenterPos = outletBase.clone().add(outletDir.clone().multiplyScalar(closureLength / 2))
                const quaternion = new THREE.Quaternion()
                quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outletDir.clone().normalize())
                const euler = new THREE.Euler().setFromQuaternion(quaternion)
                return (
                  <>
                    <mesh position={closureCenterPos.toArray()} rotation={[euler.x, euler.y, euler.z]}>
                      <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                      <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={closureCenterPos.toArray()} rotation={[euler.x, euler.y, euler.z]}>
                      <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
                      <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                    </mesh>
                  </>
                )
              })()}
              {/* Loose flange positioned after closure + 100mm gap */}
              <Flange
                center={outletBase.clone().add(outletDir.clone().multiplyScalar(closureLength + gapLength))}
                normal={outletDir}
                pipeR={outerR}
                innerR={innerR}
                nb={nominalBore}
              />
              {/* L/F dimension lines for outlet closure - C2 */}
              {(() => {
                const perpDir = new THREE.Vector3(-outletDir.z, 0, outletDir.x).normalize()
                const dimOffset = outerR + outerR * 0.3
                const dimOffsetOuter = outerR + outerR * 0.8
                const closureEnd = outletBase.clone().add(outletDir.clone().multiplyScalar(closureLength))
                return (
                  <>
                    {/* Extension line from pipe end */}
                    <Line points={[
                      [outletBase.x + perpDir.x * dimOffset, outletBase.y, outletBase.z + perpDir.z * dimOffset],
                      [outletBase.x + perpDir.x * dimOffsetOuter, outletBase.y, outletBase.z + perpDir.z * dimOffsetOuter]
                    ]} color="#cc6600" lineWidth={2} />
                    {/* Extension line from closure end */}
                    <Line points={[
                      [closureEnd.x + perpDir.x * dimOffset, closureEnd.y, closureEnd.z + perpDir.z * dimOffset],
                      [closureEnd.x + perpDir.x * dimOffsetOuter, closureEnd.y, closureEnd.z + perpDir.z * dimOffsetOuter]
                    ]} color="#cc6600" lineWidth={2} />
                    {/* Dimension line connecting */}
                    <Line points={[
                      [outletBase.x + perpDir.x * dimOffsetOuter, outletBase.y, outletBase.z + perpDir.z * dimOffsetOuter],
                      [closureEnd.x + perpDir.x * dimOffsetOuter, closureEnd.y, closureEnd.z + perpDir.z * dimOffsetOuter]
                    ]} color="#cc6600" lineWidth={3} />
                    {/* Closure length text */}
                    <Text
                      position={[
                        (outletBase.x + closureEnd.x) / 2 + perpDir.x * (dimOffsetOuter + outerR * 0.3),
                        0.01,
                        (outletBase.z + closureEnd.z) / 2 + perpDir.z * (dimOffsetOuter + outerR * 0.3)
                      ]}
                      fontSize={outerR * 0.35}
                      color="#cc6600"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                      rotation={[-Math.PI / 2, Math.PI, Math.atan2(outletDir.x, outletDir.z)]}
                    >
                      {`${closureLengthMm || 150}mm`}
                    </Text>
                  </>
                )
              })()}
            </>
          ) : hasRotatingOutletFlange ? (
            <>
              {/* Retaining ring welded to pipe end */}
              <RetainingRing
                center={outletBase}
                normal={outletDir}
                pipeR={outerR}
                innerR={innerR}
                wallThickness={wtScaled}
              />
              {/* Rotating flange positioned 80mm back from ring (into the pipe) */}
              <RotatingFlange
                center={outletBase.clone().sub(outletDir.clone().multiplyScalar(rotatingFlangeOffset))}
                normal={outletDir}
                pipeR={outerR}
                innerR={innerR}
                nb={nominalBore}
              />
            </>
          ) : (
            <Flange
              center={outletFlangePos}
              normal={outletDir}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          )
        })()}

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

        const bendMidpointX = -Math.sin(Math.PI / 4) * bendR;
        const gussetRefX = bendMidpointX;
        const steelworkX = 0;
        const steelworkY = -ribHeightH;
        const steelworkZ = 0;
        const steelworkRotationY = -Math.PI / 2;
        const visualOffsetY = -10;


        return (
          <group position={[steelworkX, steelworkY + visualOffsetY, steelworkZ]} rotation={[0, steelworkRotationY, 0]}>
            {/* Base Plate - horizontal at bottom */}
            <mesh position={[0, -plateThickness / 2, 0]}>
              <boxGeometry args={[basePlateXDim, plateThickness, basePlateYDim]} />
              <meshStandardMaterial {...basePlateColor} />
            </mesh>

            {/* Base plate dimension labels - all 4 sides labeled */}
            <Text
              position={[0, 0.02, basePlateYDim / 2 + 0.1]}
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
              position={[0, 0.02, -basePlateYDim / 2 - 0.1]}
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
              position={[basePlateXDim / 2 + 0.1, 0.02, 0]}
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
              position={[-basePlateXDim / 2 - 0.1, 0.02, 0]}
              fontSize={0.3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
            >
              Z
            </Text>

            {/* Rib running X direction */}
            <mesh position={[0, ribHeightH / 2, 0]}>
              <boxGeometry args={[basePlateXDim, ribHeightH, ribThickness]} />
              <meshStandardMaterial {...ribColor} />
            </mesh>



            {/* Gusset plate 2 (blue) - extends from base plate to top, spans from W to Y (along Z axis) */}
            {/* Has semicircular cutout at top to cradle the pipe */}
            {(() => {
              const gusset2Shape = new THREE.Shape();
              const gusset2Width = basePlateYDim; // W to Y spans basePlateYDim (Z direction)

              // Calculate the pipe center position at 45° (middle of bend) in local coordinates
              // This is where the yellow gusset intersects the blue gusset
              const extradosR = bendR + outerR;
              const midAngleRad = Math.PI / 4; // 45 degrees
              const extradosAt45Y = (bendR - extradosR * Math.cos(midAngleRad) + duckfootYOffset) - steelworkY;

              // Cutout parameters - semicircle matching pipe outer radius
              const cutoutRadius = outerR;
              // Position cutout so lowest point is halfway between extrados and pipe bottom
              const cutoutBottomY = extradosAt45Y - cutoutRadius / 2;
              const cutoutCenterY = cutoutBottomY + cutoutRadius;

              // Gusset height extends up to where the cutout edges are
              const gusset2Height = cutoutCenterY;

              // Shape in ZY plane - will be positioned to span W to Y centered on base plate
              // Start at bottom left
              gusset2Shape.moveTo(-gusset2Width / 2, 0);
              // Bottom edge to right
              gusset2Shape.lineTo(gusset2Width / 2, 0);
              // Right edge up to where cutout starts
              gusset2Shape.lineTo(gusset2Width / 2, cutoutCenterY);

              // Semicircular cutout - arc from right side, down to center, up to left side
              // Arc goes from 0 (right) to PI (left) - this creates a downward-facing semicircle
              const arcSegments = 24;
              for (let i = 0; i <= arcSegments; i++) {
                const angle = (i / arcSegments) * Math.PI; // 0 to PI
                const arcX = cutoutRadius * Math.cos(angle); // Goes from +radius to -radius
                const arcY = cutoutCenterY - cutoutRadius * Math.sin(angle); // Dips down by radius at center
                gusset2Shape.lineTo(arcX, arcY);
              }

              // Left edge down to bottom
              gusset2Shape.lineTo(-gusset2Width / 2, 0);

              return (
                <mesh
                  position={[0, 0, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <extrudeGeometry args={[gusset2Shape, { depth: ribThickness, bevelEnabled: false }]} />
                  <meshStandardMaterial color="#0066cc" metalness={0.5} roughness={0.5} />
                </mesh>
              );
            })()}

            {/* Yellow gusset plate - curved top edge following bend extrados */}
            {/* Points A, B at bottom (base plate). Points C, D at top (touching extrados) */}
            {(() => {
              const yellowThickness = 30 / SCALE;
              const extradosR = bendR + outerR;

              const pointDAngleDegrees = duckfootGussetPointDDegrees || 15;
              const pointCAngleDegrees = duckfootGussetPointCDegrees || 75;

              // After duckfoot rotation [π/2, 0, -π/2], the extrados at angle θ is at:
              // World X = -extradosR * sin(θ)
              // World Y = bendR - extradosR * cos(θ) + duckfootYOffset
              // World Z = 0
              // Convert to local coordinates (relative to steelwork group position)
              const extradosLocalX = (angleDeg: number) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                return -extradosR * Math.sin(angleRad) - gussetRefX;
              };
              const extradosLocalY = (angleDeg: number) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                return (bendR - extradosR * Math.cos(angleRad) + duckfootYOffset) - steelworkY;
              };

              // Point D position (at Point D angle, e.g., 15°)
              const pointDLocalX = extradosLocalX(pointDAngleDegrees);
              const pointDLocalY = extradosLocalY(pointDAngleDegrees);

              // Point C position (at Point C angle, e.g., 75°)
              const pointCLocalX = extradosLocalX(pointCAngleDegrees);
              const pointCLocalY = extradosLocalY(pointCAngleDegrees);

              // Bottom corners A and B span the base plate width in X direction
              // Centered at X=0 in local coords
              const halfPlateX = basePlateXDim / 2;
              const aBottomX = halfPlateX;  // Right side (positive X)
              const bBottomX = -halfPlateX; // Left side (negative X)

              // Build shape in XY plane - will be extruded in Z
              const yellowShape = new THREE.Shape();

              // Start at Point A (bottom right)
              yellowShape.moveTo(aBottomX, 0);

              // Go to Point D (top right, at extrados)
              yellowShape.lineTo(pointDLocalX, Math.max(0.1, pointDLocalY));

              // Curved edge from Point D to Point C following the extrados
              const curveSegments = 16;
              const angleStep = (pointCAngleDegrees - pointDAngleDegrees) / curveSegments;
              Array.from({ length: curveSegments }).forEach((_, i) => {
                const angleDeg = pointDAngleDegrees + (i + 1) * angleStep;
                const localX = extradosLocalX(angleDeg);
                const localY = extradosLocalY(angleDeg);
                yellowShape.lineTo(localX, Math.max(0.1, localY));
              });

              // Go to Point B (bottom left)
              yellowShape.lineTo(bBottomX, 0);

              // Close back to Point A
              yellowShape.closePath();

              const labelHeight = 0.15;

              return (
                <group>
                  {/* Gusset plate - shape in XY plane, extruded in Z */}
                  <mesh position={[0, 0, -yellowThickness / 2]}>
                    <extrudeGeometry args={[yellowShape, { depth: yellowThickness, bevelEnabled: false }]} />
                    <meshStandardMaterial color="#cc8800" metalness={0.5} roughness={0.5} />
                  </mesh>
                  {/* Corner labels */}
                  <Text
                    position={[aBottomX + 0.3, labelHeight, 0]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    A
                  </Text>
                  <Text
                    position={[bBottomX - 0.3, labelHeight, 0]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    B
                  </Text>
                  <Text
                    position={[pointDLocalX + 0.3, pointDLocalY + 0.3, 0]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    D
                  </Text>
                  <Text
                    position={[pointCLocalX - 0.3, pointCLocalY + 0.3, 0]}
                    fontSize={0.4}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    C
                  </Text>
                </group>
              );
            })()}

            {/* Weld lines visualization */}
            {(() => {
              const weldLineColor = '#000000';
              const weldLineWidth = 8;

              const extradosR = bendR + outerR;
              const midAngleRad = Math.PI / 4;
              const extradosAt45Y = (bendR - extradosR * Math.cos(midAngleRad) + duckfootYOffset) - steelworkY;
              const cutoutRadius = outerR;
              const cutoutBottomY = extradosAt45Y - cutoutRadius / 2;
              const cutoutCenterY = cutoutBottomY + cutoutRadius;
              const gussetIntersectionHeight = cutoutBottomY;

              const pointDAngleDegrees = duckfootGussetPointDDegrees || 15;
              const pointCAngleDegrees = duckfootGussetPointCDegrees || 75;

              const extradosLocalX = (angleDeg: number) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                return -extradosR * Math.sin(angleRad) - gussetRefX;
              };
              const extradosLocalY = (angleDeg: number) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                return (bendR - extradosR * Math.cos(angleRad) + duckfootYOffset) - steelworkY;
              };

              const halfPlateX = basePlateXDim / 2;
              const halfPlateY = basePlateYDim / 2;

              const blueGussetCutoutPoints: Array<[number, number, number]> = [];
              const arcSegments = 24;
              for (let i = 0; i <= arcSegments; i++) {
                const angle = (i / arcSegments) * Math.PI;
                const arcZ = cutoutRadius * Math.cos(angle);
                const arcY = cutoutCenterY - cutoutRadius * Math.sin(angle);
                blueGussetCutoutPoints.push([0, arcY, arcZ]);
              }

              const yellowGussetCurvePoints: Array<[number, number, number]> = [];
              const curveSegments = 16;
              for (let i = 0; i <= curveSegments; i++) {
                const angleDeg = pointDAngleDegrees + (i / curveSegments) * (pointCAngleDegrees - pointDAngleDegrees);
                const localX = extradosLocalX(angleDeg);
                const localY = extradosLocalY(angleDeg);
                yellowGussetCurvePoints.push([localX, Math.max(0.1, localY), 0]);
              }

              const weldOffset = 0.05;

              return (
                <group>
                  {/* 1. Blue gusset cutout weld (semicircle where it welds to pipe) */}
                  <Line points={blueGussetCutoutPoints} color={weldLineColor} lineWidth={weldLineWidth} />

                  {/* 2. Yellow gusset curve weld (arc from D to C) */}
                  <Line points={yellowGussetCurvePoints} color={weldLineColor} lineWidth={weldLineWidth} />

                  {/* 3. Gusset intersection welds (4 corners where blue and yellow meet) */}
                  <Line points={[[ribThickness/2 + weldOffset, weldOffset, weldOffset], [ribThickness/2 + weldOffset, gussetIntersectionHeight, weldOffset]]} color={weldLineColor} lineWidth={weldLineWidth} />
                  <Line points={[[-ribThickness/2 - weldOffset, weldOffset, weldOffset], [-ribThickness/2 - weldOffset, gussetIntersectionHeight, weldOffset]]} color={weldLineColor} lineWidth={weldLineWidth} />
                  <Line points={[[weldOffset, weldOffset, ribThickness/2 + weldOffset], [weldOffset, gussetIntersectionHeight, ribThickness/2 + weldOffset]]} color={weldLineColor} lineWidth={weldLineWidth} />
                  <Line points={[[weldOffset, weldOffset, -ribThickness/2 - weldOffset], [weldOffset, gussetIntersectionHeight, -ribThickness/2 - weldOffset]]} color={weldLineColor} lineWidth={weldLineWidth} />

                  {/* 4. Blue gusset to base plate weld (both sides along Z) */}
                  <Line points={[[ribThickness/2 + weldOffset, weldOffset, -halfPlateY], [ribThickness/2 + weldOffset, weldOffset, halfPlateY]]} color={weldLineColor} lineWidth={weldLineWidth} />
                  <Line points={[[-ribThickness/2 - weldOffset, weldOffset, -halfPlateY], [-ribThickness/2 - weldOffset, weldOffset, halfPlateY]]} color={weldLineColor} lineWidth={weldLineWidth} />

                  {/* 5. Yellow gusset to base plate weld (both sides along X) */}
                  <Line points={[[-halfPlateX, weldOffset, ribThickness/2 + weldOffset], [halfPlateX, weldOffset, ribThickness/2 + weldOffset]]} color={weldLineColor} lineWidth={weldLineWidth} />
                  <Line points={[[-halfPlateX, weldOffset, -ribThickness/2 - weldOffset], [halfPlateX, weldOffset, -ribThickness/2 - weldOffset]]} color={weldLineColor} lineWidth={weldLineWidth} />
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
  const captureRef = useRef<(() => string | null) | null>(null)

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
  const isSweepTee = props.bendItemType === 'SWEEP_TEE'

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
  let autoCameraTarget: [number, number, number]

  const centerX = (minX + maxX) / 2
  const centerZ = (minZ + maxZ) / 2

  if (isDuckfootBend) {
    const verticalExtent = boundingDepth + bendR
    const horizontalExtent = Math.max(boundingWidth, bendR * 2)
    const extent = Math.sqrt(horizontalExtent ** 2 + verticalExtent ** 2)
    const autoCameraDistance = Math.max(extent * 2.5, 6)
    autoCameraPosition = [0.01, -extent * 1.5, autoCameraDistance]
    autoCameraTarget = [centerX, 0, centerZ]
  } else if (isSweepTee) {
    const autoCameraDistance = Math.max(diagonalExtent * 2.5, 6)
    autoCameraPosition = [autoCameraDistance * 0.3, autoCameraDistance * 1.2, autoCameraDistance * 0.3]
    autoCameraTarget = [centerX, 0, centerZ]
  } else {
    const autoCameraDistance = Math.max(diagonalExtent * 2, 5)
    autoCameraPosition = [centerX - autoCameraDistance * 0.3, autoCameraDistance * 1.2, centerZ + autoCameraDistance * 0.8]
    autoCameraTarget = [centerX, 0, centerZ]
  }

  const cameraPosition = props.savedCameraPosition || autoCameraPosition
  const cameraTarget = props.savedCameraTarget || autoCameraTarget

  return (
    <div data-bend-preview className="w-full h-full min-h-[400px] bg-slate-50 rounded-md border overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }} camera={{ position: cameraPosition, fov: 45 }}>
        <CaptureHelper captureRef={captureRef} />
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Environment preset="city" />
        <Scene {...props} />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={15} />
        <OrbitControls makeDefault enablePan target={cameraTarget} />
        <CameraTracker
          onCameraChange={props.onCameraChange}
          onCameraUpdate={(pos, zoom) => {
            setLiveCamera(pos)
            setCurrentZoom(zoom)
          }}
          savedPosition={props.savedCameraPosition}
          savedTarget={cameraTarget}
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

      <div data-info-box className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-gray-200 leading-snug">
        <div className="font-bold text-blue-800 mb-0.5">BEND</div>
        <div className="text-gray-900 font-medium">OD: {odMm.toFixed(0)}mm | ID: {(odMm - 2 * props.wallThickness).toFixed(0)}mm</div>
        <div className="text-gray-700">WT: {props.wallThickness}mm | {props.bendAngle}°</div>
        {props.bendItemType !== 'SWEEP_TEE' && props.bendItemType !== 'DUCKFOOT_BEND' && ((props.tangent1 || 0) > 0 || (props.tangent2 || 0) > 0) && (
          <div className="text-gray-700">
            {(props.tangent1 || 0) > 0 && (props.tangent2 || 0) > 0
              ? `T1: ${props.tangent1}mm | T2: ${props.tangent2}mm`
              : (props.tangent1 || 0) > 0
                ? `T1: ${props.tangent1}mm`
                : `T2: ${props.tangent2}mm`}
          </div>
        )}
        {(() => {
          const config = (props.flangeConfig || 'PE').toUpperCase();
          const hasLooseInlet = config === 'FOE_LF' || config === '2XLF';
          const hasLooseOutlet = config === '2XLF';
          if (!hasLooseInlet && !hasLooseOutlet) return null;
          const closureValue = props.closureLengthMm || 150;
          return (
            <div className="text-gray-700">
              {hasLooseInlet && hasLooseOutlet
                ? `C1: ${closureValue}mm | C2: ${closureValue}mm`
                : `C1: ${closureValue}mm`}
            </div>
          );
        })()}
        {props.bendItemType === 'SWEEP_TEE' && props.sweepTeePipeALengthMm && (
          <div className="text-gray-700">Pipe A: {props.sweepTeePipeALengthMm}mm</div>
        )}
        {props.stubs && props.stubs.length > 0 && (
          <div className="text-gray-700">
            Stubs: {props.stubs.map((stub, i) => `${stub.length}mm`).join(' | ')}
          </div>
        )}
        {(() => {
          const config = (props.flangeConfig || 'PE').toUpperCase();
          const isSweepTee = props.bendItemType === 'SWEEP_TEE';
          const validBendFlangeConfigs = ['FBE', 'FOE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'];
          const validFittingFlangeConfigs = ['FAE', 'F2E', 'F2E_LF', 'F2E_RF', '3X_RF', '2X_RF_FOE'];
          const validConfigs = isSweepTee ? validFittingFlangeConfigs : validBendFlangeConfigs;
          const hasValidFlangeConfig = validConfigs.includes(config);
          if (!hasValidFlangeConfig) return null;
          const { specs: flangeSpecs, isFromApi } = resolveFlangeData(props.nominalBore, props.flangeSpecs);
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
        <button onClick={() => setExpanded(true)} className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Expand
        </button>
        <button
          onClick={() => {
            const container = document.querySelector('[data-bend-preview]')
            const infoBox = container?.querySelector('[data-info-box]')

            const dataUrl = captureRef.current ? captureRef.current() : null
            if (dataUrl && infoBox) {
              const children = Array.from(infoBox.children)
              const sections: { title: string; content: string[] }[] = []
              let currentSection: { title: string; content: string[] } | null = null

              children.forEach((child) => {
                const el = child as HTMLElement
                if (el.classList.contains('font-bold')) {
                  if (currentSection) sections.push(currentSection)
                  currentSection = { title: el.outerHTML, content: [] }
                } else if (currentSection) {
                  currentSection.content.push(el.outerHTML)
                }
              })
              if (currentSection) sections.push(currentSection)

              const midPoint = Math.ceil(sections.length / 2)
              const leftSections = sections.slice(0, midPoint)
              const rightSections = sections.slice(midPoint)

              const renderSections = (secs: typeof sections) =>
                secs.map((s) => `${s.title}${s.content.join('')}`).join('')

              const printWindow = window.open('', '_blank')
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>3D Bend Drawing</title>
                      <style>
                        body { margin: 15px; font-family: Arial, sans-serif; }
                        .drawing-section { width: 100%; margin-bottom: 15px; }
                        .drawing-section img { width: 100%; border: 1px solid #ccc; }
                        .info-container { display: flex; gap: 20px; }
                        .info-column { flex: 1; padding: 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; }
                        .info-column > div { margin-bottom: 3px; }
                        .font-bold { font-weight: bold; margin-top: 8px; }
                        .text-blue-800 { color: #1e40af; }
                        .text-orange-800 { color: #9a3412; }
                        .text-gray-900 { color: #111827; }
                        .text-gray-700 { color: #374151; }
                        .text-green-700 { color: #15803d; }
                        @media print { body { margin: 10px; } }
                      </style>
                    </head>
                    <body>
                      <div class="drawing-section">
                        <img src="${dataUrl}" />
                      </div>
                      <div class="info-container">
                        <div class="info-column">${renderSections(leftSections)}</div>
                        <div class="info-column">${renderSections(rightSections)}</div>
                      </div>
                      <script>
                        window.onload = function() { setTimeout(function() { window.print(); }, 100); };
                      </script>
                    </body>
                  </html>
                `)
                printWindow.document.close()
              }
            }
          }}
          className="text-[10px] text-green-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-green-50 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        <button
          onClick={() => {
            const bendAngle = props.bendAngle
            const bendRadius = props.nominalBore * 1.5
            const odMm = props.outerDiameter || (props.nominalBore * 1.1 + 6)
            const t1 = props.tangent1 || 0
            const t2 = props.tangent2 || 0
            const angleRad = (bendAngle * Math.PI) / 180

            let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n`
            dxf += `0\nSECTION\n2\nENTITIES\n`

            const outerR = bendRadius + odMm / 2
            const innerR = bendRadius - odMm / 2

            dxf += `0\nARC\n8\nBEND_OUTER\n10\n0\n20\n0\n40\n${outerR}\n50\n0\n51\n${bendAngle}\n`
            dxf += `0\nARC\n8\nBEND_INNER\n10\n0\n20\n0\n40\n${innerR}\n50\n0\n51\n${bendAngle}\n`

            if (t1 > 0) {
              dxf += `0\nLINE\n8\nTANGENT\n62\n3\n10\n${outerR}\n20\n0\n11\n${outerR + t1}\n21\n0\n`
              dxf += `0\nLINE\n8\nTANGENT\n62\n3\n10\n${innerR}\n20\n0\n11\n${innerR}\n21\n0\n`
            }

            const endX = bendRadius - bendRadius * Math.cos(angleRad)
            const endY = bendRadius * Math.sin(angleRad)
            if (t2 > 0) {
              const t2DirX = Math.sin(angleRad)
              const t2DirY = Math.cos(angleRad)
              dxf += `0\nLINE\n8\nTANGENT\n62\n3\n10\n${endX + (outerR - bendRadius) * Math.cos(angleRad + Math.PI/2)}\n20\n${endY + (outerR - bendRadius) * Math.sin(angleRad + Math.PI/2)}\n11\n${endX + (outerR - bendRadius) * Math.cos(angleRad + Math.PI/2) + t2 * t2DirX}\n21\n${endY + (outerR - bendRadius) * Math.sin(angleRad + Math.PI/2) + t2 * t2DirY}\n`
            }

            dxf += `0\nTEXT\n8\nDIMENSION\n10\n${bendRadius}\n20\n${-odMm - 30}\n40\n15\n1\n${bendAngle} DEG BEND\n`
            dxf += `0\nTEXT\n8\nDIMENSION\n10\n${bendRadius}\n20\n${-odMm - 50}\n40\n12\n1\nR${bendRadius}mm | OD${odMm.toFixed(0)}mm\n`

            dxf += `0\nENDSEC\n0\nEOF\n`

            const blob = new Blob([dxf], { type: 'application/dxf' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `bend_${bendAngle}deg_${props.nominalBore}NB.dxf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}
          className="text-[10px] text-orange-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-orange-50 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export DXF
        </button>
        <div className="text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
          Drag to Rotate
        </div>
        <button onClick={() => setHidden(true)} className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          Hide
        </button>
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
              <OrbitControls makeDefault enablePan target={cameraTarget} />
              <CameraTracker
                onCameraChange={props.onCameraChange}
                onCameraUpdate={(pos, zoom) => {
                  setLiveCamera(pos)
                  setCurrentZoom(zoom)
                }}
                savedPosition={props.savedCameraPosition}
                savedTarget={cameraTarget}
              />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg">
              <div className="font-bold text-blue-800 mb-1">BEND</div>
              <div className="text-gray-900 font-medium">OD: {odMm.toFixed(0)}mm | ID: {(odMm - 2 * props.wallThickness).toFixed(0)}mm</div>
              <div className="text-gray-700">WT: {props.wallThickness}mm | {props.bendAngle}°</div>
              {props.bendItemType !== 'SWEEP_TEE' && props.bendItemType !== 'DUCKFOOT_BEND' && ((props.tangent1 || 0) > 0 || (props.tangent2 || 0) > 0) && (
                <div className="text-gray-700">
                  {(props.tangent1 || 0) > 0 && (props.tangent2 || 0) > 0
                    ? `T1: ${props.tangent1}mm | T2: ${props.tangent2}mm`
                    : (props.tangent1 || 0) > 0
                      ? `T1: ${props.tangent1}mm`
                      : `T2: ${props.tangent2}mm`}
                </div>
              )}
              {(() => {
                const config = (props.flangeConfig || 'PE').toUpperCase();
                const hasLooseInlet = config === 'FOE_LF' || config === '2XLF';
                const hasLooseOutlet = config === '2XLF';
                if (!hasLooseInlet && !hasLooseOutlet) return null;
                const closureValue = props.closureLengthMm || 150;
                return (
                  <div className="text-gray-700">
                    {hasLooseInlet && hasLooseOutlet
                      ? `C1: ${closureValue}mm | C2: ${closureValue}mm`
                      : `C1: ${closureValue}mm`}
                  </div>
                );
              })()}
              {props.bendItemType === 'SWEEP_TEE' && props.sweepTeePipeALengthMm && (
                <div className="text-gray-700">Pipe A: {props.sweepTeePipeALengthMm}mm</div>
              )}
              {props.stubs && props.stubs.length > 0 && (
                <div className="text-gray-700">
                  Stubs: {props.stubs.map((stub) => `${stub.length}mm`).join(' | ')}
                </div>
              )}
              {(() => {
                const config = (props.flangeConfig || 'PE').toUpperCase();
                const isSweepTee = props.bendItemType === 'SWEEP_TEE';
                const validBendFlangeConfigs = ['FBE', 'FOE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'];
                const validFittingFlangeConfigs = ['FAE', 'F2E', 'F2E_LF', 'F2E_RF', '3X_RF', '2X_RF_FOE'];
                const validConfigs = isSweepTee ? validFittingFlangeConfigs : validBendFlangeConfigs;
                const hasValidFlangeConfig = validConfigs.includes(config);
                if (!hasValidFlangeConfig) return null;
                const { specs: flangeSpecs, isFromApi } = resolveFlangeData(props.nominalBore, props.flangeSpecs);
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
