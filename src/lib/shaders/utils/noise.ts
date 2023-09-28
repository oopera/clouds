// Adapted from https://www.shadertoy.com/view/3dVXDc
// Created by piyushslayer in 2019-12-11

type Vec3 = [number, number, number];

function fract(value: number): number {
  return value - Math.floor(value);
}
function hash33(p3: Vec3): Vec3 {
  const p: Vec3 = [
    fract(p3[0] * 0.1031),
    fract(p3[1] * 0.11369),
    fract(p3[2] * 0.13787),
  ];
  const dotValue = p[0] * (p[1] + p[2] + 19.19) + p[1] * (p[2] + 19.19);

  p[0] += dotValue;
  p[1] += dotValue;
  p[2] += dotValue;

  return [
    -1.0 + 2.0 * fract(p[0]),
    -1.0 + 2.0 * fract(p[1]),
    -1.0 + 2.0 * fract(p[2]),
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function gradientNoise(x: Vec3, freq: number): number {
  const p: Vec3 = [Math.floor(x[0]), Math.floor(x[1]), Math.floor(x[2])];
  const w: Vec3 = [fract(x[0]), fract(x[1]), fract(x[2])];

  const u: Vec3 = w.map(
    (v) => v * v * v * (v * (v * 6.0 - 15.0) + 10.0)
  ) as Vec3;

  const ga = hash33([(p[0] + 0) % freq, (p[1] + 0) % freq, (p[2] + 0) % freq]);
  const gb = hash33([(p[0] + 1) % freq, (p[1] + 0) % freq, (p[2] + 0) % freq]);
  const gc = hash33([(p[0] + 0) % freq, (p[1] + 1) % freq, (p[2] + 0) % freq]);
  const gd = hash33([(p[0] + 1) % freq, (p[1] + 1) % freq, (p[2] + 0) % freq]);
  const ge = hash33([(p[0] + 0) % freq, (p[1] + 0) % freq, (p[2] + 1) % freq]);
  const gf = hash33([(p[0] + 1) % freq, (p[1] + 0) % freq, (p[2] + 1) % freq]);
  const gg = hash33([(p[0] + 0) % freq, (p[1] + 1) % freq, (p[2] + 1) % freq]);
  const gh = hash33([(p[0] + 1) % freq, (p[1] + 1) % freq, (p[2] + 1) % freq]);

  const va = dot(ga, [w[0] - 0, w[1] - 0, w[2] - 0]);
  const vb = dot(gb, [w[0] - 1, w[1] - 0, w[2] - 0]);
  const vc = dot(gc, [w[0] - 0, w[1] - 1, w[2] - 0]);
  const vd = dot(gd, [w[0] - 1, w[1] - 1, w[2] - 0]);
  const ve = dot(ge, [w[0] - 0, w[1] - 0, w[2] - 1]);
  const vf = dot(gf, [w[0] - 1, w[1] - 0, w[2] - 1]);
  const vg = dot(gg, [w[0] - 0, w[1] - 1, w[2] - 1]);
  const vh = dot(gh, [w[0] - 1, w[1] - 1, w[2] - 1]);

  return (
    va +
    u[0] * (vb - va) +
    u[1] * (vc - va) +
    u[2] * (ve - va) +
    u[0] * u[1] * (va - vb - vc + vd) +
    u[1] * u[2] * (va - vc - ve + vg) +
    u[2] * u[0] * (va - vb - ve + vf) +
    u[0] * u[1] * u[2] * (-va + vb + vc - vd + ve - vf - vg + vh)
  );
}

export function perlinfbm(p: Vec3, freq: number, octaves: number): number {
  const G = Math.exp(-0.85);
  let amp = 1.0;
  let noise = 0.0;

  for (let i = 0; i < octaves; i++) {
    noise += amp * gradientNoise([p[0] * freq, p[1] * freq, p[2] * freq], freq);
    freq *= 2.0;
    amp *= G;
  }

  return noise;
}

function worley(p: Vec3, scale: number, frequency: number): number {
  p = [p[0] * frequency, p[1] * frequency, p[2] * frequency];

  const id: Vec3 = [
    Math.floor(p[0] * scale),
    Math.floor(p[1] * scale),
    Math.floor(p[2] * scale),
  ];

  const fd: Vec3 = [
    fract(p[0] * scale),
    fract(p[1] * scale),
    fract(p[2] * scale),
  ];

  let minimalDist = 1.0;

  for (let x = -1.0; x <= 1.0; x++) {
    for (let y = -1.0; y <= 1.0; y++) {
      for (let z = -1.0; z <= 1.0; z++) {
        const coord: Vec3 = [x, y, z];
        const rId = hash33([
          (id[0] + coord[0]) % scale,
          (id[1] + coord[1]) % scale,
          (id[2] + coord[2]) % scale,
        ]).map((v) => 0.5 * v + 0.5) as Vec3;

        const r: Vec3 = [
          coord[0] + rId[0] - fd[0],
          coord[1] + rId[1] - fd[1],
          coord[2] + rId[2] - fd[2],
        ];

        const d = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];

        if (d < minimalDist) {
          minimalDist = d;
        }
      }
    }
  }

  return 1.0 - minimalDist;
}

export function generateWorleyFbmNoise(
  width: number,
  height: number,
  depth: number,
  frequency: number
): Float32Array {
  const result = new Float32Array(width * height * depth);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        const uv: [number, number] = [x / width, y / height];
        const value = worley(
          [uv[0] * 2.0 - 1.0, uv[1] * 2.0 - 1.0, z / depth],
          2.0,
          frequency
        );

        const index = x + y * width + z * width * height;
        result[index] = value;
      }
    }
  }

  return result;
}

export function generatePerlinFbmNoise(
  width: number,
  height: number,
  depth: number,
  frequency: number,
  octaves: number
): Float32Array {
  const result = new Float32Array(width * height * depth);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        const uv: [number, number] = [x / width, y / height];
        const value = perlinfbm(
          [uv[0] * 2.0 - 1.0, uv[1] * 2.0 - 1.0, z / depth],
          frequency,
          octaves
        );
        const index = x + y * width + z * width * height;
        result[index] = value;
      }
    }
  }

  return result;
}
