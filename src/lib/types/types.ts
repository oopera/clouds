import type { vec3 } from 'gl-matrix';

export interface RenderOptions {
  cullmode: 'none' | 'front' | 'back';
  useTexture: boolean;
  numFs: number;
  rotationSpeed: number;
  zoom: number;
  pitch: number;
  yaw: number;
  cameraPosition: { x: number; y: number; z: number };
  topology: 'point-list' | 'line-list' | 'triangle-list';
  amountOfVertices: number;
  depthWriteEnabled: boolean;
  blend: any;
  coords: {
    lastX: number;
    lastY: number;
  };
}
export interface UniOptions {
  heightDisplacement: number;
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
export type Stores =
  | 'amount_of_points'
  | 'displacement'
  | 'rotation_speed'
  | 'zoom'
  | 'scale'
  | 'cloud_type';
