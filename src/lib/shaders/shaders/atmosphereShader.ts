export const atmosphereShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

struct Input {
  @location(0) position : vec4<f32>,
  @location(1) normal : vec4<f32>,
};

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) vPosition : vec4<f32>,
  @location(1) vNormal : vec4<f32>,
  @location(2) cameraPosition : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * (0.04), 0.0);
  let worldPosition: vec4<f32> = mPosition + displacement;
  
  output.Position = uni.viewProjectionMatrix * worldPosition;
  output.vPosition = worldPosition;
  output.vNormal = normalize(uni.normalMatrix * input.normal);
  output.cameraPosition = uni.cameraPosition;

  return output;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let viewDirection: vec3<f32> = normalize(output.cameraPosition.xyz - output.vPosition.xyz);
  let cameraDirection = normalize(vec3<f32>(1, 0, 0) - vec3<f32>(0 ,0 ,0)); 
  let up = vec3<f32>(0, 1, 0);
  var lightDir = cross(cameraDirection, up);
  lightDir = normalize(lightDir);

  let dotProduct = dot(lightDir, output.vNormal.xyz);
  let scaledDotProduct: f32 = dotProduct * 10.0;
  let lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));
  var rim: f32 = 1.0 - dot(viewDirection, output.vNormal.xyz); 
  rim = pow(rim, 2.0 + 20.0 * ( 1 - lightness )); 

  let blueColor: vec4<f32> = vec4<f32>(0.6, 0.8, 1.0, rim); 
  let orangeColor: vec4<f32> = vec4<f32>(1.0, 1.0, 1.0, rim); 

  let color: vec4<f32> = mix(blueColor, blueColor, lightness);

  return color;
}
`;
