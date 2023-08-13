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

    var d: vec2<i32> = vec2<i32>(textureDimensions(texture));

    var heightPixel: vec4<f32> = textureLoad(
      texture,
      vec2<i32>(i32(input.uv.x * f32(d.x)), i32(input.uv.y * f32(d.y))),
      0
    );
    var height: f32 = heightPixel.x;

    var noisePixel: vec4<f32> = textureLoad(
      noise_texture,
      vec3<i32>(i32(input.uv.x * f32(d.x)), i32(input.uv.y * f32(d.y)), 0),
      0
    );

    var displacement:vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius), 0.0);
    // if(height < 0.25) {
    // }else if(height < 0.5){
    //   displacement = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius + noisePixel.r / 30), 0.0);
    // }else{
    //   displacement = vec4<f32>(normalize(mPosition.xyz) * (cloudUniforms.radius + noisePixel.b / 30), 0.0);
    // }
    
    output.Position = uni.viewProjectionMatrix * (mPosition + displacement);
    output.vPosition = mPosition;
    output.vNormal = mNormal;
    output.vUV = input.uv;

    return output;
}

fn blend(baseColor: vec3<f32>, newColor: vec3<f32>, light: f32) -> vec3<f32> {
  return baseColor + newColor * light;
}

fn getNoise(p: vec3<f32>, noiseScale: vec3<f32>) -> vec4<f32> {
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

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
  let t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

fn clamp(x: f32, minVal: f32, maxVal: f32) -> f32 {
  return max(min(x, maxVal), minVal);
}

fn computeLighting(density: f32, depth: f32, maxDepth: f32, cosTheta: f32) -> f32 {
  let scaledMaxDepth: f32 = 1.0;
  let depthScaleFactor: f32 = scaledMaxDepth / maxDepth;
  let scaledDepth: f32 = depth * depthScaleFactor;

  let light: f32 = density * (depthScaleFactor - scaledDepth);
  let scatteredLight = light * schlickPhase(0.0, cosTheta);
  
  return scatteredLight;
}

fn schlickPhase(g: f32, cosTheta: f32) -> f32 {
  let g2 = g * g;
  let denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (4.0 - g2) / (1.0 * 3.141592653589793238 * denom * sqrt(denom));
}


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let cameraPosition: vec3<f32> = uni.cameraPosition.rgb;
  var rayOrigin: vec3<f32> = output.vPosition.xyz - cloudUniforms.radius * cameraPosition;
  var rayDirection: vec3<f32> = normalize(rayOrigin + cameraPosition);

  var sunRayDirection: vec3<f32> = normalize(rayOrigin + lightUni.lightPosition);
  var sunDensity: f32 = 0.0;

  let dotProduct = dot(lightUni.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

  if(lightness < 0.5) {
    lightness = 0.5;
  }


  var density: f32 = 0.0;
  var noise : vec4<f32>;

  var perlin = noise.r;
  var worley_l = noise.g;
  var worley_s = noise.b;
  var billowy = noise.a;

  var coverage: f32;
  var color : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  var light: f32 = 1.0;
  var ogNoise = getNoise(rayOrigin, vec3<f32>(1, 1, 1));

  let stepSize: f32 = 0.000001; 
  let startDepth: f32 = (cloudUniforms.radius * 0.95) ; 
  let endDepth: f32 =  (cloudUniforms.radius * 0.95) + (50 * stepSize); 

  let baseColor = vec3<f32>(0.14, 0.17, 0.22);  
  let highColor = vec3<f32>(0.84, 0.87, 0.92); 


  var outputDensity: f32;

  for (var depth: f32 = startDepth; depth < endDepth; depth += stepSize) {
    rayDirection = normalize(rayOrigin + cameraPosition);
    let texturePosition: vec3<f32> = rayOrigin + rayDirection * depth;

    light = clamp(computeLighting(density, depth, endDepth, dot(rayDirection, output.vNormal.xyz)), 0.0, 1.0);

    noise = getNoise(texturePosition, vec3<f32>(1.0, 1.0,1.0));

    perlin = noise.r;
    worley_l = noise.g;
    worley_s = noise.b;
    billowy = noise.a;

    coverage = getCoverage(texturePosition);

    if(coverage < 1){
      density += (endDepth /depth) * perlin * coverage  / 500;
    }else{
    density += (endDepth /depth) * worley_l * coverage  / 200;
    }
    
    for (var depth: f32 = -1 * startDepth; depth < -1 * endDepth; depth -= stepSize * 25) {
      sunRayDirection = normalize(rayOrigin + lightUni.lightPosition);
      let sunTexturePosition: vec3<f32> = rayOrigin + sunRayDirection * depth;
  
      coverage = getCoverage(sunTexturePosition);

      if(coverage < 1){
        sunDensity += (endDepth /depth) * worley_s * coverage / 500 ;
      }else{
        sunDensity += (endDepth /depth) * billowy * coverage  / 200 ;
      }

    }

    outputDensity += density - (sunDensity * 0.5);
  
    rayOrigin = texturePosition;
  }

  outputDensity = clamp(outputDensity, 0.0, 1.0);

  color = vec4<f32>(blend(baseColor, highColor, outputDensity), outputDensity);
  noise = getNoise(rayOrigin, vec3<f32>(2.5, 2.5,2.5));

  if(coverage < 1){
    return vec4<f32>(blend(color.rgb, vec3(noise.r, noise.r, noise.r),outputDensity), outputDensity);
  }

  return vec4<f32>(blend(color.rgb, vec3(noise.a, noise.a, noise.a), outputDensity), outputDensity);

}
`;
