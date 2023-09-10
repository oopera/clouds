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
  setZoom,
  setPitch,
  setYaw,
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

  mouse_interaction.subscribe((value) => {
    options.coords.x = value.x;
    options.coords.y = value.y;
  });

  const handleScroll = (e: WheelEvent) => {
    e.preventDefault();

    let newZoom = options.zoom + e.deltaY * 0.0025;
    if (newZoom > 2.25 && newZoom < 7.25) {
      newZoom = options.zoom + e.deltaY * 0.0025 * (options.zoom / 7.25);
    }

    let finalZoom = Math.max(2.25, Math.min(newZoom, 7.25));

    setZoom(finalZoom, true);
  };

  const handleTouch = (e: TouchEvent) => {
    e.preventDefault();

    let newZoom = options.zoom + e.touches[0].clientY * 0.0025;
    if (newZoom > 2.25 && newZoom < 7.25) {
      newZoom =
        options.zoom + e.touches[0].clientY * 0.0025 * (options.zoom / 7.25);
    }

    let finalZoom = Math.max(2.25, Math.min(newZoom, 7.25));

    setZoom(finalZoom, true);
  };

  window.addEventListener('wheel', handleScroll, { passive: false });
  window.addEventListener('touchmove', handleTouch, { passive: false });

  let initialX = 0;
  let initialY = 0;

  const handlemouseup = (e: MouseEvent) => {
    options.isDragging = false;

    // Calculate the distance moved during the drag
    const distance = Math.sqrt(
      Math.pow(e.clientX - initialX, 2) + Math.pow(e.clientY - initialY, 2)
    );

    if (distance < 50) {
      const intersection_coords = CalculateIntersection(
        e.clientX,
        e.clientY,
        options
      );

      const mouseInteractionData = {
        intersected: false,
        x: 0,
        y: 0,
        longitude: 0,
        latitude: 0,
      };

      if (intersection_coords.discriminant > 0) {
        mouseInteractionData.intersected = true;
        mouseInteractionData.x = -intersection_coords.u;
        mouseInteractionData.y = intersection_coords.v;
        mouseInteractionData.longitude = intersection_coords.longitude || 0;
        mouseInteractionData.latitude = intersection_coords.latitude || 0;
      }

      mouse_interaction.set(mouseInteractionData);
    }

    // Reset the stored initial coordinates
    initialX = 0;
    initialY = 0;
  };

  const handlemousemove = (e: MouseEvent) => {
    if (options.isDragging) {
      const changeX = e.clientX - options.coords.lastX;
      const changeY = e.clientY - options.coords.lastY;

      const newPitch =
        options.pitch + 0.1 * changeY * Math.pow(options.zoom, 0.25);
      const newYaw = options.yaw - 0.1 * changeX * Math.pow(options.zoom, 0.25);

      options.coords.lastX = e.clientX;
      options.coords.lastY = e.clientY;

      setPitch(Math.max(-89, Math.min(89, newPitch)), false);
      setYaw(newYaw, false);
    }
  };

  const handlemousedown = (e: MouseEvent) => {
    options.isDragging = true;

    // Store the initial X and Y coordinates
    initialX = e.clientX;
    initialY = e.clientY;

    options.coords.lastX = e.clientX;
    options.coords.lastY = e.clientY;
  };

  canvas.addEventListener('mousedown', handlemousedown);
  canvas.addEventListener('mouseup', handlemouseup);
  canvas.addEventListener('mousemove', handlemousemove);

  isFirstInvocation = false;
}
