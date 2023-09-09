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

@group(0) @binding(5) var cloud_texture_mb300: texture_2d<f32>;
@group(0) @binding(6) var cloud_texture_mb500: texture_2d<f32>;
@group(0) @binding(7) var cloud_texture_mb700: texture_2d<f32>;
@group(0) @binding(8) var cloud_texture_mb900: texture_2d<f32>;
@group(0) @binding(9) var cloud_sampler: sampler;


const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const raymarch_target: f32 = 1.0;
const inner_sphere_radius: f32 = 2.0;
const layer_1_sphere_radius: f32 = 2.1;
const layer_2_sphere_radius: f32 = 2.15;
const layer_3_sphere_radius: f32 = 2.2;
const outer_sphere_radius: f32 = 2.25;

const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

fn useValues() -> f32 {
  let cloud = cloudUniforms;
  let light = lightUniforms;
  let noise = textureSample(noise_texture, noise_sampler, vec3(1.0,1.0,1.0));
  let clouds = textureSample(cloud_texture_mb300, cloud_sampler, vec2(1.0,1.0));
  return 1.0;
}


@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  output.Position = uni.viewProjectionMatrix * (uni.modelMatrix * input.position);
  output.vPosition = input.position; 
  output.vNormal = uni.normalMatrix * input.normal;
  output.vUV = input.uv;
  return output;
} 

fn ReMap(value: f32, old_low: f32, old_high: f32, new_low: f32, new_high: f32) -> f32 {
  var ret_val: f32 = new_low + (value - old_low) * (new_high - new_low) / (old_high - old_low);
  return ret_val;
}

fn mieScattering(theta: f32) -> f32 {
  return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let one = useValues();
  var output_color: vec3<f32> = vec3<f32>(0.7, 0.7, 0.7);
  var highlight_color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
  var accumulated_alpha: f32 = 0.0;

  var light: f32 = 0.0;
  var sun_density: f32 = 0.0;
  var cloud_density: f32 = 0.0;

  let ray_origin = uni.cameraPosition.xyz;
  let ray_direction = normalize(output.vPosition.xyz - ray_origin);
  let sun_ray_direction = normalize(output.vPosition.xyz - lightUniforms.lightPosition);
  
  let oc = ray_origin - sphere_center;
  let a = dot(ray_direction, ray_direction);
  let b = 2.0 * dot(oc, ray_direction);
  let c = dot(oc, oc) - (outer_sphere_radius * outer_sphere_radius);
  let discriminant = b * b - 4.0 * a * c;
  let t1: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
  let t2: f32 = (-b + sqrt(discriminant)) / (2.0 * a);
  let t: f32 = min(t1, t2);
  let start_point: vec3<f32> = ray_origin + t * ray_direction;

  let cloud_color = vec3<f32>(1.0, 1.0, 1.0);
  let steps = cloudUniforms.raymarchSteps;
  let step_length = (outer_sphere_radius - raymarch_target) / steps;

  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = start_point + i * ray_direction * step_length;
    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * inner_sphere_radius;

    let sphere_uv = vec2<f32>(
      0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
      0.5 - asin((inner_sphere_point.y - sphere_center.y) / inner_sphere_radius) / PI
    );

    let coverage_mb300 = textureSample(cloud_texture_mb300, cloud_sampler, sphere_uv).r;
    let coverage_mb500 = textureSample(cloud_texture_mb500, cloud_sampler, sphere_uv).r;
    let coverage_mb700 = textureSample(cloud_texture_mb700, cloud_sampler, sphere_uv).r;
    let coverage_mb900 = textureSample(cloud_texture_mb900, cloud_sampler, sphere_uv).r;

    var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point / 2);

    var maxheight_mb300 = ReMap(noise.r, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius);
    var maxheight_mb500 = ReMap(noise.b, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius + 0.1);
    var maxheight_mb700 = ReMap(noise.a, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius + 0.2);
    var maxheight_mb900 = ReMap(noise.r, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius + 0.3);

    let distance_to_inner_sphere = length(current_point - inner_sphere_point);

    if (distance_to_center < outer_sphere_radius) {
      if(distance_to_center >= layer_3_sphere_radius) {
          if(distance_to_inner_sphere < maxheight_mb900){
            cloud_density += coverage_mb900 * cloudUniforms.density;
          }
      } else if (distance_to_center >= layer_2_sphere_radius) {
          if(distance_to_inner_sphere < maxheight_mb700){
            cloud_density += coverage_mb700 * cloudUniforms.density;
          }
      } else if (distance_to_center >= layer_1_sphere_radius) {
        if(distance_to_inner_sphere < maxheight_mb500){
          cloud_density += coverage_mb500 * cloudUniforms.density;
        }
      } else if (distance_to_center >= inner_sphere_radius) {
        if(distance_to_inner_sphere < maxheight_mb300){
          cloud_density += coverage_mb300 * cloudUniforms.density;
        }
      }
    }
      
    for(var i: f32 = 0.0; i < 0.5; i += 0.1){
      let sun_point: vec3<f32> = current_point + sun_ray_direction * i;
      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * inner_sphere_radius;
    
      let sphere_uv = vec2<f32>(
        0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
        0.5 - asin((inner_sphere_point.y - sphere_center.y) / inner_sphere_radius) / PI
      );
    
      let coverage_sun300 = textureSample(cloud_texture_mb300, cloud_sampler, sphere_uv).r;
      let coverage_sun500 = textureSample(cloud_texture_mb500, cloud_sampler, sphere_uv).r;
      let coverage_sun700 = textureSample(cloud_texture_mb700, cloud_sampler, sphere_uv).r;
      let coverage_sun900 = textureSample(cloud_texture_mb900, cloud_sampler, sphere_uv).r;
    
      var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point / 2);
    
      var maxheight_sun300 = ReMap(noise.g, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius);
      var maxheight_sun500 = ReMap(noise.b, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius + 0.1);
      var maxheight_sun700 = ReMap(noise.a, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius + 0.2);
      var maxheight_sun900 = ReMap(noise.r, 0.0, 1.0, 0.0, outer_sphere_radius - inner_sphere_radius + 0.3);
    
      let distance_to_inner_sphere = length(sun_point - inner_sphere_point);
    
      if (distance_to_center < outer_sphere_radius) {
        if(distance_to_center >= layer_3_sphere_radius) {
            if(distance_to_inner_sphere < maxheight_sun900){
              sun_density += coverage_sun900 * cloudUniforms.sunDensity;
            }
        } else if (distance_to_center >= layer_2_sphere_radius) {
            if(distance_to_inner_sphere < maxheight_sun700){
              sun_density += coverage_sun700 * cloudUniforms.sunDensity;
            }
        } else if (distance_to_center >= layer_1_sphere_radius) {
          if(distance_to_inner_sphere < maxheight_sun500){
            sun_density += coverage_sun500 * cloudUniforms.sunDensity;
          }
        } else if (distance_to_center >= inner_sphere_radius) {
          if(distance_to_inner_sphere < maxheight_sun300){
            sun_density += coverage_sun300 * cloudUniforms.sunDensity;
          }
        }
      }
    }
}
  

  output_color += sun_density * highlight_color;

  return vec4<f32>(output_color, cloud_density);
}



`;
