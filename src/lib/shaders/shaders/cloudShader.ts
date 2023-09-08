export const cloudShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

struct CloudUniforms {
  elapsed : f32,
  visibility : f32, 
  density : f32,
  sunDensity : f32,
  raymarchSteps : f32,
  raymarchLength : f32,
  interactionx: f32,
  interactiony: f32,
}

struct LightUniforms {
  lightPosition : vec3<f32>,
  rayleighIntensity : f32,
  lightType : f32,
  elapsed : f32,
  lastElapsed : f32,
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
  @location(3) vOuterPosition : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(2) var<uniform> lightUniforms: LightUniforms;
@group(0) @binding(3) var noise_texture: texture_3d<f32>;
@group(0) @binding(4) var noise_sampler: sampler;

@group(0) @binding(5) var cloud_texture: texture_3d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;


const outer_radius = 0.005;
const inner_radius = 0.005;
const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

fn useValues() -> f32 {
  let cloud = cloudUniforms;
  let light = lightUniforms;
  let noise = textureSample(noise_texture, noise_sampler, vec3(1.0,1.0,1.0));
  let clouds = textureSample(cloud_texture, cloud_sampler, vec3(1.0,1.0,1.0));
  return 1.0;
}

 
@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    let mPosition: vec4<f32> = uni.modelMatrix * input.position;
    let mNormal: vec4<f32> = uni.normalMatrix * input.normal;

    var outer_displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * outer_radius, 0.0);
    var inner_displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * inner_radius, 0.0);
    output.Position = uni.viewProjectionMatrix * (mPosition + outer_displacement);
    output.vPosition =  mPosition;
    output.vNormal = mNormal;
    output.vUV = input.uv;

    return output;
} 

fn getNoise(p: vec3<f32>, noiseScale: vec3<f32>) -> vec4<f32> {
  return textureSample(noise_texture, noise_sampler, p * noiseScale);
  }

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
  let t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

fn clamp(x: f32, minVal: f32, maxVal: f32) -> f32 {
  return max(min(x, maxVal), minVal);
}

fn getCoverage(p: vec3<f32>, depth: f32) -> f32 {
  let position = normalize(p) * inner_radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  PI);
  let latitude: f32 = acos(position.y / inner_radius) / PI;
  return textureSample(cloud_texture, cloud_sampler, vec3<f32>(longitude, latitude, depth)).r;
}

fn rayleighScattering(theta: f32) -> f32 {
    return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
}

fn mieScattering(theta: f32) -> f32 {
  return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}

fn getDensity(molarAbsorptivity: f32, concentration: f32, pathLength: f32) -> f32 {
  return molarAbsorptivity * concentration * pathLength;
}

fn ReMap(value: f32, old_low: f32, old_high: f32, new_low: f32, new_high: f32) -> f32 {
  var ret_val: f32 = new_low + (value - old_low) * (new_high - new_low) / (old_high - old_low);
  return ret_val;
}

fn calculateDensity(ray_position: vec3<f32>, corresponding_inner_point: vec3<f32>, coverage: f32, detail_height: vec4<f32>, baseDensity: f32, step: f32) -> f32 {
  var density: f32 = 0.0;
  let height = length(ray_position - corresponding_inner_point);
  let max_height = detail_height.g * coverage;

  if (height < max_height) {  
      density = getDensity(baseDensity, coverage, step);
  }
  return density;
}

fn getInnerPoint(ray_position: vec3<f32>) -> vec3<f32> {
  let dir_to_raymarch = normalize(ray_position - sphere_center);
  return sphere_center + dir_to_raymarch * (inner_radius + 2);
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let one = useValues();

  var ray_origin: vec3<f32> = output.vPosition.xyz;
  var ray_direction: vec3<f32> = normalize(uni.cameraPosition.xyz - ray_origin);

  let sphere_center: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  let sphere_radius: f32 = 2.5;

  var output_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var density: f32 = 0.0;

  for (var i: u32 = 0; i < 10; i = i + 1) {
    let t: f32 = f32(i) / 9.0;
    let sample_point = ray_origin + t * cloudUniforms.raymarchLength * ray_direction;
    let oc = sample_point - sphere_center;

    let a = dot(ray_direction, ray_direction);
    let b = 2.0 * dot(oc, ray_direction);
    let c = dot(oc, oc) - (sphere_radius * sphere_radius);
    let discriminant = b * b - 4.0 * a * c;

    let r = length(sample_point - sphere_center);
    let theta = acos((sample_point.y - sphere_center.y) / r);
    let phi = atan2(sample_point.z - sphere_center.z, sample_point.x - sphere_center.x);
    
    let uv = vec2(phi / (2.0 * PI), theta / PI);
    let sampled_noise = textureSample(noise_texture, noise_sampler, vec3(uv, r)).r;
    let sampled_coverage = textureSample(cloud_texture, cloud_sampler, vec3(uv, r)).r;

    if(discriminant > 0.0){


      density += sampled_noise * sampled_coverage;
    }
  }

  output_color = density * vec3<f32>(1.0, 1.0, 1.0);

  return vec4<f32>(output_color, density);
}
`;
