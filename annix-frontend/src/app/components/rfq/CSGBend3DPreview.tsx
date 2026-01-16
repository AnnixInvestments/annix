'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Environment, ContactShadows, Tube } from '@react-three/drei'
import * as THREE from 'three'
import { log } from '@/app/lib/logger'

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

const FLANGE_DATA: { [key: number]: { flangeOD: number; pcd: number; boltHoles: number; holeID: number; boltSize: number } } = {
  15: { flangeOD: 95, pcd: 65, boltHoles: 4, holeID: 14, boltSize: 12 },
  20: { flangeOD: 105, pcd: 75, boltHoles: 4, holeID: 14, boltSize: 12 },
  25: { flangeOD: 115, pcd: 85, boltHoles: 4, holeID: 14, boltSize: 12 },
  32: { flangeOD: 140, pcd: 100, boltHoles: 4, holeID: 18, boltSize: 16 },
  40: { flangeOD: 150, pcd: 110, boltHoles: 4, holeID: 18, boltSize: 16 },
  50: { flangeOD: 165, pcd: 125, boltHoles: 4, holeID: 18, boltSize: 16 },
  65: { flangeOD: 185, pcd: 145, boltHoles: 4, holeID: 18, boltSize: 16 },
  80: { flangeOD: 200, pcd: 160, boltHoles: 8, holeID: 18, boltSize: 16 },
  100: { flangeOD: 220, pcd: 180, boltHoles: 8, holeID: 18, boltSize: 16 },
  125: { flangeOD: 250, pcd: 210, boltHoles: 8, holeID: 18, boltSize: 16 },
  150: { flangeOD: 285, pcd: 240, boltHoles: 8, holeID: 22, boltSize: 20 },
  200: { flangeOD: 340, pcd: 295, boltHoles: 12, holeID: 22, boltSize: 20 },
  250: { flangeOD: 405, pcd: 355, boltHoles: 12, holeID: 26, boltSize: 24 },
  300: { flangeOD: 460, pcd: 410, boltHoles: 12, holeID: 26, boltSize: 24 },
  350: { flangeOD: 520, pcd: 470, boltHoles: 16, holeID: 26, boltSize: 24 },
  400: { flangeOD: 580, pcd: 525, boltHoles: 16, holeID: 30, boltSize: 27 },
  450: { flangeOD: 640, pcd: 585, boltHoles: 20, holeID: 30, boltSize: 27 },
  500: { flangeOD: 670, pcd: 620, boltHoles: 20, holeID: 26, boltSize: 24 },
  600: { flangeOD: 780, pcd: 725, boltHoles: 20, holeID: 30, boltSize: 27 },
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
  const flangeR = pipeR * 2.2
  const thick = pipeR * 0.4
  const boltR = pipeR * 1.65
  const holeR = pipeR * 0.12
  const boltCount = nb <= 100 ? 4 : nb <= 200 ? 8 : nb <= 350 ? 12 : 20
  const boreR = innerR * 1.02

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
  const flangeOffset = outerR * 0.18

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
  const flangeOffset = outerR * 0.18

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
  const flangeR = pipeR * 2.2
  const thick = pipeR * 0.4
  const boltR = pipeR * 1.65
  const holeR = pipeR * 0.12
  const boltCount = nb <= 100 ? 4 : nb <= 200 ? 8 : nb <= 350 ? 12 : 20

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
    blankFlangePositions = []
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

  const weldTube = outerR * 0.05

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

  return (
    <Center>
      <group>
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
            <WeldRing center={inletEnd} normal={inletDir} radius={outerR * 1.02} tube={weldTube} />
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

        <WeldRing center={bendEndPoint} normal={outletDir} radius={outerR * 1.02} tube={weldTube} />

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

          return (
            <StubPipe
              key={i}
              baseCenter={stubCenterOnAxis}
              direction={orientationDir}
              length={stub.length}
              outerR={stub.outerR}
              innerR={stub.innerR}
              mainPipeOuterR={outerR}
              nb={stub.nb}
            />
          )
        })}

        {hasInletFlange && (
          <Flange
            center={new THREE.Vector3(0, 0, -outerR * 0.18)}
            normal={new THREE.Vector3(0, 0, -1)}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        )}

        {hasOutletFlange && (
          <Flange
            center={t2 > 0
              ? outletEnd.clone().add(outletDir.clone().multiplyScalar(outerR * 0.18))
              : bendEndPoint.clone().add(outletDir.clone().multiplyScalar(outerR * 0.18))
            }
            normal={outletDir}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        )}

        {addBlankFlange && blankFlangePositions.includes('inlet') && hasInletFlange && (() => {
          const flangeThick = outerR * 0.4
          const flangeOffset = outerR * 0.18
          const blankOffset = flangeOffset + flangeThick * 2 + 0.05
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
          const flangeThick = outerR * 0.4
          const flangeOffset = outerR * 0.18
          const blankOffset = flangeOffset + flangeThick * 2 + 0.05
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

  const autoCameraDistance = Math.max(diagonalExtent * 2, 5)
  const autoCameraHeight = autoCameraDistance * 0.6
  const autoCameraZ = autoCameraDistance * 1.2

  const autoCameraPosition: [number, number, number] = [autoCameraDistance * 0.5, autoCameraHeight, autoCameraZ]
  const cameraPosition = props.savedCameraPosition || autoCameraPosition

  return (
    <div className="w-full h-full min-h-[400px] bg-slate-50 rounded-md border overflow-hidden relative">
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
        {props.numberOfSegments && props.numberOfSegments > 0 && (() => {
          const degreesPerSeg = props.bendAngle / props.numberOfSegments;
          const bendRadius = props.nominalBore * 1.5;
          const arcLengthPerSeg = (bendRadius * Math.PI * degreesPerSeg) / 180;
          return (
            <div className="text-gray-700">{props.numberOfSegments} seg × {degreesPerSeg.toFixed(1)}° × {arcLengthPerSeg.toFixed(0)}mm</div>
          );
        })()}
        {props.flangeConfig && props.flangeConfig !== 'PE' && (() => {
          const flangeSpecs = FLANGE_DATA[props.nominalBore];
          const config = (props.flangeConfig || 'PE').toUpperCase();
          return (
            <>
              <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE ({config})</div>
              {flangeSpecs && (
                <>
                  <div className="text-gray-900 font-medium">OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm</div>
                  <div className="text-gray-700">Holes: {flangeSpecs.boltHoles} × Ø{flangeSpecs.holeID}mm</div>
                  <div className="text-gray-700">Bolts: {flangeSpecs.boltHoles} × M{flangeSpecs.boltSize}</div>
                  <div className="text-green-700 font-medium">SABS 1123 T1000/3</div>
                </>
              )}
            </>
          );
        })()}
        {props.stubs && props.stubs.length > 0 && (
          <div className="text-purple-700 font-medium mt-0.5">{props.stubs.length} stub(s)</div>
        )}
      </div>

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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div className="relative w-full h-full max-w-[95vw] max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setExpanded(false)} className="absolute top-4 right-4 z-50 bg-white p-2 rounded-full shadow">✕</button>
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
          </div>
        </div>
      )}
    </div>
  )
}
