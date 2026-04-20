"use client";

import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import {
  AngularDimension,
  Flange,
  HollowBendPipe,
  RetainingRing,
  RotatingFlange,
  WeldRing,
} from "@/app/components/rfq/3d";
import { GEOMETRY_CONSTANTS } from "@/app/lib/config/rfq/rendering3DStandards";
import { SimpleLine as Line } from "./SimpleLine";

const SCALE = GEOMETRY_CONSTANTS.SCALE;

interface SBendGeometryProps {
  bendR: number;
  outerR: number;
  innerR: number;
  weldTube: number;
  hasInletFlange: boolean;
  hasOutletFlange: boolean;
  hasLooseInletFlange: boolean;
  hasLooseOutletFlange: boolean;
  hasRotatingInletFlange: boolean;
  hasRotatingOutletFlange: boolean;
  closureLength: number;
  gapLength: number;
  flangeOffset: number;
  wtScaled: number;
  rotatingFlangeOffset: number;
  nominalBore: number;
  closureLengthMm: number;
}

const SBendGeometry = (props: SBendGeometryProps) => {
  const {
    bendR,
    outerR,
    innerR,
    weldTube,
    hasInletFlange,
    hasOutletFlange,
    hasLooseInletFlange,
    hasLooseOutletFlange,
    hasRotatingInletFlange,
    hasRotatingOutletFlange,
    closureLength,
    gapLength,
    flangeOffset,
    wtScaled,
    rotatingFlangeOffset,
    nominalBore,
    closureLengthMm,
  } = props;

  const bend1Center = new THREE.Vector3(-bendR, 0, 0);
  const connectionPoint = new THREE.Vector3(-bendR, 0, bendR);

  return (
    <>
      <HollowBendPipe
        bendCenter={bend1Center}
        bendRadius={bendR}
        startAngle={0}
        endAngle={Math.PI / 2}
        outerR={outerR}
        innerR={innerR}
      />

      <group position={[connectionPoint.x, connectionPoint.y, connectionPoint.z]}>
        <HollowBendPipe
          bendCenter={new THREE.Vector3(0, 0, bendR)}
          bendRadius={bendR}
          startAngle={Math.PI}
          endAngle={(3 * Math.PI) / 2}
          outerR={outerR}
          innerR={innerR}
        />
      </group>

      <WeldRing
        center={connectionPoint}
        normal={new THREE.Vector3(-1, 0, 0)}
        radius={outerR * 1.02}
        tube={weldTube}
      />

      {hasInletFlange &&
        (hasLooseInletFlange ? (
          <>
            <mesh position={[0, 0, -closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
              <meshStandardMaterial
                color="#2a2a2a"
                metalness={0.6}
                roughness={0.6}
                envMapIntensity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0, -closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
              <meshStandardMaterial color="#333333" side={THREE.BackSide} />
            </mesh>
            <Flange
              center={new THREE.Vector3(0, 0, -closureLength - gapLength)}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
            {(() => {
              const dimX = -outerR - outerR * 0.3;
              const dimXOuter = -outerR - outerR * 0.8;
              return (
                <>
                  <Line
                    points={[
                      [dimX, 0, 0],
                      [dimXOuter, 0, 0],
                    ]}
                    color="#cc6600"
                    lineWidth={2}
                  />
                  <Line
                    points={[
                      [dimX, 0, -closureLength],
                      [dimXOuter, 0, -closureLength],
                    ]}
                    color="#cc6600"
                    lineWidth={2}
                  />
                  <Line
                    points={[
                      [dimXOuter, 0, 0],
                      [dimXOuter, 0, -closureLength],
                    ]}
                    color="#cc6600"
                    lineWidth={3}
                  />
                  <Text
                    position={[dimXOuter - outerR * 0.3, 0, -closureLength / 2]}
                    fontSize={outerR * 0.5}
                    color="#cc6600"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                    rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                  >
                    {`C1: ${closureLengthMm || 150}mm`}
                  </Text>
                </>
              );
            })()}
          </>
        ) : hasRotatingInletFlange ? (
          <>
            <RetainingRing
              center={new THREE.Vector3(0, 0, 0)}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              wallThickness={wtScaled}
            />
            <RotatingFlange
              center={new THREE.Vector3(0, 0, rotatingFlangeOffset)}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
            <Text
              position={[0, -outerR - 0.28, rotatingFlangeOffset / 2]}
              fontSize={0.12}
              color="#ea580c"
              anchorX="center"
              anchorY="top"
            >
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
        ))}

      {hasOutletFlange &&
        (hasLooseOutletFlange ? (
          <>
            <mesh
              position={[-2 * bendR, 0, 2 * bendR + closureLength / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
              <meshStandardMaterial
                color="#2a2a2a"
                metalness={0.6}
                roughness={0.6}
                envMapIntensity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              position={[-2 * bendR, 0, 2 * bendR + closureLength / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
              <meshStandardMaterial color="#333333" side={THREE.BackSide} />
            </mesh>
            <Flange
              center={new THREE.Vector3(-2 * bendR, 0, 2 * bendR + closureLength + gapLength)}
              normal={new THREE.Vector3(0, 0, 1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
            {(() => {
              const dimX = -2 * bendR + outerR + outerR * 0.3;
              const dimXOuter = -2 * bendR + outerR + outerR * 0.8;
              return (
                <>
                  <Line
                    points={[
                      [dimX, 0, 2 * bendR],
                      [dimXOuter, 0, 2 * bendR],
                    ]}
                    color="#cc6600"
                    lineWidth={2}
                  />
                  <Line
                    points={[
                      [dimX, 0, 2 * bendR + closureLength],
                      [dimXOuter, 0, 2 * bendR + closureLength],
                    ]}
                    color="#cc6600"
                    lineWidth={2}
                  />
                  <Line
                    points={[
                      [dimXOuter, 0, 2 * bendR],
                      [dimXOuter, 0, 2 * bendR + closureLength],
                    ]}
                    color="#cc6600"
                    lineWidth={3}
                  />
                  <Text
                    position={[dimXOuter + outerR * 0.3, 0, 2 * bendR + closureLength / 2]}
                    fontSize={outerR * 0.5}
                    color="#cc6600"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                    rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                  >
                    {`C2: ${closureLengthMm || 150}mm`}
                  </Text>
                </>
              );
            })()}
          </>
        ) : hasRotatingOutletFlange ? (
          <>
            <RetainingRing
              center={new THREE.Vector3(-2 * bendR, 0, 2 * bendR)}
              normal={new THREE.Vector3(0, 0, 1)}
              pipeR={outerR}
              innerR={innerR}
              wallThickness={wtScaled}
            />
            <RotatingFlange
              center={new THREE.Vector3(-2 * bendR, 0, 2 * bendR - rotatingFlangeOffset)}
              normal={new THREE.Vector3(0, 0, 1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
            <Text
              position={[-2 * bendR, -outerR - 0.28, 2 * bendR - rotatingFlangeOffset / 2]}
              fontSize={0.12}
              color="#ea580c"
              anchorX="center"
              anchorY="top"
            >
              R/F
            </Text>
          </>
        ) : (
          <Flange
            center={new THREE.Vector3(-2 * bendR, 0, 2 * bendR + flangeOffset)}
            normal={new THREE.Vector3(0, 0, 1)}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        ))}

      <Line
        points={[
          [0, -outerR * 1.5, 0],
          [0, -outerR * 1.5, bendR],
        ]}
        color="#0066cc"
        lineWidth={3}
      />
      <Line
        points={[
          [-outerR * 0.3, -outerR * 1.5, 0],
          [outerR * 0.3, -outerR * 1.5, 0],
        ]}
        color="#0066cc"
        lineWidth={2}
      />
      <Line
        points={[
          [-outerR * 0.3, -outerR * 1.5, bendR],
          [outerR * 0.3, -outerR * 1.5, bendR],
        ]}
        color="#0066cc"
        lineWidth={2}
      />
      <Billboard position={[outerR * 1.2, -outerR * 1.5, bendR / 2]}>
        <Text
          fontSize={outerR * 0.7}
          color="#0066cc"
          anchorX="left"
          anchorY="middle"
          fontWeight="bold"
        >
          {Math.round(bendR * SCALE)}mm
        </Text>
      </Billboard>

      <Line
        points={[
          [0, -outerR * 1.5, bendR],
          [-2 * bendR, -outerR * 1.5, bendR],
        ]}
        color="#0066cc"
        lineWidth={3}
      />
      <Line
        points={[
          [0, -outerR * 1.5, bendR - outerR * 0.2],
          [0, -outerR * 1.5, bendR + outerR * 0.2],
        ]}
        color="#0066cc"
        lineWidth={2}
      />
      <Line
        points={[
          [-2 * bendR, -outerR * 1.5, bendR - outerR * 0.2],
          [-2 * bendR, -outerR * 1.5, bendR + outerR * 0.2],
        ]}
        color="#0066cc"
        lineWidth={2}
      />
      <Billboard position={[-bendR, -outerR * 2.5, bendR]}>
        <Text
          fontSize={outerR * 0.7}
          color="#0066cc"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {Math.round(bendR * 2 * SCALE)}mm
        </Text>
      </Billboard>

      <Line
        points={[
          [-2 * bendR, -outerR * 1.5, bendR],
          [-2 * bendR, -outerR * 1.5, 2 * bendR],
        ]}
        color="#0066cc"
        lineWidth={3}
      />
      <Line
        points={[
          [-2 * bendR - outerR * 0.3, -outerR * 1.5, 2 * bendR],
          [-2 * bendR + outerR * 0.3, -outerR * 1.5, 2 * bendR],
        ]}
        color="#0066cc"
        lineWidth={2}
      />
      <Billboard position={[-2 * bendR - outerR * 1.2, -outerR * 1.5, bendR * 1.5]}>
        <Text
          fontSize={outerR * 0.7}
          color="#0066cc"
          anchorX="right"
          anchorY="middle"
          fontWeight="bold"
        >
          {Math.round(bendR * SCALE)}mm
        </Text>
      </Billboard>

      {(() => {
        const arcRadius = outerR * 1.2;
        const cornerY = -outerR * 1.5;
        return (
          <AngularDimension
            center={new THREE.Vector3(0, cornerY, bendR)}
            radius={arcRadius}
            startAngle={Math.PI}
            endAngle={Math.PI * 1.5}
            plane="xz"
            color="#0066cc"
            fontSize={outerR * 0.4}
            showArrows={false}
          />
        );
      })()}

      {(() => {
        const arcRadius = outerR * 1.2;
        const cornerY = -outerR * 1.5;
        const cornerX = -2 * bendR;
        return (
          <AngularDimension
            center={new THREE.Vector3(cornerX, cornerY, bendR)}
            radius={arcRadius}
            startAngle={0}
            endAngle={Math.PI / 2}
            plane="xz"
            color="#0066cc"
            fontSize={outerR * 0.4}
            showArrows={false}
          />
        );
      })()}
    </>
  );
};

export { SBendGeometry };
