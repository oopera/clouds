import { mat4, vec3, vec4 } from 'gl-matrix';
import { CreateViewProjection } from './matrix';
import type { RenderOptions } from '$lib/types/types';
import { camera_position } from '$lib/stores/stores';

var cam: any;
camera_position.subscribe((value) => {
  cam = value;
});

export function CalculateIntersection(
  mouseX: number,
  mouseY: number,
  options: RenderOptions
) {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();

  const x = ((mouseX - rect.left) / canvas.width) * 2 - 1;
  const y = -((mouseY - rect.top) / canvas.height) * 2 + 1;

  const cameraPosition = vec3.create();
  vec3.set(
    cameraPosition,
    options.cameraPosition.x,
    options.cameraPosition.y,
    options.cameraPosition.z
  );

  const vpMatrix = CreateViewProjection(
    canvas.width / canvas.height,
    cameraPosition
  );

  const rayClip = vec4.fromValues(x, y, -1.0, 1.0);

  const rayEye = vec4.transformMat4(
    vec4.create(),
    rayClip,
    mat4.invert(mat4.create(), vpMatrix.projectionMatrix)
  );

  rayEye[2] = -1.0;
  rayEye[3] = 0.0;

  const rayWorld = vec4.transformMat4(
    vec4.create(),
    rayEye,
    mat4.invert(mat4.create(), vpMatrix.viewMatrix)
  );

  const rayDirection = vec3.normalize(
    vec3.create(),
    vec3.fromValues(rayWorld[0], rayWorld[1], rayWorld[2])
  );

  const sphereCenter = vec3.fromValues(0, 0, 0);
  const sphereRadius = 2.5;

  const rayOriginToSphereCenter = vec3.sub(
    vec3.create(),
    sphereCenter,
    cameraPosition
  );

  const a = vec3.dot(rayDirection, rayDirection);
  const b = 2.0 * vec3.dot(rayDirection, rayOriginToSphereCenter);
  const c =
    vec3.dot(rayOriginToSphereCenter, rayOriginToSphereCenter) -
    sphereRadius * sphereRadius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant >= 0) {
    const t = (-b + Math.sqrt(discriminant)) / (2.0 * a);
    const intersectionPoint = vec3.add(
      vec3.create(),
      rayOriginToSphereCenter,
      vec3.scale(vec3.create(), rayDirection, t)
    );

    const azimuth = Math.atan2(intersectionPoint[2], intersectionPoint[0]);
    const polar = Math.asin(intersectionPoint[1] / sphereRadius);

    const degreesPerRadian = 180 / Math.PI;
    const longitude = azimuth * degreesPerRadian;
    const latitude = polar * degreesPerRadian;

    const normalizedLongitude = (longitude + 180) / 360;
    const normalizedLatitude = (latitude + 90) / 180;

    const u = normalizedLongitude;
    const v = normalizedLatitude;

    options.lastElapsed = options.elapsed;

    return { u, v, discriminant, longitude, latitude };
  } else {
    return { u: 0, v: 0, discriminant, longitude: 0, latitude: 0 };
  }
}

const width = 1440;
const height = 721;

export function getCloudCoverageByCoordinates(
  data: number[],
  longitude: number,
  latitude: number
): number | null {
  const normalizedLong = Math.floor(((longitude + 180) / 360) * width);
  const normalizedLat = Math.floor(((latitude + 90) / 180) * height);
  const index = normalizedLat * width + normalizedLong;

  if (index < 0 || index >= data.length) {
    return null;
  }

  return data[index];
}

export default CalculateIntersection;
