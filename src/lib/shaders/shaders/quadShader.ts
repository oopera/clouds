export const fullScreenQuadShader = /* wgsl */ `
struct Input {
    @location(0) position: vec4<f32>,
};

struct Output {
    @builtin(position) Position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
    var output: Output;

    // Directly output the full-screen quad vertices
    let quad_positions: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, 1.0)
    );

    output.Position = vec4<f32>(quad_positions[vertexIndex], 0.0, 1.0);
    output.uv = (quad_positions[vertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5; // Convert to UV space (0.0 to 1.0)

    return output;
}

@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, output.uv);
}
`;
