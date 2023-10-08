import { vec3 } from 'gl-matrix';

const SpherePosition = (
  radius: number,
  theta: number,
  phi: number,
  center: vec3 = [0, 0, 0]
) => {
  let snt = Math.sin((theta * Math.PI) / 180);
  let cnt = Math.cos((theta * Math.PI) / 180);
  let snp = Math.sin((phi * Math.PI) / 180);
  let cnp = Math.cos((phi * Math.PI) / 180);
  return vec3.fromValues(
    radius * snt * cnp + center[0],
    radius * cnt + center[1],
    -radius * snt * snp + center[2]
  );
};
const SphereData = (
  radius: number = 10,
  u: number = 20,
  v: number = 15,
  center: vec3 = [0, 0, 0]
) => {
  if (u < 2 || v < 2) return;
  let pts = [];
  let pt: vec3;
  for (let i = 0; i < u; i++) {
    let pt1: vec3[] = [];
    for (let j = 0; j < v; j++) {
      pt = SpherePosition(
        radius,
        (i * 180) / (u - 1),
        (j * 360) / (v - 1),
        center
      );
      pt1.push(pt);
    }
    pts.push(pt1);
  }

  let vertex = [] as any,
    normal = [] as any;
  let uv = [] as any;
  let p0: vec3, p1: vec3, p2: vec3, p3: vec3, a: vec3, b: vec3;

  for (let i = 0; i < u - 1; i++) {
    for (let j = 0; j < v - 1; j++) {
      p0 = pts[i][j];
      p1 = pts[i + 1][j];
      p2 = pts[i + 1][j + 1];
      p3 = pts[i][j + 1];
      a = vec3.create();
      b = vec3.create();
      vec3.subtract(a, p2, p0);
      vec3.subtract(b, p1, p3);

      vertex.push([
        p0[0],
        p0[1],
        p0[2],
        p1[0],
        p1[1],
        p1[2],
        p3[0],
        p3[1],
        p3[2],

        p1[0],
        p1[1],
        p1[2],
        p2[0],
        p2[1],
        p2[2],
        p3[0],
        p3[1],
        p3[2],
      ]);

      normal.push([
        p0[0] / radius,
        p0[1] / radius,
        p0[2] / radius,
        p1[0] / radius,
        p1[1] / radius,
        p1[2] / radius,
        p3[0] / radius,
        p3[1] / radius,
        p3[2] / radius,

        p1[0] / radius,
        p1[1] / radius,
        p1[2] / radius,
        p2[0] / radius,
        p2[1] / radius,
        p2[2] / radius,
        p3[0] / radius,
        p3[1] / radius,
        p3[2] / radius,
      ]);

      uv.push([
        j / (v - 1),
        i / (u - 1),
        j / (v - 1),
        (i + 1) / (u - 1),
        (j + 1) / (v - 1),
        i / (u - 1),
        j / (v - 1),
        (i + 1) / (u - 1),
        (j + 1) / (v - 1),
        (i + 1) / (u - 1),
        (j + 1) / (v - 1),
        i / (u - 1),
      ]);
    }
  }
  return {
    vertexData: new Float32Array(vertex.flat()),
    normalData: new Float32Array(normal.flat()),
    uvData: new Float32Array(uv.flat()),
  };
};

onmessage = function (event: any) {
  var numFs = event.data.numFs;
  var sphereData = SphereData(10, numFs, numFs);

  postMessage(sphereData);
};
