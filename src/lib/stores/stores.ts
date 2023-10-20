import type { LoadingStore } from '$lib/types/types';
import { derived, writable, type Writable } from 'svelte/store';
import { cubicBezier } from '../shaders/utils/tween';
import { tweened } from 'svelte/motion';

export const has_initialized = writable(false);
export const amount_of_points = writable(250);
export const scale = writable(0.05);
export const fps = writable(0);
export const dragging = writable(false);
export const cloud_density = writable(0.5);
export const sun_transmittance = writable(2.0);
export const rayleigh_intensity = writable(0.2);
export const raymarch_length = writable(0.3);
export const raymarch_steps = writable(31);
export const rotation_speed = writable(0.05);
export const half_res = writable(true);
export const day_cycle = writable<'day_cycle' | 'full_day' | 'full_night'>(
  'day_cycle'
);

export const mouse_interaction = writable({
  intersected: false,
  x: 0,
  y: 0,
  longitude: 0.0,
  latitude: 0.0,
});

export const loading: Writable<LoadingStore> = writable({
  welcome: {
    id: 0,
    status: true,
    progress: 0,
    message: 'Welcome',
  },
});

export const mb300 = writable(1);
export const mb500 = writable(1);
export const mb700 = writable(1);
export const atmo = writable(1);

export const pitch = writable(0);
export const tweenedPitch = tweened(0, {
  duration: 1750,
  easing: cubicBezier,
});
export const setPitch = (value: number, useTween: boolean) => {
  if (useTween) {
    tweenedPitch.set(value);
  } else {
    pitch.set(value);
  }
};

export const yaw = writable(0);
export const tweenedYaw = tweened(0, {
  duration: 1750,
  easing: cubicBezier,
});
export const setYaw = (value: number, useTween: boolean) => {
  if (useTween) {
    tweenedYaw.set(value);
  } else {
    yaw.set(value);
  }
};

export const zoom = writable(10);
export const tweenedZoom = tweened(25, {
  duration: 1250,
  easing: cubicBezier,
});
export const setZoom = (value: number, useTween: boolean) => {
  if (useTween) {
    tweenedZoom.set(value);
  } else {
    zoom.set(value);
  }
};

export const camera_position = derived(
  [pitch, yaw, zoom],
  ([$pitch, $yaw, $zoom]) => {
    const pitchRadian = ($pitch * Math.PI) / 180;
    const yawRadian = ($yaw * Math.PI) / 180;
    const x = $zoom * Math.cos(pitchRadian) * Math.sin(yawRadian);
    const y = $zoom * Math.sin(pitchRadian);
    const z = $zoom * Math.cos(pitchRadian) * Math.cos(yawRadian);
    return { x, y, z };
  }
);

export const projection_date = writable({
  modelRunDate: {
    year: '0',
    month: '0',
    day: '0',
  },
  modelRunTime: '0',
  forecastHours: '0',
  projected_time: '0',
});

export const tweenedLightposition = tweened(
  { x: 0, y: 0, z: 5 },
  {
    duration: 2750,
    easing: cubicBezier,
  }
);

export const light_position = derived(
  [projection_date],
  ([$projection_date]) => {
    const distance = 6.0;

    // Adjust for time difference between GMT and Amazon Time (AMT is GMT-4)
    const adjustedTime = parseInt($projection_date.projected_time) + 12;

    // Normalize the time to a 24-hour format after adjustment
    const normalizedTime = (adjustedTime + 24) % 24;

    // Calculate angle based on adjusted time
    const angle = (normalizedTime / 24.0) * 2.0 * Math.PI;

    const x = distance * Math.cos(angle);
    const y = 0;
    const z = distance * Math.sin(angle);

    tweenedLightposition.set({ x, y, z });

    return { x, y, z };
  }
);
