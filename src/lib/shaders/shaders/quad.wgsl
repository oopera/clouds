struct Input {
    @location(0) position: vec4<f32>,
};

struct Output {
    @builtin(position) Position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var myTexture: texture_2d<f32>;
@group(0) @binding(1) var mySampler: sampler;

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    let quad_positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), 
        vec2<f32>(1.0, -1.0),  
        vec2<f32>(-1.0, 1.0),  
        vec2<f32>(-1.0, 1.0),   
        vec2<f32>(1.0, -1.0),  
        vec2<f32>(1.0, 1.0)     
    );

    output.Position = vec4<f32>(quad_positions[vertexIndex], 0.0, 1.0);
    output.uv = vec2((quad_positions[vertexIndex].x + 1.0) * 0.5, 1.0 - (quad_positions[vertexIndex].y + 1.0) * 0.5);

    return output;
}

fn bilinearInterpolation(uv: vec2<f32>, texSize: vec2<f32>) -> vec4<f32> {
    let uvPixel = uv * texSize;
    let uv0 = floor(uvPixel);
    let uv1 = uv0 + vec2<f32>(1.0, 1.0);
    
    let f = fract(uvPixel);
    
    let a = textureSample(myTexture, mySampler, uv0 / texSize);
    let b = textureSample(myTexture, mySampler, vec2<f32>(uv1.x, uv0.y) / texSize);
    let c = textureSample(myTexture, mySampler, vec2<f32>(uv0.x, uv1.y) / texSize);
    let d = textureSample(myTexture, mySampler, uv1 / texSize);
    
    let lerp_x1 = mix(a, b, f.x);
    let lerp_x2 = mix(c, d, f.x);
    let lerp_y = mix(lerp_x1, lerp_x2, f.y);
    
    return lerp_y;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
var color = textureSample(myTexture, mySampler, output.uv);
return color;
}