import { mat4, vec3, quat } from 'gl-matrix';

export const CreateViewProjection = (
  respectRatio = 1.0,
  cameraPosition: vec3 = [0, 0, 4],
  lookDirection: vec3 = [0, 0, 0],
  upDirection: vec3 = [0, 1, 0]
) => {
  const viewMatrix = mat4.create();
  const projectionMatrix = mat4.create();
  const viewProjectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, 2, respectRatio, 0.1, Infinity);

  mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
  mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

  return {
    projectionMatrix,
    viewProjectionMatrix,
    viewMatrix,
  };
};
