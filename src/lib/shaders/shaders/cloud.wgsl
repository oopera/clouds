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
  atmoVisibility: f32,
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
}

struct SunRaymarchOutput {
  sun_density: f32,
  light: vec3<f32>,
};

struct RaymarchOutput {
  light: vec3<f32>,
  transmittance: f32,
};

struct CloudVariables {
  altitude: f32,
  layer: f32,
  scale: f32,
};


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


const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const sphere_radius: f32 = 20.0;
const sphere_offset: f32 = 0.7 ; 

const cube_partial = sphere_offset / 9;

const layer_1_offset = cube_partial * 1; 
const layer_1_buffer = cube_partial * 4;
const layer_2_offset = cube_partial * 5;
const layer_2_buffer = cube_partial * 7;
const layer_3_offset = cube_partial * 8;

const layer_1_sphere_radius: f32 = sphere_radius + layer_1_offset;
const layer_2_sphere_radius: f32 = sphere_radius + layer_2_offset;
const layer_3_sphere_radius: f32 = sphere_radius + layer_3_offset;

const outer_sphere_radius: f32 = sphere_radius + sphere_offset;

const high_lod: f32 = 1;
const low_lod: f32 = 1;
const lod_distance_threshold: f32 = 35; 

const sun_color: vec3<f32> = vec3<f32>(0.8, 0.8, 0.9);
const moon_color: vec3<f32> = vec3<f32>(0.4, 0.5, 0.7);
const base_color: vec3<f32> = vec3<f32>(0.62, 0.63, 0.67);

const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

// Define the constants
const cloud_inscatter: f32 = 0.2;
const cloud_silver_intensity: f32 = 2.5;
const cloud_silver_exponent: f32 = 2.0;
const cloud_outscatter: f32 = 0.1;
const cloud_in_vs_outscatter: f32 = 0.5;
const cloud_beer: f32 = 6;
const cloud_attuention_clampval: f32 = 0.2;
const cloud_outscatter_ambient: f32 = 0.9;
const cloud_ambient_minimum: f32 = 0.2 ;


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
    dist_along_ray: f32,
    sun_color: vec3<f32>,
    ) -> vec3<f32> {

    let attenuation_prob = Attenuation(density_to_sun, cos_angle);
    let ambient_out_scatter = OutScatterAmbient(density, percent_height);
    let sun_highlight = InOutScatter(cos_angle);
    var attenuation = attenuation_prob * sun_highlight * ambient_out_scatter;
    attenuation = max(density * cloud_ambient_minimum * (1.0 - pow(saturate(dist_along_ray / 4000.0), 2.0)), attenuation);
    attenuation += bluenoise * 0.003;
    return sun_color * attenuation;
}

fn InOutScatter(cos_angle: f32) -> f32 {
    let first_hg = mieScattering(cos_angle) * cloud_inscatter;
    let second_hg = cloud_silver_intensity * pow(saturate(cos_angle), cloud_silver_exponent);
    let in_scatter_hg = max(first_hg, second_hg);
    let out_scatter_hg = rayleighScattering(cos_angle) * cloud_outscatter;
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


fn HeightAlter(percent_height: f32, coverage: f32) -> f32 {
    var ret_val: f32 = saturate(ReMap(percent_height, 0.0, 0.07, 0.0, 1.0));
    let stop_height: f32 = saturate(coverage - .12);
    ret_val *= saturate(ReMap(percent_height, stop_height * 0.2, stop_height, 1.0, 0.0));
    ret_val = pow(ret_val, saturate(ReMap(percent_height, 0.35, 0.85, 1.0, 1.0 )));
    return ret_val;
}

fn DensityAlter(percent_height: f32, coverage: f32) -> f32 {
    var ret_val: f32 = percent_height;
    ret_val *= saturate(ReMap(percent_height, 0.0, 0.2, 0.0, 1.0));
    ret_val *= coverage * 1.2;
    ret_val *= saturate(ReMap(pow(percent_height, 0.85), 0.4, 0.95, 1.0, 0.2));
    ret_val *= saturate(ReMap(percent_height, 0.9, 1.0, 1.0, 0.0));
    return ret_val;
}


fn getDensity(noise: vec4<f32>, detail_noise: vec4<f32>,  curl_noise: vec4<f32>, percent_height: f32, layer: f32, coverage: f32) -> f32{
  var shape_noise: f32 = saturate(pow( noise.g * 0.65 + noise.b * 0.25 + noise.a * 0.1 + 0.2, 1));
  var detail: f32 = pow( detail_noise.g * 0.25 + detail_noise.b * 0.15 + detail_noise.a * 0.1, 1.2 + (1 - coverage));

  shape_noise = -(1 - shape_noise);
  shape_noise = ReMap(noise.r, shape_noise, 1.0, 0.0, 1.0);
  // shape_noise *= HeightAlter(percent_height, coverage);

  var detail_modifier: f32 = lerp(detail, 1.0 - detail, saturate(percent_height * 2.0));

detail_modifier *= .35 * exp(-coverage * .75);
  var final_density: f32 = saturate(ReMap(shape_noise, detail_modifier, 1.0, 0.0, 1.0));

  // return coverage;


  return pow(final_density, 2) * DensityAlter(percent_height, coverage) * HeightAlter(percent_height, coverage);
}

fn isBlocked(ro: vec3<f32>, rd: vec3<f32>) -> f32 {

  var closest_intersection: f32 = 9999999;
  var oc: vec3<f32> = -ro;
  var b: f32 = dot(oc, rd);

  var c = dot(oc, oc) - sphere_radius * sphere_radius;
  var discriminant = b * b - c;

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


fn getLod() -> f32 {
    let distance = length(sphere_center - uni.cameraPosition.xyz);
    let lod = mix(high_lod, low_lod, clamp(distance / lod_distance_threshold, 0.0, 1.0));
    return lod;
}

fn getScale(altitude: f32, layer:f32) -> f32{
   if(layer == 1){
      return ReMap(altitude, layer_1_offset, layer_1_buffer, 0.0, 1.0);
    }else if(layer == 2){
      return ReMap(altitude, layer_2_offset, layer_2_buffer, 0.0, 1.0);
    }else if(layer == 3){
      return ReMap(altitude, layer_3_offset, sphere_offset, 0.0, 1.0);
    }
  return 0.0;
}

fn getLayer(altitude: f32) -> f32{
    if (altitude < sphere_offset && altitude > layer_3_offset) {
      return 3.0;
    } else if (altitude < layer_2_buffer && altitude > layer_2_offset) {
      return 2.0;
    } else if (altitude < layer_1_buffer && altitude > layer_1_offset) {
      return 1.0;
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

fn getSamples(inner_sphere_point:vec3<f32>, sphere_uv: vec2<f32>, layer: f32, coverage: f32) -> Samples {
  var lod = getLod();
  var noise = textureSampleLevel(noise_texture, noise_sampler, inner_sphere_point * lod * (1 + layer * 0.2) * clamp(1 - coverage, 0.7, 1.0), 0);    
  var detail_noise = textureSampleLevel(detail_noise_texture, detail_noise_sampler, inner_sphere_point * lod * (0.5 + layer * 0.2) * clamp(1 - coverage, 0.7, 1.0), 0);
  var blue_noise = textureSampleLevel(bluenoise_texture, bluenoise_sampler, sphere_uv, 0);
  return Samples(noise, detail_noise, noise, blue_noise);
}

fn getSphereUV(current_point: vec3<f32>) -> vec2<f32> {
  let inner_sphere_point = sphere_center + normalize(current_point - sphere_center) * sphere_radius;
  return vec2<f32>(
    0.5 + atan2(inner_sphere_point.z - sphere_center.z, inner_sphere_point.x - sphere_center.x) / (2.0 * PI),
    0.5 - asin((inner_sphere_point.y - sphere_center.y) / sphere_radius) / PI
  );
}

fn calculateLightness(current_point: vec3<f32>, light_position: vec3<f32>, scale: f32) -> f32 {
    let dotProduct = dot(light_position, current_point);
    return 1.0 - (1.0 / (1.0 + exp(-dotProduct * scale)));
}

fn calculateCloudVariables(current_point: vec3<f32>, sphere_center: vec3<f32>, sphere_radius: f32) -> CloudVariables {
  let distance_to_center = length(current_point - sphere_center);
  let altitude = distance_to_center - sphere_radius;
  let layer = getLayer(altitude);
  let scale = getScale(altitude, layer);
  return CloudVariables(altitude, layer, scale);
}


fn sunRaymarch(current_point: vec3<f32>, ray_direction: vec3<f32>, cloud_density: f32, step_length: f32, lightness: f32) -> SunRaymarchOutput {

  var sun_density: f32 = 0.0;
  var light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var light_position: vec3<f32>;
  let moonposition = vec3<f32>(-lightUniforms.lightPosition.x, -lightUniforms.lightPosition.y, -lightUniforms.lightPosition.z);
        

  if(lightness >= 0.5 || lightUniforms.lightType == 1){
    light_position = lightUniforms.lightPosition;
  }else if (lightness < 0.5 || lightUniforms.lightType == 0){
    light_position = moonposition;
  }

  var sundirection = normalize(lightUniforms.lightPosition - current_point);
  var moondirection = normalize(moonposition - current_point);

  var thetaA = angleBetweenVectors(ray_direction, sundirection);
  var thetaB = angleBetweenVectors(ray_direction, moondirection);

  let sun_ray_direction = normalize(current_point - light_position);
  var sun_point = current_point;


  // let distance = isBlocked(sundirection, current_point);

  // if(distance > 0.0){
  //   return SunRaymarchOutput(sun_density, light);
  // }
  
  var angle: f32;
  var sun_lightness: f32 = calculateLightness(sun_point, lightUniforms.lightPosition, 20);

  if(lightUniforms.lightType == 1){
    angle = 0.5;
    sun_lightness = 1.0;
  }else if(lightUniforms.lightType == 0.5){
    angle = 0.5;
    sun_lightness = clamp(lightness, 0.5, 1.0);
  }else if(lightUniforms.lightType == 0){
    angle = 0.5;
    sun_lightness = 0.5;
  }

  for(var k: f32 = 0.0; k <= 1.0; k += 1.0) {
        sun_point += sun_ray_direction * step_length;

        let sphere_uv = getSphereUV(sun_point);
        let cloud_variables: CloudVariables = calculateCloudVariables(sun_point, sphere_center, sphere_radius);
        var coverage = getCoverage(cloud_variables.layer, textureSampleLevel(cloud_texture, cloud_sampler, sphere_uv, 0));
        
        if(coverage > 0.05){
          var samples: Samples = getSamples(sun_point, sphere_uv, cloud_variables.layer, coverage);
          var new_sun_color = mix(moon_color, sun_color, sun_lightness);
          var density = getDensity(samples.noise, samples.detail_noise, samples.curl_noise, cloud_variables.scale, cloud_variables.layer, coverage);
          sun_density += density;

          if(sun_density > 0.05){
            light += mieScattering(angle) * lightUniforms.rayleighIntensity * sun_lightness;
            // light += CalculateLight(cloud_density, sun_density, angle, 1 - cloud_variables.scale, samples.blue_noise.r, 1, new_sun_color) * lightUniforms.rayleighIntensity * sun_lightness;  
          }
        }
  }
  
  return SunRaymarchOutput(sun_density, light);
}


fn raymarch(ray_origin: vec3<f32>, ray_direction: vec3<f32>) -> RaymarchOutput {

  var max_length: f32 = calculateStepLength(ray_origin, ray_direction);
  var step_length = cloudUniforms.raymarchSteps;
  var current_point: vec3<f32> = ray_origin; 

  var light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var transmittance: f32 = 1.0;
  var density: f32 = 0.0;
  var distance: f32 = 0.0;

  if(max_length == 0){
      return RaymarchOutput(vec3(0.0, 0.0, 0.0), 1.0);
  }


  while(distance <= max_length){
      var cur_step_length: f32;

      if(density > 0.05){
        cur_step_length = step_length / 2 * (distance  + 1);
      }else{
        cur_step_length = step_length * (distance + 1);
      }

      var remapped_step_length = ReMap(cur_step_length, 0.0, step_length, 0.0, 1.0);
      
      current_point += ray_direction * cur_step_length;
      distance += cur_step_length;

      let sphere_uv = getSphereUV(current_point);
      let cloud_variables: CloudVariables = calculateCloudVariables(current_point, sphere_center, sphere_radius);
      var coverage = getCoverage(cloud_variables.layer, textureSampleLevel(cloud_texture, cloud_sampler, sphere_uv, 0));
    
      if(coverage > 0.05){

        var samples: Samples = getSamples(current_point, sphere_uv, cloud_variables.layer, coverage);
        density = getDensity(samples.noise, samples.detail_noise, samples.curl_noise, cloud_variables.scale, cloud_variables.layer, coverage) * cloudUniforms.density * 2;

          if(density > 0.05){
            var lightness = calculateLightness(current_point, lightUniforms.lightPosition, 1);
            let sunRaymarchOutput = sunRaymarch(current_point, ray_direction, density, cur_step_length, lightness);
            // light += sunRaymarchOutput.light; 

            // CALCULATIONS USED FOR BASIC LIGHTING MODEL

            var light_direction = normalize(lightUniforms.lightPosition - current_point);
            let phaseVal = mieScattering(angleBetweenVectors(ray_direction, light_direction)) * lightUniforms.rayleighIntensity;
            var sun_density = sunRaymarchOutput.sun_density;
            var atmo_intensity = exp(-sun_density * cloudUniforms.sunDensity);
            light += atmo_intensity * density * transmittance * sunRaymarchOutput.light * sunRaymarchOutput.light * 10;

            transmittance *= exp(-density);
            if(transmittance < 0.01){
                break;
            }
          }
        }
      
    } 

  return RaymarchOutput(light, transmittance);
}

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;
  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * sphere_offset, 0.0);
  let worldPosition: vec4<f32> = mPosition + displacement;
  
  output.Position = uni.viewProjectionMatrix * worldPosition;
  output.vPosition = worldPosition;
  output.vNormal = normalize(uni.normalMatrix * input.normal);
  output.vUV = input.uv;
  return output;
} 


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  var base_color: vec3<f32> = vec3<f32>(0.5, 0.5, 0.5);
  let ray_origin = output.vPosition.xyz;
  let ray_direction = normalize(ray_origin - uni.cameraPosition.xyz);

  // Cloud raymarching
  let cloudValues: RaymarchOutput = raymarch(ray_origin, ray_direction);

  var cloud_color =  cloudValues.light + base_color; 

  var cloud_transmittance = clamp(cloudValues.transmittance, 0.0, 1.0);

  // Atmosphere raymarching
  let atmoValues: RayMarchAtmoOutput = atmoraymarch(ray_origin, ray_direction);
  var atmo_color =  atmoValues.light;
  var atmo_transmittance = atmoValues.transmittance;

  // Blending
  var blended_color = cloud_color * cloudUniforms.visibility * (1.0 - cloud_transmittance);
  blended_color += atmo_color * (cloud_transmittance + (1 - cloudUniforms.visibility)) * cloudUniforms.atmoVisibility;
  var blended_transmittance: f32;

  blended_transmittance = clamp(cloud_transmittance + (1 - cloudUniforms.visibility), 0.0, 1.0) * clamp(atmo_transmittance + (1 - cloudUniforms.atmoVisibility), 0.0, 1.0);

  return vec4<f32>(blended_color, (1.0 - blended_transmittance));
}


struct RayMarchAtmoOutput {
    light: vec3<f32>,
    transmittance: f32,
};


fn atmoRay(point: vec3<f32>, sun_direction: vec3<f32>) -> vec3<f32> {
    let scattering_coeff = vec3<f32>(0.002, 0.003, 0.004); 
    let dot_product = dot(point, sun_direction);
    return scattering_coeff * max(dot_product, 0.0);
}


fn atmoraymarch(ray_origin: vec3<f32>, ray_direction: vec3<f32>) -> RayMarchAtmoOutput {
    var current_point: vec3<f32> = ray_origin; 
    var max_length: f32 = calculateStepLength(ray_origin, ray_direction);
    var step_length = 1 / (20.0 * cloudUniforms.sunDensity);

    var light_position: vec3<f32>;
    let moonposition = vec3<f32>(-lightUniforms.lightPosition.x, -lightUniforms.lightPosition.y, -lightUniforms.lightPosition.z);
    var lightness = calculateLightness(current_point, lightUniforms.lightPosition, 2);

    if( lightUniforms.lightType == 1){
      light_position = lightUniforms.lightPosition;
    }else if (lightUniforms.lightType == 0){
      light_position = moonposition;
    }else{
      light_position = mix(lightUniforms.lightPosition, moonposition, lightness);
    }

    var distance: f32 = 0.0;
    var accumulated_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var transmittance: f32 = 1.0;

    var sun_lightness: f32;

    while(distance <= max_length){
        var sundirection = normalize(lightUniforms.lightPosition - current_point);
        var moondirection = normalize(moonposition - current_point);
        lightness = calculateLightness(current_point, lightUniforms.lightPosition, 2);
        var thetaA = angleBetweenVectors(ray_direction, sundirection);
        var thetaB = angleBetweenVectors(ray_direction, moondirection);

        let sun_ray_direction = normalize(current_point - lightUniforms.lightPosition);

        if(lightUniforms.lightType == 1){
          sun_lightness = 1.0;
        }else if(lightUniforms.lightType == 0.5){
          sun_lightness = lightness;
        }else if(lightUniforms.lightType == 0){
          sun_lightness = 0.00;
        }

        let scatter = atmoRay(current_point, sun_ray_direction);
        accumulated_light += scatter * (1 - transmittance);
        transmittance *= 0.995 * clamp(1 - sun_lightness, 0.99, 1.0); 
        
        current_point += ray_direction * step_length;
        distance += step_length;
    } 

    return RayMarchAtmoOutput(accumulated_light, pow(transmittance, 2));
}