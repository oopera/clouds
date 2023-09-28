import { mat4, vec3 } from 'gl-matrix';
import {
  CreatePipeline,
  CreateBindGroup,
  CreateVertexBuffers,
  WriteVertexBuffers,
  CreateSphereData,
} from './utils/wgsl.js';
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
} from './utils/texture.js';
import {
  displayError,
  executePromise,
  fetchCloudCover,
  loadImage,
} from './utils/promises.js';
import InitStores from './utils/stores.js';
import { CreateViewProjection, CreateTransforms } from './utils/matrix.js';

import { loading, setZoom, setPitch, setYaw } from '$lib/stores/stores.js';

import earthShader from './shaders/earth.wgsl?raw';
import cloudShader from './shaders/cloud.wgsl?raw';
import atmosphereShader from './shaders/atmosphere.wgsl?raw';
import fullScreenQuadShader from './shaders/quad.wgsl?raw';

import type { RenderOptions, HasChanged } from '$lib/types/types.js';

import { dev } from '$app/environment';
import { tweened } from 'svelte/motion';
import { cubicBezier } from '$lib/shaders/utils/tween.js';

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
  isFetching: false,
  elapsed: 0,
  lastElapsed: 0,

  projectionDate: {
    modelRunDate: {
      year: '2021',
      month: '01',
      day: '01',
    },
    modelRunTime: '0',
    forecastHours: '0',
    projected_time: '0',
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
  lightPosition: { x: 0, y: 0, z: 0 },
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

async function init() {
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

  InitStores(options, hasChanged);

  let data = await executePromise(
    'sphere',
    CreateSphereData(options),
    'Vertex Data'
  );

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

  let detail_noise = await executePromise(
    'detail_noise',
    loadBinaryData('/textures/detail_noise.bin'),
    '3d detail noise textures'
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
  const detailnoiseV = Create3DTextureFromData(device, detail_noise);

  const generateWorleyTexture = false;

  if (generateWorleyTexture) {
    executePromise(
      'worleyNoiseTexture',
      (await Get3DNoiseTexture(device), 128, 128, 128) as any,
      '3D Noise Texture'
    );
  }

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

  const fetchTextures = async (setTextures: boolean = false) => {
    console.log('test', options.isFetching);
    if (options.isFetching) return;
    options.isFetching = true;
    const dateString =
      options.projectionDate.modelRunDate.year +
      options.projectionDate.modelRunDate.month +
      options.projectionDate.modelRunDate.day;

    const modelHour = options.projectionDate.modelRunTime;
    const forecastHours = options.projectionDate.forecastHours;

    const lowD = await executePromise(
      'mb300RD',
      fetchCloudCover(
        `/api/cloud-texture?level=low&date=${dateString}&modelrunhour=${modelHour}&forecasthour=${forecastHours}`
      ),
      'low-level cloud-data'
    );
    const midD = await executePromise(
      'mb500RD',
      fetchCloudCover(
        `/api/cloud-texture?level=high&date=${dateString}&modelrunhour=${modelHour}&forecasthour=${forecastHours}`
      ),
      'mid-level cloud-data'
    );

    const highD = await executePromise(
      'mb700RD',
      fetchCloudCover(
        `/api/cloud-texture?level=middle&date=${dateString}&modelrunhour=${modelHour}&forecasthour=${forecastHours}`
      ),
      'high-levl cloud-data'
    );

    const lowJ = await lowD.json();
    const middleJ = await midD.json();
    const highJ = await highD.json();

    const low = parseEncodedToFlattened(lowJ);
    const middle = parseEncodedToFlattened(middleJ);
    const high = parseEncodedToFlattened(highJ);

    if (setTextures) {
      parsedGribTexture = await Get4LayerTextureFromGribData(device, [
        low,
        middle,
        high,
        high,
      ]);
    }
    options.isFetching = false;

    return {
      low: low,
      middle: middle,
      high: high,
    };
  };

  if (dev) {
    const local_low = await executePromise(
      'mb300RD',
      import('$lib/assets/low'),
      'low-level cloud-data'
    );

    const local_mid = await executePromise(
      'mb300RD',
      import('$lib/assets/mid'),
      'low-level cloud-data'
    );

    const local_high = await executePromise(
      'mb300RD',
      import('$lib/assets/high'),
      'low-level cloud-data'
    );

    parsedGribTexture = await Get4LayerTextureFromGribData(device, [
      local_low.default,
      local_mid.default,
      local_high.default,
      local_high.default,
    ]);
  } else {
    const result = await fetchTextures();
    if (result) {
      const { low, middle, high } = result;

      parsedGribTexture = await Get4LayerTextureFromGribData(device, [
        low,
        middle,
        high,
        high,
      ]);
    }
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
      resource: noiseV.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 4,
      resource: noiseV.sampler,
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
    {
      binding: 9,
      resource: detailnoiseV.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 10,
      resource: detailnoiseV.sampler,
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

  loading.update((current) => ({
    ...current,
    welcome: {
      ...current.welcome,
      progress: 100,
      status: false,
    },
  }));
  // document?.getElementById('download')?.addEventListener('click', function (e) {
  //   let canvasUrl = canvas.toDataURL();
  //   const createEl = document.createElement('a');
  //   createEl.href = canvasUrl;
  //   createEl.download = 'Canvas.png';
  //   createEl.click();
  //   createEl.remove();
  // });

  setYaw(210, true);
  setZoom(7.5, true);
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

    const lightPosition = vec3.create();
    vec3.set(
      lightPosition,
      options.lightPosition.x,
      options.lightPosition.y,
      options.lightPosition.z
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
      if (options.isFetching) return;
      fetchTextures(true).then(() => {
        tweenedVisibility.set(1.0);
      });
    }

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
      options.lightPosition.x,
      options.lightPosition.y,
      options.lightPosition.z,
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

export default init;
