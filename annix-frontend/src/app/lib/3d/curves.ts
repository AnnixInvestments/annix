import * as THREE from "three";

export class ArcCurve extends THREE.Curve<THREE.Vector3> {
  center: THREE.Vector3;
  radius: number;
  startAngle: number;
  endAngle: number;

  constructor(center: THREE.Vector3, radius: number, startAngle: number, endAngle: number) {
    super();
    this.center = center;
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  getPoint(t: number): THREE.Vector3 {
    const angle = this.startAngle + t * (this.endAngle - this.startAngle);
    return new THREE.Vector3(
      this.center.x + this.radius * Math.cos(angle),
      this.center.y,
      this.center.z + this.radius * Math.sin(angle),
    );
  }
}

export class SaddleCurve extends THREE.Curve<THREE.Vector3> {
  stubRadius: number;
  mainPipeRadius: number;
  useXAxis: boolean;

  constructor(stubRadius: number, mainPipeRadius: number, useXAxis: boolean = false) {
    super();
    this.stubRadius = stubRadius;
    this.mainPipeRadius = mainPipeRadius;
    this.useXAxis = useXAxis;
  }

  getPoint(t: number): THREE.Vector3 {
    const theta = t * Math.PI * 2;
    const r = this.stubRadius;
    const R = this.mainPipeRadius;

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const saddleCoord = this.useXAxis ? y : x;
    const z = Math.sqrt(Math.max(0, R * R - saddleCoord * saddleCoord));

    return new THREE.Vector3(x, y, z);
  }
}
