import {
  generatePerlinFbmNoise,
  generateWorleyFbmNoise,
} from './helper/noiseHelper';

export const GetTexture = async (
  device: GPUDevice,
  imageName: string,
  addressModeU = 'clamp-to-edge',
  addressModeV = 'clamp-to-edge'
) => {
  // get image file
  const img = document.createElement('img');
  img.src = imageName;
  await img.decode();
  const imageBitmap = await createImageBitmap(img);

  // create sampler with linear filtering for smooth interpolation
  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
    addressModeU: addressModeU as GPUAddressMode,
    addressModeV: addressModeV as GPUAddressMode,
  });

  // create texture
  const texture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: texture },
    [imageBitmap.width, imageBitmap.height]
  );

  return {
    texture,
    sampler,
  };
};
export const GetTextureFromGribData = async (
  device: GPUDevice,
  encodedRuns: [], // Assume that this is an array of {value, count} objects
  addressModeU = 'repeat',
  addressModeV = 'repeat'
) => {
  const width = 1440; // the number of longitudes
  const height = 721; // the number of latitudes

  // Decode run-length encoded data
  const gribData = new Float32Array(width * height);
  let index = 0;
  for (const run of encodedRuns) {
    for (let i = 0; i < run[0] && index < gribData.length; i++) {
      gribData[index++] = run[1];
    }
  }

  // create RGBA data from grib data
  const rgbaData = new Uint8ClampedArray(gribData.length * 4);
  for (let i = 0; i < gribData.length; i++) {
    const value = gribData[i];
    const color = value * 2.55; // scale 0-100 to 0-255
    const index = i * 4;
    rgbaData[index] = color; // R
    rgbaData[index + 1] = color; // G
    rgbaData[index + 2] = color; // B
    rgbaData[index + 3] = color; // A
  }

  const imageBitmap = await createImageBitmap(
    new ImageData(rgbaData, width, height)
  );

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
    addressModeU: addressModeU as GPUAddressMode,
    addressModeV: addressModeV as GPUAddressMode,
  });

  const texture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: texture },
    [imageBitmap.width, imageBitmap.height, 1]
  );

  return {
    texture,
    sampler,
  };
};

export function Create3DTextureFromData(
  device: GPUDevice,
  data: Uint8Array,
  width: number = 128,
  height: number = 128,
  depth: number = 128
): { texture: GPUTexture; sampler: GPUSampler } {
  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    addressModeW: 'repeat',
  });

  const texture = device.createTexture({
    size: { width: width, height: height, depthOrArrayLayers: depth },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    dimension: '3d',
  });

  device.queue.writeTexture(
    { texture: texture },
    data,
    { offset: 0, bytesPerRow: 4 * width, rowsPerImage: height },
    { width: width, height: height, depthOrArrayLayers: depth }
  );

  return {
    texture,
    sampler,
  };
}

export const GetPartitionedTexture = async (
  device: GPUDevice,
  imageName: string,
  addressModeU = 'clamp-to-edge',
  addressModeV = 'clamp-to-edge'
) => {
  // get image file
  const img = document.createElement('img');
  img.src = imageName;
  await img.decode();

  const textures = [];

  for (let i = 0; i < 2; i++) {
    const imageBitmap = await createImageBitmap(
      img,
      (i * img.width) / 2, // Start crop at i * width / 2
      0,
      img.width / 2,
      img.height
    );

    // create sampler with linear filtering for smooth interpolation
    const sampler = device.createSampler({
      minFilter: 'linear',
      magFilter: 'linear',
      addressModeU: addressModeU as GPUAddressMode,
      addressModeV: addressModeV as GPUAddressMode,
    });

    // create texture
    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );

    textures.push({
      texture,
      sampler,
    });
  }

  return textures;
};

export const GetDepthTexture = async (
  device: GPUDevice,
  width: any,
  height: any
) => {
  // Create texture for texture binding
  const texture = device.createTexture({
    size: [width, height],
    format: 'depth24plus',
    sampleCount: 4,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Create texture for render attachment
  const textureRenderAttachment = device.createTexture({
    size: [width, height],
    format: 'depth24plus',
    sampleCount: 4,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Create sampler with nearest filtering
  const sampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
    compare: 'less',
  });

  return {
    texture,
    textureRenderAttachment,
    sampler,
  };
};

// This function is used to load existing noise textures from the generated binary file

export async function loadBinaryData(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
}

// These functions are used to create new Noise Textures

export const Get3DNoiseTexture = async (
  device: GPUDevice,
  width: number = 128,
  height: number = 128,
  depth: number = 128,
  addressModeU = 'repeat',
  addressModeV = 'repeat',
  addressModeW = 'repeat'
) => {
  const perlinNoiseData_01 = generatePerlinFbmNoise(
    width,
    height,
    depth,
    25,
    25
  );
  const noiseData_01 = generateWorleyFbmNoise(width, height, depth, 6);
  const noiseData_02 = generateWorleyFbmNoise(width, height, depth, 12);
  const rgbaData = new Uint8Array(noiseData_01.length * 4);

  function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
  }

  for (let i = 0; i < noiseData_01.length; i++) {
    const index = i * 4;
    let pfbm = mix(noiseData_01[i], perlinNoiseData_01[i], 0.25);
    const billowyPerlinData = Math.abs(pfbm * 2.0 - 1.0);

    rgbaData[index] = perlinNoiseData_01[i] * 255; // R
    rgbaData[index + 1] = noiseData_01[i] * 255; // G
    rgbaData[index + 2] = noiseData_02[i] * 255; // B
    rgbaData[index + 3] = billowyPerlinData * 255; // A
  }

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
    addressModeU: addressModeU as GPUAddressMode,
    addressModeV: addressModeV as GPUAddressMode,
    addressModeW: addressModeW as GPUAddressMode,
  });

  const texture = device.createTexture({
    size: { width: width, height: height, depthOrArrayLayers: depth },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    dimension: '3d',
  });
  device.queue.writeTexture(
    { texture: texture },
    rgbaData,
    { offset: 0, bytesPerRow: 4 * width, rowsPerImage: height },
    { width: width, height: height, depthOrArrayLayers: depth }
  );

  downloadData(rgbaData, 'noiseTexture.bin');

  return {
    texture,
    sampler,
  };
};

function downloadData(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);

  a.href = url;
  a.download = filename;

  a.click();

  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
