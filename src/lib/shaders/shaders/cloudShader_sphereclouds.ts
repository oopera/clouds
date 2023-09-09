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
  @location(3) vOuterPosition : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(2) var<uniform> lightUniforms: LightUniforms;
@group(0) @binding(3) var noise_texture: texture_3d<f32>;
@group(0) @binding(4) var noise_sampler: sampler;

@group(0) @binding(5) var cloud_texture: texture_3d<f32>;
// @group(0) @binding(5) var cloud_texture: texture_2d<f32>;
@group(0) @binding(6) var cloud_sampler: sampler;


const PI: f32 = 3.141592653589793;
const N: f32 = 2.545e25;  
const n: f32 = 1.0003;   

fn useValues() -> f32 {
  let cloud = cloudUniforms;
  let light = lightUniforms;
  let noise = textureSample(noise_texture, noise_sampler, vec3(1.0,1.0,1.0));
  let clouds = textureSample(cloud_texture, cloud_sampler, vec3(1.0,1.0,1.0));
  return 1.0;
}
 
@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    output.Position = uni.viewProjectionMatrix * (uni.modelMatrix * input.position);
    output.vPosition = input.position; 
    output.vNormal = uni.normalMatrix * input.normal;
    output.vUV = input.uv;
    return output;
} 



@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let one = useValues();
  var output_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var accumulated_alpha: f32 = 0.0;

  let ray_origin = uni.cameraPosition.xyz;
  let ray_direction = normalize(output.vPosition.xyz - ray_origin);
  
  let oc = ray_origin - sphere_center;
  let a = dot(ray_direction, ray_direction);
  let b = 2.0 * dot(oc, ray_direction);
  let c = dot(oc, oc) - (sphere_radius * sphere_radius);
  let discriminant = b * b - 4.0 * a * c;

  let t1: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
  let t2: f32 = (-b + sqrt(discriminant)) / (2.0 * a);
  let t: f32 = min(t1, t2);
  let start_point: vec3<f32> = ray_origin + t * ray_direction;

  let cloud_color = vec3<f32>(1.0, 1.0, 1.0);
  let steps = cloudUniforms.raymarchSteps;

  for (var i: f32 = 0.0; i < steps; i += 1.0) {
    let current_point = start_point + i * ray_direction * cloudUniforms.raymarchLength / steps;
    let density = textureSample(cloud_texture, cloud_sampler, current_point).r * textureSample(noise_texture, noise_sampler, current_point).g * cloudUniforms.density;

    if (discriminant > 0.0) {
      accumulated_alpha += (1.0 - accumulated_alpha) * density;
      output_color += (1.0 - accumulated_alpha) * density * cloud_color;
    }
  }

  return vec4<f32>(output_color, accumulated_alpha);
}
`;
