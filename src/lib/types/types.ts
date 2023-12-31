import type { vec3 } from 'gl-matrix';

export type Stores =
  // Rendering related
  | 'amount_of_points'
  | 'step_length'
  | 'rotation_speed'
  | 'zoom'
  | 'tweenedZoom'
  | 'scale'

  // Light and atmosphere related
  | 'day_cycle'
  | 'cloud_density'
  | 'atmo_intensity'
  | 'light_intensity'
  | 'atmo'
  | 'mb300'
  | 'raymarch_length'
  | 'projection_date'
  | 'half_res';

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
  cloudDensity: number;
  sunDensity: number;
  rayleighIntensity: number;
  raymarchLength: number;
  scale: number;
  amountOfVertices: number;
  halfRes: boolean;
  isDragging: boolean;
  isFetching: boolean;

  elapsed: number;
  lastElapsed: number;

  projectionDate: {
    modelRunDate: {
      year: string;
      month: string;
      day: string;
    };
    modelRunTime: string;
    forecastHours: string;
    projected_time: string;
  };

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
  lightPosition: {
    x: number;
    y: number;
    z: number;
  };
  coords: {
    x: number;
    y: number;
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
  projectionDate: boolean;
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
