import { mat4, vec3, vec4 } from 'gl-matrix';
import { CreateViewProjection } from './helper/matrixHelper';
import type { RenderOptions } from '$lib/types/types';
import { degToRad } from './helper/wgslHelper';

export function CalculateIntersection(
  mouseX: number,
  mouseY: number,
  options: RenderOptions
) {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();

  const x = ((mouseX - rect.left) / canvas.width) * 2 - 1;
  const y = -((mouseY - rect.top) / canvas.height) * 2 + 1;

  const pitchRadian = degToRad(options.pitch);
  const yawRadian = degToRad(options.yaw);

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
  const sphereRadius = 2; // Assuming the fixed radius of the globe is 2

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
    const t = (-b + Math.sqrt(discriminant)) / (2.0 * a); // Use positive root
    const intersectionPoint = vec3.add(
      vec3.create(),
      rayOriginToSphereCenter,
      vec3.scale(vec3.create(), rayDirection, t)
    );
    const rotationMatrix = mat4.create();
    mat4.rotateY(rotationMatrix, rotationMatrix, yawRadian);
    mat4.rotateX(rotationMatrix, rotationMatrix, pitchRadian);

    const rotatedIntersectionPoint = vec3.transformMat4(
      vec3.create(),
      intersectionPoint,
      rotationMatrix
    );

    const azimuth = Math.atan2(
      rotatedIntersectionPoint[2],
      rotatedIntersectionPoint[0]
    );
    const polar = Math.asin(rotatedIntersectionPoint[1] / sphereRadius);

    const degreesPerRadian = 180 / Math.PI;
    const longitude = azimuth * degreesPerRadian;
    const latitude = polar * degreesPerRadian;

    const normalizedLongitude = (longitude + 180) / 360;
    const normalizedLatitude = (latitude + 90) / 180;

    const u = normalizedLongitude;
    const v = normalizedLatitude;
    return { u, v, discriminant, longitude, latitude };
  } else {
    return { u: 0, v: 0, discriminant };
  }
}
export default CalculateIntersection;
