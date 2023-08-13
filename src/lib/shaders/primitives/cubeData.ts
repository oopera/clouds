export const generateCubeData = (size: number) => {
  const halfSize = size * 0.5;

  // Define the 8 vertices for the corners of the cube
  const vertices = [
    -halfSize,
    -halfSize,
    halfSize, // 0
    halfSize,
    -halfSize,
    halfSize, // 1
    halfSize,
    halfSize,
    halfSize, // 2
    -halfSize,
    halfSize,
    halfSize, // 3
    -halfSize,
    -halfSize,
    -halfSize, // 4
    halfSize,
    -halfSize,
    -halfSize, // 5
    halfSize,
    halfSize,
    -halfSize, // 6
    -halfSize,
    halfSize,
    -halfSize, // 7
  ];

  // Define the 12 triangles (each group of 3 integers denotes a triangle)
  const indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    1,
    5,
    6,
    1,
    6,
    2, // Right face
    5,
    4,
    7,
    5,
    7,
    6, // Back face
    4,
    0,
    3,
    4,
    3,
    7, // Left face
    3,
    2,
    6,
    3,
    6,
    7, // Top face
    4,
    5,
    1,
    4,
    1,
    0, // Bottom face
  ];

  // Normals for each face of the cube
  const normals = [
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
  ];

  // UV coordinates for a simple texture mapping
  const uv = [
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    1, // Assuming a single texture for all faces
  ];

  return {
    vertexData: new Float32Array(vertices),
    indexData: new Uint32Array(indices),
    normalData: new Float32Array(normals),
    uvData: new Float32Array(uv),
  };
};
