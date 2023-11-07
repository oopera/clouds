export const generateCubeData = (size: number) => {
  const vertices = [
    // Front face
    -size,
    -size,
    size,
    size,
    -size,
    size,
    size,
    size,
    size,

    -size,
    -size,
    size,
    size,
    size,
    size,
    -size,
    size,
    size,

    // Right face
    size,
    -size,
    size,
    size,
    -size,
    -size,
    size,
    size,
    -size,

    size,
    -size,
    size,
    size,
    size,
    -size,
    size,
    size,
    size,

    // Back face
    size,
    -size,
    -size,
    -size,
    -size,
    -size,
    -size,
    size,
    -size,

    size,
    -size,
    -size,
    -size,
    size,
    -size,
    size,
    size,
    -size,

    // Left face
    -size,
    -size,
    -size,
    -size,
    -size,
    size,
    -size,
    size,
    size,

    -size,
    -size,
    -size,
    -size,
    size,
    size,
    -size,
    size,
    -size,

    // Top face
    -size,
    size,
    size,
    size,
    size,
    size,
    size,
    size,
    -size,

    -size,
    size,
    size,
    size,
    size,
    -size,
    -size,
    size,
    -size,

    // Bottom face
    -size,
    -size,
    -size,
    size,
    -size,
    -size,
    size,
    -size,
    size,

    -size,
    -size,
    -size,
    size,
    -size,
    size,
    -size,
    -size,
    size,
  ];

  const normals = new Array(36)
    .fill([
      0,
      0,
      1, // Front face
      1,
      0,
      0, // Right face
      0,
      0,
      -1, // Back face
      -1,
      0,
      0, // Left face
      0,
      1,
      0, // Top face
      0,
      -1,
      0, // Bottom face
    ])
    .flat();

  const uv = new Array(6).fill([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]).flat();

  return {
    vertexData: new Float32Array(vertices),
    normalData: new Float32Array(normals),
    uvData: new Float32Array(uv),
  };
};
