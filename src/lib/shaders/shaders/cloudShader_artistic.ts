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
@group(0) @binding(7) var bluenoise_texture: texture_2d<f32>;
@group(0) @binding(8) var bluenoise_sampler: sampler;



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
  let distance_to_sphere = length(closest_point - sphere_center);
  return distance_to_sphere > sphere_radius || length(camera_to_point) < length(camera_to_sphere);
}


fn calculate_height(min_layer_sphere_radius: f32, max_layer_sphere_radius: f32, scaling_factor: f32, noise: f32, detail_noise: f32, blue_noise:f32) -> vec2<f32> {
  var maxheight = ReMap((noise * scaling_factor + blue_noise * 0.05), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  maxheight = ReMap(detail_noise, 0.0, 1.0, min_layer_sphere_radius, maxheight);
  var minheight = ReMap(2 - detail_noise + blue_noise * 0.05, 0.0, 2.0, 0.0, .5);
  minheight = ReMap(minheight, 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  return vec2<f32>(minheight, maxheight);
}

// fn calculate_height(min_layer_sphere_radius: f32, max_layer_sphere_radius: f32, noise: vec4<f32>, coverage: f32, percent_height: f32) -> vec2<f32> {
//   var shape_noise = noise.g * 0.625 + noise.b * 0.125 + noise.a * 0.0625;
//   shape_noise = -(1 - shape_noise);
//   shape_noise = ReMap(noise.r * coverage, shape_noise, 1.0, 0.0, 1.0);

//   var detail: f32 = noise.r * 0.625 + noise.g * 0.25 + noise.b * 0.125;
//   var detail_modifier: f32 = lerp(detail, 1.0 - detail, saturate(percent_height * 2.0));
//   detail_modifier = detail_modifier * exp(-coverage * 0.75);
//   var final_density: f32 = ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0);

//   var maxheight = ReMap(pow((final_density), 2), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
//   let minheight = ReMap(ReMap(1 - final_density, 0.0, 1.0, 0.0, 1.0), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));

//   return vec2<f32>(minheight, maxheight);
// }
fn calculateStepLength(ro: vec3<f32>, rd: vec3<f32>) -> f32 {
  var closest_intersection: f32 = 9999999; // Set to a large value
  var oc: vec3<f32> = -ro;
  var b: f32 = dot(oc, rd);

  var c = dot(oc, oc) - outer_sphere_radius * outer_sphere_radius;
  var discriminant = b * b - c;

  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);
      if t2 > 0.0 && t2 < closest_intersection {
        closest_intersection = t2;
    }
  }

   c = dot(oc, oc) - sphere_radius * sphere_radius;
   discriminant = b * b - c;

  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);

      if t2 > 0.0 && t2 < closest_intersection {
        closest_intersection = t2;
      }

      if t1 > 0.0 && t1 < closest_intersection {
        closest_intersection = t1;
          
      }
  }

  if (closest_intersection == 9999999){
      closest_intersection = 0;
  }

  return closest_intersection;
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return (1.0 - t) * a + t * b;
}


fn getDensity(current_point: vec3<f32>, distance_to_center: f32, distance_to_inner_sphere:f32, coverage: vec4<f32>, noise: vec4<f32>, detail_noise: vec4<f32>, blue_noise: f32, reverse: bool) -> f32 {
  var heights_mb300: vec2<f32> = calculate_height(layer_1_offset, layer_2_sphere_radius , .8, noise.r, noise.r + detail_noise.r, blue_noise);
  var heights_mb500: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, .8, noise.g, noise.g + detail_noise.g, blue_noise);
  var heights_mb700: vec2<f32> = calculate_height(layer_3_offset, layer_4_sphere_radius, .8, noise.b,noise.b + detail_noise.b, blue_noise);
  var heights_mb900: vec2<f32> = calculate_height(layer_4_offset, outer_sphere_radius, .8, noise.a, noise.a + detail_noise.a, blue_noise);
  // var heights_mb300: vec2<f32> = calculate_height(layer_1_offset, outer_sphere_radius, noise, coverage.r, length(sphere_radius - current_point));
  // var heights_mb500: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, noise, coverage.g, length(sphere_radius - current_point));
  // var heights_mb700: vec2<f32> = calculate_height(layer_3_offset, layer_4_sphere_radius,noise, coverage.b, length(sphere_radius - current_point));
  // var heights_mb900: vec2<f32> = calculate_height(layer_4_offset, outer_sphere_radius, noise, coverage.a, length(sphere_radius - current_point));

  var offset_scale =(ReMap(distance_to_center, sphere_radius, outer_sphere_radius, 0.5, 1.0));

  if(reverse){
    offset_scale = 1.0 - offset_scale;
  }

  if (distance_to_center < outer_sphere_radius && distance_to_center > sphere_radius) {
    if(distance_to_center > layer_4_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb900[0] && distance_to_inner_sphere < heights_mb900[1])){
        return coverage.a * offset_scale;
      }
    } else if (distance_to_center > layer_3_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb700[0] && distance_to_inner_sphere < heights_mb700[1])){
        return coverage.b * offset_scale;
      }
    } else if (distance_to_center > layer_2_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb500[0] && distance_to_inner_sphere < heights_mb500[1])){
        return coverage.g * offset_scale;
      }
    } else if (distance_to_center > layer_1_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb300[0] && distance_to_inner_sphere < heights_mb300[1])){
        return coverage.r * offset_scale;
      }
    }
  }

  return 0.0;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  var output_color: vec3<f32> = vec3<f32>(0.62, 0.63, 0.67);
  var highlight_color: vec3<f32> = vec3<f32>(0.09, 0.07, 0.12);

  var light: f32 = 0.0;
  var sun_density: f32 = 0.0;
  var cloud_density: f32 = 0.0;

  let ray_origin = output.vPosition.xyz;
  let ray_direction = normalize(ray_origin - uni.cameraPosition.xyz);

  let steps = cloudUniforms.raymarchSteps;
  var step_length = calculateStepLength(ray_origin, ray_direction) / (steps);


  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = output.vPosition.xyz + i * ray_direction * step_length;
    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
  
    let sphere_uv = vec2<f32>(
      0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
      0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
    );

    var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * 1);    
    var detail_noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * 2);
    var blue_noise = textureSample(bluenoise_texture, bluenoise_sampler, output.vUV);
    let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);

    var is_infront = is_point_occluded_by_sphere(current_point, ray_origin);

    if(is_infront){
      cloud_density += clamp(getDensity(current_point, distance_to_center, length(current_point - inner_sphere_point), coverage, noise, detail_noise, blue_noise.r, false) * cloudUniforms.density, 0.0, 0.2);
    }
    for(var k: f32 = 0.0; k < 1; k += 0.5){
      light = 0;
      let sun_ray_direction = normalize(current_point - lightUniforms.lightPosition);
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;
      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
  
      let sphere_uv = vec2<f32>(
        0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
        0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
      );
    
      let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
      var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * 1);
      var detail_noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * 2);
      var blue_noise = textureSample(bluenoise_texture, bluenoise_sampler, output.vUV);

      var is_infront = is_point_occluded_by_sphere(sun_point, ray_origin);

      if(is_infront){
        let distance_to_inner_sphere = length(sun_point - inner_sphere_point);

        var theta = dot(normalize(current_point), normalize(sun_point));
        light += mieScattering(theta) * lightUniforms.rayleighIntensity + blue_noise.r * 0.05;

        if(cloud_density < 1.0){
          sun_density += getDensity(sun_point, distance_to_center, distance_to_inner_sphere, coverage, noise, detail_noise, blue_noise.r, false) * cloudUniforms.sunDensity * light;
      }
    }
    }
  } 

  output_color += sun_density * highlight_color;
  return vec4<f32>(output_color, cloud_density * cloudUniforms.visibility);
  }
`;
