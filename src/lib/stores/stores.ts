import type { LoadingStore } from '$lib/types/types';
import { derived, writable, type Writable } from 'svelte/store';

export const amount_of_points = writable(150);
export const displacement = writable(0.01);
export const topology = writable<'triangle-list' | 'line-list' | 'point-list'>(
  'triangle-list'
);
export const rotation_speed = writable(1);
export const use_texture = writable(true);
export const wireframe = writable(false);
export const pitch = writable(1);
export const yaw = writable(1);
export const zoom = writable(1);
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
  sphere: {
    id: 1,
    status: false,
    progress: 0,
    message: 'Vertex Data',
  },
});

export default {
  amount_of_points,
  displacement,
  loading,
  pitch,
  rotation_speed,
  topology,
  mouse_interaction,
  use_texture,
  wireframe,
  yaw,
  zoom,
};
