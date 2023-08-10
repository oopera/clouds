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
@group(0) @binding(1) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(2) var<uniform> lightUni: LightUniforms;
@group(0) @binding(3) var texture: texture_2d<f32>;
@group(0) @binding(4) var textureSampler: sampler;
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




fn ReMap(value: f32, low1: f32, high1: f32, low2: f32, high2: f32) -> f32 {
  return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return (1.0 - t) * a + t * b;
}

fn getNoise(p: vec3<f32>) -> vec4<f32> {
  let noiseScale = vec3<f32>(1.0, 1.0, 1.0);
  return textureSample(noise_texture, noise_sampler, p * noiseScale);
}

fn getCoverage(p: vec3<f32>) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  var longitude: f32 = atan2(p.z, p.x) / (2.0 *  3.141592653589793238);
  let latitude: f32 = acos(p.y / radius) / 3.141592653589793238;

  return textureSample(texture, textureSampler, vec2<f32>(longitude, latitude)).r;
}
  


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = output.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vNormal.xyz;
  
  var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);

  let radius = 1 + cloudUniforms.radius;
  var density: f32; 
  var coverage: f32;
  
  let startDepth: f32 = cloudUniforms.radius / 10;
  let endDepth: f32 = cloudUniforms.radius / 10 + 0.00015;

  let stepSize: f32 = 0.000005;


  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;
    let viewDirection = normalize(output.cameraPosition.rgb - output.vNormal.rgb);

    let noise: vec4<f32> = getNoise(texturePosition);
    coverage = getCoverage(texturePosition);

    density += coverage * noise.b;

    let baseColor = vec3<f32>(0.54, 0.57, 0.92);  
    let highColor = vec3<f32>(0.84, 0.87, 0.92); 

    let colorDensity = mix(baseColor, highColor, endDepth - startDepth -  depth);
    color = blend(color, vec4<f32>(colorDensity, density) , 1.0);
  
    rayOrigin = texturePosition;
  }



  return color;
}
`;
