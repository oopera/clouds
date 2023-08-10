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

fn ReMap(value: f32, low1: f32, high1: f32, low2: f32, high2: f32) -> f32 {
  return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return (1.0 - t) * a + t * b;
}


fn DensityAlter(percent_height: f32, weather_map: vec4<f32>) -> f32 {
  // Have density be generally increasing over height
  var ret_val: f32 = percent_height;

  // Reduce density at base
  ret_val *= saturate(ReMap(percent_height, 0.0, 0.2, 0.0, 1.0));

  // Apply weather_map density
  ret_val *= weather_map.a * 2.0;

  // Reduce density at top to make a better transition
  ret_val *= saturate(ReMap(percent_height, 0.9, 1.0, 1.0, 0.0));

  return ret_val;
}

fn getCoverage (p: vec3<f32>) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  let pos: vec3<f32> = normalize(p) * radius;
  let coverage: f32 = textureSample(texture, textureSampler, map3DTo2D(pos)).r;
  return coverage;
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = output.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vNormal.xyz;
  
  let radius = 1 + cloudUniforms.radius;

  let lowNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz).r;
  let midNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz ).g;
  let highNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz ).b;
  let supaNoise = textureSample(noise_texture, noise_sampler, output.vNormal.xyz ).a;

  let coverage = getCoverage(output.vNormal.xyz);

  let startDepth: f32 = cloudUniforms.radius / 10;
  let endDepth: f32 = cloudUniforms.radius / 10 + 0.0025;

  let stepSize: f32 = 0.00005;

  var value = supaNoise * coverage; 

  if(output.vUV.x  > 0.75){
     value = supaNoise ; 
}else if(output.vUV.x > 0.5){
   value = midNoise ;
}else if(output.vUV.x > 0.25){
   value = highNoise ;
}else {
   value = lowNoise ;
}

let color: vec4<f32> = vec4<f32>(value, value, value, value);


  return color;
}
`;

// for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
//   let rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
//   let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;
//   let viewDirection = normalize(output.cameraPosition.rgb - output.vNormal.rgb);
//   let cosTheta = dot(output.lightPosition, viewDirection);
//   let coverage = getCoverage(texturePosition,depth);
//   let adjusted_density: f32 = DensityAlter(depth,vec4(coverage,coverage,coverage,coverage));
//   var density: f32 = cloudDensity(texturePosition, depth);
//   density *= adjusted_density;

//   let baseColor = vec3<f32>(0.54, 0.57, 0.92);  // Dark blue
//   let highColor = vec3<f32>(0.84, 0.87, 0.92);  // Light blue
//   let colorDensity = mix(baseColor, highColor, density);
//   color = blend(color, vec4<f32>(colorDensity, density) , supaNoise);

//   rayOrigin = texturePosition;
// }

// return color;

// let dotProduct = dot(output.lightPosition, output.vNormal.xyz);
// let scaledDotProduct: f32 = dotProduct * 2.0;
// var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

// if(lightness < 0.05){
//   lightness = 0.05;
// }
// if(lightness > 0.25){
//   lightness = 0.25;
// }
// if(color.a < 0.05){
//   discard;
// }
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
