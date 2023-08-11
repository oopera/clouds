export const cloudShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

// unpopulated except radius

struct CloudUniforms {
  radius : f32,
  coverage : f32, 
  noiseScale : f32,
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
@group(0) @binding(3) var texture: texture_2d<f32>;
@group(0) @binding(4) var textureSampler: sampler;
@group(0) @binding(5) var noise_texture: texture_3d<f32>;
@group(0) @binding(6) var noise_sampler: sampler;

 
@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let mNormal: vec4<f32> = uni.normalMatrix * input.normal;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius), 0.0);
  
  output.Position = uni.viewProjectionMatrix * (mPosition + displacement);
  output.vPosition = uni.viewProjectionMatrix * (mPosition + displacement);
  output.vNormal = mNormal;
  output.vUV = input.uv;
  

  return output;
}

fn blend(baseColor: vec3<f32>, newColor: vec3<f32>, light: f32) -> vec3<f32> {
  return baseColor + newColor * light;
}

fn getNoise(p: vec3<f32>) -> vec4<f32> {
  let noiseScale = vec3<f32>(1.0, 1.0, 1.0);
  
   let noise = textureSample(noise_texture, noise_sampler, p * noiseScale);
   return noise;
  }

fn getCoverage(p: vec3<f32>) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  let position = normalize(p) * radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  3.141592653589793238);
  let latitude: f32 = acos(position.y / radius) / 3.141592653589793238;

  return textureSample(texture, textureSampler, vec2<f32>(longitude, latitude)).r;
}
  

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = uni.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vNormal.xyz;
  var rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
  
  var density: f32 = 0.0;
  var noise : vec4<f32>;
  var coverage: f32;
  var color : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);

  let startDepth: f32 = cloudUniforms.radius / 10;
  let endDepth: f32 = cloudUniforms.radius / 2;

  let stepSize: f32 = cloudUniforms.radius / 50;


  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    // rayDirection = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;

    noise = getNoise(texturePosition);
    coverage = getCoverage(texturePosition);

    density += coverage * noise.b;

    // falloff = smoothstep(min, falloff, 1, distance + noise);

    let baseColor = vec3<f32>(0.54, 0.57, 0.52);  
    let highColor = vec3<f32>(0.84, 0.87, 0.92); 

    var cloudColor: vec3<f32> = mix(baseColor, highColor, density);
    cloudColor = cloudColor * stepSize;
    color.r = cloudColor.r;
    color.g = cloudColor.g;
    color.b = cloudColor.b;

  
    rayOrigin = texturePosition;
  }

  var lightDirection: vec3<f32> = normalize(lightUni.lightPosition - output.vPosition.xyz);
  var lightIntensity: f32 = max(dot(output.vNormal.xyz, lightDirection), 0.0);
   color = vec4<f32>(blend(vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0), density), density);
  
  return vec4(color.r * noise.a * 0.80, color.g * noise.a * 0.82, color.b * noise.a * 0.92, color.a * noise.a  ) ;
}
`;
