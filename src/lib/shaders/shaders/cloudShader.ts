export const cloudShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

struct CloudUniforms {
  radius : f32,
  dissapation : f32, 
  visibility : f32,
  noiseStrength : f32,
}

struct LightUniforms {
  lightPosition : vec3<f32>,
  lightColor : vec3<f32>,
  lightIntensity : f32,
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
@group(0) @binding(2) var<uniform> lightUni: LightUniforms;
@group(0) @binding(3) var noise_texture: texture_3d<f32>;
@group(0) @binding(4) var noise_sampler: sampler;

@group(0) @binding(5) var cloud_texture: texture_3d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;

 
@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    let mPosition: vec4<f32> = uni.modelMatrix * input.position;
    let mNormal: vec4<f32> = uni.normalMatrix * input.normal;

    var displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius), 0.0);

    output.Position = uni.viewProjectionMatrix * (mPosition + displacement);
    output.vPosition = mPosition;
    output.vNormal = mNormal;
    output.vUV = input.uv;

    return output;
}

const PI: f32 = 3.141592653589793;

// Constants for the Rayleigh scattering calculation. These can be adjusted based on specific atmospheric conditions.
const N: f32 = 2.545e25;  // Number density of molecules (approximated value)
const n: f32 = 1.0003;    // Refractive index of the atmosphere

fn blend(baseColor: vec3<f32>, newColor: vec3<f32>, light: f32) -> vec3<f32> {
  return baseColor + newColor * light;
}

fn getNoise(p: vec3<f32>, noiseScale: vec3<f32>) -> vec4<f32> {
   let noise = textureSample(noise_texture, noise_sampler, p * noiseScale);
   return noise;
  }


fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
  let t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

fn clamp(x: f32, minVal: f32, maxVal: f32) -> f32 {
  return max(min(x, maxVal), minVal);
}

fn getDensity(molarAbsorptivity: f32, concentration: f32, pathLength: f32) -> f32 {
  return molarAbsorptivity * concentration * pathLength;
}

fn computeNoise(coverage: f32, noise: vec4<f32>) -> f32 {
  let perlin = noise.r;
  let worley_l = noise.g;
  let worley_s = noise.b;
  let billowy = noise.a;

  let bar1 = 0.1;
  let bar2 = 0.2;
  let bar3 = 0.4;
  let bar4 = 0.6;
  let bar5 = 0.8;

  if coverage <= bar1 {
      return 0.0;
  } else if coverage <= bar2 {
      return perlin * smoothstep(bar1, bar2, coverage);
  } else if coverage <= bar3 {
      return perlin + (billowy - perlin) * smoothstep(bar2, bar3, coverage);
  } else if coverage <= bar4 {
      return billowy + (worley_s - billowy) * smoothstep(bar3, bar4, coverage);
  } else if coverage <= bar5 {
      return worley_s + (worley_l - worley_s) * smoothstep(bar4, bar5, coverage);
  } else {
      return worley_l;
  }
}

fn getCoverage(p: vec3<f32>, depth: f32) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  let position = normalize(p) * radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  PI);
  let latitude: f32 = acos(position.y / radius) / PI;

  return textureSample(cloud_texture, cloud_sampler, vec3<f32>(longitude, latitude, depth)).r;
}

fn rayleighScattering(theta: f32) -> f32 {
    return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  
  let cameraPosition: vec3<f32> = uni.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vPosition.xyz - cloudUniforms.radius * cameraPosition;
  var rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
  var sunRayDirection: vec3<f32> = normalize(rayOrigin + lightUni.lightPosition);
  
  var sunDensity: f32 = 0.5;
  var density: f32 = 0.0;
  var noise : vec4<f32>;

  var coverage: f32;

  var color : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  var light: f32 = 1.0;
  var caseNoise: f32;

  let stepSize: f32 = 0.0001; 
  let startDepth: f32 =  cloudUniforms.radius; 
  let endDepth: f32 =  startDepth + (50  * stepSize); 

  let baseColor = vec3<f32>(0.12, 0.17, 0.22);  
  let highColor = vec3<f32>(0.89, 0.87, 0.92); 

  var outputDensity: f32;
  var outputColor: vec3<f32>;
  var rayleighIntensity: f32;

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    rayDirection = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;
    let depthFactor =  (depth - startDepth) / (endDepth - startDepth);
    
    coverage = getCoverage(texturePosition, depthFactor / 4);
    noise = getNoise(texturePosition, vec3<f32>(2.0, 2.0, 2.0));

    caseNoise = pow(computeNoise(coverage, noise), 1);

    density += getDensity(0.05, caseNoise,  depthFactor);
    for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
      sunRayDirection = normalize(rayOrigin + lightUni.lightPosition);
      let sunTexturePosition: vec3<f32> = rayOrigin + sunRayDirection * depth;
      let depthFactor =  (depth - startDepth) / (endDepth - startDepth);

      caseNoise = computeNoise(coverage, noise);

      let theta: f32 = dot(normalize(rayDirection), normalize(sunRayDirection));

      light = rayleighScattering(theta);
      sunDensity += getDensity(0.05, caseNoise, depthFactor);
    }

    outputColor += clamp(density, 0.0, 1.0) * baseColor + clamp(sunDensity, 0.0,1.0) * highColor * light / 10;

    outputDensity += density;
    rayOrigin = texturePosition;
  }

  let dotProduct = dot(lightUni.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  if(lightness < 0.5){
    lightness = 0.5;
  }

  return vec4(clamp(outputColor.r, 0.72, 1) * lightness,clamp(outputColor.g, 0.77, 1) * lightness,clamp(outputColor.b, 0.82, 1) * lightness, outputDensity) * cloudUniforms.visibility;
}
`;
