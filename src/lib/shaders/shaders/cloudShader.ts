export const cloudShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

struct CloudUniforms {
  radius : f32,
  coverage : f32,
  noiseScale : f32,
  noiseStrength : f32,
}

struct LightUniforms {
  lightPosition : vec3<f32>,
  lightColor : vec3<f32>,
  lightIntensity : f32,
};

struct Input {
  @location(0) position : vec4<f32>,
  @location(1) normal : vec4<f32>,
  @location(2) uv : vec2<f32>,
};

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) vPosition : vec4<f32>,
  @location(1) vNormal : vec4<f32>,
  @location(2) vUV : vec2<f32>,
  @location(4) cameraPosition : vec4<f32>,
  @location(5) lightPosition : vec3<f32>,
  @location(6) lightColor : vec3<f32>,
  @location(7) lightIntensity : f32,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(4) var<uniform> lightUni: LightUniforms;
@group(0) @binding(5) var noise_texture: texture_3d<f32>;
@group(0) @binding(6) var noise_sampler: sampler;

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let mNormal: vec4<f32> = uni.normalMatrix * input.normal;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius), 0.0);
  
  output.Position = uni.viewProjectionMatrix * (mPosition + displacement);
  output.vPosition =   uni.viewProjectionMatrix * (mPosition + displacement);
  output.vNormal = mNormal;
  output.vUV = input.uv;
  output.cameraPosition = uni.cameraPosition;
  output.lightPosition = lightUni.lightPosition;
  output.lightColor = lightUni.lightColor;
  output.lightIntensity = lightUni.lightIntensity;

  return output;
}

fn blend(baseColor: vec4<f32>, newColor: vec4<f32>, light: f32) -> vec4<f32> {
  return baseColor + newColor * light;
}

fn map3DTo2D(position: vec3<f32>) -> vec2<f32> {
  let radius: f32 = 1 + cloudUniforms.radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  3.141592653589793238);
  let latitude: f32 = acos(position.y / radius) / 3.141592653589793238;
  
  return vec2<f32>(longitude, latitude);
}

fn cloudDensity(p: vec3<f32>, depth: f32) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  let pos: vec3<f32> = normalize(p) * radius;
  let coverage: f32 = textureSample(texture, textureSampler, map3DTo2D(pos)).r;
  let noise: f32 = textureSample(noise_texture, noise_sampler, pos).r;
  return coverage * noise;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = output.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vNormal.xyz;
  
  let startDepth: f32 = cloudUniforms.radius / 10;
  let endDepth: f32 = cloudUniforms.radius / 10 + 0.0025;

  let stepSize: f32 = 0.00005;

  var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);

  let lowNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz).r;
  let midNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz ).g;
  let highNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz ).b;
  let supaNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz ).a;

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;
    
    let density: f32 = cloudDensity(texturePosition, depth);

    let baseColor = vec3<f32>(0.54, 0.57, 0.92);  // Dark blue
    let highColor = vec3<f32>(0.84, 0.87, 0.92);  // Light blue
    let colorDensity = mix(baseColor, highColor, density);
    color = blend(color, vec4<f32>(colorDensity, density) , supaNoise);
    
    rayOrigin = texturePosition;
  }


  let dotProduct = dot(output.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  if(lightness < 0.05){
    lightness = 0.05;
  }
  if(lightness > 0.25){
    lightness = 0.25;
  }
  if(color.a < 0.05){
    discard;
  }
  // if(output.vUV.x  > 0.75){
  //   return vec4(lowNoise,lowNoise,lowNoise,1.0);
  // }else if(output.vUV.x > 0.5){
  //   return vec4(midNoise,midNoise,midNoise,1.0);
  // }else if(output.vUV.x > 0.25){
  //   return vec4(highNoise,highNoise,highNoise,1.0);
  // }else {
  //   return vec4(supaNoise,supaNoise,supaNoise,1.0);
  // }

  // return vec4(supaNoise,supaNoise,supaNoise,1.0);

  return color * lightness * lowNoise;
}
`;
