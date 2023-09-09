export const atmosphereShader = /* wgsl */ `
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
@group(0) @binding(1) var<uniform> atmopshereUniforms: AtmosphereUniforms;
@group(0) @binding(2) var<uniform> lightUni: LightUniforms;

const radius = 0.25;
const PI: f32 = 3.141592653589793;


fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}


fn rayleighScattering(theta: f32) -> f32 {
  return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta)) ;
}

fn mieScattering(theta: f32) -> f32 {
return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * radius, 0.0);
  let worldPosition: vec4<f32> = mPosition + displacement;
  
  output.Position = uni.viewProjectionMatrix * worldPosition;
  output.vPosition = worldPosition;
  output.vNormal = normalize(uni.normalMatrix * input.normal);

  return output;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let viewDirection: vec3<f32> = normalize(uni.cameraPosition.xyz - output.vPosition.xyz);
  let visibility = atmopshereUniforms.visibility;


  let dotProduct = dot(lightUni.lightPosition, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));
  if(lightUni.lightType == 0.0){
    lightness = 0.5;
  }else if(lightUni.lightType == 1.0){
    lightness = 1.0;
  }

  let edge = fwidth(lightness);
  let borderColor = vec4(1.0, 0.92, 0.95, 1.0);
  let blendRadius = 0.1; 
  let mask = smoothstep(0.0, blendRadius, edge);

// COMMON LIGHT CALCS

  var rim: f32 = 1.0 - dot(viewDirection, output.vNormal.xyz); 
  rim = pow(rim, 2.5 + 30.0 * ( 1 - lightness )); 

  let blueColor: vec4<f32> = vec4<f32>(0.6, 0.8, 1.0, rim); 
  let orangeColor: vec4<f32> = vec4<f32>(1.0, 1.0, 1.0, rim); 

  let color: vec4<f32> = mix(orangeColor, blueColor, lightness);
  let resultColor =   mask * borderColor;

  return (color + resultColor);
}
`;
