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

const applyGaussianBlur1D = (data: number[], kernel: number[]) => {
  const output = new Array<number>(data.length).fill(0);
  const halfKernelSize = Math.floor(kernel.length / 2);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let j = -halfKernelSize; j <= halfKernelSize; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        sum += data[index] * kernel[j + halfKernelSize];
      }
    }
    output[i] = sum;
  }

  return output;
};

const applyGaussianBlur2D = (
  data: number[],
  width: number,
  height: number,
  kernel: number[]
) => {
  let output = new Array<number>(width * height).fill(0);

  // Apply to each row
  for (let y = 0; y < height; y++) {
    const row = data.slice(y * width, (y + 1) * width);
    const blurredRow = applyGaussianBlur1D(row, kernel);
    for (let x = 0; x < width; x++) {
      output[y * width + x] = blurredRow[x];
    }
  }

  // Apply to each column
  for (let x = 0; x < width; x++) {
    const col = [];
    for (let y = 0; y < height; y++) {
      col.push(output[y * width + x]);
    }
    const blurredCol = applyGaussianBlur1D(col, kernel);
    for (let y = 0; y < height; y++) {
      output[y * width + x] = blurredCol[y];
    }
  }

  return output;
};

export const Get4LayerTextureFromGribData = async (
  device: GPUDevice,
  data: number[][],
  addressModeU = 'repeat',
  addressModeV = 'repeat'
) => {
  const width = 1440;
  const height = 721;

  const kernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];

  // Apply Gaussian blur to each channel
  const blurredData = data.map((channel) => {
    return applyGaussianBlur2D(channel, width, height, kernel);
  });

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
  //   for (let i = 0; i < blurredData[1].length; i++) {
  //     const value = Math.floor(blurredData[0][i] * 2.55); // Convert data to 8-bit value
  //     const offset = i * 4; // Each pixel has 4 bytes (R, G, B, A)
  //     imageData.data[offset] = value; // R
  //     imageData.data[offset + 1] = value; // G
  //     imageData.data[offset + 2] = value; // B
  //     imageData.data[offset + 3] = value; // A (full opacity)
  //   }
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
    mipmapFilter: 'linear',
    addressModeU: addressModeU as GPUAddressMode,
    addressModeV: addressModeV as GPUAddressMode,
  });

  const texture = device.createTexture({
    size: [width, height, 1],
    format: 'rgba8unorm',
    mipLevelCount: Math.log2(Math.max(width, height)) + 1,
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
  width: number = 64,
  height: number = 64,
  depth: number = 64
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

export function CreateNoiseImages(
  buffer: ArrayBuffer,
  width: number = 64,
  height: number = 64,
  depth: number = 64
) {
  const data = new Uint8Array(buffer);
  // Initialize canvases and their 2D contexts for RGBA channels
  const canvases = {
    R: document.createElement('canvas'),
    G: document.createElement('canvas'),
    B: document.createElement('canvas'),
    A: document.createElement('canvas'),
  };

  canvases.R.width =
    canvases.G.width =
    canvases.B.width =
    canvases.A.width =
      width;
  canvases.R.height =
    canvases.G.height =
    canvases.B.height =
    canvases.A.height =
      height;

  const ctxs = {
    R: canvases.R.getContext('2d')!,
    G: canvases.G.getContext('2d')!,
    B: canvases.B.getContext('2d')!,
    A: canvases.A.getContext('2d')!,
  };

  const imgData = {
    R: ctxs.R.createImageData(width, height),
    G: ctxs.G.createImageData(width, height),
    B: ctxs.B.createImageData(width, height),
    A: ctxs.A.createImageData(width, height),
  };

  // Loop through the first slice and fill all channels equally based on the single channel value
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index3D = (x + y * width) * 4;
      const indexImgData = (x + y * width) * 4;

      // For Red channel
      imgData.R.data[indexImgData] =
        imgData.R.data[indexImgData + 1] =
        imgData.R.data[indexImgData + 2] =
          data[index3D];
      imgData.R.data[indexImgData + 3] = 255;

      // For Green channel
      imgData.G.data[indexImgData] =
        imgData.G.data[indexImgData + 1] =
        imgData.G.data[indexImgData + 2] =
          data[index3D + 1];
      imgData.G.data[indexImgData + 3] = 255;

      // For Blue channel
      imgData.B.data[indexImgData] =
        imgData.B.data[indexImgData + 1] =
        imgData.B.data[indexImgData + 2] =
          data[index3D + 2];
      imgData.B.data[indexImgData + 3] = 255;

      // For Alpha channel
      imgData.A.data[indexImgData] =
        imgData.A.data[indexImgData + 1] =
        imgData.A.data[indexImgData + 2] =
          data[index3D + 3];
      imgData.A.data[indexImgData + 3] = 255;
    }
  }

  // Put image data onto canvas and download
  for (const channel of ['R', 'G', 'B', 'A']) {
    ctxs[channel].putImageData(imgData[channel], 0, 0);
    const dataUrl = canvases[channel].toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `texture_${channel}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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
    magFilter: 'linear',
    minFilter: 'linear',
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

function reMap(
  value: number,
  old_low: number,
  old_high: number,
  new_low: number,
  new_high: number
) {
  var ret_val: number =
    new_low + ((value - old_low) * (new_high - new_low)) / (old_high - old_low);
  return ret_val;
}

export const Get3DNoiseTexture = async (
  device: GPUDevice,
  width: number = 32,
  height: number = 32,
  depth: number = 32,
  addressModeU = 'repeat',
  addressModeV = 'repeat',
  addressModeW = 'repeat'
) => {
  const perlinNoiseData_01 = generatePerlinFbmNoise(
    width,
    height,
    depth,
    25,
    5
  );
  const noiseData = generateWorleyFbmNoise(width, height, depth, 1, 10, 3);
  const noiseData_01 = generateWorleyFbmNoise(width, height, depth, 1, 12, 3);
  const noiseData_02 = generateWorleyFbmNoise(width, height, depth, 1, 16, 3);
  const noiseData_03 = generateWorleyFbmNoise(width, height, depth, 1, 32, 3);

  const rgbaData = new Uint8Array(noiseData_01.length * 4);

  function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
  }

  for (let i = 0; i < noiseData_01.length; i++) {
    const index = i * 4;

    const fbmNoise =
      noiseData[i] * 0.5 +
      noiseData_01[i] * 0.25 +
      noiseData_02[i] * 0.125 +
      noiseData_03[i] * 0.125;

    let pfbm = mix(fbmNoise, perlinNoiseData_01[i], 0.75);
    const billowyPerlinData = reMap(pfbm, 0.0, 1.0, fbmNoise, 1.0);

    rgbaData[index] = billowyPerlinData * 255; // R
    rgbaData[index + 1] = noiseData_01[i] * 255; // G
    rgbaData[index + 2] = noiseData_02[i] * 255; // B
    rgbaData[index + 3] = noiseData_03[i] * 255; // A
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

  downloadData(rgbaData, 'detail-noise.bin');

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
