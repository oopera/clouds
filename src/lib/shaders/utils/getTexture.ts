import worleyFbm from './worleyNoise';

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

export const Get3DNoiseTexture = async (
  device: GPUDevice,
  width: number = 128,
  height: number = 128,
  depth: number = 128,
  addressModeU = 'repeat',
  addressModeV = 'repeat',
  addressModeW = 'repeat'
) => {
  // Generate 3D noise data
  const noiseData_01 = generateWorleyFbmNoise(width, height, depth, 0.125); // Replace this with your 3D noise generation logic
  const noiseData_02 = generateWorleyFbmNoise(width, height, depth, 0.25);
  const noiseData_03 = generateWorleyFbmNoise(width, height, depth, 0.5);
  const noiseData_04 = generateWorleyFbmNoise(width, height, depth, 0.75);
  // Create RGBA data from noise data
  const rgbaData = new Uint8Array(noiseData_01.length * 4);
  for (let i = 0; i < noiseData_01.length; i++) {
    const color_01 = noiseData_01[i] * 255; // Scale 0-1 to 0-255
    const color_02 = noiseData_02[i] * 255;
    const color_03 = noiseData_03[i] * 255;
    const color_04 = noiseData_04[i] * 255;

    const index = i * 4;
    rgbaData[index] = color_01; // R
    rgbaData[index + 1] = color_02; // G
    rgbaData[index + 2] = color_03; // B
    rgbaData[index + 3] = color_04; // A
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
    dimension: '3d', // Specify that the texture is 3D
  });
  device.queue.writeTexture(
    { texture: texture },
    rgbaData,
    { offset: 0, bytesPerRow: 4 * width, rowsPerImage: height },
    { width: width, height: height, depthOrArrayLayers: depth }
  );
  return {
    texture,
    sampler,
  };
};

function generateWorleyFbmNoise(
  width: number,
  height: number,
  depth: number,
  freq: number
): Float32Array {
  const noiseData = new Float32Array(width * height * depth);

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const noiseValue = worleyFbm({ x, y, z }, freq);
        noiseData[z * width * height + y * width + x] = noiseValue;
      }
    }
  }

  return noiseData;
}

export const GetTextureFromGribData3D = async (
  device: GPUDevice,
  encodedRunsArrays: any, // Now an array of arrays
  width: number = 1440, // the number of longitudes
  height: number = 721, // the number of latitudes
  depth: number, // the number of layers
  addressModeU = 'repeat',
  addressModeV = 'repeat',
  addressModeW = 'clamp-to-edge' // 3D textures need a third address mode
) => {
  const rgbaData = new Uint8Array(width * height * depth * 4); // 4 for RGBA channels

  // Iterate over each layer
  for (let d = 0; d < depth; d++) {
    const encodedRuns = encodedRunsArrays[d];

    // Decode run-length encoded data
    const gribData = new Float32Array(width * height);
    let index = 0;
    for (const run of encodedRuns) {
      for (let i = 0; i < run.count && index < gribData.length; i++) {
        gribData[index++] = run.value;
      }
    }

    // Create RGBA data from grib data and insert it into the larger array
    for (let i = 0; i < gribData.length; i++) {
      const value = gribData[i];
      const color = value * 2.55; // scale 0-100 to 0-255
      const index = (d * width * height + i) * 4; // Account for depth in the index
      rgbaData[index] = color; // R
      rgbaData[index + 1] = color; // G
      rgbaData[index + 2] = color; // B
      rgbaData[index + 3] = color; // A
    }
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

  const bytesPerRow = Math.ceil((width * 4) / 256) * 256; // must be a multiple of 256
  const rowsPerImage = height;

  device.queue.writeTexture(
    { texture: texture },
    rgbaData,
    { offset: 0, bytesPerRow: bytesPerRow, rowsPerImage: rowsPerImage },
    { width: width, height: height, depthOrArrayLayers: depth }
  );

  return {
    texture,
    sampler,
  };
};

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
