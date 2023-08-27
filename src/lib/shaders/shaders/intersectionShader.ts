export const intersectionShader = /* wgsl */ `
struct Uniforms {
  viewProjectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
  viewProjectionMatrix2 : mat4x4<f32>,
  options : vec4<f32>,
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
  @location(3) options : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

fn convertUVTo3D(uv: vec2<f32>) -> vec3<f32> {
  let radius: f32 = 1.0;

  let u: f32 = uv.x * 2.0 * 3.14159265359; 
  let v: f32 = uv.y * 1.0 * 3.14159265359; 

  let x: f32 = radius * sin(v) * cos(u) * 4;
  let z: f32 = radius * sin(v) * sin(u) * 4;
  let y: f32 = radius * cos(v) * 4;

  return vec3<f32>(x, y, -z);
}

@vertex
fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;

  let coords = convertUVTo3D(vec2(uni.options[2], uni.options[3]));

  let scaleMatrix = mat4x4<f32>(
    vec4<f32>(0.5, 0.0, 0.0, 0.0),
    vec4<f32>(0.0, 0.5, 0.0, 0.0),
    vec4<f32>(0.0, 0.0, 0.5, 0.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0)
  );
  let scaledModelMatrix = uni.modelMatrix * scaleMatrix;
  let mPosition: vec4<f32> = scaledModelMatrix * vec4<f32>(coords, 1.0);
  let mNormal: vec4<f32> = uni.normalMatrix * input.normal;

  let displacement: vec3<f32> = normalize(mNormal.xyz) * 0.05;

  output.Position = uni.viewProjectionMatrix * (mPosition + vec4<f32>(displacement, 0.0));
  output.vPosition = uni.viewProjectionMatrix * (mPosition + vec4<f32>(displacement, 0.0));
  output.vNormal = mNormal;
  output.vUV = input.uv;
  output.options = uni.options;

  return output;
}

@fragment
fn fs(output: Output) -> @location(0) vec4<f32> {
  return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}
`;
