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
@group(0) @binding(5) var detail_noise_texture: texture_3d<f32>; 
@group(0) @binding(6) var detail_noise_sampler: sampler;
@group(0) @binding(7) var cloud_texture: texture_2d<f32>;
@group(0) @binding(8) var cloud_sampler: sampler;
@group(0) @binding(9) var bluenoise_texture: texture_2d<f32>;
@group(0) @binding(10) var bluenoise_sampler: sampler;
@group(0) @binding(11) var curlnoise_texture: texture_2d<f32>;
@group(0) @binding(12) var curlnoise_sampler: sampler;


const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const sphere_radius: f32 = 20.0;
const cube_offset: f32 = 0.5; 
const cube_partial = cube_offset / 10;

const layer_1_offset = cube_partial * 0.5; 
const layer_1_buffer = cube_partial * 4;
const layer_2_offset = cube_partial * 4.5;
const layer_2_buffer = cube_partial * 6.5;
const layer_3_offset = cube_partial * 9;

const layer_1_sphere_radius: f32 = sphere_radius + layer_1_offset;
const layer_2_sphere_radius: f32 = sphere_radius + layer_2_offset;
const layer_3_sphere_radius: f32 = sphere_radius + layer_3_offset;

const outer_sphere_radius: f32 = sphere_radius + cube_offset;

const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

// Define the constants
const cloud_inscatter: f32 = 0.27;
const cloud_silver_intensity: f32 = 0.2;
const cloud_silver_exponent: f32 = 0.0;
const cloud_outscatter: f32 = 0.45;
const cloud_in_vs_outscatter: f32 = 0.8;
const cloud_beer: f32 = 0.25;
const cloud_attuention_clampval: f32 = 0.05;
const cloud_outscatter_ambient: f32 = 0.8;
const cloud_ambient_minimum: f32 = 0.7;


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

fn CalculateLight(
    density: f32, 
    density_to_sun: f32, 
    cos_angle: f32, 
    percent_height: f32, 
    bluenoise: f32, 
    dist_along_ray: f32
    ) -> f32 {
    let attenuation_prob = Attenuation(density_to_sun, cos_angle);
    let ambient_out_scatter = OutScatterAmbient(density, percent_height);
    let sun_highlight = InOutScatter(cos_angle);
    var attenuation = attenuation_prob * sun_highlight * ambient_out_scatter;
    attenuation = max(density * cloud_ambient_minimum * (1.0 - pow(saturate(dist_along_ray / 4000.0), 2.0)), attenuation);
    attenuation += bluenoise * 0.003;
    let ret_color = vec3<f32>(attenuation * sun_color.x, attenuation * sun_color.y, attenuation * sun_color.z);
    return attenuation;
}


fn InOutScatter(cos_angle: f32) -> f32 {
    let first_hg = HG(cos_angle, cloud_inscatter);
    let second_hg = cloud_silver_intensity * pow(saturate(cos_angle), cloud_silver_exponent);
    let in_scatter_hg = max(first_hg, second_hg);
    let out_scatter_hg = HG(cos_angle, -cloud_outscatter);
    return lerp(in_scatter_hg, out_scatter_hg, cloud_in_vs_outscatter);
}

fn Attenuation(density_to_sun: f32, cos_angle: f32) -> f32 {
    let prim = exp(-cloud_beer * density_to_sun);
    let scnd = exp(-cloud_beer * cloud_attuention_clampval) * 0.7;
    let checkval = ReMap(cos_angle, 0.0, 1.0, scnd, scnd * 0.5);
    return max(checkval, prim);
}

fn OutScatterAmbient(density: f32, percent_height: f32) -> f32 {
    let depth = cloud_outscatter_ambient * pow(density, ReMap(percent_height, 0.3, 0.9, 0.5, 1.0));
    let vertical = pow(saturate(ReMap(percent_height, 0.0, 0.3, 0.8, 1.0)), 0.8);
    var out_scatter = depth * vertical;
    out_scatter = 1.0 - saturate(out_scatter);
    return out_scatter;
}

fn angleBetweenVectors(A: vec3<f32>, B: vec3<f32>) -> f32 {
  let dotProduct = dot(A, B);
  let magnitudeA = length(A);
  let magnitudeB = length(B);
  let cosTheta = dotProduct / (magnitudeA * magnitudeB);
  return acos(clamp(cosTheta, -1.0, 1.0));
}


fn getNoise(noise:vec4<f32>, layer:f32) -> f32{
  if(layer == 1){
    return noise.g ;
  }else if(layer == 2){
    return noise.b ;
  }else if(layer == 3){
    return noise.a ;
  }
  return 0.0;
}


fn HeightAlter(percent_height: f32, coverage: f32) -> f32 {
    var ret_val: f32 = saturate(ReMap(percent_height, 0.0, 0.07, 0.0, 1.0));
    let stop_height: f32 = saturate(coverage);
    ret_val *= saturate(ReMap(percent_height, stop_height * 0.2, stop_height, 1.0, 0.0));
    ret_val = pow(ret_val, saturate(ReMap(percent_height, 0.65, 0.95, 1.0, 1.0 )));
    return ret_val;
}

fn DensityAlter(percent_height: f32, coverage: f32) -> f32 {
    var ret_val: f32 = percent_height;
    ret_val *= saturate(ReMap(percent_height, 0.0, 0.2, 0.0, 1.0));
    ret_val *= coverage * 2.0;
    ret_val *= saturate(ReMap(pow(percent_height, 0.5), 0.4, 0.95, 1.0, 0.2));
    ret_val *= saturate(ReMap(percent_height, 0.9, 1.0, 1.0, 0.0));
    return ret_val;
}

fn getDensity(noise: vec4<f32>, detail_noise: vec4<f32>,  curl_noise: vec4<f32>, percent_height: f32, layer: f32, coverage: f32) -> f32{
  var shape_noise: f32 = getNoise(noise, layer);
  var detail: f32;

  detail = detail_noise.r * 0.625 + detail_noise.g * 0.25 + detail_noise.b * 0.125;

  shape_noise = -(1 - shape_noise);
  shape_noise = ReMap(noise.r, shape_noise, 1.0, 0.0, 1.0);

  var detail_modifier: f32 = lerp(detail_noise.r, 1.0 - detail_noise.r, saturate(percent_height));
  detail_modifier = ReMap(detail_modifier, 0.0, 1.0, 0.0, 1.0);
  var final_density: f32 = saturate(ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0));

  return pow(final_density, 1 + (layer * 0.2)) * coverage * DensityAlter(percent_height, coverage) * HeightAlter(percent_height, coverage);
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


const high_lod: f32 = 0.5;
const low_lod: f32 = 0.5;
const lod_distance_threshold: f32 = 35; 

fn getLod() -> f32 {
    let distance = length(sphere_center - uni.cameraPosition.xyz);
    let lod = mix(high_lod, low_lod, clamp(distance / lod_distance_threshold, 0.0, 1.0));
    return lod;
}


fn getScale(distance_to_center: f32, layer:f32) -> f32{
  var altitude = distance_to_center - sphere_radius;

   if(layer == 1){
      return ReMap(altitude, layer_1_offset, layer_1_buffer, 0.0, 1.0);
    }else if(layer == 2){
      return ReMap(altitude, layer_2_offset, layer_2_buffer, 0.0, 1.0);
    }else if(layer == 3){
      return ReMap(altitude, layer_3_offset, cube_offset, 0.0, 1.0);
    }
  return 0.0;
}

fn getLayer(inner_sphere_point: vec3<f32>) -> f32{
  var distance_to_center = length(inner_sphere_point - sphere_center);
  var altitude = distance_to_center - sphere_radius;

  if (distance_to_center < outer_sphere_radius && distance_to_center > sphere_radius) {
    if (altitude < cube_offset && altitude > layer_3_offset) {
      return 3.0;
    } else if (altitude < layer_2_buffer && altitude > layer_2_offset) {
      return 2.0;
    } else if (altitude < layer_1_buffer && altitude > layer_1_offset) {
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

fn getSamples(inner_sphere_point:vec3<f32>, sphere_uv: vec2<f32>) -> Samples {
  var lod = getLod();
  let coverage = textureSample(cloud_texture, cloud_sampler, sphere_uv);
  var noise = textureSample(noise_texture, noise_sampler, inner_sphere_point  * lod);    
  var detail_noise = textureSample(detail_noise_texture, detail_noise_sampler, inner_sphere_point * lod);
  var blue_noise = textureSample(bluenoise_texture, bluenoise_sampler, sphere_uv);
  var curl_noise = textureSample(curlnoise_texture, curlnoise_sampler, sphere_uv);
  return Samples(noise, detail_noise, blue_noise, curl_noise, coverage);
}

fn getSphereUV(inner_sphere_point: vec3<f32>) -> vec2<f32> {
  return vec2<f32>(
    0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
    0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
  );
}

// fn hash33(p: vec3<f32>) -> f32 {
//     var q: f32 = p * 987654.321;
//     q = vec3<f32>(q.x + q.y + q.z) * vec3<f32>(987654.321, 123456.789, 192837.465);
//     return -1.0 + 2.0 * q / 4294967295.0;
// }

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



  const highlight_color: vec3<f32> = vec3<f32>(0.09, 0.07, 0.12);
  const sun_color: vec3<f32> = vec3<f32>(0.8, 0.8, 0.9);
  const moon_color: vec3<f32> = vec3<f32>(0.4, 0.5, 0.7);
  const base_color: vec3<f32> = vec3<f32>(0.62, 0.63, 0.77);



@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  var output_color: vec3<f32> = vec3<f32>(0.52, 0.53, 0.57);
  var light: f32 = 0.0;
  var sun_transmittance: f32 = 0.0;
  var sun_output: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var cloud_density: f32 = 0.0;

  let ray_origin = output.vPosition.xyz;
  let ray_direction = normalize(ray_origin - uni.cameraPosition.xyz);

  let steps = cloudUniforms.raymarchSteps;
  var step_length = calculateStepLength(ray_origin, ray_direction) / (steps);


  var transmittance:f32 = 1;
  var light_energy:f32 = 0.0;
  var cur_transmittance: f32 = 0;

  var current_point: vec3<f32> = output.vPosition.xyz; 
  
  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    // current_point += (clamp(1 - cur_transmittance, 0.1, (1.0 - (clamp(cur_transmittance * 25, 0.0, 0.75)))))  * ray_direction * step_length;
  current_point += (clamp(1 - cur_transmittance, 0.1, 1.0))  * ray_direction * step_length;

    let distance_to_center = length(current_point - sphere_center);
    let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
    let sphere_uv = getSphereUV(inner_sphere_point);

    var layer = getLayer(current_point);
    var samples: Samples = getSamples(current_point, sphere_uv);
    var scale = getScale(distance_to_center, layer);
    var coverage = getCoverage(layer, samples.coverage);
    var density = getDensity(samples.noise, samples.detail_noise, samples.curl_noise, scale, 1, coverage);

    cur_transmittance = density * cloudUniforms.density;

    cloud_density += cur_transmittance;

    var sun_density: f32 = 0.0;
    var sun_transmittance: f32 = 1.0;
    var light: f32 = 0.0;
    
    let dotProduct = dot(lightUniforms.lightPosition, current_point);
    let scaledDotProduct: f32 = dotProduct * 1.0;
    var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

    for(var k: f32 = 0.0; k < 1.0; k += 1.0){
      let moonposition = vec3<f32>(-lightUniforms.lightPosition.x, -lightUniforms.lightPosition.y, -lightUniforms.lightPosition.z);
      
      var sundirection = normalize(lightUniforms.lightPosition - current_point);
      var moondirection = normalize(moonposition - current_point);

      var thetaA = angleBetweenVectors(ray_direction, sundirection);
      var thetaB = angleBetweenVectors(ray_direction, moondirection);

      let combinedcos = thetaA * lightness + thetaB * (1.0 - lightness);

      var light_position: vec3<f32>;

      if(lightness > 0.5){
        light_position = lightUniforms.lightPosition;
      }else{
        light_position = moonposition;
      }

      let sun_ray_direction = normalize(current_point - light_position);
      let sun_point: vec3<f32> = current_point + k * sun_ray_direction * step_length;

      let distance_to_center = length(sun_point - sphere_center);
      let inner_sphere_point = sphere_center + normalize(sun_point - sphere_center) * sphere_radius;
      let sphere_uv = getSphereUV(inner_sphere_point);
    
      var samples: Samples = getSamples(sun_point, sphere_uv);
      let distance_to_inner_sphere = length(sun_point - inner_sphere_point);

      if(lightUniforms.lightType == 1){
        lightness = 1.0;
      }else if(lightUniforms.lightType == 0.5){
        lightness = clamp(lightness, 0.8, 1.0);
      }else if(lightUniforms.lightType == 0){
        lightness = 0.8;
      }

      var layer = getLayer(sun_point);
      var scale = getScale(distance_to_center, layer);


      if(1 - transmittance < 1 && cur_transmittance > 0.005){
        sun_density += getDensity(samples.noise, samples.detail_noise,  samples.curl_noise,  scale, layer, coverage) * cloudUniforms.sunDensity + samples.blue_noise.r * 0.01;
        light += CalculateLight(cur_transmittance, sun_density, combinedcos, scale, samples.blue_noise.r, step_length) * lightUniforms.rayleighIntensity * lightness;
        // light += mieScattering(combinedcos) * lightUniforms.rayleighIntensity;
      }
    }
      sun_transmittance = exp(-sun_density * cloudUniforms.sunDensity);
      var darkness = lightness + sun_transmittance * (1 - lightness);
      light_energy += cloud_density * darkness * light * transmittance; 
      transmittance *= exp(-cloud_density * cloudUniforms.density);
    } 

    var cloud_color = light_energy * sun_color;
    output_color += base_color * transmittance + cloud_color;

    return vec4<f32>(output_color, (1 - transmittance) * cloudUniforms.visibility);
  }



