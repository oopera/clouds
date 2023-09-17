import type { LoadingStore } from '$lib/types/types';
import { derived, writable, type Writable } from 'svelte/store';
import { cubicBezier } from '../shaders/utils/cubicBezier';
import { tweened } from 'svelte/motion';

export const amount_of_points = writable(250);
export const scale = writable(0.05);

export const cloud_density = writable(0.75);

export const sun_transmittance = writable(0.44);
export const rayleigh_intensity = writable(1.3);

export const raymarch_length = writable(0.3);
export const raymarch_steps = writable(99);
export const rotation_speed = writable(0.05);

export const half_res = writable(true);
export const projection_date = writable({ day: '0', month: '0', year: '0' });
export const light_type = writable<'day_cycle' | 'full_day' | 'full_night'>(
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
  duration: 1250,
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
  duration: 1250,
  easing: cubicBezier,
});
export const setYaw = (value: number, useTween: boolean) => {
  if (useTween) {
    tweenedYaw.set(value);
  } else {
    yaw.set(value);
  }
};

export const zoom = writable(25);
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

export const cameraposition = derived(
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

export default {
  amount_of_points,
  scale,
  loading,
  pitch,
  rotation_speed,
  light_type,
  mouse_interaction,
  yaw,
  zoom,
  mb300,
};
