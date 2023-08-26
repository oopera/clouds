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
  zoom,
  cloud_density,
  sun_transmittance,
  rayleigh_intensity,
  raymarch_steps,
  raymarch_length,
  projection_date,
  half_res,
  tweenedZoom,
  tweenedYaw,
  tweenedPitch,
  mouse_interaction,
} from '$lib/stores/stores';
import type { HasChanged, RenderOptions } from '$lib/types/types';
import CalculateIntersection from './calculateIntersection';

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

  half_res.subscribe((value) => {
    options.halfRes = value;
  });

  raymarch_steps.subscribe((value) => {
    options.raymarchSteps = value;
  });

  light_type.subscribe((value) => {
    options.lightType = value;
  });

  cloud_density.subscribe((value) => {
    options.cloudDensity = value;
  });

  sun_transmittance.subscribe((value) => {
    options.sunDensity = value;
  });

  rayleigh_intensity.subscribe((value) => {
    options.rayleighIntensity = value;
  });

  raymarch_length.subscribe((value) => {
    options.raymarchLength = value;
  });

  cameraposition.subscribe((value) => {
    options.cameraPosition = value;
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

  yaw.subscribe((value) => {
    tweenedYaw.update((n) => (n = value));
  });

  tweenedYaw.subscribe((value) => {
    options.yaw = value;
  });

  pitch.subscribe((value) => {
    tweenedPitch.update((n) => (n = value));
  });

  tweenedPitch.subscribe((value) => {
    options.pitch = value;
  });

  zoom.subscribe((value) => {
    tweenedZoom.update((n) => (n = value));
  });

  tweenedZoom.subscribe((value) => {
    options.zoom = value;
  });

  mouse_interaction.subscribe((value) => {
    options.coords.x = -value.u;
    options.coords.y = value.v;
  });

  const handleScroll = (e: WheelEvent) => {
    e.preventDefault();

    let newZoom = options.zoom + e.deltaY * 0.0025;
    if (newZoom > 2.25 && newZoom < 7.25) {
      newZoom = options.zoom + e.deltaY * 0.0025 * (options.zoom / 7.25);
    }

    let finalZoom = Math.max(2.25, Math.min(newZoom, 7.25));

    zoom.set(finalZoom);
  };

  const handleTouch = (e: TouchEvent) => {
    e.preventDefault();

    let newZoom = options.zoom + e.touches[0].clientY * 0.0025;
    if (newZoom > 2.25 && newZoom < 7.25) {
      newZoom =
        options.zoom + e.touches[0].clientY * 0.0025 * (options.zoom / 7.25);
    }

    let finalZoom = Math.max(2.25, Math.min(newZoom, 7.25));

    zoom.set(finalZoom);
  };

  window.addEventListener('wheel', handleScroll, { passive: false });
  window.addEventListener('touchmove', handleTouch, { passive: false });

  const handlemouseup = (e: MouseEvent) => {
    isDragging = false;
    options.coords.lastX = 0;
    options.coords.lastY = 0;
  };

  const handlemousemove = (e: MouseEvent) => {
    if (isDragging) {
      var changeX = e.clientX - options.coords.lastX;
      var changeY = e.clientY - options.coords.lastY;

      var newPitch = options.pitch + 0.1 * changeY * Math.pow(options.zoom, 3);
      newPitch = Math.max(-89, Math.min(89, newPitch));

      var newYaw = options.yaw - 0.1 * changeX * Math.pow(options.zoom, 3);
      newYaw = newYaw % 360;

      options.coords.lastX = e.clientX;
      options.coords.lastY = e.clientY;

      pitch.set(newPitch);
      yaw.set(newYaw);
    }
  };

  const handlemousedown = (e: MouseEvent) => {
    isDragging = true;
    options.coords.lastX = e.clientX;
    options.coords.lastY = e.clientY;

    const intersection_coords = CalculateIntersection(
      e.clientX,
      e.clientY,
      options
    );

    if (intersection_coords.discriminant > 0) {
      mouse_interaction.set({
        intersected: true,
        x: intersection_coords.u,
        y: intersection_coords.v,
        longitude: intersection_coords.longitude || 0,
        latitude: intersection_coords.latitude || 0,
      });
    } else {
      mouse_interaction.set({
        intersected: false,
        x: 0,
        y: 0,
        longitude: 0,
        latitude: 0,
      });
    }
  };

  canvas.addEventListener('mousedown', handlemousedown);
  canvas.addEventListener('mouseup', handlemouseup);
  canvas.addEventListener('mousemove', handlemousemove);

  isFirstInvocation = false;
}
