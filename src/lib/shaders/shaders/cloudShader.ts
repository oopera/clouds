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
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var noiseTexture: texture_3d<f32>;
@group(0) @binding(4) var noiseTextureSampler: sampler;
@group(0) @binding(5) var<uniform> cloudUniforms: CloudUniforms;

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

  return output;
}

fn computeLighting(density: f32, depth: f32, maxDepth: f32, cosTheta: f32) -> f32 {
  let scaledMaxDepth: f32 = 1.0;
  let depthScaleFactor: f32 = scaledMaxDepth / maxDepth;
  let scaledDepth: f32 = depth * depthScaleFactor;

  let light: f32 = density * (depthScaleFactor - scaledDepth);
  let scatteredLight = light * schlickPhase(0.0, cosTheta);
  
  return scatteredLight;
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

fn schlickPhase(g: f32, cosTheta: f32) -> f32 {
  let g2 = g * g;
  let denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (4.0 - g2) / (1.0 * 3.141592653589793238 * denom * sqrt(denom));
}

fn cloudDensity(p: vec3<f32>, depth: f32) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  let pos = normalize(p) * radius;

  let coverage: f32 = textureSample(texture, textureSampler, map3DTo2D(pos)).r /3;
  let noiseScale = vec3<f32>(2.0, 2.0, 2.0);  // Change this to adjust the detail
  var noise: f32 = textureSample(noiseTexture, noiseTextureSampler, pos * noiseScale).r / 15;
  let density: f32  =  noise * coverage ;

  return density;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = output.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vNormal.xyz;
  
  let startDepth: f32 = cloudUniforms.radius / 10;
  let endDepth: f32 = cloudUniforms.radius / 10 + 0.0025;

  let stepSize: f32 = 0.00005;

  var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;
    
    let density: f32 = cloudDensity(texturePosition, depth);
    let light: f32 = computeLighting(density, depth, endDepth - startDepth, dot(rayDirection, output.vNormal.xyz));

    let baseColor = vec3<f32>(0.4, 0.35, 0.45);  // Dark blue
    let highColor = vec3<f32>(0.5, 0.45, 0.55);  // Light blue
    let colorDensity = mix(baseColor, highColor, density);
    color = blend(color, vec4<f32>(colorDensity, density) , 1.0);
    
    rayOrigin = texturePosition;
  }

  if(color.a < 0.2) {
    discard;
  }

  let cameraDirection = normalize(vec3<f32>(1, 0, 0) - vec3<f32>(0 ,0 ,0)); 
  let up = vec3<f32>(0, 1, 0);
  var lightDir = cross(cameraDirection, up);
  lightDir = normalize(lightDir);
  let dotProduct = dot(lightDir, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  if(lightness < 0.2){
    lightness = 0.2;
  }

  return color * lightness;
}


`;
