import {
  amount_of_points,
  atmo,
  camera_position,
  light_position,
  tweenedLightposition,
  day_cycle,
  scale,
  mb300,
  mb500,
  mb700,
  pitch,
  rotation_speed,
  yaw,
  zoom,
  cloud_density,
  atmo_intensity,
  light_intensity,
  step_length,
  projection_date,
  half_res,
  tweenedZoom,
  tweenedYaw,
  tweenedPitch,
  dragging,
} from '$lib/stores/stores';
import type { HasChanged, RenderOptions } from '$lib/types/types';

export default function InitStores(
  options: RenderOptions,
  hasChanged: HasChanged
) {
  if (!document) return;

  let isFirstInvocation = true;

  amount_of_points.subscribe((value) => {
    options.numFs = value;
    if (!isFirstInvocation) {
      hasChanged.numFs = true;
    }
  });

  half_res.subscribe((value) => {
    options.halfRes = value;
    if (!isFirstInvocation) {
      hasChanged.resolution = true;
    }
  });

  dragging.subscribe((value) => {
    options.isDragging = value;
  });

  step_length.subscribe((value) => {
    options.raymarchSteps = value;
  });

  day_cycle.subscribe((value) => {
    options.lightType = value;
  });

  cloud_density.subscribe((value) => {
    options.cloudDensity = value;
  });

  atmo_intensity.subscribe((value) => {
    options.sunDensity = value;
  });

  light_intensity.subscribe((value) => {
    options.rayleighIntensity = value;
  });

  camera_position.subscribe((value) => {
    options.cameraPosition = value;
  });

  tweenedLightposition.subscribe((value) => {
    options.lightPosition = value;
  });

  projection_date.subscribe((value) => {
    options.projectionDate = value;

    if (isFirstInvocation) return;
    hasChanged.projectionDate = true;
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

  atmo.subscribe((value) => {
    options.layer.atmo = value;
  });

  scale.subscribe((value) => {
    options.scale = value;
  });

  rotation_speed.subscribe((value) => {
    options.rotationSpeed = value;
    if (!isFirstInvocation) {
      hasChanged.rotationSpeed = true;
    }
  });

  tweenedYaw.subscribe((value) => {
    yaw.set(value);
  });

  yaw.subscribe((value) => {
    options.yaw = value;
  });

  tweenedPitch.subscribe((value) => {
    pitch.set(value);
  });

  pitch.subscribe((value) => {
    options.pitch = value;
  });

  tweenedZoom.subscribe((value) => {
    zoom.set(value);
  });

  zoom.subscribe((value) => {
    options.zoom = value;
  });

  let light_position_value;

  light_position.subscribe((value) => {
    light_position_value = value;
  });

  isFirstInvocation = false;
}
