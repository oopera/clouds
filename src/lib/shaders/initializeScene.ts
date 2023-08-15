// @ts-nocheck
import { mat4, vec4, vec3 } from 'gl-matrix';
import {
  CreatePipeline,
  CreateBindGroup,
  CreateVertexBuffers,
  WriteVertexBuffers,
  CreateSphereData,
  UpdateVertexBuffers,
} from './utils/helper/wgslHelper.js';
import InitStores from './utils/initStores.js';
import {
  CreateViewProjection,
  CreateTransforms,
} from './utils/helper/matrixHelper.js';
import { earthShader } from './shaders/earthShader.js';
import { yaw, loading, scale } from '$lib/stores/stores.js';
import { cloudShader } from './shaders/cloudShader.js';

import {
  GetTexture,
  GetTextureFromGribData,
  GetPartitionedTexture,
  Get3DNoiseTexture,
  loadBinaryData,
  Create3DTextureFromData,
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

let depthTexture: GPUTexture;

import { dev } from '$app/environment';
import { tweened } from 'svelte/motion';
import { quintIn, quintOut } from 'svelte/easing';

var hasChanged: HasChanged = {
  numFs: false,
  rotationSpeed: false,
  useTexture: false,
  cullmode: false,
  zoom: false,
  topology: false,
  cloudType: false,
};

var options: RenderOptions = {
  cullmode: 'back',
  useTexture: true,
  numFs: 0,
  rotationSpeed: 0.0025,
  zoom: 1,
  pitch: 0,
  yaw: 0,
  layer: {
    mb300: 1,
    mb500: 1,
    mb700: 1,
    atmo: 1,
  },
  cloudType: 'cumulus',
  cameraPosition: [0, 0, 0],
  topology: 'point-list',
  amountOfVertices: 0,
  depthWriteEnabled: true,
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
  coords: {
    lastX: 0,
    lastY: 0,
  },
};

var uniOptions: UniOptions = {
  heightDisplacement: 0.0,
  useTexture: true,
  intersection: {
    x: 0,
    y: 0,
  },
};

const pipeline: GPURenderPipeline[] = [];
const bindGroup = [];
const buffers = [];

var cloudDensity = 1.0;

var usedScale;

scale.subscribe((value) => {
  usedScale = value;
});

var elapsed = 0;

async function InitializeScene() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  // const device = false;
  if (!device) {
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
        const id = Object.keys(current).length; // use the current number of keys as id
        return {
          ...current,
          [`Error-${id}`]: {
            id,
            status: true,
            message:
              counter % 2 === 0
                ? 'ERROR ERROR ERROR'
                : 'You need a browser that supports WebGPU',
            progress: 0,
          },
        };
      });
      if (counter > 5) {
        clearInterval(interval);
      }
    }, 500);
    return;
  }

  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('webgpu');

  InitStores(uniOptions, options, hasChanged, canvas);

  let heightMap = await executePromise(
    'heightMap',
    loadImage('/textures/nasa-heightmap.png'),
    'height map'
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
    'noise texture'
  );

  const heightMapV = await GetTexture(device, heightMap);
  const textureV = await GetPartitionedTexture(device, texture);
  const lightMapV = await GetPartitionedTexture(device, lightmap);
  const noiseV = await Create3DTextureFromData(device, noise);

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

  const cloudUniBuffer_01 = device.createBuffer({
    label: 'cloud_01 uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cloudUniBuffer_02 = device.createBuffer({
    label: 'cloud_02 uniform buffer',
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cloudUniBuffer_03 = device.createBuffer({
    label: 'cloud_03 uniform buffer',
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

  var parsedGribTexture;
  var parsedGribTexture_2;
  var parsedGribTexture_3;

  const generateNewNoiseTexture = false;
  var worleyNoiseTexture = noiseV;
  if (generateNewNoiseTexture) {
    worleyNoiseTexture = await executePromise(
      'worleyNoiseTexture',
      await Get3DNoiseTexture(device),
      '3D Noise Texture'
    );
  }

  if (dev) {
    parsedGribTexture = await GetTextureFromGribData(device, mb300);
    parsedGribTexture_2 = await GetTextureFromGribData(device, mb500);
    parsedGribTexture_3 = await GetTextureFromGribData(device, mb700);
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

    const mb300R = await mb300RD.json();
    const mb500R = await mb500RD.json();
    const mb700R = await mb700RD.json();

    parsedGribTexture = await GetTextureFromGribData(device, mb300R);
    parsedGribTexture_2 = await GetTextureFromGribData(device, mb500R);
    parsedGribTexture_3 = await GetTextureFromGribData(device, mb700R);
  }

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
        buffer: cloudUniBuffer_01,
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
      resource: parsedGribTexture.texture.createView(),
    },
    {
      binding: 4,
      resource: parsedGribTexture.sampler,
    },
    {
      binding: 5,
      resource: worleyNoiseTexture.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 6,
      resource: worleyNoiseTexture.sampler,
    },
  ];

  const cloudBindings_2 = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: cloudUniBuffer_02,
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
      resource: parsedGribTexture_2.texture.createView(),
    },
    {
      binding: 4,
      resource: parsedGribTexture_2.sampler,
    },
    {
      binding: 5,
      resource: worleyNoiseTexture.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 6,
      resource: worleyNoiseTexture.sampler,
    },
  ];

  const cloudBindings_3 = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniBuffer,
      },
    },

    {
      binding: 1,
      resource: {
        buffer: cloudUniBuffer_03,
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
      resource: parsedGribTexture_3.texture.createView(),
    },
    {
      binding: 4,
      resource: parsedGribTexture_3.sampler,
    },
    {
      binding: 5,
      resource: worleyNoiseTexture.texture.createView({ dimension: '3d' }),
    },
    {
      binding: 6,
      resource: worleyNoiseTexture.sampler,
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
      cullmode: 'none',
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
    device.createShaderModule({ code: cloudShader }),
    {
      ...options,
      cullmode: 'none',
    },
    presentationFormat
  );

  pipeline[4] = CreatePipeline(
    device,
    device.createShaderModule({ code: cloudShader }),
    {
      ...options,
      cullmode: 'none',
    },
    presentationFormat
  );

  bindGroup[0] = CreateBindGroup(device, pipeline[0], earthBindings);

  bindGroup[1] = CreateBindGroup(device, pipeline[1], cloudBindings);

  bindGroup[2] = CreateBindGroup(device, pipeline[2], atmosphereBindings);

  bindGroup[3] = CreateBindGroup(device, pipeline[3], cloudBindings_2);

  bindGroup[4] = CreateBindGroup(device, pipeline[4], cloudBindings_3);

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      sampleCount: 4,
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  const halfResRenderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      sampleCount: 4,
      depthClearValue: 1,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  buffers[0] = CreateVertexBuffers(device, data);
  WriteVertexBuffers(device, buffers[0][0], buffers[0][1], buffers[0][2], data);

  let canvasTexture = context.getCurrentTexture();

  let colorTexture = device.createTexture({
    size: {
      width: canvasTexture.width,
      height: canvasTexture.height,
      depth: 1,
    },
    sampleCount: 4, // the same as your pipeline's sampleCount
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  var depth = await GetDepthTexture(
    device,
    colorTexture.width,
    colorTexture.height
  );

  depthTexture = depth.texture;

  loading.update((current) => ({
    ...current,
    welcome: {
      ...current.welcome,
      progress: 100,
      status: false,
    },
  }));

  const halfWidth = Math.floor(canvas.width / 2);
  const halfHeight = Math.floor(canvas.height / 2);

  var offscreenTexture = device.createTexture({
    size: { width: halfWidth, height: halfHeight, depth: 1 },
    format: 'bgra8unorm', // e.g., 'bgra8unorm'
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });

  halfResRenderPassDescriptor.colorAttachments[0].view =
    offscreenTexture.createView();

  async function frame() {
    const cloudUniValues_01 = new Float32Array([
      0.01 * usedScale,
      cloudDensity,
      options.layer.mb300,
      0.0,
    ]);

    const cloudUniValues_02 = new Float32Array([
      0.02 * usedScale,
      cloudDensity,
      options.layer.mb500,
      0.0,
    ]);

    const cloudUniValues_03 = new Float32Array([
      0.03 * usedScale,
      cloudDensity,
      options.layer.mb700,
      0.0,
    ]);

    const atmosphereUniValues = new Float32Array([
      0.04 * usedScale,
      cloudDensity,
      options.layer.atmo,
      0.0,
    ]);

    elapsed += 0.0005;

    var lightPosition = vec3.create();
    vec3.set(lightPosition, 2 * Math.cos(elapsed), 0.0, 2 * Math.sin(elapsed));

    var lightColor = vec3.create();
    vec3.set(lightColor, 1.0, 1.0, 1.0);

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

    canvasTexture = context.getCurrentTexture();

    if (hasChanged.resolution) {
      hasChanged.resolution = false;
      depthTexture.destroy();
      colorTexture.destroy();
      offscreenTexture.destroy();

      offscreenTexture = device.createTexture({
        size: { width: halfWidth, height: halfHeight, depth: 1 },
        format: 'bgra8unorm', // e.g., 'bgra8unorm'
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });

      colorTexture = device.createTexture({
        size: {
          width: canvasTexture.width,
          height: canvasTexture.height,
          depth: 1,
        },
        sampleCount: 4,
        format: 'bgra8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      var depth = await GetDepthTexture(
        device,
        colorTexture.width,
        colorTexture.height
      );

      depthTexture = depth.texture;
    }

    if (hasChanged.cloudType) {
      if (cloudDensity === 1.0) {
        const tweenedDensity = tweened(1.0, {
          duration: 3500,
          easing: quintOut,
        });

        tweenedDensity.subscribe((value) => {
          console.log(value);
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
          console.log(value);
          cloudDensity = value;
        });
        tweenedDensity.set(1.0);
        hasChanged.cloudType = false;
      }
    }

    bindGroup[0] = CreateBindGroup(device, pipeline[0], earthBindings);
    bindGroup[1] = CreateBindGroup(device, pipeline[1], cloudBindings);
    bindGroup[2] = CreateBindGroup(device, pipeline[2], atmosphereBindings);
    bindGroup[3] = CreateBindGroup(device, pipeline[3], cloudBindings_2);
    bindGroup[4] = CreateBindGroup(device, pipeline[4], cloudBindings_3);

    halfResRenderPassDescriptor.depthStencilAttachment.view =
      offscreenTexture.createView();

    renderPassDescriptor.depthStencilAttachment.view =
      depthTexture.createView();

    renderPassDescriptor.colorAttachments[0].view = colorTexture.createView();
    renderPassDescriptor.colorAttachments[0].resolveTarget =
      canvasTexture.createView();

    const vpmatrix = CreateViewProjection(
      canvas.width / canvas.height,
      cameraPosition
    ).viewProjectionMatrix;

    CreateTransforms(modelMatrix);

    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    const scales = vec4.create();

    vec4.set(
      scales,
      usedScale,
      uniOptions.useTexture ? 1 : 0,
      uniOptions.intersection.x,
      uniOptions.intersection.y
    );

    device.queue.writeBuffer(vertexUniBuffer, 0, vpmatrix as ArrayBuffer);
    device.queue.writeBuffer(vertexUniBuffer, 64, modelMatrix as ArrayBuffer);
    device.queue.writeBuffer(vertexUniBuffer, 128, normalMatrix as ArrayBuffer);
    device.queue.writeBuffer(
      vertexUniBuffer,
      192,
      cameraPosition as ArrayBuffer
    );
    device.queue.writeBuffer(vertexUniBuffer, 208, scales as ArrayBuffer);
    device.queue.writeBuffer(
      cloudUniBuffer_01,
      0,
      cloudUniValues_01 as ArrayBuffer
    );
    device.queue.writeBuffer(
      cloudUniBuffer_02,
      0,
      cloudUniValues_02 as ArrayBuffer
    );
    device.queue.writeBuffer(
      cloudUniBuffer_03,
      0,
      cloudUniValues_03 as ArrayBuffer
    );
    device.queue.writeBuffer(lightUniBuffer, 0, lightPosition as ArrayBuffer);
    device.queue.writeBuffer(lightUniBuffer, 16, lightColor as ArrayBuffer);

    device.queue.writeBuffer(
      atmosphereUniBuffer,
      0,
      atmosphereUniValues as ArrayBuffer
    );

    draw(data);
    requestAnimationFrame(frame);
  }

  function draw() {
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
      renderPass.setPipeline(pipeline[1]);
      renderPass.setVertexBuffer(0, buffers[0][0]);
      renderPass.setVertexBuffer(1, buffers[0][1]);
      renderPass.setVertexBuffer(2, buffers[0][2]);
      renderPass.setBindGroup(0, bindGroup[1]);

      renderPass.draw(options.amountOfVertices);
    }

    if (options.layer.mb500 > 0) {
      renderPass.setPipeline(pipeline[3]);
      renderPass.setVertexBuffer(0, buffers[0][0]);
      renderPass.setVertexBuffer(1, buffers[0][1]);
      renderPass.setVertexBuffer(2, buffers[0][2]);
      renderPass.setBindGroup(0, bindGroup[3]);

      renderPass.draw(options.amountOfVertices);
    }

    if (options.layer.mb700 > 0) {
      renderPass.setPipeline(pipeline[4]);
      renderPass.setVertexBuffer(0, buffers[0][0]);
      renderPass.setVertexBuffer(1, buffers[0][1]);
      renderPass.setVertexBuffer(2, buffers[0][2]);
      renderPass.setBindGroup(0, bindGroup[4]);

      renderPass.draw(options.amountOfVertices);
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
      canvas.width = Math.min(width, device.limits.maxTextureDimension2D);
      canvas.height = Math.min(height, device.limits.maxTextureDimension2D);
    }
  });

  frame();
  observer.observe(canvas);
}

function fail(msg) {
  alert(msg);
}

export default InitializeScene;
