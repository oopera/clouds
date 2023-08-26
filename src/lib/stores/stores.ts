import type { LoadingStore } from '$lib/types/types';
import { derived, writable, type Writable } from 'svelte/store';
import { cubicBezier } from './easing';
import { tweened } from 'svelte/motion';

export const amount_of_points = writable(250);
export const scale = writable(0.05);
export const cloud_density = writable(0.15);
export const sun_transmittance = writable(0.015);
export const rayleigh_intensity = writable(0.3);
export const raymarch_length = writable(0.0001);
export const light_type = writable<'day_cycle' | 'full_day' | 'full_night'>(
  'day_cycle'
);
export const projection_date = writable({ day: '0', month: '0', year: '0' });
export const raymarch_steps = writable(60);
export const rotation_speed = writable(0.0);
export const use_texture = writable(true);
export const wireframe = writable(false);
export const half_res = writable(false);
export const mb300 = writable(1);
export const mb500 = writable(1);
export const mb700 = writable(1);
export const atmo = writable(1);
export const cloud = writable(1);
export const pitch = writable(1);
export const tweenedPitch = tweened(100, {
  duration: 250,
  easing: cubicBezier,
});
export const yaw = writable(1);
export const tweenedYaw = tweened(100, {
  duration: 250,
  easing: cubicBezier,
});
export const zoom = writable(25);
export const tweenedZoom = tweened(25, {
  duration: 1250,
  easing: cubicBezier,
});

export const cameraposition = derived(
  [tweenedPitch, tweenedYaw, tweenedZoom],
  ([$pitch, $yaw, $zoom]) => {
    const pitchRadian = ($pitch * Math.PI) / 180;
    const yawRadian = ($yaw * Math.PI) / 180;

    const x = $zoom * Math.cos(pitchRadian) * Math.sin(yawRadian);
    const y = $zoom * Math.sin(pitchRadian);
    const z = $zoom * Math.cos(pitchRadian) * Math.cos(yawRadian);
    return { x, y, z };
  }
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

export default {
  amount_of_points,
  scale,
  loading,
  pitch,
  rotation_speed,
  light_type,
  mouse_interaction,
  use_texture,
  wireframe,
  yaw,
  zoom,
  mb300,
};
