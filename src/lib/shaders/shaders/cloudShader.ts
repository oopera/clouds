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
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(2) var<uniform> lightUniforms: LightUniforms;
@group(0) @binding(3) var noise_texture: texture_3d<f32>;
@group(0) @binding(4) var noise_sampler: sampler;

@group(0) @binding(5) var cloud_texture: texture_2d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;


const outer_radius = 0.01;
const inner_radius = 0.005;
const sphere_center = vec3<f32>(0.0, 0.0, 0.0);
const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

 
@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    let mPosition: vec4<f32> = uni.modelMatrix * input.position;
    let mNormal: vec4<f32> = uni.normalMatrix * input.normal;

    var outer_displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * outer_radius, 0.0);
    var inner_displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * inner_radius, 0.0);
    output.Position = uni.viewProjectionMatrix * (mPosition + outer_displacement);
    output.vPosition = mPosition;
    output.vNormal = mNormal;
    output.vUV = input.uv;

    return output;
} 

fn getNoise(p: vec3<f32>, noiseScale: vec3<f32>) -> vec4<f32> {
  return textureSample(noise_texture, noise_sampler, p * noiseScale);
  }

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
  let t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

fn clamp(x: f32, minVal: f32, maxVal: f32) -> f32 {
  return max(min(x, maxVal), minVal);
}
fn computeNoise(coverage: f32, noise: vec4<f32>) -> f32 {
  let perlin = noise.r;
  let worley_l = noise.g;
  let worley_s = noise.b;
  let billowy = noise.a;

  let threshold1 = 0.1; 
  let threshold2 = 0.3; 
  let threshold3 = 0.5; 
  let threshold4 = 0.7;

  return worley_l *  coverage;
  
  if coverage <= threshold1 {
    return smoothstep(0.0, threshold1, coverage);
  } else if coverage <= threshold2 {
    return perlin + (billowy - perlin) * smoothstep(threshold1, threshold2, coverage);
  } else if coverage <= threshold3 {
    return billowy + (worley_s - billowy) * smoothstep(threshold2, threshold3, coverage);
  } else if coverage <= threshold4 {
    return worley_s + (billowy - worley_s) * smoothstep(threshold3, threshold4, coverage);
  } else {
    return billowy;
  }
}

fn getCoverage(p: vec3<f32>) -> f32 {
  let position = normalize(p) * inner_radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  PI);
  let latitude: f32 = acos(position.y / inner_radius) / PI;
  return textureSample(cloud_texture, cloud_sampler, vec2<f32>(longitude, latitude)).r;
}

fn rayleighScattering(theta: f32) -> f32 {
    return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
}

fn mieScattering(theta: f32) -> f32 {
  return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}

fn getDensity(molarAbsorptivity: f32, concentration: f32, pathLength: f32) -> f32 {
  return molarAbsorptivity * concentration * pathLength;
}

fn ReMap(value: f32, old_low: f32, old_high: f32, new_low: f32, new_high: f32) -> f32 {
  var ret_val: f32 = new_low + (value - old_low) * (new_high - new_low) / (old_high - old_low);
  return ret_val;
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = uni.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vPosition.xyz;
  var rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
  var sunRayDirection: vec3<f32> = normalize(rayOrigin + lightUniforms.lightPosition);
  
  var sunDensity: f32 = 0.0;
  var density: f32 = 0.0;
  var noise : vec4<f32> = getNoise(rayOrigin, vec3<f32>(.20, .20, .20));

  var theta: f32;

  var coverage: f32;

  var color : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  var light: f32 = 1.0;
  var noisedcoverage: f32;


  let stepSize: f32 = cloudUniforms.raymarchLength; 
  let startDepth: f32 = 0; 
  let endDepth: f32 =  startDepth + (cloudUniforms.raymarchSteps * stepSize); 

  let baseColor = vec3<f32>(0.52, 0.53, 0.67);  
  let highColor = vec3<f32>(0.89, 0.87, 0.90); 

  var outputDensity: f32 = 0.0;
  var outputColor = baseColor;

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let rayPosition: vec3<f32> = rayOrigin + rayDirection * depth;
    
    let dir_to_raymarch = normalize(rayPosition - sphere_center);
    let corresponding_inner_point = sphere_center + dir_to_raymarch * (inner_radius + 2);
    let deviation = rayPosition - corresponding_inner_point;

    let max_height = textureSample(noise_texture, noise_sampler, corresponding_inner_point).g;
    let detail_height = textureSample(noise_texture, noise_sampler, corresponding_inner_point * 2.0);
    let height = length(deviation);

    coverage = getCoverage(corresponding_inner_point);
    noisedcoverage = computeNoise(coverage, detail_height);

    if (height < max_height || max_height < 0.05) {  
      if(height < detail_height.r * 0.5) {
      density += getDensity(cloudUniforms.density, noisedcoverage, 0.2);
      outputDensity += density;
    }
  }

    for(var i = 0.0; i < 0.5; i += 0.1){
      let sunRayPosition: vec3<f32> = rayPosition + sunRayDirection * i;
  
      coverage = getCoverage(sunRayPosition);
      noise = getNoise(sunRayPosition, vec3<f32>(1.0, 1.0, 1.0));
      noisedcoverage = computeNoise(coverage, noise);
  
      theta = dot(normalize(rayPosition), normalize(sunRayPosition));
  
      light += mieScattering(theta) * lightUniforms.rayleighIntensity;
      sunDensity += getDensity(cloudUniforms.sunDensity, noisedcoverage, 0.1);
      }

    rayOrigin = rayPosition;
  }

  outputColor += density  * highColor * sunDensity * clamp(light, 0.0, 2.0);

  let dotProduct = dot(lightUniforms.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));
  if(lightness < 0.75){
    lightness = 0.75;
  }
  
  return vec4<f32>(outputColor, outputDensity) * cloudUniforms.visibility * lightness;
}
`;
