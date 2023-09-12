export const fullScreenQuadShader = /* wgsl */ `
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
@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
    var color = textureSample(myTexture, mySampler, output.uv);
    return color;
}
`;
