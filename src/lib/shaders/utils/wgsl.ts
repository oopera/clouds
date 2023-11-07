import type { RenderOptions, SphereData } from '$lib/types/types';

export async function CreateSphereData(options: RenderOptions): Promise<any> {
  const worker: Worker = new Worker(
    new URL('$lib/shaders/primitives/sphere.ts', import.meta.url),
    { type: 'module' }
  );

  let data: any = null;

  worker.onerror = function (event: ErrorEvent) {
    console.error('WORKER ERROR', event);
    throw new Error(event.message);
  };

  worker.onmessage = (e: MessageEvent) => {
    const receivedData = e.data;
    data = receivedData;
  };

  worker.postMessage({ numFs: options.numFs });

  const startTime = Date.now();
  const timeout = 10000;

  while (!data) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for worker response');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  options.amountOfVertices = data.vertexData.length / 3;

  return data;
}

export function CreatePipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  options: RenderOptions,
  presentationFormat: GPUTextureFormat,
  multisampleCount: number = 4
) {
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    multisample: {
      count: multisampleCount,
      alphaToCoverageEnabled: false,
    },
    vertex: {
      module: module,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: 12,
          attributes: [
            {
              shaderLocation: 0,
              format: 'float32x3',
              offset: 0,
            },
          ],
        },
        {
          arrayStride: 12,
          attributes: [
            {
              shaderLocation: 1,
              format: 'float32x3',
              offset: 0,
            },
          ],
        },
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 2,
              format: 'float32x2',
              offset: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: module,
      entryPoint: 'fs',
      targets: [
        {
          format: presentationFormat,
          blend: options.blend,
        },
      ],
    },

    primitive: {
      topology: options.topology,
      cullMode: options.cullmode,
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: options.depthWriteEnabled,
      depthCompare: 'less',
    },
  });
  return pipeline;
}

export const CreateBindGroup = (
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  bindings: GPUBindGroupEntry[]
) => {
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: bindings,
  });
  return bindGroup;
};

export const CreateVertexBuffers = (device: GPUDevice, data: SphereData) => {
  const vertexBuffer: GPUBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: data.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const normalBuffer: GPUBuffer = device.createBuffer({
    label: 'normal buffer vertices',
    size: data.normalData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const uVBuffer: GPUBuffer = device.createBuffer({
    label: 'uV buffer vertices',
    size: data.uvData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  return [vertexBuffer, normalBuffer, uVBuffer];
};

export const WriteVertexBuffers = (
  device: GPUDevice,
  vertexBuffer: GPUBuffer,
  normalBuffer: GPUBuffer,
  uVBuffer: GPUBuffer,
  data: SphereData
) => {
  device.queue.writeBuffer(vertexBuffer, 0, data.vertexData);
  device.queue.writeBuffer(normalBuffer, 0, data.normalData);
  device.queue.writeBuffer(uVBuffer, 0, data.uvData);
};

export const UpdateVertexBuffers = (
  device: GPUDevice,
  buffers: GPUBuffer[],
  data: SphereData
) => {
  buffers[0].destroy();
  buffers[1].destroy();
  buffers[2].destroy();
  const newBuffers = CreateVertexBuffers(device, data);
  buffers[0] = newBuffers[0];
  buffers[1] = newBuffers[1];
  buffers[2] = newBuffers[2];
  WriteVertexBuffers(device, buffers[0], buffers[1], buffers[2], data);
};
