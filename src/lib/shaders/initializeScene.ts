import { mat4, vec3 } from 'gl-matrix';
import {
  CreatePipeline,
  CreateBindGroup,
  CreateVertexBuffers,
  WriteVertexBuffers,
  CreateSphereData,
} from './utils/helper/wgslHelper.js';
import InitStores from './utils/initStores.js';
import {
  CreateViewProjection,
  CreateTransforms,
} from './utils/helper/matrixHelper.js';
import { earthShader } from './shaders/earthShader.js';
import { yaw, loading } from '$lib/stores/stores.js';
import { cloudShader } from './shaders/cloudShader.js';

import {
  GetTexture,
  GetPartitionedTexture,
  Get3DNoiseTexture,
  loadBinaryData,
  Create3DTextureFromData,
  Get3DTextureFromGribData,
} from './utils/getTexture.js';

import { GetDepthTexture } from './utils/getTexture.js';
import type {
  RenderOptions,
  HasChanged,
  UniOptions,
} from '$lib/types/types.js';
import { atmosphereShader } from './shaders/atmosphereShader.js';
import { executePromise, loadImage } from './utils/executeAndUpdate.js';
import { mb300 } from '$lib/assets/mb300.js';
import { mb500 } from '$lib/assets/mb500.js';
import { mb700 } from '$lib/assets/mb700.js';
import { mb900 } from '$lib/assets/mb900.js';

import { dev } from '$app/environment';
import { tweened } from 'svelte/motion';
import { quintIn, quintOut } from 'svelte/easing';
import { fullScreenQuadShader } from './shaders/quadShader.js';

let depthTexture: GPUTexture;
let offscreenDepthTexture: GPUTexture;

var hasChanged: HasChanged = {
  numFs: false,
  rotationSpeed: false,
  useTexture: false,
  cullmode: false,
  zoom: false,
  topology: false,
  cloudType: false,
  resolution: false,
};

var options: RenderOptions = {
  // Booleans
  useTexture: true,
  depthWriteEnabled: true,

  // Numbers
  numFs: 0,
  rotationSpeed: 0.0025,
  zoom: 1,
  pitch: 0,
  yaw: 0,
  raymarchSteps: 0,
  density: 0.15,
  sunDensity: 0.5,
  rayleighIntensity: 0.5,
  scale: 0.0,
  amountOfVertices: 0,

  // Strings (enum types)
  lightType: 'day_cycle',
  cloudType: 'cumulus',
  cullmode: 'back',
  topology: 'triangle-list',

  // Nested Objects
  layer: {
    mb300: 1,
    mb500: 1,
    mb700: 1,
    atmo: 1,
  },
  cameraPosition: { x: 0, y: 0, z: 0 },
  coords: {
    lastX: 0,
    lastY: 0,
  },
  blend: {
    color: {
      srcFactor: 'src-alpha',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    },
    alpha: {
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    },
  },
};
var uniOptions: UniOptions = {
  displacement: 0.0,
  useTexture: true,
  intersection: {
    x: 0,
    y: 0,
  },
};

const pipeline: GPURenderPipeline[] = [];
const bindGroup: GPUBindGroup[] = [];
const buffers: GPUBuffer[][] = [];

var cloudDensity = 1.0;

var elapsed = -1;

const displayError = (message: string) => {
  var counter = 0;
  var interval = setInterval(() => {
    if (counter === 0) {
      loading.set({
        welcome: {
          id: 0,
          status: true,
          message: 'oh-oh',

          progress: 0,
        },
      });
    }
    counter++;

    loading.update((current) => {
      const id = Object.keys(current).length;
      return {
        ...current,
        [`Error-${id}`]: {
          id,
          status: true,
          message: counter % 2 === 0 ? 'ERROR ERROR ERROR' : message,
          progress: 0,
        },
      };
    });
    if (counter > 5) {
      clearInterval(interval);
    }
  }, 500);
  throw new Error(message);
};

async function InitializeScene() {
  if (!navigator.gpu) {
    displayError('You need a browser that supports WebGPU');
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    displayError('Failed to get GPU adapter.');
    return;
  }

  const device = await adapter.requestDevice();
  if (!device) {
    displayError('Failed to get GPU device.');
    return;
  }

  const canvas: HTMLCanvasElement = document.getElementById(
    'canvas'
  ) as HTMLCanvasElement;
  if (!canvas) {
    displayError('Failed to get canvas element.');
    return;
  }

  const context = canvas.getContext('webgpu');
  if (!context) {
    displayError('Failed to get canvas context.');
    return;
  }

  InitStores(options, hasChanged, canvas);

  let heightMap = await executePromise(
    'heightMap',
    loadImage('/textures/nasa-heightmap.png'),
    'height map'
  );
  let texture = await executePromise(
    'texture',
    loadImage('/textures/earth-truecolor.jpg'),
    'texture map'
  );
  let lightmap = await executePromise(
    'lightmap',
    loadImage('/textures/nasa-lightmap.jpg'),
    'light map'
  );

  let noise = await executePromise(
    'noise',
    loadBinaryData('/textures/noise.bin'),
    '3d noise textures'
  );

  let blueNoise = await executePromise(
    'blueNoise',
    loadImage('/textures/BlueNoise64Tiled.jpg'),
    'blue noise'
  );

  const heightMapV = await GetTexture(device, heightMap);
  const textureV = await GetPartitionedTexture(device, texture);
  const lightMapV = await GetPartitionedTexture(device, lightmap);
  const noiseV = Create3DTextureFromData(device, noise);
  const blueNoiseV = await GetTexture(device, blueNoise);

  let data = await executePromise(
    'sphere',
    CreateSphereData(options),
    'Vertex Data'
  );

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const vertexUniBuffer = device.createBuffer({
    label: 'vertex uniform buffer',
    size: 272,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cloudUniBuffer = device.createBuffer({
    label: 'cloud_01 uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const lightUniBuffer = device.createBuffer({
    label: 'light uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const atmosphereUniBuffer = device.createBuffer({
    label: 'light uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const normalMatrix = mat4.create();
  const modelMatrix = mat4.create();

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateString = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

  var parsed3DGribTexture;

  const generateNewNoiseTexture = false;
  var worleyNoiseTexture = noiseV;
  if (generateNewNoiseTexture) {
    worleyNoiseTexture = await executePromise(
      'worleyNoiseTexture',
      (await Get3DNoiseTexture(device)) as any,
      '3D Noise Texture'
    );
  }

  if (dev) {
    parsed3DGribTexture = await Get3DTextureFromGribData(device, [
      mb300,
      mb500,
      mb700,
      mb900,
    ]);
  } else {
    const mb300RD = await executePromise(
      'mb300RD',
      fetch(`/api/cloud-texture?level_mb=300_mb&date=${dateString}`),
      '300 millibar cloud-data'
    );

    const mb500RD = await executePromise(
      'mb500RD',
      fetch(`/api/cloud-texture?level_mb=500_mb&date=${dateString}`),
      '500 millibar cloud-data'
    );

    const mb700RD = await executePromise(
      'mb700RD',
      fetch(`/api/cloud-texture?level_mb=700_mb&date=${dateString}`),
      '700 millibar cloud-data'
    );

    const mb900RD = await executePromise(
      'mb800RD',
      fetch(`/api/cloud-texture?level_mb=900_mb&date=${dateString}`),
      '900 millibar cloud-data'
    );

    const mb300R = await mb300RD.json();
    const mb500R = await mb500RD.json();
    const mb700R = await mb700RD.json();
    const mb900R = await mb900RD.json();

    parsed3DGribTexture = await Get3DTextureFromGribData(device, [
      mb300R,
      mb500R,
      mb700R,
      mb900R,
    ]);

    // downloadJSONData(mb300R, 'mb300');
    // downloadJSONData(mb500R, 'mb500');
    // downloadJSONData(mb700R, 'mb700');
    // downloadJSONData(mb900R, 'mb900');
  }

  let canvasTexture = context.getCurrentTexture();

  let colorTexture = device.createTexture({
    size: {
      width: canvasTexture.width,
      height: canvasTexture.height,
    },
    sampleCount: 4,
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  let offscreenWidth = Math.floor(canvasTexture.width / 2);
  let offscreenHeight = Math.floor(canvasTexture.height / 2);

  let offscreenTexture = device.createTexture({
    size: {
      width: offscreenWidth,
      height: offscreenHeight,
    },
    sampleCount: 4,
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });

  let offscreenTextureResolve = device.createTexture({
    size: {
      width: offscreenWidth,
      height: offscreenHeight,
    },
    sampleCount: 1,
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });

  let offscreenDepth = await GetDepthTexture(
    device,
    offscreenWidth,
    offscreenHeight
  );

  var depth = await GetDepthTexture(
    device,
    colorTexture.width,
    colorTexture.height
  );

  offscreenDepthTexture = offscreenDepth.texture;

  depthTexture = depth.texture;

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: colorTexture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        resolveTarget: canvasTexture.createView(),
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  const offscreenPassDescriptor = {
    colorAttachments: [
      {
        loadOp: 'clear',
        storeOp: 'store',
        resolveTarget: offscreenTextureResolve.createView(),
        view: offscreenTexture.createView(),
      },
    ],
    depthStencilAttachment: {
      view: offscreenDepthTexture.createView(),
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });

  const earthBindings = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniBuffer,
      },
    },
    {
      binding: 1,
      resource: heightMapV.texture.createView(),
    },
    {
      binding: 2,
      resource: lightMapV[0].texture.createView(),
    },
    {
      binding: 3,
      resource: lightMapV[1].texture.createView(),
    },
    {
      binding: 4,
      resource: textureV[0].texture.createView(),
    },
    {
      binding: 5,
      resource: textureV[1].texture.createView(),
    },
    {
      binding: 6,
      resource: textureV[0].sampler,
    },
    {
      binding: 7,
      resource: {
        buffer: lightUniBuffer,
      },
    },
  ];

  const cloudBindings = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: cloudUniBuffer,
      },
    },
    {
      binding: 2,
      resource: {
        buffer: lightUniBuffer,
      },
    },
    {
      binding: 3,
      resource: worleyNoiseTexture.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 4,
      resource: worleyNoiseTexture.sampler,
    },

    {
      binding: 5,
      resource: parsed3DGribTexture.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 6,
      resource: parsed3DGribTexture.sampler,
    },
    {
      binding: 7,
      resource: blueNoiseV.texture.createView(),
    },
    {
      binding: 8,
      resource: blueNoiseV.sampler,
    },
  ];

  const atmosphereBindings = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: lightUniBuffer,
      },
    },
    {
      binding: 2,
      resource: {
        buffer: atmosphereUniBuffer,
      },
    },
  ];

  pipeline[0] = CreatePipeline(
    device,
    device.createShaderModule({ code: earthShader }),
    options,
    presentationFormat
  );

  pipeline[1] = CreatePipeline(
    device,
    device.createShaderModule({ code: cloudShader }),
    {
      ...options,
      cullmode: 'back',
    },
    presentationFormat
  );

  pipeline[2] = CreatePipeline(
    device,
    device.createShaderModule({ code: atmosphereShader }),
    {
      ...options,
    },
    presentationFormat
  );

  pipeline[3] = CreatePipeline(
    device,
    device.createShaderModule({ code: fullScreenQuadShader }),
    {
      ...options,
      depthWriteEnabled: false,
    },
    presentationFormat
  );

  buffers[0] = CreateVertexBuffers(device, data);
  WriteVertexBuffers(device, buffers[0][0], buffers[0][1], buffers[0][2], data);

  loading.update((current) => ({
    ...current,
    welcome: {
      ...current.welcome,
      progress: 100,
      status: false,
    },
  }));

  async function frame() {
    if (!device) return;
    var lightPosition = vec3.create();
    vec3.set(lightPosition, 2 * Math.cos(elapsed), 0.0, 2 * Math.sin(elapsed));

    const cloudUniValues = new Float32Array([
      0.02 * options.scale,
      options.layer.mb300,
      options.density,
      options.sunDensity,
      options.raymarchSteps,
    ]);

    const atmosphereUniValues = new Float32Array([
      0.035 * options.scale,
      cloudDensity,
      options.layer.atmo,
      0.0,
    ]);

    const lightUniValues = new Float32Array([
      lightPosition[0],
      lightPosition[1],
      lightPosition[2],
      options.rayleighIntensity,
      options.lightType === 'full_day'
        ? 1
        : options.lightType === 'day_cycle'
        ? 0.5
        : options.lightType === 'full_night'
        ? 0
        : 1.0,
    ]);

    const earthUniValues = new Float32Array([
      0.015 * options.scale,
      uniOptions.useTexture ? 1 : 0,
      uniOptions.intersection.x,
      uniOptions.intersection.y,
    ]);

    elapsed += 0.0005;

    var newYaw = options.yaw + options.rotationSpeed / 250;
    newYaw = newYaw % 360;

    yaw.update((n) => (n = newYaw));

    const cameraPosition = vec3.create();
    vec3.set(
      cameraPosition,
      options.cameraPosition.x,
      options.cameraPosition.y,
      options.cameraPosition.z
    );

    if (!context) return;
    canvasTexture = context.getCurrentTexture();
    offscreenWidth = Math.floor(canvasTexture.width / 2);
    offscreenHeight = Math.floor(canvasTexture.height / 2);

    if (hasChanged.resolution) {
      hasChanged.resolution = false;
      depthTexture.destroy();
      colorTexture.destroy();
      offscreenTexture.destroy();
      offscreenDepthTexture.destroy();
      offscreenTextureResolve.destroy();

      colorTexture = device.createTexture({
        size: {
          width: canvasTexture.width,
          height: canvasTexture.height,
        },
        sampleCount: 4,
        format: 'bgra8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      offscreenTexture = device.createTexture({
        size: {
          width: offscreenWidth,
          height: offscreenHeight,
          depthOrArrayLayers: 1,
        },
        sampleCount: 4,
        format: 'bgra8unorm',
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });

      offscreenTextureResolve = device.createTexture({
        size: {
          width: offscreenWidth,
          height: offscreenHeight,
        },
        sampleCount: 1,
        format: 'bgra8unorm',
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });

      offscreenDepth = await GetDepthTexture(
        device,
        offscreenWidth,
        offscreenHeight
      );

      depth = await GetDepthTexture(
        device,
        colorTexture.width,
        colorTexture.height
      );

      offscreenDepthTexture = offscreenDepth.texture;

      depthTexture = depth.texture;
    }

    if (hasChanged.cloudType) {
      if (cloudDensity === 1.0) {
        const tweenedDensity = tweened(1.0, {
          duration: 3500,
          easing: quintOut,
        });

        tweenedDensity.subscribe((value) => {
          cloudDensity = value;
        });
        tweenedDensity.set(0.0);

        hasChanged.cloudType = false;
      } else if (cloudDensity === 0) {
        const tweenedDensity = tweened(0.0, {
          duration: 3500,
          easing: quintIn,
        });

        tweenedDensity.subscribe((value) => {
          cloudDensity = value;
        });
        tweenedDensity.set(1.0);
        hasChanged.cloudType = false;
      }
    }

    bindGroup[0] = CreateBindGroup(device, pipeline[0], earthBindings);
    bindGroup[1] = CreateBindGroup(device, pipeline[1], cloudBindings);
    bindGroup[2] = CreateBindGroup(device, pipeline[2], atmosphereBindings);
    bindGroup[3] = CreateBindGroup(device, pipeline[3], [
      {
        binding: 0,
        resource: offscreenTextureResolve.createView(),
      },
      {
        binding: 1,
        resource: sampler,
      },
      {
        binding: 2,
        resource: blueNoiseV.texture.createView(),
      },
      {
        binding: 3,
        resource: blueNoiseV.sampler,
      },
    ]);

    const colorAttachments =
      renderPassDescriptor.colorAttachments as (GPURenderPassColorAttachment | null)[];
    const colorAttachment = colorAttachments[0]!;
    const depthAttachment = renderPassDescriptor.depthStencilAttachment!;
    depthAttachment.view = depthTexture.createView();
    colorAttachment.view = colorTexture.createView();
    colorAttachment.resolveTarget = canvasTexture.createView();

    offscreenPassDescriptor.colorAttachments[0]!.view =
      offscreenTexture.createView();
    offscreenPassDescriptor.depthStencilAttachment!.view =
      offscreenDepthTexture.createView();
    offscreenPassDescriptor.colorAttachments[0]!.resolveTarget =
      offscreenTextureResolve.createView();

    const vpmatrix = CreateViewProjection(
      canvas.width / canvas.height,
      cameraPosition
    ).viewProjectionMatrix;

    CreateTransforms(modelMatrix);

    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    device.queue.writeBuffer(vertexUniBuffer, 0, vpmatrix as ArrayBuffer);
    device.queue.writeBuffer(vertexUniBuffer, 64, modelMatrix as ArrayBuffer);
    device.queue.writeBuffer(vertexUniBuffer, 128, normalMatrix as ArrayBuffer);
    device.queue.writeBuffer(
      vertexUniBuffer,
      192,
      cameraPosition as ArrayBuffer
    );
    device.queue.writeBuffer(
      vertexUniBuffer,
      208,
      earthUniValues as ArrayBuffer
    );
    device.queue.writeBuffer(cloudUniBuffer, 0, cloudUniValues as ArrayBuffer);
    device.queue.writeBuffer(lightUniBuffer, 0, lightUniValues as ArrayBuffer);
    device.queue.writeBuffer(
      atmosphereUniBuffer,
      0,
      atmosphereUniValues as ArrayBuffer
    );

    draw();
    requestAnimationFrame(frame);
  }

  function draw() {
    const firstCommandEncoder = device.createCommandEncoder();
    const passEncoder = firstCommandEncoder.beginRenderPass(
      offscreenPassDescriptor as GPURenderPassDescriptor
    );
    if (options.layer.mb300 > 0) {
      passEncoder.setPipeline(pipeline[1]);
      passEncoder.setVertexBuffer(0, buffers[0][0]);
      passEncoder.setVertexBuffer(1, buffers[0][1]);
      passEncoder.setVertexBuffer(2, buffers[0][2]);
      passEncoder.setBindGroup(0, bindGroup[1]);

      passEncoder.draw(options.amountOfVertices);
    }

    passEncoder.end();
    device.queue.submit([firstCommandEncoder.finish()]);

    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass(
      renderPassDescriptor as GPURenderPassDescriptor
    );

    renderPass.setPipeline(pipeline[0]);
    renderPass.setVertexBuffer(0, buffers[0][0]);
    renderPass.setVertexBuffer(1, buffers[0][1]);
    renderPass.setVertexBuffer(2, buffers[0][2]);
    renderPass.setBindGroup(0, bindGroup[0]);

    renderPass.draw(options.amountOfVertices);

    if (options.layer.mb300 > 0) {
      renderPass.setPipeline(pipeline[3]);
      renderPass.setBindGroup(0, bindGroup[3]);
      renderPass.draw(6);
    }
    if (options.layer.atmo > 0) {
      renderPass.setPipeline(pipeline[2]);
      renderPass.setVertexBuffer(0, buffers[0][0]);
      renderPass.setVertexBuffer(1, buffers[0][1]);
      renderPass.setVertexBuffer(2, buffers[0][2]);
      renderPass.setBindGroup(0, bindGroup[2]);

      renderPass.draw(options.amountOfVertices);
    }
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      hasChanged.resolution = true;
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      (canvas as HTMLCanvasElement).width = Math.min(
        width,
        device.limits.maxTextureDimension2D
      );
      (canvas as HTMLCanvasElement).height = Math.min(
        height,
        device.limits.maxTextureDimension2D
      );
    }
  });

  frame();
  observer.observe(canvas);
}

export default InitializeScene;
