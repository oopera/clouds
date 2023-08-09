function hash33(p: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  const UI3 = [1597334673, 3812015801, 2798796415];
  const UIF = 1.0 / 0xffffffff;

  let q = {
    x:
      (Math.floor(p.x) * UI3[0]) ^
      (Math.floor(p.y) * UI3[1]) ^
      (Math.floor(p.z) * UI3[2]),
    y:
      (Math.floor(p.y) * UI3[0]) ^
      (Math.floor(p.z) * UI3[1]) ^
      (Math.floor(p.x) * UI3[2]),
    z:
      (Math.floor(p.z) * UI3[0]) ^
      (Math.floor(p.x) * UI3[1]) ^
      (Math.floor(p.y) * UI3[2]),
  };

  q = {
    x: q.x * UIF,
    y: q.y * UIF,
    z: q.z * UIF,
  };

  return {
    x: -1.0 + 2.0 * q.x,
    y: -1.0 + 2.0 * q.y,
    z: -1.0 + 2.0 * q.z,
  };
}

function worleyNoise(
  uv: { x: number; y: number; z: number },
  freq: number
): number {
  const id = {
    x: Math.floor(uv.x),
    y: Math.floor(uv.y),
    z: Math.floor(uv.z),
  };

  const p = {
    x: uv.x - id.x,
    y: uv.y - id.y,
    z: uv.z - id.z,
  };

  let minDist = Infinity;

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const offset = { x, y, z };
        const h = hash33({
          x: (id.x + offset.x) % freq,
          y: (id.y + offset.y) % freq,
          z: (id.z + offset.z) % freq,
        });

        const d = {
          x: p.x - h.x,
          y: p.y - h.y,
          z: p.z - h.z,
        };

        minDist = Math.min(minDist, d.x * d.x + d.y * d.y + d.z * d.z);
      }
    }
  }

  return 1 - minDist;
}

export default function worleyFbm(
  p: { x: number; y: number; z: number },
  freq: number
): number {
  return (
    worleyNoise({ x: p.x * freq, y: p.y * freq, z: p.z * freq }, freq) * 0.125 +
    worleyNoise(
      { x: p.x * freq * 2, y: p.y * freq * 2, z: p.z * freq * 2 },
      freq * 2
    ) *
      0.25 +
    worleyNoise(
      { x: p.x * freq * 4, y: p.y * freq * 4, z: p.z * freq * 4 },
      freq * 4
    ) *
      0.125
  );
}
