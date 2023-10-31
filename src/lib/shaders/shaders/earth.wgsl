    struct Uniforms {
      viewProjectionMatrix : mat4x4<f32>,
      modelMatrix : mat4x4<f32>,
      normalMatrix : mat4x4<f32>,
      cameraPosition : vec4<f32>,
    };

    struct EarthUniforms {
      elapsed: f32,
      visibility : f32,
      coordx: f32,
      coordy: f32,
    };



    struct LightUniforms {
      lightPosition : vec3<f32>,
      rayleighIntensity : f32,
      lightType : f32,
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
    @group(0) @binding(1) var<uniform> earthUni: EarthUniforms;
    @group(0) @binding(2) var<uniform> lightUni: LightUniforms;
    @group(0) @binding(3) var lightTexture_01: texture_2d<f32>;
    @group(0) @binding(4) var lightTexture_02: texture_2d<f32>;
    @group(0) @binding(5) var texture_01: texture_2d<f32>;
    @group(0) @binding(6) var texture_02: texture_2d<f32>;
    @group(0) @binding(7) var heightmap_01: texture_2d<f32>;
    // @group(0) @binding(8) var heightmap_02: texture_2d<f32>;
    @group(0) @binding(8) var textureSampler: sampler;

    @vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
      var output: Output;

      
      var d: vec2<i32> = vec2<i32>(textureDimensions(heightmap_01));
    
      var height_01: vec4<f32> = textureLoad(
        heightmap_01,
        vec2<i32>(i32(input.uv.x * f32(d.x)), i32(input.uv.y * f32(d.y))),
        0
      );

      var height: f32;

          height = height_01.r;


      var usedVisibility = earthUni.visibility;
      
      let mPosition: vec4<f32> = uni.modelMatrix * input.position;
      let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * height * 0.5, 0.0);
      let worldPosition: vec4<f32> = mPosition + displacement;
      
      output.Position = uni.viewProjectionMatrix * worldPosition;
      output.vPosition = worldPosition;
      output.vNormal = normalize(uni.normalMatrix * input.normal);
      output.vUV = input.uv;
      return output;
    }




    
    fn getDistance(uv: vec2<f32>, selectedPoint: vec2<f32>) -> f32 {
      let delta = abs(uv - selectedPoint);
      let wrappedDelta = vec2<f32>(min(delta.x, 1.0 - delta.x) * 2, delta.y);
      return length(wrappedDelta);
    }

    fn convertUVToNormal(uv: vec2<f32>) -> vec3<f32> {
      let u: f32 = uv.x * 2.0 * 3.14159265359; 
      let v: f32 = uv.y * 3.14159265359; 
    
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
      let lightColor_01 = textureSample(lightTexture_01, textureSampler, vec2<f32>(output.vUV.x * 2.0, output.vUV.y));
      let lightColor_02 = textureSample(lightTexture_02, textureSampler, vec2<f32>((output.vUV.x - 0.5) * 2.0, output.vUV.y));
      var textureColor: vec4<f32>;
      var lightColor: vec4<f32>;


      if (output.vUV.x < 0.5) {
          textureColor = textureColor_01;
          lightColor = lightColor_01;
      } else {
          textureColor = textureColor_02;
          lightColor = lightColor_02;
      }

      let dotProduct = dot(lightUni.lightPosition, output.vNormal.xyz);
      let scaledDotProduct: f32 = dotProduct * 5;
      var lightness: f32 = 1.0 - (1.0 / (1.0 + exp(-scaledDotProduct)));

      let borderColor = vec4(1.0, 0.92, 0.95, 1.0);
      let blendRadius = 0.1; 
      var mask: f32 = 0;

      if(lightUni.lightType == 0.0){
        lightness = 0.0;
      }else if(lightUni.lightType == 1.0){
        lightness = 1.0;
      }
      lightness = clamp(lightness, 0.2, 1.0);
      

      let resultColor = vec4(textureColor.rgb * pow(lightness, 1.2), 1) + 
                   vec4(lightColor.rgb  * pow(1.0 - lightness, 1.2) , 1.0);

      return resultColor;
    }       
