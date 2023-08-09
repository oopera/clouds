export const cloudShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

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
  @location(4) cameraPosition : vec4<f32>,
  @location(5) lightPosition : vec3<f32>,
  @location(6) lightColor : vec3<f32>,
  @location(7) lightIntensity : f32,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(4) var<uniform> lightUni: LightUniforms;

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let mNormal: vec4<f32> = uni.normalMatrix * input.normal;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius), 0.0);
  
  output.Position = uni.viewProjectionMatrix * (mPosition + displacement);
  output.vPosition =   uni.viewProjectionMatrix * (mPosition + displacement);
  output.vNormal = mNormal;
  output.vUV = input.uv;
  output.cameraPosition = uni.cameraPosition;
  output.lightPosition = lightUni.lightPosition;
  output.lightColor = lightUni.lightColor;
  output.lightIntensity = lightUni.lightIntensity;

  return output;
}


const m: mat3x3<f32> = mat3x3<f32>(
  0.00, 0.80, 0.60,
 -0.80, 0.36, -0.48,
 -0.60, -0.48, 0.64
);

// Conversion of function signatures and return types
fn hash(n: f32) -> f32 {
  return fract(sin(n) * 43758.5453);
}

fn noise(x: vec3<f32>) -> f32 {
  let p: vec3<f32> = floor(x);
  var f: vec3<f32> = fract(x);

  f = f * f * (3.0 - 2.0 * f);

  let n: f32 = p.x + p.y * 57.0 + 113.0 * p.z;

  let res: f32 = mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                          mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                          mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
  return res;
}

fn fbm(p: vec3<f32>) -> f32 {
  var f: f32 = 0.0;
  var pp = p;
  f += 0.5000 * noise(p); pp = m * p * 2.02;
  f += 0.2500 * noise(p); pp = m * p * 2.03;
  f += 0.12500 * noise(p); pp = m * p * 2.01;
  f += 0.06250 * noise(p);
  return f;
}

fn computeLighting(density: f32, depth: f32, maxDepth: f32, cosTheta: f32) -> f32 {
  let diffuse = max(cosTheta, 0.0);
  let attenuationByDensity = 1.0 - density;
  let scaledDepth: f32 = depth / maxDepth;
  let attenuationByDepth = 1.0 - 0.15 * scaledDepth;  

  let light = diffuse * attenuationByDensity * attenuationByDepth;

  return light;
}

fn blend(baseColor: vec4<f32>, newColor: vec4<f32>, light: f32) -> vec4<f32> {
  return baseColor * (1.0 - newColor.a) + newColor * light;
}


fn map3DTo2D(position: vec3<f32>) -> vec2<f32> {
  let radius: f32 = 1 + cloudUniforms.radius;
  var longitude: f32 = atan2(position.z, position.x) / (2.0 *  3.141592653589793238);
  let latitude: f32 = acos(position.y / radius) / 3.141592653589793238;
  
  return vec2<f32>(longitude, latitude);
}

fn cloudDensity(p: vec3<f32>, depth: f32) -> f32 {
  let radius: f32 = 1 + cloudUniforms.radius;
  let pos: vec3<f32> = normalize(p) * radius;
  let coverage: f32 = textureSample(texture, textureSampler, map3DTo2D(pos)).r ;
  var noise: f32 = fbm(pos);
  let density: f32 = noise * coverage / 2;

  return density;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = output.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vNormal.xyz;
  
  let startDepth: f32 = cloudUniforms.radius / 10;
  let endDepth: f32 = cloudUniforms.radius / 10 + 0.001;

  let stepSize: f32 = 0.00005;

  var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    let rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;
    
    let density: f32 = cloudDensity(texturePosition, depth);
    let light: f32 = computeLighting(density, depth, endDepth - startDepth, dot(rayDirection, output.vNormal.xyz));

    let baseColor = vec3<f32>(0.54, 0.57, 0.62);
    let highColor = vec3<f32>(0.84, 0.87, 0.92);
    let colorDensity = mix(baseColor, highColor, density);
    color = clamp(blend(color, vec4<f32>(colorDensity, density), clamp(light,0.0,1.0)), vec4<f32>(0.0, 0.0, 0.0, 0.0), vec4<f32>(1.0, 1.0, 1.0, 1.0));

    rayOrigin = texturePosition;
  }

  // if(color.a < 0.05) {
  //   discard;
  // }


  let dotProduct = dot(output.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  if(lightness < 0.5){
    lightness = 0.5;
  }

  return color * lightness;
}
`;
