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
