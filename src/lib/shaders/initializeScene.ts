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
import { loading, setZoom, setPitch, setYaw } from '$lib/stores/stores.js';
import { cloudShader } from './shaders/cloudShader_artistic.js';

import {
  GetPartitionedTexture,
  Get3DNoiseTexture,
  loadBinaryData,
  Create3DTextureFromData,
  parseEncodedToFlattened,
  Get4LayerTextureFromGribData,
  GetDepthTexture,
  downloadData,
  GetTexture,
} from './utils/helper/textureHelper.js';

import type { RenderOptions, HasChanged } from '$lib/types/types.js';
import { atmosphereShader } from './shaders/atmosphereShader.js';
import { executePromise, loadImage } from './utils/executeAndUpdate.js';

import { mb300 } from '$lib/assets/mb300.js';
import { mb500 } from '$lib/assets/mb500.js';
import { mb700 } from '$lib/assets/mb700.js';
import { mb900 } from '$lib/assets/mb900.js';

import { dev } from '$app/environment';
import { tweened } from 'svelte/motion';
import { fullScreenQuadShader } from './shaders/quadShader.js';
import { cubicBezier } from '$lib/shaders/utils/cubicBezier.js';
import { generateCubeData } from './primitives/cubeData.js';
import { getCloudCoverageByCoordinates } from './utils/calculateIntersection.js';

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
  projectionDate: false,
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
  cloudDensity: 1,
  sunDensity: 0.5,
  raymarchLength: 0.0001,
  rayleighIntensity: 0.5,
  scale: 0.0,
  amountOfVertices: 0,
  halfRes: false,
  isDragging: false,

  elapsed: 0,
  lastElapsed: 0,

  projectionDate: {
    day: '0',
    month: '0',
    year: '0',
  },

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
    x: 0,
    y: 0,
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

var visibility: number = 0.0;
var tweenedVisibility = tweened(visibility, {
  duration: 3500,
  easing: cubicBezier,
});
tweenedVisibility.subscribe((value) => {
  visibility = value;
});

const pipeline: GPURenderPipeline[] = [];
const bindGroup: GPUBindGroup[] = [];
const buffers: GPUBuffer[][] = [];

const displayError = (message: string) => {
  var counter = 0;

  if (counter === 0) {
    loading.set({
      welcome: {
        id: 0,
        status: true,
        message: 'error',
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

  throw new Error(message);
};

async function InitializeScene() {
  if (!navigator.gpu) {
    displayError('You need a browser or device that supports WebGPU');
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

  let data = await executePromise(
    'sphere',
    CreateSphereData(options),
    'Vertex Data'
  );

  let cubeData = generateCubeData(2.65);

  let texture = await executePromise(
    'texture',
    loadImage('/textures/nasa-texture.jpg'),
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

  let bluenoise = await executePromise(
    'bluenoise',
    loadImage('/textures/BlueNoise64Tiled.jpg'),
    'bluenoise textures'
  );

  const textureV = await GetPartitionedTexture(device, texture);
  const lightMapV = await GetPartitionedTexture(device, lightmap);
  const noiseV = Create3DTextureFromData(device, noise);
  const bluenoiseV = await GetTexture(device, bluenoise);

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

  const earthUniBuffer = device.createBuffer({
    label: 'light uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const lightUniBuffer = device.createBuffer({
    label: 'light uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const atmoUniBuffer = device.createBuffer({
    label: 'light uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const normalMatrix = mat4.create();
  const modelMatrix = mat4.create();

  var parsedGribTexture: {
    texture: GPUTexture;
    sampler: GPUSampler;
  };

  const generateWorleyTexture = false;
  var worleyNoiseTexture;

  if (generateWorleyTexture) {
    worleyNoiseTexture = await executePromise(
      'worleyNoiseTexture',
      (await Get3DNoiseTexture(device)) as any,
      '3D Noise Texture'
    );
  } else {
    worleyNoiseTexture = noiseV;
  }

  const fetchTextures = async (setTextures: boolean = false) => {
    const dateString =
      options.projectionDate.year +
      options.projectionDate.month +
      options.projectionDate.day;

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

    if (setTextures) {
      parsedGribTexture = await Get4LayerTextureFromGribData(device, [
        mb300,
        mb500,
        mb700,
        mb900,
      ]);
    }

    const mb3001d = parseEncodedToFlattened(mb300R);
    const mb5001d = parseEncodedToFlattened(mb500R);
    const mb7001d = parseEncodedToFlattened(mb700R);
    const mb9001d = parseEncodedToFlattened(mb900R);

    return {
      mb300: mb3001d,
      mb500: mb5001d,
      mb700: mb7001d,
      mb900: mb9001d,
    };
  };

  if (dev) {
    parsedGribTexture = await Get4LayerTextureFromGribData(device, [
      mb300,
      mb500,
      mb700,
      mb900,
    ]);
  } else {
    const { mb300, mb500, mb700, mb900 } = await fetchTextures();
    parsedGribTexture = await Get4LayerTextureFromGribData(device, [
      mb300,
      mb500,
      mb700,
      mb900,
    ]);
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
      resource: {
        buffer: earthUniBuffer,
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
      resource: lightMapV[0].texture.createView(),
    },
    {
      binding: 4,
      resource: lightMapV[1].texture.createView(),
    },
    {
      binding: 5,
      resource: textureV[0].texture.createView(),
    },
    {
      binding: 6,
      resource: textureV[1].texture.createView(),
    },
    {
      binding: 7,
      resource: textureV[0].sampler,
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
      resource: parsedGribTexture.texture.createView(),
    },
    {
      binding: 6,
      resource: parsedGribTexture.sampler,
    },
    {
      binding: 7,
      resource: bluenoiseV.texture.createView(),
    },
    {
      binding: 8,
      resource: bluenoiseV.sampler,
    },
  ];

  const atmoBindings = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: atmoUniBuffer,
      },
    },
    {
      binding: 2,
      resource: {
        buffer: lightUniBuffer,
      },
    },
  ];

  const quadBindings = [
    {
      binding: 0,
      resource: offscreenTextureResolve.createView(),
    },
    {
      binding: 1,
      resource: sampler,
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

  buffers[1] = CreateVertexBuffers(device, cubeData);

  WriteVertexBuffers(
    device,
    buffers[1][0],
    buffers[1][1],
    buffers[1][2],
    cubeData
  );

  loading.update((current) => ({
    ...current,
    welcome: {
      ...current.welcome,
      progress: 100,
      status: false,
    },
  }));
  document?.getElementById('download')?.addEventListener('click', function (e) {
    console.log('test');
    // Convert our canvas to a data URL
    let canvasUrl = canvas.toDataURL();
    // Create an anchor, and set the href value to our data URL
    const createEl = document.createElement('a');
    createEl.href = canvasUrl;

    // This is the name of our downloaded file
    createEl.download = 'Canvas.png';

    // Click the download button, causing a download, and then remove it
    createEl.click();
    createEl.remove();
  });

  setYaw(360, true);
  setZoom(4, true);
  setPitch(0, true);
  tweenedVisibility.set(1.0);

  async function frame() {
    if (!device) return;
    options.elapsed += 0.0005;

    const cameraPosition = vec3.create();
    vec3.set(
      cameraPosition,
      options.cameraPosition.x,
      options.cameraPosition.y,
      options.cameraPosition.z
    );

    if (!context) return;
    canvasTexture = context.getCurrentTexture();
    if (options.halfRes) {
      offscreenWidth = Math.floor(canvasTexture.width / 2);
      offscreenHeight = Math.floor(canvasTexture.height / 2);
    } else {
      offscreenWidth = canvasTexture.width;
      offscreenHeight = canvasTexture.height;
    }

    if (!options.isDragging) {
      var newYaw = options.yaw + options.rotationSpeed / 10;
      setYaw(newYaw, false);
    }

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

    if (hasChanged.projectionDate) {
      hasChanged.projectionDate = false;
      tweenedVisibility.set(0.0);
      fetchTextures(true).then(() => {
        tweenedVisibility.set(1.0);
      });
    }

    var lightPosition = vec3.create();
    vec3.set(
      lightPosition,
      2 * Math.cos(options.elapsed),
      0.0,
      2 * Math.sin(options.elapsed)
    );

    const cloudUniValues = new Float32Array([
      options.elapsed,
      visibility,
      options.cloudDensity,
      options.sunDensity,
      options.raymarchSteps,
      options.raymarchLength,
      options.coords.x,
      options.coords.y,
    ]);

    const atmoUniValues = new Float32Array([
      options.elapsed,
      visibility,
      options.coords.x,
      options.coords.y,
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
      options.elapsed,
      options.lastElapsed,
    ]);

    const earthUniValues = new Float32Array([
      options.elapsed,
      visibility,
      options.coords.x,
      options.coords.y,
    ]);

    quadBindings[0].resource = offscreenTextureResolve.createView();
    bindGroup[0] = CreateBindGroup(device, pipeline[0], earthBindings);
    bindGroup[1] = CreateBindGroup(device, pipeline[1], cloudBindings);
    bindGroup[2] = CreateBindGroup(device, pipeline[2], atmoBindings);
    bindGroup[3] = CreateBindGroup(device, pipeline[3], quadBindings);

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

    device.queue.writeBuffer(earthUniBuffer, 0, earthUniValues as ArrayBuffer);
    device.queue.writeBuffer(cloudUniBuffer, 0, cloudUniValues as ArrayBuffer);
    device.queue.writeBuffer(lightUniBuffer, 0, lightUniValues as ArrayBuffer);
    device.queue.writeBuffer(atmoUniBuffer, 0, atmoUniValues as ArrayBuffer);

    draw();
    requestAnimationFrame(frame);
  }

  function draw() {
    const firstCommandEncoder = device.createCommandEncoder();
    const passEncoder = firstCommandEncoder.beginRenderPass(
      offscreenPassDescriptor as GPURenderPassDescriptor
    );
    if (visibility > 0) {
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

    if (visibility > 0) {
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
