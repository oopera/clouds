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
@group(0) @binding(5) var cloud_texture: texture_2d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;



const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const sphere_radius: f32 = 2.5;
const cube_offset: f32 = 0.15;

const layer_1_offset = 0.02;
const layer_2_offset = 0.07;
const layer_3_offset = 0.10;
const layer_4_offset = 0.13;

const layer_1_sphere_radius: f32 = sphere_radius + layer_1_offset;
const layer_2_sphere_radius: f32 = sphere_radius + layer_2_offset;
const layer_3_sphere_radius: f32 = sphere_radius + layer_3_offset;
const layer_4_sphere_radius: f32 = sphere_radius + layer_4_offset;

const outer_sphere_radius: f32 = sphere_radius + cube_offset;

const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;
  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * cube_offset, 0.0);
  let worldPosition: vec4<f32> = mPosition + displacement;
  
  output.Position = uni.viewProjectionMatrix * worldPosition;
  output.vPosition = worldPosition;
  output.vNormal = normalize(uni.normalMatrix * input.normal);
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
const fov = 1.5;
fn is_point_occluded_by_sphere(point: vec3<f32>, camera_position: vec3<f32>) -> bool {
  // Calculate vector from the camera to the point and from the camera to the sphere
  let camera_to_point = point - camera_position;
  let camera_to_sphere = sphere_center - camera_position;

  // Project camera_to_sphere onto camera_to_point to find the point on the line through camera_position and point that is closest to sphere_position
  let t = dot(camera_to_sphere, camera_to_point) / dot(camera_to_point, camera_to_point);
  let closest_point = camera_position + t * camera_to_point;

  // Calculate the distance from the closest point to the sphere's center
  let distance_to_sphere = length(closest_point - sphere_center);

  // Check if the closest point is inside the sphere
  return distance_to_sphere > sphere_radius || length(camera_to_point) < length(camera_to_sphere);
}

fn calculate_height(min_layer_sphere_radius: f32, max_layer_sphere_radius: f32, scaling_factor: f32, noise: f32, detail_noise: f32) -> vec2<f32> {
  var maxheight = ReMap((noise * scaling_factor), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  maxheight = ReMap(detail_noise, 0.0, 1.0, min_layer_sphere_radius, maxheight);
  var minheight = ReMap(2 - detail_noise, 0.0, 2.0, 0.0, .5);
  minheight = ReMap(minheight, 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  return vec2<f32>(minheight, maxheight);
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  var output_color: vec3<f32> = vec3<f32>(0.62, 0.63, 0.67);
  var highlight_color: vec3<f32> = vec3<f32>(0.89, 0.87, 0.90);


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
  let steps = cloudUniforms.raymarchSteps;
  let step_length = ReMap(cloudUniforms.raymarchLength, 0.0, 1.0, 0, 2 * outer_sphere_radius)    / steps;

  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = start_point + i * ray_direction * step_length;
    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
  
    let sphere_uv = vec2<f32>(
      0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
      0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
    );

    var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point);    
    let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
    let coverage_mb300 = coverage.r;
    let coverage_mb500 = coverage.g;
    let coverage_mb700 = coverage.b;
    let coverage_mb900 = coverage.a;

    var is_infront = is_point_occluded_by_sphere(current_point, ray_origin);

    if(is_infront){
      var heights_mb300: vec2<f32> = calculate_height(layer_1_offset, layer_2_sphere_radius , .9, noise.r, noise.r + noise.g);
      var heights_mb500: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, .8, noise.g, noise.g + noise.g);
      var heights_mb700: vec2<f32> = calculate_height(layer_3_offset, layer_4_sphere_radius, .7, noise.b,noise.b + noise.g);
      var heights_mb900: vec2<f32> = calculate_height(layer_4_offset, outer_sphere_radius, .6, noise.a, noise.a + noise.g);

      let distance_to_inner_sphere = length(current_point - inner_sphere_point);

      if (distance_to_center < outer_sphere_radius) {
        if(distance_to_center > layer_4_sphere_radius) {
          if((distance_to_inner_sphere > heights_mb900[0] && distance_to_inner_sphere < heights_mb900[1])){
            cloud_density += coverage_mb900 * cloudUniforms.density;
            }
        } else if (distance_to_center > layer_3_sphere_radius) {
          if((distance_to_inner_sphere > heights_mb700[0] && distance_to_inner_sphere < heights_mb700[1])){
            cloud_density += coverage_mb700 * cloudUniforms.density;
          }
        } else if (distance_to_center > layer_2_sphere_radius) {
          if((distance_to_inner_sphere > heights_mb500[0] && distance_to_inner_sphere < heights_mb500[1])){
            cloud_density += coverage_mb500 * cloudUniforms.density;
          }
        } else 
        if (distance_to_center > layer_1_sphere_radius) {
          if((distance_to_inner_sphere > heights_mb300[0] && distance_to_inner_sphere < heights_mb300[1])){
            cloud_density += coverage_mb300 * cloudUniforms.density;
          }
        }
      }
    }
      
    for(var k: f32 = 0.0; k < 1; k += 0.5){
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;
      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
    
      let sphere_uv = vec2<f32>(
        0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
        0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
      );
    
      let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
      let coverage_mb300 = coverage.r;
      let coverage_mb500 = coverage.g;
      let coverage_mb700 = coverage.b;
      let coverage_mb900 = coverage.a;

      var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point);
      
      var is_infront = is_point_occluded_by_sphere(sun_point, ray_origin);

      if(is_infront){
      var heights_mb300: vec2<f32> = calculate_height(layer_1_offset, layer_2_sphere_radius, .9, noise.r, noise.r + noise.g);
      var heights_mb500: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, .8, noise.g, noise.g + noise.g);
      var heights_mb700: vec2<f32> = calculate_height(layer_3_offset, layer_4_sphere_radius, .7, noise.b,noise.b + noise.g);
      var heights_mb900: vec2<f32> = calculate_height(layer_4_offset, outer_sphere_radius, .6, noise.a, noise.a + noise.g);

        let distance_to_inner_sphere = length(sun_point - inner_sphere_point);

        var theta = dot(normalize(current_point), normalize(sun_point));
        light = mieScattering(theta) * lightUniforms.rayleighIntensity;

        if(cloud_density < (layer_2_offset - layer_1_offset) / (cube_offset - layer_4_offset)){
      
        if (distance_to_center < outer_sphere_radius) {
          if(distance_to_center > layer_4_sphere_radius) {
            if((distance_to_inner_sphere > heights_mb900[0] && distance_to_inner_sphere < heights_mb900[1])){
              sun_density += coverage_mb900 * cloudUniforms.sunDensity * light * (layer_2_offset - layer_1_offset) / (cube_offset - layer_4_offset) * (ReMap(distance_to_center, layer_4_sphere_radius, outer_sphere_radius, 0.0, 1.0));
              }
          } else if (distance_to_center > layer_3_sphere_radius) {
            if((distance_to_inner_sphere > heights_mb700[0] && distance_to_inner_sphere < heights_mb700[1])){
              sun_density += coverage_mb700 * cloudUniforms.sunDensity * light * (layer_2_offset - layer_1_offset) / (layer_4_offset - layer_3_offset) * (ReMap(distance_to_center, layer_3_sphere_radius, layer_4_sphere_radius, 0.0, 1.0));
              }
          } else if (distance_to_center > layer_2_sphere_radius) {
            if((distance_to_inner_sphere > heights_mb500[0] && distance_to_inner_sphere < heights_mb500[1])){ 
              sun_density += coverage_mb500 * cloudUniforms.sunDensity * light * (layer_2_offset - layer_1_offset) / (layer_3_offset - layer_2_offset) * (ReMap(distance_to_center, layer_2_sphere_radius, layer_3_sphere_radius, 0.0, 1.0));
            }
          } else 
          if (distance_to_center > layer_1_sphere_radius) {
            if((distance_to_inner_sphere > heights_mb300[0] && distance_to_inner_sphere < heights_mb300[1])){
              sun_density += coverage_mb300 * cloudUniforms.sunDensity * light * (ReMap(distance_to_center, layer_1_sphere_radius, layer_2_sphere_radius, 0.0, 1.0));
            }
          }
        }
      }
    }
    }
  } 
  
  output_color += sun_density * highlight_color * light;
  return vec4<f32>(output_color, cloud_density * cloudUniforms.visibility);
  }
`;
