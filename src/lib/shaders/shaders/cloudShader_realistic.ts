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

const layer_1_offset = 0.01;
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

const fov = 1.5;
const lod = 1.0;

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


fn HG(cos_angle: f32, g: f32) -> f32 {
  let g2: f32 = g * g;
  let val: f32 = (1.0 - g2) / (pow(1.0 + g2 - 2.0 * g * cos_angle, 1.5)) / (4.0 * 3.1415);
  return val;
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return (1.0 - t) * a + t * b;
}

fn saturate(x: f32) -> f32 {
  return clamp(x, 0.0, 1.0);
}

fn pow(x: f32, y: f32) -> f32 {
  return exp(y * log(x));
}

fn mieScattering(theta: f32) -> f32 {
  return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}
fn rayleighScattering(theta: f32) -> f32 {
  return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
}


fn is_point_occluded_by_sphere(point: vec3<f32>, camera_position: vec3<f32>, camera_direction: vec3<f32>) -> bool {
    let camera_to_point = point - camera_position;
    let camera_to_sphere = sphere_center - camera_position;
    let t = dot(camera_to_sphere, camera_to_point) / dot(camera_to_point, camera_to_point);
    let closest_point = camera_position + t * camera_to_point;
    let distance_to_sphere = length(closest_point - sphere_center);
    let occluded_by_sphere = distance_to_sphere > sphere_radius || length(camera_to_point) < length(camera_to_sphere);
    let normalized_camera_direction = normalize(camera_direction);
    let normalized_camera_to_point = normalize(camera_to_point);
    let angle_cosine = dot(normalized_camera_direction, normalized_camera_to_point);
    let half_fov_cosine = cos(fov * 0.5 );
    let within_fov = angle_cosine >= half_fov_cosine;

    return !(within_fov && !occluded_by_sphere);
}

fn calculate_height(min_layer_sphere_radius: f32, max_layer_sphere_radius: f32, noise: vec4<f32>, coverage: f32, percent_height: f32) -> vec2<f32> {
  var shape_noise = pow(noise.g * 0.625 + noise.b * 0.125 + noise.a * 0.0625, 2);
  shape_noise = -(1 - shape_noise);
  shape_noise = ReMap(noise.r * coverage, shape_noise, 1.0, 0.0, 1.0);

  var detail: f32 = pow(noise.r * 0.625 + noise.g * 0.25 + noise.b * 0.125, 2);
  var detail_modifier: f32 = lerp(detail, 1.0 - detail, saturate(percent_height * 2.0));
  detail_modifier = detail_modifier * coverage;
  var final_density: f32 = ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0);

  var maxheight = ReMap(pow((final_density), 2), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  let minheight = ReMap(ReMap(1 - final_density, 0.0, 1.0, 0.0, 1.0), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));

  return vec2<f32>(minheight, maxheight);
}


fn calculateStepLength(ro: vec3<f32>, rd: vec3<f32>) -> f32 {
  var oc: vec3<f32> = -ro;
  var b: f32 = dot(oc, rd);
  var c: f32 = dot(oc, oc) - sphere_radius * sphere_radius;
  var discriminant: f32 = b * b - c;

  var closest_intersection: f32 = -1.0;

  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);

      if (t1 > 0.0 && (t1 < closest_intersection || closest_intersection < 0.0)) {
          closest_intersection = t1;
      }

      if (t2 > 0.0 && (t2 < closest_intersection || closest_intersection < 0.0)) {
          closest_intersection = t2;
      }
  }

  let outer_sphere_radius: f32 = sphere_radius + cube_offset;
  c = dot(oc, oc) - outer_sphere_radius * outer_sphere_radius;
  discriminant = b * b - c;

  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);

      if (t1 > 0.0 && (t1 < closest_intersection || closest_intersection < 0.0)) {
          closest_intersection = t1;
      }

      if (t2 > 0.0 && (t2 < closest_intersection || closest_intersection < 0.0)) {
          closest_intersection = t2;
      }
  }

  return closest_intersection;
}


fn getDensity(current_point: vec3<f32>, distance_to_center: f32, distance_to_inner_sphere:f32, coverage: vec4<f32>, noise: vec4<f32>, reverse: bool) -> f32 {
  var heights_mb300: vec2<f32> = calculate_height(layer_1_offset, outer_sphere_radius, noise, coverage.r, length(sphere_radius - current_point));
  var heights_mb500: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, noise, coverage.g, length(sphere_radius - current_point));
  var heights_mb700: vec2<f32> = calculate_height(layer_3_offset, layer_4_sphere_radius,noise, coverage.b, length(sphere_radius - current_point));
  var heights_mb900: vec2<f32> = calculate_height(layer_4_offset, outer_sphere_radius, noise, coverage.a, length(sphere_radius - current_point));
  var offset_scale =(ReMap(distance_to_center, sphere_radius, outer_sphere_radius, 0.5, 1.0));
  var offset_scale_mb300 =(ReMap(distance_to_center, layer_1_sphere_radius, layer_2_sphere_radius, 0.5, 1.0));
  var offset_scale_mb500 = (ReMap(distance_to_center, layer_2_sphere_radius, layer_3_sphere_radius, 0.5, 1.0));
  var offset_scale_mb700 = (ReMap(distance_to_center, layer_3_sphere_radius, layer_4_sphere_radius, 0.5, 1.0));
  var offset_scale_mb900 = (ReMap(distance_to_center, layer_4_sphere_radius, outer_sphere_radius, 0.5, 1.0));

  if(reverse){
    offset_scale = 1.0 - offset_scale;
  }
  if (abs(coverage.r - coverage.g) < 0.03 && coverage.r > 0.95 && coverage.g > 0.3) {
    heights_mb300[1] = 1.0;
    heights_mb500[0] = 0.0;
    offset_scale_mb500 = offset_scale;
  } 

  if (abs(coverage.g - coverage.b) < 0.03 && coverage.g > 0.95 && coverage.b > 0.3) {
    heights_mb500[1] = 1.0;
    heights_mb700[0] = 0.0;
    offset_scale_mb700 = offset_scale;
  } 

  if (abs(coverage.b - coverage.a) < 0.03 && coverage.b > 0.95 && coverage.a > 0.3) {
    heights_mb700[1] = 1.0;
    heights_mb900[0] = 0.0;
    offset_scale_mb900 = offset_scale;
  } 

  if (distance_to_center < outer_sphere_radius && distance_to_center > sphere_radius) {
    if(distance_to_center > layer_4_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb900[0] && distance_to_inner_sphere < heights_mb900[1])){
        return coverage.a * offset_scale_mb900;
      }
    } else if (distance_to_center > layer_3_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb700[0] && distance_to_inner_sphere < heights_mb700[1])){
        return coverage.b * offset_scale_mb700;
      }
    } else if (distance_to_center > layer_2_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb500[0] && distance_to_inner_sphere < heights_mb500[1])){
        return coverage.g * offset_scale_mb500;
      }
    } else if (distance_to_center > layer_1_sphere_radius) {
      if((distance_to_inner_sphere > heights_mb300[0] && distance_to_inner_sphere < heights_mb300[1])){
        return coverage.r * offset_scale_mb300;
      }
    }
  }

  return 0.0;
}

const high_lod: f32 = 2.0;
const low_lod: f32 = 0.1;
const lod_distance_threshold: f32 = 10.0; 

fn calculate_lod() -> f32 {
    let distance = length(sphere_center - uni.cameraPosition.xyz);
    let lod = mix(high_lod, low_lod, clamp(distance / lod_distance_threshold, 0.0, 1.0));
    return lod;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  var output_color: vec3<f32> = vec3<f32>(0.62, 0.63, 0.67);

  var highlight_color: vec3<f32> = vec3<f32>(0.89, 0.82, 0.90);

  var light: f32 = 0.0;
  var sun_density: f32 = 0.0;
  var cloud_density: f32 = 0.0;

  let ray_origin = uni.cameraPosition.xyz;
  let ray_direction = normalize(output.vPosition.xyz - ray_origin);
  let ray_to_center = length(sphere_center - ray_origin);
  
  let steps = cloudUniforms.raymarchSteps;
  let step_length = calculateStepLength(ray_origin, ray_direction) / steps;


  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = output.vPosition.xyz + i * ray_direction * step_length;
    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
  
    let sphere_uv = vec2<f32>(
      0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
      0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
    );


    var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * lod);    
    let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
    var is_infront = is_point_occluded_by_sphere(current_point, ray_origin, ray_direction);
    let distance_to_inner_sphere = length(current_point - inner_sphere_point);

    if(is_infront){
      cloud_density += getDensity(current_point, distance_to_center, distance_to_inner_sphere, coverage, noise, true) * cloudUniforms.density;
    }
    
    for(var k: f32 = 0.0; k < 1; k += 0.5){
      light = 0.0;
      let sun_ray_direction = normalize(current_point - lightUniforms.lightPosition);
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;
      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
    
      let sphere_uv = vec2<f32>(
        0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
        0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
      );

    
      let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
      var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * lod);
      var is_infront = is_point_occluded_by_sphere(sun_point, ray_origin, ray_direction);
      let distance_to_inner_sphere = length(sun_point - inner_sphere_point);


      if(is_infront){
        var theta = dot(normalize(current_point), normalize(sun_point));
        light += mieScattering(theta) * rayleighScattering(theta) * lightUniforms.rayleighIntensity;
        // light = CalculateLight(cloud_density / 5, sun_density, theta, length(sphere_radius - sun_point), 0.5).r * lightUniforms.rayleighIntensity;
          if(cloud_density < 5.0){
          sun_density += getDensity(sun_point, distance_to_center, distance_to_inner_sphere,coverage, noise, false) * cloudUniforms.sunDensity;
          }
        }
      }
      output_color += sun_density * highlight_color * light;
    }

  return vec4<f32>(output_color, cloud_density * cloudUniforms.visibility);
  }
`;

// let dotProduct = dot(lightUniforms.lightPosition, output.vNormal.xyz);
// let scaledDotProduct: f32 = dotProduct * 10.0;
// var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

// let edge = fwidth(lightness);
// let borderColor_light = vec3<f32>(1.0, 0.72, 0.75);
// let borderColor_dark = vec3<f32>(0.45, 0.43, 0.7);
// let blendRadius = 0.1;
// let mask = smoothstep(0.0, blendRadius, edge);
// let resultColor_dark = mask * borderColor_dark;
// let resultColor_light = mask * borderColor_light;

// var highlight_color_alt: vec3<f32> = vec3<f32>(0.6, 0.66, 0.6);
// var output_color_alt: vec3<f32> = vec3<f32>(0.4, 0.4, 0.4);

// output_color = mix(mix(output_color, output_color_alt, lightness), resultColor_dark, mask);
// highlight_color = mix(mix(highlight_color, highlight_color_alt, lightness), resultColor_light, mask);

// const cloud_ambient_minimum: f32 = 0.2;
// const sun_color: vec3<f32> = vec3<f32>(0.89, 0.82, 0.90);
// const cloud_beer: f32 = 0.75;
// const cloud_attuention_clampval: f32 = 0.1;
// const cloud_outscatter_ambient: f32 = 0.4;
// const cloud_inscatter: f32 = 0.7;
// const cloud_silver_intensity: f32 = 0.1;
// const cloud_silver_exponent: f32 = 1.0;
// const cloud_outscatter: f32 = 0.2;
// const cloud_in_vs_outscatter: f32 = 0.5;

// // Function to compute InOutScatter
// fn InOutScatter(cos_angle: f32, cloud_inscatter: f32, cloud_silver_intensity: f32, cloud_silver_exponent: f32, cloud_outscatter: f32, cloud_in_vs_outscatter: f32) -> f32 {
//   let first_hg: f32 = HG(cos_angle, cloud_inscatter);
//   let second_hg: f32 = cloud_silver_intensity * pow(saturate(cos_angle), cloud_silver_exponent);
//   let in_scatter_hg: f32 = max(first_hg, second_hg);
//   let out_scatter_hg: f32 = HG(cos_angle, -cloud_outscatter);
//   return mix(in_scatter_hg, out_scatter_hg, cloud_in_vs_outscatter);
// }

// // Function to compute Attenuation
// fn Attenuation(density_to_sun: f32, cos_angle: f32, cloud_beer: f32, cloud_attuention_clampval: f32) -> f32 {
//   let prim: f32 = exp(-cloud_beer * density_to_sun);
//   let scnd: f32 = exp(-cloud_beer * cloud_attuention_clampval) * 0.7;
//   let checkval: f32 = ReMap(cos_angle, 0.0, 1.0, scnd, scnd * 0.5);
//   return max(checkval, prim);
// }

// // Function to compute OutScatterAmbient
// fn OutScatterAmbient(density: f32, percent_height: f32, cloud_outscatter_ambient: f32) -> f32 {
//   let depth: f32 = cloud_outscatter_ambient * pow(density, ReMap(percent_height, 0.3, 0.9, 0.5, 1.0));
//   let vertical: f32 = pow(saturate(ReMap(percent_height, 0.0, 0.3, 0.8, 1.0)), 0.8);
//   let out_scatter: f32 = depth * vertical;
//   return 1.0 - saturate(out_scatter);
// }

// fn CalculateLight(
//   density: f32,
//   density_to_sun: f32,
//   cos_angle: f32,
//   percent_height: f32,
//   dist_along_ray: f32,
// ) -> vec3<f32> {
//   let attenuation_prob: f32 = Attenuation(density_to_sun, cos_angle, cloud_beer, cloud_attuention_clampval);
//   let ambient_out_scatter: f32 = OutScatterAmbient(density, percent_height, cloud_outscatter_ambient);
//   let sun_highlight: f32 = InOutScatter(cos_angle, cloud_inscatter, cloud_silver_intensity, cloud_silver_exponent, cloud_outscatter, cloud_in_vs_outscatter);
//   var attenuation: f32 = attenuation_prob * sun_highlight * ambient_out_scatter;
//   attenuation = max(density * cloud_ambient_minimum * (1.0 - pow(saturate(dist_along_ray / 4000.0), 2.0)), attenuation);
//   // attenuation += bluenoise * 0.003;
//   let ret_color: vec3<f32> = vec3<f32>(attenuation, attenuation, attenuation) * sun_color;
//   return ret_color;
// }
