import { generatePerlinFbmNoise, generateWorleyFbmNoise } from './noise';

export const GetTexture = async (
  device: GPUDevice,
  imageName: string,
  addressModeU = 'clamp-to-edge',
  addressModeV = 'clamp-to-edge'
) => {
  const img = document.createElement('img');
  img.src = imageName;
  await img.decode();
  const imageBitmap = await createImageBitmap(img);

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
    [imageBitmap.width, imageBitmap.height]
  );

  return {
    texture,
    sampler,
  };
};

export const Get4LayerTextureFromGribData = async (
  device: GPUDevice,
  data: number[][],
  addressModeU = 'repeat',
  addressModeV = 'repeat'
) => {
  const width = 1440;
  const height = 721;

  const rgbaData = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wh = y * width + x;
      // Invert horizontally and vertically to Align with Texture
      // Tested this in Figma
      const whShifted = (height - 1 - y) * width + (width - 1 - (x + width));

      const layerData1 = data[0][wh];
      const layerData2 = data[1][wh];
      const layerData3 = data[2][wh];
      const layerData4 = data[3][wh];
      const offset = whShifted * 4; // Using the shifted index here

      const value = Math.floor(layerData1 * 2.55);
      const value2 = Math.floor(layerData2 * 2.55);
      const value3 = Math.floor(layerData3 * 2.55);
      const value4 = Math.floor(layerData4 * 2.55);

      rgbaData[offset] = value;
      rgbaData[offset + 1] = value2;
      rgbaData[offset + 2] = value3;
      rgbaData[offset + 3] = value4; // alpha channel
    }
  }

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
    addressModeU: addressModeU as GPUAddressMode,
    addressModeV: addressModeV as GPUAddressMode,
  });

  const texture = device.createTexture({
    size: [width, height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.writeTexture(
    { texture },
    rgbaData,
    { bytesPerRow: width * 4, rowsPerImage: height },
    [width, height, 1]
  );

  // const canvas = document.createElement('canvas');
  // canvas.width = width;
  // canvas.height = height;
  // const ctx = canvas.getContext('2d');
  // if (ctx) {
  //   const imageData = ctx.createImageData(width, height);
  //   imageData.data.set(rgbaData);
  //   ctx.putImageData(imageData, 0, 0);

  //   const pngURL = canvas.toDataURL('image/png');
  //   const link = document.createElement('a');
  //   link.href = pngURL;
  //   link.download = 'texture.png';
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // }

  return {
    texture,
    sampler,
  };
};

export const GetTextureFromGribData = async (
  device: GPUDevice,
  data: number[],
  addressModeU = 'repeat',
  addressModeV = 'repeat'
) => {
  const width = 1440;
  const height = 721;

  const rgbaData = new Uint8Array(width * height * 4);

  for (let wh = 0; wh < width * height; wh++) {
    const layerData = data[wh];
    const offset = wh * 4;

    const value = Math.floor(layerData * 2.55);

    rgbaData[offset] = value;
    rgbaData[offset + 1] = value;
    rgbaData[offset + 2] = value;
    rgbaData[offset + 3] = 255; // alpha channel
  }

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
    addressModeU: addressModeU as GPUAddressMode,
    addressModeV: addressModeV as GPUAddressMode,
  });

  const texture = device.createTexture({
    size: [width, height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.writeTexture(
    { texture },
    rgbaData,
    { bytesPerRow: width * 4, rowsPerImage: height },
    [width, height, 1]
  );

  return {
    texture,
    sampler,
  };
};

// Used to create Worley Noise Texture from Binary

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

// Used to partition a texture into 2 textures since the max texture size is 8192

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
  width: number,
  height: number,
  sampleCount: number = 4
) => {
  const texture = device.createTexture({
    size: [width, height, 1],
    format: 'depth24plus',
    sampleCount: sampleCount,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const sampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
    compare: 'less',
  });

  return {
    texture,
    sampler,
  };
};

export const parseEncodedToFlattened = (encodedLayer: number[][]): number[] => {
  let flattenedLayer: number[] = [];

  for (const run of encodedLayer) {
    for (let i = 0; i < run[0]; i++) {
      flattenedLayer.push(run[1]);
    }
  }
  return flattenedLayer;
};

export const Get3DNoiseTexture = async (
  device: GPUDevice,
  width: number = 128,
  height: number = 128,
  depth: number = 128,
  addressModeU = 'repeat',
  addressModeV = 'repeat',
  addressModeW = 'repeat'
) => {
  const perlinNoiseData_01 = generatePerlinFbmNoise(width, height, depth, 4, 8);
  const noiseData_01 = generateWorleyFbmNoise(width, height, depth, 2);
  const noiseData_02 = generateWorleyFbmNoise(width, height, depth, 4);
  const noiseData_03 = generateWorleyFbmNoise(width, height, depth, 8);
  const noiseData_04 = generateWorleyFbmNoise(width, height, depth, 16);
  const rgbaData = new Uint8Array(noiseData_01.length * 4);

  function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
  }

  function reMap(
    value: number,
    old_low: number,
    old_high: number,
    new_low: number,
    new_high: number
  ) {
    var ret_val: number =
      new_low +
      ((value - old_low) * (new_high - new_low)) / (old_high - old_low);
    return ret_val;
  }

  for (let i = 0; i < noiseData_01.length; i++) {
    const index = i * 4;
    let pfbm = mix(noiseData_01[i], perlinNoiseData_01[i], 0.5);
    const billowyPerlinData = reMap(pfbm, 0.0, 1.0, noiseData_02[i], 1.0);

    // rgbaData[index] = perlinNoiseData_01[i] * 255; // R
    rgbaData[index] = billowyPerlinData * 255; // G
    rgbaData[index + 1] = noiseData_02[i] * 255; // B
    rgbaData[index + 2] = noiseData_03[i] * 255; // G
    rgbaData[index + 3] = noiseData_04[i] * 255; // B
    // rgbaData[index + 3] = billowyPerlinData * 255; // A
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

export async function loadBinaryData(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
}

export const downloadData = async (data: Uint8Array, filename: string) => {
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
};

export const downloadJSONData = async (jsonData: any, filename: string) => {
  const jsonString = JSON.stringify(jsonData, null, 2);

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);

  a.href = url;
  a.download = filename;

  a.click();

  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
