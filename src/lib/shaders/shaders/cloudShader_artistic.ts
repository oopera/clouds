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

struct Samples {
  noise : vec4<f32>,
  detail_noise : vec4<f32>,
  blue_noise : vec4<f32>,
  coverage : vec4<f32>,
}

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(2) var<uniform> lightUniforms: LightUniforms;
@group(0) @binding(3) var noise_texture: texture_3d<f32>;
@group(0) @binding(4) var noise_sampler: sampler;
@group(0) @binding(5) var cloud_texture: texture_2d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;
@group(0) @binding(7) var bluenoise_texture: texture_2d<f32>;
@group(0) @binding(8) var bluenoise_sampler: sampler;
@group(0) @binding(9) var detail_texture: texture_3d<f32>;
@group(0) @binding(10) var detail_sampler: sampler;


const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const sphere_radius: f32 = 5.0;
const cube_offset: f32 = 0.25;

const layer_1_offset = 0.03; 
const layer_2_offset = 0.17;
const layer_3_offset = 0.22;

const layer_1_sphere_radius: f32 = sphere_radius + layer_1_offset;
const layer_2_sphere_radius: f32 = sphere_radius + layer_2_offset;
const layer_3_sphere_radius: f32 = sphere_radius + layer_3_offset;

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


// fn calculate_height(min_layer_sphere_offset: f32, max_layer_sphere_radius: f32, scaling_factor: f32, noise: f32, detail_noise: f32, blue_noise:f32) -> vec2<f32> {
//   var maxheight = ReMap(noise * scaling_factor, 0.0, 1.0, min_layer_sphere_offset, (max_layer_sphere_radius - sphere_radius));
//   maxheight = ReMap(pow(detail_noise, 4), 0, 1.0, maxheight,  (max_layer_sphere_radius - sphere_radius));
//   var minheight = ReMap(1 - detail_noise, 0.0, 1.0, 0.0, 0.25);
//   minheight = ReMap(minheight, 0.0, 1, min_layer_sphere_offset, (max_layer_sphere_radius - sphere_radius));
//   return vec2<f32>(minheight, maxheight);
// }

fn calculate_height(min_layer_sphere_radius: f32, max_layer_sphere_radius: f32, noise: vec4<f32>, detail_noise: vec4<f32>, coverage: f32, percent_height: f32, scaling_factor: f32) -> vec2<f32> {
  var shape_noise: f32;

  if(scaling_factor == 1){
    shape_noise  = noise.g * 0.625 + noise.b * 0.25 + noise.a * 0.125;
  }else if(scaling_factor == 2){
    shape_noise  = noise.b * 0.625 + noise.g * 0.25 + noise.a * 0.125;
  }else if(scaling_factor == 3){
    shape_noise  = noise.a * 0.625 + noise.b * 0.25 + noise.g * 0.125;
  }
  shape_noise = -(1 - shape_noise);
  shape_noise = ReMap(noise.r, shape_noise, 1.0, 0.0, 1.0);

  var detail: f32;

  if(scaling_factor == 1){
    detail = detail_noise.r * 0.625 + detail_noise.g * 0.25 + detail_noise.b * 0.125;
  }else if(scaling_factor == 2){
    detail = detail_noise.r * 0.625 + detail_noise.r * 0.25 + detail_noise.b * 0.125;
  }else if(scaling_factor == 3){
    detail = detail_noise.r * 0.625 + detail_noise.g * 0.25 + detail_noise.r * 0.125;
  }

  var detail_modifier: f32 = lerp(detail, 1.0 - detail, saturate(percent_height));
  detail_modifier = detail_modifier * coverage;
  var final_density: f32 = ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0);

  var maxheight = ReMap(pow(final_density, 1.0), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));
  let minheight = ReMap(ReMap(1 - final_density, 0.0, 1.0, 0.0, .5), 0.0, 1.0, min_layer_sphere_radius, (max_layer_sphere_radius - sphere_radius));

  return vec2<f32>(minheight, maxheight);
}

fn calculateStepLength(ro: vec3<f32>, rd: vec3<f32>) -> f32 {
  var closest_intersection: f32 = 9999999;
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


fn getSamples(inner_sphere_point:vec3<f32>, sphere_uv: vec2<f32>) -> Samples {
  var lod = calculate_lod();
  let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
  var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * lod);    
  var detail_noise = textureSample(detail_texture, detail_sampler, inner_sphere_point * lod * 2);
  var blue_noise = textureSample(bluenoise_texture, bluenoise_sampler, sphere_uv * lod);
  // var blue_noise = vec4<f32>(0.0, 0.0, 0.0, 0.0);

  return Samples(noise, detail_noise, blue_noise, coverage);
}


fn getDensity(current_point: vec3<f32>, distance_to_center: f32, distance_to_inner_sphere:f32, samples: Samples, reverse: bool) -> f32 {
  var distance_low = ReMap(length(sphere_center - current_point), layer_1_offset, layer_2_sphere_radius - sphere_radius, 0.0, 1.0);
  var offset_scale_low =(ReMap(distance_to_center, sphere_radius, layer_2_sphere_radius, 0.0, 1.0));
  var low: vec2<f32> = calculate_height(layer_1_offset, layer_2_sphere_radius,samples.noise, samples.noise, samples.coverage.r, distance_low, 1);
  
  var distance_middle = ReMap(length(sphere_center - current_point), layer_2_offset, layer_3_sphere_radius - sphere_radius, 0.0, 1.0);
  var offset_scale_middle =(ReMap(distance_to_center, sphere_radius, layer_3_sphere_radius, 0.0, 1.0));
  var middle: vec2<f32> = calculate_height(layer_2_offset, layer_3_sphere_radius, samples.noise, samples.detail_noise, samples.coverage.g, distance_middle, 2);
  
  var distance_high = ReMap(length(sphere_center - current_point), layer_3_offset, outer_sphere_radius - sphere_radius, 0.0, 1.0);
  var offset_scale_high =(ReMap(distance_to_center, sphere_radius, outer_sphere_radius, 0.0, 1.0));
  var high: vec2<f32> = calculate_height(layer_3_offset, outer_sphere_radius,samples.detail_noise, samples.detail_noise, samples.coverage.b, distance_high, 3);

  var offset_scale =(ReMap(distance_to_center, sphere_radius, outer_sphere_radius, 0.0, 1.0));

  if (distance_to_center < outer_sphere_radius && distance_to_center > sphere_radius) {
   if (distance_to_center > layer_3_sphere_radius) {
      if((distance_to_inner_sphere > high[0] && distance_to_inner_sphere < high[1] * samples.coverage.b)){
        return samples.coverage.b  * clamp(offset_scale_high, 0.5, 1.0);
      }
    } else if (distance_to_center > layer_2_sphere_radius) {
      if((distance_to_inner_sphere > middle[0] && distance_to_inner_sphere < middle[1] * samples.coverage.g)){
        return samples.coverage.g  *  clamp(offset_scale_middle, 0.5, 1.0);
      }
    } else if (distance_to_center > layer_1_sphere_radius) {
      if((distance_to_inner_sphere > low[0] && distance_to_inner_sphere < low[1] * samples.coverage.r)){
        return samples.coverage.r * clamp(offset_scale_low, 0.5, 1.0);
      }
    }
  }

  return 0.0;
}

const sun_color: vec3<f32> = vec3<f32>(0.89, 0.82, 0.90);
const cloud_beer: f32 = 0.7;

fn angleBetweenVectors(A: vec3<f32>, B: vec3<f32>) -> f32 {
  let dotProduct = dot(A, B);
  let magnitudeA = length(A);
  let magnitudeB = length(B);
  let cosTheta = dotProduct / (magnitudeA * magnitudeB);
  return acos(clamp(cosTheta, -1.0, 1.0));
}

const high_lod: f32 = 1.2;
const low_lod: f32 = 0.2;
const lod_distance_threshold: f32 = 8.5; 

fn calculate_lod() -> f32 {
    let distance = length(sphere_center - uni.cameraPosition.xyz);
    let lod = mix(high_lod, low_lod, clamp(distance / lod_distance_threshold, 0.0, 1.0));
    return lod;
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  var output_color: vec3<f32> = vec3<f32>(0.52, 0.53, 0.57);
  var highlight_color: vec3<f32> = vec3<f32>(0.09, 0.07, 0.12);

  let dotProduct = dot(lightUniforms.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  var light: f32 = 0.0;
  var sun_transmittance: f32 = 0.0;
  var sun_output: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var cloud_density: f32 = 0.0;

  let ray_origin = output.vPosition.xyz;
  let ray_direction = normalize(ray_origin - uni.cameraPosition.xyz);

  let steps = cloudUniforms.raymarchSteps;
  var step_length = calculateStepLength(ray_origin, ray_direction) / (steps);
  // var blue_noise = textureSample(bluenoise_texture, bluenoise_sampler, vec2(0.0, 0.0));

  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = output.vPosition.xyz + i * ray_direction * step_length;
    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
  
    let sphere_uv = vec2<f32>(
      0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
      0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
    );

    var samples: Samples = getSamples(inner_sphere_point, sphere_uv);
    cloud_density += clamp(getDensity(current_point, distance_to_center, length(current_point - inner_sphere_point), samples, true) * cloudUniforms.density, 0.0, 1.0);
  

    for(var k: f32 = 0.0; k < 2.0; k += 1.0){
      light = 0;
      let sun_ray_direction = normalize(current_point + lightUniforms.lightPosition);
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;
      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
  
      let sphere_uv = vec2<f32>(
        0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
        0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
      );
    
      var samples: Samples = getSamples(inner_sphere_point, sphere_uv);
      let distance_to_inner_sphere = length(sun_point - inner_sphere_point);
      var theta = angleBetweenVectors(ray_direction, sun_ray_direction);
      light += rayleighScattering(theta) * lightUniforms.rayleighIntensity + samples.blue_noise.r * 0.05;

        var lightclamp: vec2<f32>; 

        if(lightUniforms.lightType == 1){
          lightclamp = vec2(0.3,1.0);
        }else if(lightUniforms.lightType == 0.5){
          lightclamp = vec2(1.0, 1.0); 
        }else if(lightUniforms.lightType == 0){
          lightclamp = vec2(0.3, 0.3);
        }

      if(cloud_density < 1.25){
        sun_transmittance += clamp(getDensity(sun_point, distance_to_center, distance_to_inner_sphere, samples, false), 0.0, 1.0) * cloudUniforms.sunDensity * clamp(lightness, lightclamp[0], lightclamp[1]);
      }
    }
  } 
  output_color += sun_transmittance * highlight_color  * light;
  return vec4<f32>(output_color, cloud_density * cloudUniforms.visibility);
  }
`;
