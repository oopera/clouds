export const earthShader = /* wgsl */ `
    struct Uniforms {
      viewProjectionMatrix : mat4x4<f32>,
      modelMatrix : mat4x4<f32>,
      normalMatrix : mat4x4<f32>,
      cameraPosition : vec4<f32>,
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
      @location(4) cameraPosition : vec4<f32>,
    };
    
    @group(0) @binding(0) var<uniform> uni: Uniforms;
    @group(0) @binding(1) var heightTexture: texture_2d<f32>;
    @group(0) @binding(2) var lightTexture_01: texture_2d<f32>;
    @group(0) @binding(3) var lightTexture_02: texture_2d<f32>;
    @group(0) @binding(4) var texture_01: texture_2d<f32>;
    @group(0) @binding(5) var texture_02: texture_2d<f32>;
    @group(0) @binding(6) var textureSampler: sampler;

    @vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
      var output: Output;
    
      var d: vec2<i32> = vec2<i32>(textureDimensions(heightTexture));
    
      var heightPixel: vec4<f32> = textureLoad(
        heightTexture,
        vec2<i32>(i32(input.uv.x * f32(d.x)), i32(input.uv.y * f32(d.y))),
        0
      );
      var height: f32 = heightPixel.x;
    
      let mPosition: vec4<f32> = uni.modelMatrix * input.position;
      let mNormal: vec4<f32> = uni.normalMatrix * input.normal;
    
      let displacement: vec3<f32> = normalize(mNormal.xyz) * (height * uni.options[0]);
    
      output.Position = uni.viewProjectionMatrix * (mPosition + vec4<f32>(displacement, 0.0));
  
      output.vPosition = uni.viewProjectionMatrix * (mPosition + vec4<f32>(displacement, 0.0));
      output.vNormal = mNormal;
      output.vUV = input.uv;
      output.options = uni.options;
      output.cameraPosition = uni.cameraPosition;

    
      return output;
    }
    
    fn getDistance(uv: vec2<f32>, selectedPoint: vec2<f32>) -> f32 {
      let delta = abs(uv - selectedPoint);
      let wrappedDelta = vec2<f32>(min(delta.x, 1.0 - delta.x) * 2, delta.y);
      return length(wrappedDelta);
    }

    fn convertUVToNormal(uv: vec2<f32>) -> vec3<f32> {
      let u: f32 = uv.x * 2.0 * 3.14159265359; // Convert U coordinate to radians
      let v: f32 = uv.y * 3.14159265359; // Convert V coordinate to radians
    
      let x: f32 = sin(v) * cos(u);
      let y: f32 = sin(v) * sin(u);
      let z: f32 = cos(v);
    
      return normalize(vec3<f32>(x, z, -y));
    }

    fn getNormal(uv: vec2<f32>) -> vec3<f32> {
      let normal: vec3<f32> = convertUVToNormal(uv);
      return normal;
    }
    
    fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
      let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
  }
    @fragment fn fs(output: Output) -> @location(0) vec4<f32> {
      let textureColor_01 = textureSample(texture_01, textureSampler, vec2<f32>(output.vUV.x * 2.0, output.vUV.y));
      let textureColor_02 = textureSample(texture_02, textureSampler, vec2<f32>((output.vUV.x - 0.5) * 2.0, output.vUV.y));
      let heightColor: vec4<f32> = textureSample(heightTexture, textureSampler, output.vUV);
      let lightColor_01 = textureSample(lightTexture_01, textureSampler, vec2<f32>(output.vUV.x * 2.0, output.vUV.y));
      let lightColor_02 = textureSample(lightTexture_02, textureSampler, vec2<f32>((output.vUV.x - 0.5) * 2.0, output.vUV.y));
      let normal: vec3<f32> = getNormal(vec2(output.options[2], output.options[3]));
      var textureColor: vec4<f32>;
      var lightColor: vec4<f32>;
      var distance: f32 = length(output.vNormal.xyz - normal);

      let cameraDirection = normalize(vec3<f32>(1, 0, 0) - vec3<f32>(0 ,0 ,0)); 
      let up = vec3<f32>(0, 1, 0);
      var lightDir = cross(cameraDirection, up);
      lightDir = normalize(lightDir);
      let dotProduct = dot(lightDir, output.vNormal.xyz);
      let scaledDotProduct: f32 = dotProduct * 10.0;
      let lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

      // if (distance < 0.1) {
      //   return mix(vec4(textureColor), vec4(0.2, 0.3, 0.4, 1.0), 2.0);
      // }


      if (output.vUV.x < 0.5) {
          textureColor = textureColor_01;
          lightColor = lightColor_01;
      } else {
          textureColor = textureColor_02;
          lightColor = lightColor_02;
      }

      if(output.options[1] <= 0.5){
        textureColor = heightColor;
      }

      return vec4(textureColor.rgb * lightness, 1) + vec4(lightColor.rgb  * (1.0 - lightness) , 1.0);
    }       
    `;
