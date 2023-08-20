import {
  amount_of_points,
  atmo,
  cameraposition,
  light_type,
  scale,
  mb300,
  mb500,
  mb700,
  pitch,
  rotation_speed,
  yaw,
  density,
  sun_transmittance,
  rayleigh_intensity,
} from '$lib/stores/stores';
import type { HasChanged, RenderOptions } from '$lib/types/types';
import { quintOut } from 'svelte/easing';
import { tweened } from 'svelte/motion';

export default function InitStores(
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

  light_type.subscribe((value) => {
    options.lightType = value;
  });

  density.subscribe((value) => {
    options.density = value;
  });

  sun_transmittance.subscribe((value) => {
    options.sunDensity = value;
  });

  rayleigh_intensity.subscribe((value) => {
    options.rayleighIntensity = value;
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

  const tweenedmb300 = tweened<number>(1, {
    duration: 1000,
    easing: quintOut,
  });

  mb300.subscribe((value) => {
    tweenedmb300.set(value);
  });

  tweenedmb300.subscribe((value) => {
    options.layer.mb300 = value;
  });

  const tweenedmb500 = tweened<number>(1, {
    duration: 1000,
    easing: quintOut,
  });

  mb500.subscribe((value) => {
    tweenedmb500.set(value);
  });

  tweenedmb500.subscribe((value) => {
    options.layer.mb500 = value;
  });

  const tweenedmb700 = tweened<number>(1, {
    duration: 1000,
    easing: quintOut,
  });

  mb700.subscribe((value) => {
    tweenedmb700.set(value);
  });

  tweenedmb700.subscribe((value) => {
    options.layer.mb700 = value;
  });

  const tweenedAtmo = tweened<number>(1, {
    duration: 1000,
    easing: quintOut,
  });

  tweenedAtmo.subscribe((value) => {
    options.layer.atmo = value;
  });

  atmo.subscribe((value) => {
    tweenedAtmo.set(value);
  });

  const tweenedscale = tweened<number>(0, {
    duration: 1000,
    easing: quintOut,
  });
  tweenedscale.subscribe((value) => {
    options.scale = value;
  });

  scale.subscribe((value) => {
    tweenedscale.set(value);
  });

  rotation_speed.subscribe((value) => {
    options.rotationSpeed = value;
    if (!isFirstInvocation) {
      hasChanged.rotationSpeed = true;
    }
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
