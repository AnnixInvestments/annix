import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg'

const evaluator = new Evaluator()

export interface HollowPipeParams {
  length: number
  outerRadius: number
  innerRadius: number
  radialSegments?: number
}

export interface SaddleCutParams {
  mainPipeRadius: number
  stubRadius: number
  stubPosition: THREE.Vector3
  stubDirection: THREE.Vector3
  stubLength: number
}

export const createHollowCylinder = ({
  length,
  outerRadius,
  innerRadius,
  radialSegments = 32
}: HollowPipeParams): THREE.BufferGeometry => {
  const outerGeometry = new THREE.CylinderGeometry(
    outerRadius,
    outerRadius,
    length,
    radialSegments
  )

  const innerGeometry = new THREE.CylinderGeometry(
    innerRadius,
    innerRadius,
    length + 0.001,
    radialSegments
  )

  const outerBrush = new Brush(outerGeometry)
  const innerBrush = new Brush(innerGeometry)

  const result = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION)

  outerGeometry.dispose()
  innerGeometry.dispose()

  return result.geometry
}

export const createPipeWithStubHole = (
  mainPipeGeometry: THREE.BufferGeometry,
  stubParams: SaddleCutParams
): THREE.BufferGeometry => {
  const { mainPipeRadius, stubRadius, stubPosition, stubDirection, stubLength } = stubParams

  const cutterLength = mainPipeRadius * 3
  const cutterGeometry = new THREE.CylinderGeometry(
    stubRadius,
    stubRadius,
    cutterLength,
    32
  )

  const cutterBrush = new Brush(cutterGeometry)

  const up = new THREE.Vector3(0, 1, 0)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, stubDirection)

  cutterBrush.position.copy(stubPosition)
  cutterBrush.quaternion.copy(quaternion)
  cutterBrush.updateMatrixWorld()

  const mainBrush = new Brush(mainPipeGeometry)
  const result = evaluator.evaluate(mainBrush, cutterBrush, SUBTRACTION)

  cutterGeometry.dispose()

  return result.geometry
}

export const createHollowStub = (params: {
  outerRadius: number
  innerRadius: number
  length: number
  mainPipeOuterRadius: number
  position: THREE.Vector3
  direction: THREE.Vector3
}): THREE.BufferGeometry => {
  const { outerRadius, innerRadius, length, mainPipeOuterRadius, position, direction } = params

  const extendedLength = length + mainPipeOuterRadius * 1.5
  const stubGeometry = createHollowCylinder({
    length: extendedLength,
    outerRadius,
    innerRadius,
    radialSegments: 32
  })

  const cutterRadius = mainPipeOuterRadius * 1.1
  const cutterLength = mainPipeOuterRadius * 4
  const cutterGeometry = new THREE.CylinderGeometry(
    cutterRadius,
    cutterRadius,
    cutterLength,
    32
  )

  const stubBrush = new Brush(stubGeometry)
  const cutterBrush = new Brush(cutterGeometry)

  cutterBrush.rotation.x = Math.PI / 2
  cutterBrush.position.y = -extendedLength / 2 - mainPipeOuterRadius * 0.5
  cutterBrush.updateMatrixWorld()

  const result = evaluator.evaluate(stubBrush, cutterBrush, SUBTRACTION)

  stubGeometry.dispose()
  cutterGeometry.dispose()

  return result.geometry
}

export const computeSaddleCurve = (params: {
  mainPipeRadius: number
  stubRadius: number
  segments?: number
}): THREE.Vector3[] => {
  const { mainPipeRadius, stubRadius, segments = 64 } = params
  const points: THREE.Vector3[] = []

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2

    const x = stubRadius * Math.cos(theta)
    const z = stubRadius * Math.sin(theta)

    const distFromAxis = Math.abs(x)
    let y = 0

    if (distFromAxis < mainPipeRadius) {
      y = Math.sqrt(mainPipeRadius * mainPipeRadius - distFromAxis * distFromAxis)
    }

    points.push(new THREE.Vector3(x, y, z))
  }

  return points
}

export const createSaddleWeldGeometry = (params: {
  mainPipeRadius: number
  stubRadius: number
  weldBeadRadius?: number
  segments?: number
}): THREE.BufferGeometry => {
  const { mainPipeRadius, stubRadius, weldBeadRadius = 0.003, segments = 64 } = params

  const saddlePoints = computeSaddleCurve({
    mainPipeRadius,
    stubRadius,
    segments
  })

  const curve = new THREE.CatmullRomCurve3(saddlePoints, true)

  const tubeGeometry = new THREE.TubeGeometry(
    curve,
    segments,
    weldBeadRadius,
    8,
    true
  )

  return tubeGeometry
}

export const createHollowPipeWithStubs = (params: {
  pipeLength: number
  pipeOuterRadius: number
  pipeInnerRadius: number
  stubs: Array<{
    position: number
    outerRadius: number
    innerRadius: number
    length: number
    angle?: number
  }>
}): {
  pipeGeometry: THREE.BufferGeometry
  stubGeometries: THREE.BufferGeometry[]
  weldGeometries: THREE.BufferGeometry[]
} => {
  const { pipeLength, pipeOuterRadius, pipeInnerRadius, stubs } = params

  let pipeGeometry = createHollowCylinder({
    length: pipeLength,
    outerRadius: pipeOuterRadius,
    innerRadius: pipeInnerRadius
  })

  const stubGeometries: THREE.BufferGeometry[] = []
  const weldGeometries: THREE.BufferGeometry[] = []

  stubs.forEach((stub) => {
    const stubDirection = new THREE.Vector3(0, 1, 0)
    const stubPosition = new THREE.Vector3(0, stub.position - pipeLength / 2, 0)

    if (stub.angle) {
      stubDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), stub.angle)
    }

    const radialPosition = new THREE.Vector3(pipeOuterRadius, 0, 0)
    if (stub.angle) {
      radialPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), stub.angle)
    }

    const holePosition = stubPosition.clone().add(radialPosition)

    pipeGeometry = createPipeWithStubHole(pipeGeometry, {
      mainPipeRadius: pipeOuterRadius,
      stubRadius: stub.outerRadius,
      stubPosition: holePosition,
      stubDirection,
      stubLength: stub.length
    })

    const stubGeo = createHollowStub({
      outerRadius: stub.outerRadius,
      innerRadius: stub.innerRadius,
      length: stub.length,
      mainPipeOuterRadius: pipeOuterRadius,
      position: holePosition,
      direction: stubDirection
    })
    stubGeometries.push(stubGeo)

    const weldGeo = createSaddleWeldGeometry({
      mainPipeRadius: pipeOuterRadius,
      stubRadius: stub.outerRadius * 1.05,
      weldBeadRadius: Math.min(stub.outerRadius * 0.08, 0.01)
    })
    weldGeometries.push(weldGeo)
  })

  return { pipeGeometry, stubGeometries, weldGeometries }
}
