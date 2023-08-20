import type { vec3 } from 'gl-matrix';

export type Stores =
  // Rendering related
  | 'amount_of_points'
  | 'raymarch_steps'
  | 'rotation_speed'
  | 'zoom'
  | 'scale'

  // Light and atmosphere related
  | 'light_type'
  | 'density'
  | 'sun_transmittance'
  | 'rayleigh_intensity'
  | 'atmo'
  | 'mb300';

export interface RenderOptions {
  // Booleans
  useTexture: boolean;
  depthWriteEnabled: boolean;

  // Numbers
  numFs: number;
  rotationSpeed: number;
  zoom: number;
  pitch: number;
  yaw: number;
  raymarchSteps: number;
  density: number;
  sunDensity: number;
  rayleighIntensity: number;
  scale: number;
  amountOfVertices: number;

  // Strings (enum types)
  cullmode: 'none' | 'front' | 'back';
  lightType: 'day_cycle' | 'full_day' | 'full_night';
  cloudType: 'cumulus' | 'stratus' | 'cirrus';
  topology: 'point-list' | 'line-list' | 'triangle-list';

  // Nested Objects
  layer: {
    mb300: number;
    mb500: number;
    mb700: number;
    atmo: number;
  };
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
  coords: {
    lastX: number;
    lastY: number;
  };

  // Others
  blend: any;
}
export interface UniOptions {
  displacement: number;
  useTexture: boolean;
  intersection: {
    x: number;
    y: number;
  };
}
export interface HasChanged {
  numFs: boolean;
  rotationSpeed: boolean;
  useTexture: boolean;
  cullmode: boolean;
  zoom: boolean;
  topology: boolean;
  cloudType: boolean;
  resolution: boolean;
}

export interface SphereData {
  vertexData: Float32Array;
  normalData: Float32Array;
  uvData: Float32Array;
}

export interface LoadingItem {
  id: number;
  status: boolean;
  message: string;
  progress: number;
}

export interface LoadingStore {
  [key: string]: LoadingItem;
}

export interface LightUniforms {
  lightPosition: vec3;
  lightColor: vec3;
  lightIntensity: number;
}
