'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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
    flangeConfig = 'PE'
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
  const hasInletFlange = ['FOE', 'FBE', 'FOE_LF'].includes(config)
  const hasOutletFlange = ['FBE', 'FOE_LF'].includes(config)

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
          orientation: s.orientation || 'outside'
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
            const orientation = stub.orientation
            if (orientation === 'top') return new THREE.Vector3(0, 1, 0)
            if (orientation === 'bottom') return new THREE.Vector3(0, -1, 0)

            const yUp = new THREE.Vector3(0, 1, 0)
            const perpHorizontal = new THREE.Vector3().crossVectors(tangentDir, yUp).normalize()

            const toCenter = bendCenter.clone().sub(stubCenterOnAxis)
            toCenter.y = 0
            const dotToCenter = perpHorizontal.dot(toCenter.normalize())

            if (orientation === 'inside') {
              return dotToCenter > 0 ? perpHorizontal : perpHorizontal.clone().negate()
            }
            if (orientation === 'outside') {
              return dotToCenter > 0 ? perpHorizontal.clone().negate() : perpHorizontal
            }
            return new THREE.Vector3(0, 1, 0)
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

        {hasOutletFlange && t2 > 0 && (
          <Flange
            center={outletEnd.clone().add(outletDir.clone().multiplyScalar(outerR * 0.18))}
            normal={outletDir}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        )}

        <axesHelper args={[1]} />
      </group>
    </Center>
  )
}

const CameraSetup = () => {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(5, 4, 12)
  }, [camera])
  return null
}

export default function CSGBend3DPreview(props: Props) {
  const [hidden, setHidden] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (hidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border px-3 py-2 flex justify-between">
        <span className="text-sm text-gray-600">3D Preview</span>
        <button onClick={() => setHidden(false)} className="text-xs text-blue-600">Show</button>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[400px] bg-slate-50 rounded-md border overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [5, 4, 12], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Environment preset="city" />
        <Scene {...props} />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={15} />
        <OrbitControls makeDefault enablePan />
        <CameraSetup />
      </Canvas>

      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded">
        <span className="text-purple-700 font-medium">Hollow Pipe Preview</span>
      </div>

      <div className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1 rounded shadow border">
        <div className="font-bold text-blue-800">{props.nominalBore}NB | {props.bendAngle}°</div>
        <div className="text-gray-600">WT: {props.wallThickness}mm{props.numberOfSegments ? ` | ${props.numberOfSegments} seg` : ''}</div>
        <div className="text-gray-600">T1: {props.tangent1 || 0}mm | T2: {props.tangent2 || 0}mm</div>
        <div className="text-gray-600">Config: {props.flangeConfig || 'PE'}</div>
        {props.stubs && props.stubs.length > 0 && (
          <div className="text-gray-600">{props.stubs.length} stub(s)</div>
        )}
      </div>

      <div className="absolute bottom-2 right-2 flex gap-2">
        <button onClick={() => setExpanded(true)} className="text-xs text-blue-600 bg-white px-2 py-1 rounded shadow">Expand</button>
        <button onClick={() => setHidden(true)} className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">Hide</button>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8" onClick={() => setExpanded(false)}>
          <div className="relative w-full h-full max-w-6xl bg-slate-100 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setExpanded(false)} className="absolute top-4 right-4 z-50 bg-white p-2 rounded-full shadow">✕</button>
            <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 6, 18], fov: 40 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[10, 10, 10]} intensity={1} castShadow />
              <pointLight position={[-5, 5, -5]} intensity={0.5} />
              <Environment preset="city" />
              <Scene {...props} />
              <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={15} />
              <OrbitControls makeDefault enablePan />
            </Canvas>
          </div>
        </div>
      )}
    </div>
  )
}
