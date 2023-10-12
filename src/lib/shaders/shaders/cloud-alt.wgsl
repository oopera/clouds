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
  detail_noise: vec4<f32>,
  blue_noise : vec4<f32>,
  curl_noise: vec4<f32>,
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
@group(0) @binding(9) var curlnoise_texture: texture_2d<f32>;
@group(0) @binding(10) var curlnoise_sampler: sampler;



const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const sphere_radius: f32 = 20.0;
const cube_offset: f32 = 0.3;

const layer_1_offset = 0.03; 
const layer_1_buffer = 0.14;
const layer_2_offset = 0.16;
const layer_2_buffer = 0.22;
const layer_3_offset = 0.23;

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
  let val: f32 = (1.0 - g2) / (pow(1.0 + g2 - 2.0 * g * cos_angle, 1.5)) / (4.0 * PI);
  return val;
}

fn mieScattering(theta: f32) -> f32 {
  return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}
fn rayleighScattering(theta: f32) -> f32 {
  return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
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


fn angleBetweenVectors(A: vec3<f32>, B: vec3<f32>) -> f32 {
  let dotProduct = dot(A, B);
  let magnitudeA = length(A);
  let magnitudeB = length(B);
  let cosTheta = dotProduct / (magnitudeA * magnitudeB);
  return acos(clamp(cosTheta, -1.0, 1.0));
}

fn getDensity(noise: vec4<f32>, detail_noise: vec4<f32>, curl_noise: vec4<f32>,  percent_height: f32, layer: f32) -> f32{
  var shape_noise: f32;
  var detail: f32;

  if(layer == 1){
    shape_noise  = noise.g * 0.625 + noise.b * 0.25 + noise.a * 0.125;
    detail = detail_noise.r * 0.625 + detail_noise.g * 0.25 + detail_noise.a * 0.125;
  }else if(layer == 2){
    shape_noise  = noise.b * 0.625 + noise.g * 0.25 + noise.a * 0.125;
    detail = detail_noise.r * 0.625 + detail_noise.g * 0.25 + detail_noise.a * 0.125;
  }else if(layer == 3){
    shape_noise  = noise.a * 0.625 + noise.b * 0.25 + noise.g * 0.125;
    detail = detail_noise.r * 0.625 + detail_noise.g * 0.25 + detail_noise.a * 0.125;
  }

  shape_noise = -(1 - shape_noise);
  shape_noise = ReMap(noise.r, shape_noise, 1.0, 0.0, 1.0);

  var detail_modifier: f32 = lerp(detail, 1.0 - detail, saturate(percent_height));
  detail_modifier = detail_modifier;
  var final_density: f32 = saturate(ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0));

  return pow(final_density, 1 + (layer * 0.2));
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



const high_lod: f32 = 2;
const low_lod: f32 = 1.0;
const lod_distance_threshold: f32 = 25; 

fn getLod() -> f32 {
    let distance = length(sphere_center - uni.cameraPosition.xyz);
    let lod = mix(high_lod, low_lod, clamp(distance / lod_distance_threshold, 0.0, 1.0));
    return lod;
}


fn getScale(current_point: vec3<f32>, distance_to_center: f32, layer:f32) -> f32{
  var offset_scale_low =(ReMap(distance_to_center, sphere_radius, layer_2_sphere_radius, 0.0, 1.0));
  var offset_scale_middle =(ReMap(distance_to_center, sphere_radius, layer_3_sphere_radius, 0.0, 1.0));
  var offset_scale_high =(ReMap(distance_to_center, sphere_radius, outer_sphere_radius, 0.0, 1.0));

   if(layer == 3){
      return offset_scale_high;
    }else if(layer == 2){
      return offset_scale_middle;
    }else if(layer == 1){
      return offset_scale_low;
    }
  
  
  return 0.0;
}

fn getLayer(inner_sphere_point: vec3<f32>) -> f32{
  var distance_to_center = length(inner_sphere_point - sphere_center);

  if (distance_to_center < outer_sphere_radius && distance_to_center > sphere_radius) {
    if (distance_to_center > layer_3_sphere_radius) {
      return 3.0;
    } else if (distance_to_center > layer_2_sphere_radius) {
      return 2.0;
    } else if (distance_to_center > layer_1_sphere_radius) {
      return 1.0;
    }
  }
  return 0.0;
}

fn getCoverage(layer: f32, coverage: vec4<f32>) -> f32 {

  if(layer == 1){
    return coverage.r;
  }else if(layer == 2){
    return coverage.g;
  }else if(layer == 3){
    return coverage.b;
  }

  return 0.0;
}

fn getSamples(inner_sphere_point:vec3<f32>, sphere_uv: vec2<f32>, layer: f32) -> Samples {
  var lod = getLod();
  let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
  var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * lod * clamp(1 - getCoverage(layer, coverage), 0.5, 1.0));    
  // var detail_noise = textureSample(noise_texture, noise_sampler, inner_sphere_point * lod * 0.5 * clamp(1 - getCoverage(layer, coverage), 0.5, 1.0));
  var blue_noise = textureSample(bluenoise_texture, bluenoise_sampler, sphere_uv * lod);
  var curl_noise = textureSample(curlnoise_texture, curlnoise_sampler, sphere_uv);

  return Samples(noise, noise, blue_noise, curl_noise, coverage);
}

fn getSphereUV(inner_sphere_point: vec3<f32>) -> vec2<f32> {
  return vec2<f32>(
    0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
    0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
  );
}

fn beersLaw(density: f32, transmittance: f32, distance: f32) -> f32 {
  return exp(-density * transmittance * distance);
} 



@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let base_color: vec3<f32> = vec3<f32>(0.32, 0.33, 0.37);
  var output_color: vec3<f32>;
  var highlight_color: vec3<f32> = vec3<f32>(0.09, 0.07, 0.1);
  var sun_color: vec3<f32> = vec3<f32>(1, 0.8, 0.7);
  var light: f32 = 0.0;
  var sun_output: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var cloud_density: f32 = 0.0;

  let ray_origin = output.vPosition.xyz;
  let ray_direction = normalize(ray_origin - uni.cameraPosition.xyz);

  let steps = cloudUniforms.raymarchSteps;
  var step_length = calculateStepLength(ray_origin, ray_direction) / (steps);
  var transmittance:f32 = 1;
  var light_energy:f32 = 0.0;

  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = output.vPosition.xyz + i * ray_direction * step_length;
    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
    let sphere_uv = getSphereUV(inner_sphere_point);

    var layer = getLayer(current_point);
    var samples: Samples = getSamples(inner_sphere_point, sphere_uv, layer);
    var density = getDensity(samples.noise, samples.detail_noise,samples.curl_noise, length(current_point - inner_sphere_point), layer);

    cloud_density += density * getCoverage(layer, samples.coverage) * cloudUniforms.density;

    var sun_density: f32 = 0.0;
    var sun_transmittance: f32 = 1.0;
    var light: f32 = 0.0;

    for(var k: f32 = 0.0; k < 2.0; k += 1.0){
      let sun_ray_direction = normalize(current_point + lightUniforms.lightPosition);
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;

      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
      let sphere_uv = getSphereUV(inner_sphere_point);
    
      let distance_to_inner_sphere = length(sun_point - inner_sphere_point);
      var theta = angleBetweenVectors(ray_direction, sun_ray_direction);

      let dotProduct = dot(lightUniforms.lightPosition, sun_point);
      let scaledDotProduct: f32 = dotProduct * 1.0;
      var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

      var lightclamp: vec2<f32> = vec2<f32>(0.7, 1.0); 

      if(lightUniforms.lightType == 1){
        lightclamp = vec2(1.0,1.0);
      }else if(lightUniforms.lightType == 0.5){
        lightclamp = vec2(0.5, 1.0); 
      }else if(lightUniforms.lightType == 0){
        lightclamp = vec2(0.5, 0.5);
      }

      var layer = getLayer(sun_point);
      var samples: Samples = getSamples(inner_sphere_point, sphere_uv, layer);
      var scale = getScale(sun_point, distance_to_center, layer);
      
      if(cloud_density > 0.0 && cloud_density < 1.5){
        light += mieScattering(theta) * lightUniforms.rayleighIntensity * 5 + samples.blue_noise.r * 0.05;
        sun_density += getDensity(samples.noise, samples.detail_noise, samples.curl_noise,  scale, layer) * getCoverage(layer, samples.coverage) * clamp(lightness, lightclamp[0], lightclamp[1]);
      }
    }

      sun_transmittance = exp(-sun_density * cloudUniforms.sunDensity);
      var darknessThres = 0.5;
      var darkness = darknessThres + sun_transmittance * 0.5;
      light_energy += cloud_density * step_length * darkness * light * transmittance; 
      transmittance *= exp(-density * cloudUniforms.density * step_length);

  } 
    var cloud_color = light_energy * sun_color;

    output_color = base_color * transmittance + cloud_color;
    return vec4<f32>(output_color, cloud_density * cloudUniforms.visibility);
  }

