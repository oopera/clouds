import {
  amount_of_points,
  cameraposition,
  displacement,
  mb300,
  mb500,
  mb700,
  pitch,
  rotation_speed,
  topology,
  use_texture,
  yaw,
} from '$lib/stores/stores';
import type { HasChanged, RenderOptions, UniOptions } from '$lib/types/types';

export default function InitStores(
  uniOptions: UniOptions,
  options: RenderOptions,
  hasChanged: HasChanged,
  canvas: HTMLCanvasElement
) {
  if (!document) return;

  let isFirstInvocation = true;

  var isDragging = false;

  amount_of_points.subscribe((value) => {
    options.numFs = value;
    if (!isFirstInvocation) {
      hasChanged.numFs = true;
    }
  });

  cameraposition.subscribe((value) => {
    options.cameraPosition = value;
  });

  yaw.subscribe((value) => {
    options.yaw = value;
  });

  pitch.subscribe((value) => {
    options.pitch = value;
  });

  mb300.subscribe((value) => {
    options.layer.mb300 = value;
  });

  mb500.subscribe((value) => {
    options.layer.mb500 = value;
  });

  mb700.subscribe((value) => {
    options.layer.mb700 = value;
  });

  use_texture.subscribe((value) => {
    uniOptions.useTexture = value;
    hasChanged.useTexture = true;
  });

  displacement.subscribe((value) => {
    uniOptions.heightDisplacement = value;
  });

  rotation_speed.subscribe((value) => {
    options.rotationSpeed = value;
    hasChanged.rotationSpeed = true;
  });

  topology.subscribe((value) => {
    options.topology = value;
    hasChanged.topology = true;
  });

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    options.coords.lastX = e.clientX;
    options.coords.lastY = e.clientY;

    // const intersection_coords = CalculateIntersection(
    //   e.clientX,
    //   e.clientY,
    //   options
    // );
    // if (intersection_coords.discriminant > 0) {
    //   uniOptions.intersection.x = -intersection_coords.u;
    //   uniOptions.intersection.y = intersection_coords.v;
    //   mouse_interaction.set({
    //     intersected: true,
    //     x: intersection_coords.u,
    //     y: intersection_coords.v,
    //     longitude: intersection_coords.longitude || 0,
    //     latitude: intersection_coords.latitude || 0,
    //   });
    // } else {
    //   mouse_interaction.set({
    //     intersected: false,
    //     x: 0,
    //     y: 0,
    //     longitude: 0,
    //     latitude: 0,
    //   });
    // }
  });
  canvas.addEventListener('mouseup', (e) => {
    isDragging = false;
    options.coords.lastX = 0;
    options.coords.lastY = 0;
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      var changeX = e.clientX - options.coords.lastX;
      var changeY = e.clientY - options.coords.lastY;

      var newPitch = options.pitch + 0.1 * changeY * Math.pow(options.zoom, 2);
      newPitch = Math.max(-89, Math.min(89, newPitch));

      var newYaw = options.yaw - 0.1 * changeX * Math.pow(options.zoom, 2);

      newYaw = newYaw % 360;

      pitch.set(newPitch);
      yaw.set(newYaw);
      options.coords.lastX = e.clientX;
      options.coords.lastY = e.clientY;
    }
  });

  isFirstInvocation = false;
}
