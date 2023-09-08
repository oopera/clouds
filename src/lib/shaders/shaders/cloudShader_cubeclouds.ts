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
// @group(0) @binding(5) var cloud_texture: texture_2d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;


const outer_radius = 0.005;
const inner_radius = 0.005;
const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

 
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
  var ray_origin: vec3<f32> = output.vPosition.xyz;
  var ray_direction: vec3<f32> = normalize(ray_origin + uni.cameraPosition.rgb);
  var sunray_direction: vec3<f32> = normalize(ray_origin + lightUniforms.lightPosition);

  var sun_density: f32 = 0.0;
  var density: f32 = 0.0;
  var noise : vec4<f32> = getNoise(ray_origin, vec3<f32>(1, 1, 1));
  var theta: f32;
  var coverage: f32;
  var color : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  var light: f32 = 1.0;
  var noised_coverage: f32;


  let stepSize: f32 = cloudUniforms.raymarchLength; 
  let startDepth: f32 = 0; 
  let endDepth: f32 =  startDepth + (cloudUniforms.raymarchSteps * stepSize); 

  let baseColor = vec3<f32>(0.72, 0.73, 0.77);  
  let highColor = vec3<f32>(0.99, 0.97, 1.0); 

  var output_density: f32 = 0.0;
  var output_color = baseColor;

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let ray_position: vec3<f32> = ray_origin + ray_direction * depth;

    let corresponding_inner_point = getInnerPoint(ray_position);
    let deviation = ray_position - corresponding_inner_point;
    let height = length(deviation);

    let detail_height = textureSample(noise_texture, noise_sampler, corresponding_inner_point);
    coverage = getCoverage(corresponding_inner_point, ReMap(depth, startDepth, endDepth, 0.0, 1.0));
    density += calculateDensity(ray_position, corresponding_inner_point, coverage, detail_height, cloudUniforms.density, 1.0 / cloudUniforms.raymarchSteps);

    for(var i = 0.0; i < 1.0; i += 0.5){
      let sunray_position: vec3<f32> = ray_position + sunray_direction * i;

      let corresponding_inner_point = getInnerPoint(sunray_position);
      let deviation = sunray_position - corresponding_inner_point;
      let height = length(deviation);
      
      let detail_height = textureSample(noise_texture, noise_sampler, corresponding_inner_point);
      coverage = getCoverage(corresponding_inner_point, ReMap(depth, startDepth, endDepth, 0.0, 1.0));

      theta = dot(normalize(ray_position), normalize(sunray_position));
      light = rayleighScattering(theta) * lightUniforms.rayleighIntensity;

      sun_density += calculateDensity(sunray_position, corresponding_inner_point, coverage, detail_height, cloudUniforms.sunDensity, 0.2);
    }

    output_density += density;
    output_color += density * highColor * sun_density * light;
    ray_origin = ray_position;
  }

  return vec4<f32>(output_color, output_density) * cloudUniforms.visibility;
}
`;
