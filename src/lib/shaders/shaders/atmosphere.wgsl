struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

struct LightUniforms {
  lightPosition : vec3<f32>,
  rayleighIntensity : f32,
  lightType : f32,
};

struct AtmosphereUniforms {
  radius : f32,
  coverage : f32, 
  visibility : f32,
  noiseStrength : f32,
}

struct Input {
  @location(0) position : vec4<f32>,
  @location(1) normal : vec4<f32>,
};

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) vPosition : vec4<f32>,
  @location(1) vNormal : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> atmosphereUni: AtmosphereUniforms;
@group(0) @binding(2) var<uniform> lightUniforms: LightUniforms;

const radius = 1;
const sphere_radius: f32 = 20.0;
const sphere_offset: f32 = 0.7; 
const outer_sphere_radius: f32 = sphere_radius + sphere_offset;
const PI: f32 = 3.141592653589793;


fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}


// fn rayleighScattering(theta: f32) -> f32 {
//   return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
// }

fn mieScattering(theta: f32) -> f32 {
return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
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

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * radius, 0.0);
  let worldPosition: vec4<f32> = mPosition + displacement;
  
  output.Position = uni.viewProjectionMatrix * worldPosition;
  output.vPosition = worldPosition;
  output.vNormal = normalize(uni.normalMatrix * input.normal);

  let x = atmosphereUni.radius;

  return output;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {

  var color = raymarch(output.vPosition.xyz, normalize(output.vPosition.xyz - uni.cameraPosition.xyz), lightUniforms.lightPosition);
  return vec4(0.0,0.0,0.0,0.0);
  return vec4(color.light, (1 - color.transmittance));
}


struct RaymarchOutput {
    light: vec3<f32>,
    transmittance: f32,
};




fn rayleighScattering(point: vec3<f32>, sun_direction: vec3<f32>) -> vec3<f32> {
    let scattering_coeff = vec3<f32>(0.2, 0.3, 0.4); 
    let dot_product = dot(point, sun_direction);
    return scattering_coeff * max(dot_product, 0.0);
}



fn calculateLightness(current_point: vec3<f32>, light_position: vec3<f32>) -> f32 {
    let dotProduct = dot(light_position, current_point);
    return 1.0 - (1.0 / (1.0 + exp(-dotProduct)));
}
// Raymarch function
fn raymarch(ray_origin: vec3<f32>, ray_direction: vec3<f32>, sun_direction: vec3<f32>) -> RaymarchOutput {
    var step_length = 1.0 / 10.0;
    var current_point: vec3<f32> = ray_origin; 
    var max_length: f32 = calculateStepLength(ray_origin, ray_direction);

    var sun_density: f32 = 0.0;
    var light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var light_position: vec3<f32>;
    let moonposition = vec3<f32>(-lightUniforms.lightPosition.x, -lightUniforms.lightPosition.y, -lightUniforms.lightPosition.z);
    var lightness = calculateLightness(current_point, lightUniforms.lightPosition);

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

    var distance: f32 = 0.0;
    var accumulated_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var transmittance: f32 = 1.0;

    while(distance <= max_length){

        let scatter = rayleighScattering(current_point, sun_ray_direction);
        accumulated_light += scatter * transmittance;
        transmittance *= 0.99 * clamp(1 - lightness, 0.95, 1.0); 
        
        
        current_point += ray_direction * step_length;
        distance += step_length;
    } 

    return RaymarchOutput(accumulated_light, pow(transmittance, 2));
}

fn angleBetweenVectors(A: vec3<f32>, B: vec3<f32>) -> f32 {
  let dotProduct = dot(A, B);
  let magnitudeA = length(A);
  let magnitudeB = length(B);
  let cosTheta = dotProduct / (magnitudeA * magnitudeB);
  return acos(clamp(cosTheta, -1.0, 1.0));
}
