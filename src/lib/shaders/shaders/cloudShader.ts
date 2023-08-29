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

@group(0) @binding(5) var cloud_texture: texture_3d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;
@group(0) @binding(7) var blue_noise: texture_2d<f32>;
@group(0) @binding(8) var blue_noise_sampler: sampler;

const radius = 0.005;

 
@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    let mPosition: vec4<f32> = uni.modelMatrix * input.position;
    let mNormal: vec4<f32> = uni.normalMatrix * input.normal;

    var displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * radius, 0.0);

    output.Position = uni.viewProjectionMatrix * (mPosition + displacement);
    output.vPosition = mPosition;
    output.vNormal = mNormal;
    output.vUV = input.uv;

    return output;
}

const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;    

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

  let bar1 = 0.2;
  let bar2 = 0.3;
  let bar3 = 0.4;
  let bar4 = 0.6;
  let bar5 = 0.8;

  if coverage <= bar1 {
      return pow(smoothstep(0, 0.3, coverage),2);
  } else if coverage <= bar2 {
      return perlin * smoothstep(bar1, bar2, coverage);
  } else if coverage <= bar3 {
      return perlin + (billowy - perlin) * smoothstep(bar2, bar3, coverage);
  } else if coverage <= bar4 {
      return billowy + (billowy - billowy) * smoothstep(bar3, bar4, coverage);
  } else if coverage <= bar5 {
      return billowy + (worley_s - billowy) * smoothstep(bar4, bar5, coverage);
  } else {
      return worley_s;
  }
}

fn getCoverage(p: vec3<f32>, depth: f32) -> f32 {
  let position = normalize(p) * radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  PI);
  let latitude: f32 = acos(position.y / radius) / PI;
  return textureSample(cloud_texture, cloud_sampler, vec3<f32>(longitude, latitude, depth)).r;
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

fn convertUVToNormal(uv: vec2<f32>) -> vec3<f32> {
  let u: f32 = uv.x * 2.005 * 3.14159265359; // Convert U coordinate to radians
  let v: f32 = uv.y * 3.14159265359; // Convert V coordinate to radians

  let x: f32 = sin(v) * cos(u);
  let y: f32 = sin(v) * sin(u);
  let z: f32 = cos(v);

  return normalize(vec3<f32>(x, z, -y));
}


fn getNormal(x: f32, y: f32) -> vec3<f32> {
  let normal: vec3<f32> = convertUVToNormal(vec2<f32>(x, y));
  return normal;
}

fn getDistance(uv: vec2<f32>, selectedPoint: vec2<f32>) -> f32 {
  let delta = abs(uv - selectedPoint);

  // Take into account the wrap-around for the U coordinate
  let wrappedDeltaX = min(delta.x, 1.0 - delta.x);
  let wrappedDelta = vec2<f32>(wrappedDeltaX, delta.y);

  return length(wrappedDelta);
}

fn modifyDensity(originalDensity: f32, distance: f32, maxRadius: f32) -> f32 {
  let falloff = smoothstep(0.0, maxRadius, distance); // Adjust this to fit your needs
  return originalDensity * falloff ;
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = uni.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vPosition.xyz - radius;
  var rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
  var sunRayDirection: vec3<f32> = normalize(rayOrigin + lightUniforms.lightPosition);
  
  var sunDensity: f32 = 0.0;
  var density: f32 = 0.0;
  var noise : vec4<f32> = getNoise(rayOrigin, vec3<f32>(1.0, 1.0, 1.0));
  var theta: f32;

  var coverage: f32;

  var color : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  var light: f32 = 1.0;
  var noisedcoverage: f32;

  let stepSize: f32 = cloudUniforms.raymarchLength; 
  let startDepth: f32 =  radius; 
  let endDepth: f32 =  startDepth + (cloudUniforms.raymarchSteps  * stepSize); 

  let baseColor = vec3<f32>(0.62, 0.63, 0.67);  
  let highColor = vec3<f32>(0.89, 0.87, 0.90); 

  var outputDensity: f32;
  var outputColor = baseColor;

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;

    coverage = getCoverage(texturePosition, ReMap(depth, startDepth, endDepth, .0, 1.0));
    noise = getNoise(texturePosition, vec3<f32>(1.0, 1.0, 1.0));
    noisedcoverage = computeNoise(coverage, noise);

    density += getDensity(cloudUniforms.density, noisedcoverage, ReMap(depth, startDepth, endDepth, .0, 1.0)); 
    
    for(var i = 0.0; i < 0.5; i += 0.1){
    let sunTexturePosition: vec3<f32> = texturePosition + sunRayDirection * i;

    coverage = getCoverage(texturePosition, ReMap(depth, startDepth, endDepth, 0.0, 1.0));
    noise = getNoise(texturePosition, vec3<f32>(1.0, 1.0, 1.0));
    noisedcoverage = computeNoise(coverage, noise);

    theta = dot(normalize(texturePosition), normalize(sunRayDirection));

    light = mieScattering(theta) * lightUniforms.rayleighIntensity;
    sunDensity += getDensity(cloudUniforms.sunDensity, noisedcoverage, 0.2);
    }

    
    let selectedNormal: vec3<f32> = getNormal(cloudUniforms.interactionx, cloudUniforms.interactiony);

    let timeSinceAnimationStart = lightUniforms.elapsed - lightUniforms.lastElapsed;
  
    // Calculate the current diameter of the circle based on the elapsed time
    let currentDiameter = mix(0.0, 0.5, clamp(timeSinceAnimationStart / 0.05, 0.0, 0.25));
  
    let distance: f32 = length(output.vNormal.xyz - selectedNormal);


    outputColor += clamp(density, 0.0, 0.1) * sunDensity * highColor * light; 
    outputDensity += modifyDensity(density, distance, currentDiameter);;
    rayOrigin = texturePosition;
  }

  let dotProduct = dot(lightUniforms.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  if(lightness < 0.5){
    lightness = 0.5;
  }

  if(lightUniforms.lightType == 0.0){
    lightness = 0.5;
  }else if(lightUniforms.lightType == 1.0){
    lightness = 1.0;
  }
  let bnoise = textureSample(blue_noise, blue_noise_sampler, output.vUV).r;


  return vec4<f32>(outputColor, outputDensity) * cloudUniforms.visibility * lightness;
}
`;
