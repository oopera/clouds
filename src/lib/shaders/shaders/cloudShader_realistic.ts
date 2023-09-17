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

const layer_1_offset = 0.00;
const layer_2_offset = 0.05;
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
fn rayleighScattering(theta: f32) -> f32 {
  return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
}
const fov = 1.5;
fn is_point_occluded_by_sphere(point: vec3<f32>, camera_position: vec3<f32>) -> bool {
  let camera_to_point = point - camera_position;
  let camera_to_sphere = sphere_center - camera_position;
  let t = dot(camera_to_sphere, camera_to_point) / dot(camera_to_point, camera_to_point);
  let closest_point = camera_position + t * camera_to_point;
  let distance_to_sphere = length(closest_point - sphere_center);
  return distance_to_sphere > sphere_radius || length(camera_to_point) < length(camera_to_sphere);
}

fn calculate_height(min_layer_sphere_radius: f32, max_layer_sphere_radius: f32, noise: vec4<f32>, coverage: f32, percent_height: f32) -> vec2<f32> {
  var shape_noise = noise.g * 0.625 + noise.b * 0.125 + noise.a * 0.0625;
  shape_noise = -(1 - shape_noise);
  shape_noise = ReMap(noise.r, shape_noise, 1.0, 0.0, 1.0);

  var detail: f32 = noise.r * 0.625 + noise.g * 0.25 + noise.b * 0.125;
  var detail_modifier: f32 = lerp(detail, 1.0 - detail, saturate(percent_height * 5.0));
  detail_modifier = detail_modifier * exp(-coverage * 0.75);
  var final_density: f32 = ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0);

  var maxheight = ReMap(pow((final_density), 2), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  let minheight = ReMap(ReMap(1 - final_density, 0.0, 1.0, 0.0, .5), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));

  return vec2<f32>(minheight, maxheight);
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

fn getDensity(current_point: vec3<f32>, distance_to_center: f32, distance_to_inner_sphere:f32, coverage: vec4<f32>, noise: vec4<f32>, reverse: bool) -> f32 {
  var heights_mb300: vec2<f32> = calculate_height(layer_1_offset, outer_sphere_radius, noise, coverage.r, layer_1_offset / length(sphere_radius - current_point));
  var heights_mb500: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, noise, coverage.g, layer_2_offset / length(layer_2_sphere_radius - current_point));
  var heights_mb700: vec2<f32> = calculate_height(layer_3_offset, layer_4_sphere_radius,noise, coverage.b, layer_3_offset / length(layer_3_sphere_radius - current_point));
  var heights_mb900: vec2<f32> = calculate_height(layer_4_offset, outer_sphere_radius, noise, coverage.a, layer_4_offset / length(outer_sphere_radius - current_point));
  var offset_scale =(ReMap(distance_to_center, sphere_radius, outer_sphere_radius, 0.5, 1.0));
  var offset_scale_mb300 =(ReMap(distance_to_center, layer_1_sphere_radius, layer_2_sphere_radius, 0.5, 1.0));
  var offset_scale_mb500 = (ReMap(distance_to_center, layer_2_sphere_radius, layer_3_sphere_radius, 0.5, 1.0));
  var offset_scale_mb700 = (ReMap(distance_to_center, layer_3_sphere_radius, layer_4_sphere_radius, 0.5, 1.0));
  var offset_scale_mb900 = (ReMap(distance_to_center, layer_4_sphere_radius, outer_sphere_radius, 0.5, 1.0));

  if(reverse){
    offset_scale = 1.0 - offset_scale;
  }
  if (abs(coverage.r - coverage.g) < 0.03 && coverage.r > 0.95) {
    heights_mb300[1] = 1.0;
    heights_mb500[0] = 0.0;
    offset_scale_mb500 = offset_scale;
  } 

  if (abs(coverage.g - coverage.b) < 0.03 && coverage.g > 0.95) {
    heights_mb500[1] = 1.0;
    heights_mb700[0] = 0.0;
    offset_scale_mb700 = offset_scale;
  } 

  if (abs(coverage.b - coverage.a) < 0.03 && coverage.b > 0.95) {
    heights_mb700[1] = 1.0;
    heights_mb900[0] = 0.0;
    offset_scale_mb900 = offset_scale;
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
  var output_color: vec3<f32> = vec3<f32>(0.52, 0.53, 0.57);
  
  var highlight_color: vec3<f32> = vec3<f32>(0.89, 0.87, 0.90);


  let dotProduct = dot(lightUniforms.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));
  var highlight_color_alt: vec3<f32> = vec3<f32>(0.89, 0.87, 0.90);
  var output_color_alt: vec3<f32> = vec3<f32>(0.63, 0.63, 0.7);
  output_color = mix(output_color, output_color, lightness);
  highlight_color = mix(highlight_color, highlight_color, lightness);

  var light: f32 = 0.0;
  var sun_density: f32 = 0.0;
  var cloud_density: f32 = 0.0;

  let ray_origin = uni.cameraPosition.xyz;
  let ray_direction = normalize(output.vPosition.xyz - ray_origin);
  let sun_ray_direction = normalize(output.vPosition.xyz - lightUniforms.lightPosition);

  let ray_to_center = length(sphere_center - ray_origin);

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
  let step_length = ReMap(cloudUniforms.raymarchLength, 0.0, 1.0, 0, 2 * outer_sphere_radius)/ steps;
  

  let lod = 1.2;

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
    var is_infront = is_point_occluded_by_sphere(current_point, ray_origin);
    let distance_to_inner_sphere = length(current_point - inner_sphere_point);


    if(is_infront){
      cloud_density += getDensity(current_point, distance_to_center, distance_to_inner_sphere, coverage, noise, true) * cloudUniforms.density;
    }
    
      
    for(var k: f32 = 0.0; k < 1; k += 0.5){
      light = 0.0;
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;
      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
    
      let sphere_uv = vec2<f32>(
        0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
        0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
      );
    
      let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
      var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * lod);
      var is_infront = is_point_occluded_by_sphere(sun_point, ray_origin);
      let distance_to_inner_sphere = length(sun_point - inner_sphere_point);

      if(is_infront){
        var theta = dot(normalize(current_point), normalize(sun_point));
        light += mieScattering(theta) * rayleighScattering(theta) * lightUniforms.rayleighIntensity;
          if(cloud_density < 1.0){
          sun_density += getDensity(sun_point,distance_to_center, distance_to_inner_sphere,coverage, noise, false) * cloudUniforms.sunDensity;
          }
        }
      }
      output_color += sun_density * highlight_color * light;
    }


  return vec4<f32>(output_color, cloud_density * cloudUniforms.visibility);
  }
`;
