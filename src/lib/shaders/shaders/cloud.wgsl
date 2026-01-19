struct Uniforms {
  viewProjectionMatrix: mat4x4<f32>,
  modelMatrix: mat4x4<f32>,
  normalMatrix: mat4x4<f32>,
  cameraPosition: vec4<f32>,
};

struct CloudUniforms {
  elapsed: f32,
  visibility: f32, 
  density: f32,
  sunDensity: f32,
  raymarchSteps: f32,
  raymarchLength: f32,
  atmoVisibility: f32,
  interactionY: f32,
}

struct LightUniforms {
  lightPosition: vec3<f32>,
  rayleighIntensity: f32,
  lightType: f32,
  elapsed: f32,
  lastElapsed: f32,
};

struct Input {
  @location(0) position: vec4<f32>,
  @location(1) normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
};

struct Output {
  @builtin(position) Position: vec4<f32>,
  @location(0) vPosition: vec4<f32>,
  @location(1) vNormal: vec4<f32>,
  @location(2) vUV: vec2<f32>,
  @location(3) vOuterPosition: vec4<f32>,
};

struct Samples {
  noise: vec4<f32>,
  detailNoise: vec4<f32>,
  blueNoise: vec4<f32>,
  curlNoise: vec4<f32>,
}

struct SunRaymarchOutput {
  sunDensity: f32,
  light: vec3<f32>,
};

struct RaymarchOutput {
  light: vec3<f32>,
  transmittance: f32,
};

struct RayMarchAtmoOutput {
    light: vec3<f32>,
    transmittance: f32,
};

struct CloudVariables {
  altitude: f32,
  layer: f32,
  scale: f32,
};


@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> cloudUniforms: CloudUniforms;
@group(0) @binding(2) var<uniform> lightUniforms: LightUniforms;
@group(0) @binding(3) var noise_texture: texture_3d<f32>;
@group(0) @binding(4) var noise_sampler: sampler;
@group(0) @binding(5) var detail_noise_texture: texture_3d<f32>; 
@group(0) @binding(6) var detail_noise_sampler: sampler;
@group(0) @binding(7) var cloud_texture: texture_2d<f32>;
@group(0) @binding(8) var cloud_sampler: sampler;
@group(0) @binding(9) var bluenoise_texture: texture_2d<f32>;
@group(0) @binding(10) var bluenoise_sampler: sampler;


// --- Constants ---

// Spheres & Layers
const SPHERE_CENTER = vec3<f32>(0.0, 0.0, 0.0);
const SPHERE_RADIUS: f32 = 20.0;
const SPHERE_OFFSET: f32 = 0.2; 
const CUBE_PARTIAL: f32 = SPHERE_OFFSET / 9.0;

const LAYER_1_OFFSET: f32 = CUBE_PARTIAL * 1.0; 
const LAYER_1_BUFFER: f32 = CUBE_PARTIAL * 4.0;
const LAYER_2_OFFSET: f32 = CUBE_PARTIAL * 5.0;
const LAYER_2_BUFFER: f32 = CUBE_PARTIAL * 7.0;
const LAYER_3_OFFSET: f32 = CUBE_PARTIAL * 8.0;

const OUTER_SPHERE_RADIUS: f32 = SPHERE_RADIUS + SPHERE_OFFSET;

// LOD
const HIGH_LOD: f32 = 1.0;
const LOW_LOD: f32 = 1.0;
const LOD_DISTANCE_THRESHOLD: f32 = 35.0; 

// Colors
const SUN_COLOR: vec3<f32> = vec3<f32>(0.8, 0.8, 0.9);
const MOON_COLOR: vec3<f32> = vec3<f32>(0.4, 0.5, 0.7);
const BASE_COLOR: vec3<f32> = vec3<f32>(0.62, 0.63, 0.67);

// Math
const PI: f32 = 3.141592653589793;

// Physics / Scattering / Lighting
const CLOUD_INSCATTER: f32 = 0.2;
const CLOUD_SILVER_INTENSITY: f32 = 2.5;
const CLOUD_SILVER_EXPONENT: f32 = 2.0;
const CLOUD_OUTSCATTER: f32 = 0.1;
const CLOUD_IN_VS_OUTSCATTER: f32 = 0.5;
const CLOUD_BEER: f32 = 6.0;
const CLOUD_ATTENUATION_CLAMP: f32 = 0.2;
const CLOUD_OUTSCATTER_AMBIENT: f32 = 0.9;
const CLOUD_AMBIENT_MINIMUM: f32 = 0.2;
const MIN_TRANSMITTANCE: f32 = 0.005;
const FAST_SKIP_MULT: f32 = 4.0;
const BLUE_NOISE_INTENSITY: f32 = 0.003;
const FADE_DISTANCE: f32 = 4000.0;


fn reMap(value: f32, oldLow: f32, oldHigh: f32, newLow: f32, newHigh: f32) -> f32 {
  return newLow + (value - oldLow) * (newHigh - newLow) / (oldHigh - oldLow);
}

fn mieScattering(theta: f32) -> f32 {
  return (3.0 / 4.0) * (1.0 + cos(theta) * cos(theta));
}

fn rayleighScattering(theta: f32) -> f32 {
  return  (3.0 / (16.0 * PI)) * (1.0 + cos(theta) * cos(theta));
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return (1.0 - t) * a + t * b;
}

fn saturate(x: f32) -> f32 {
  return clamp(x, 0.0, 1.0);
}

fn pow(x: f32, y: f32) -> f32 {
  return exp(y * log(x));
}

fn calculateLight(
    density: f32, 
    densityToSun: f32, 
    cosAngle: f32, 
    percentHeight: f32, 
    blueNoise: f32, 
    distAlongRay: f32,
    sunColor: vec3<f32>,
) -> vec3<f32> {
    let attenuationProb: f32 = attenuation(densityToSun, cosAngle);
    let ambientOutScatter: f32 = outScatterAmbient(density, percentHeight);
    let sunHighlight: f32 = inOutScatter(cosAngle);
    
    var lightEnergy: f32 = attenuationProb * sunHighlight * ambientOutScatter;
    
    // Apply distance fading and ambient minimums
    lightEnergy = max(density * CLOUD_AMBIENT_MINIMUM * (1.0 - pow(saturate(distAlongRay / FADE_DISTANCE), 2.0)), lightEnergy);
    
    // Slight noise dithering
    lightEnergy += blueNoise * BLUE_NOISE_INTENSITY;
    
    return sunColor * lightEnergy;
}

fn inOutScatter(cosAngle: f32) -> f32 {
    let firstHG: f32 = mieScattering(cosAngle) * CLOUD_INSCATTER;
    let secondHG: f32 = CLOUD_SILVER_INTENSITY * pow(saturate(cosAngle), CLOUD_SILVER_EXPONENT);
    let inScatterHG: f32 = max(firstHG, secondHG);
    let outScatterHG: f32 = rayleighScattering(cosAngle) * CLOUD_OUTSCATTER;
    return lerp(inScatterHG, outScatterHG, CLOUD_IN_VS_OUTSCATTER);
}

fn attenuation(densityToSun: f32, cosAngle: f32) -> f32 {
    let prim: f32 = exp(-CLOUD_BEER * densityToSun);
    let scnd: f32 = exp(-CLOUD_BEER * CLOUD_ATTENUATION_CLAMP) * 0.7;
    let checkVal: f32 = reMap(cosAngle, 0.0, 1.0, scnd, scnd * 0.5);
    return max(checkVal, prim);
}

fn outScatterAmbient(density: f32, percentHeight: f32) -> f32 {
    let depth: f32 = CLOUD_OUTSCATTER_AMBIENT * pow(density, reMap(percentHeight, 0.3, 0.9, 0.5, 1.0));
    let vertical: f32 = pow(saturate(reMap(percentHeight, 0.0, 0.3, 0.8, 1.0)), 0.8);
    let outScatter: f32 = 1.0 - saturate(depth * vertical);
    return outScatter;
}

fn angleBetweenVectors(A: vec3<f32>, B: vec3<f32>) -> f32 {
  let dotProduct = dot(A, B);
  let magnitudeA = length(A);
  let magnitudeB = length(B);
  let cosTheta = dotProduct / (magnitudeA * magnitudeB);
  return acos(clamp(cosTheta, -1.0, 1.0));
}


fn heightAlter(percentHeight: f32, coverage: f32) -> f32 {
    var retVal: f32 = saturate(reMap(percentHeight, 0.0, 0.07, 0.0, 1.0));
    let stopHeight: f32 = saturate(coverage - .12);
    retVal *= saturate(reMap(percentHeight, stopHeight * 0.2, stopHeight, 1.0, 0.0));
    retVal = pow(retVal, saturate(reMap(percentHeight, 0.35, 0.85, 1.0, 1.0 )));
    return retVal;
}

fn densityAlter(percentHeight: f32, coverage: f32) -> f32 {
    var retVal: f32 = percentHeight;
    retVal *= saturate(reMap(percentHeight, 0.0, 0.2, 0.0, 1.0));
    retVal *= coverage * 1.2;
    retVal *= saturate(reMap(pow(percentHeight, 0.85), 0.4, 0.95, 1.0, 0.2));
    retVal *= saturate(reMap(percentHeight, 0.9, 1.0, 1.0, 0.0));
    return retVal;
}


fn getDensity(noise: vec4<f32>, detailNoise: vec4<f32>,  curlNoise: vec4<f32>, percentHeight: f32, layer: f32, coverage: f32) -> f32 {
  var shapeNoise: f32 = saturate(pow( noise.g * 0.65 + noise.b * 0.25 + noise.a * 0.1 + 0.2, 1.0));
  var detail: f32 = pow( detailNoise.g * 0.25 + detailNoise.b * 0.15 + detailNoise.a * 0.1, 1.2 + (1.0 - coverage));

  shapeNoise = -(1.0 - shapeNoise);
  shapeNoise = reMap(noise.r, shapeNoise, 1.0, 0.0, 1.0);

  var detailModifier: f32 = lerp(detail, 1.0 - detail, saturate(percentHeight * 2.0));

  detailModifier *= .35 * exp(-coverage * .75);
  var finalDensity: f32 = saturate(reMap(shapeNoise, detailModifier, 1.0, 0.0, 1.0));

  return pow(finalDensity, 2.0) * densityAlter(percentHeight, coverage) * heightAlter(percentHeight, coverage);
}

fn isBlocked(ro: vec3<f32>, rd: vec3<f32>) -> f32 {
  var closestIntersection: f32 = 9999999.0;
  var oc: vec3<f32> = -ro;
  var b: f32 = dot(oc, rd);
  var c: f32 = dot(oc, oc) - SPHERE_RADIUS * SPHERE_RADIUS;
  var discriminant: f32 = b * b - c;

  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);

      if (t2 > 0.0 && t2 < closestIntersection) { closestIntersection = t2; }
      if (t1 > 0.0 && t1 < closestIntersection) { closestIntersection = t1; }
  }
  
  if (closestIntersection == 9999999.0) { closestIntersection = 0.0; }
  return closestIntersection;
}


fn calculateStepLength(ro: vec3<f32>, rd: vec3<f32>) -> f32 {
  var closestIntersection: f32 = 9999999.0;
  var oc: vec3<f32> = -ro;
  var b: f32 = dot(oc, rd);

  var c: f32 = dot(oc, oc) - OUTER_SPHERE_RADIUS * OUTER_SPHERE_RADIUS;
  var discriminant: f32 = b * b - c;

  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);
      if (t2 > 0.0 && t2 < closestIntersection) { closestIntersection = t2; }
  }
  
  c = dot(oc, oc) - SPHERE_RADIUS * SPHERE_RADIUS;
  discriminant = b * b - c;
  if (discriminant > 0.0) {
      let t1: f32 = b - sqrt(discriminant);
      let t2: f32 = b + sqrt(discriminant);
      if (t2 > 0.0 && t2 < closestIntersection) { closestIntersection = t2; }
      if (t1 > 0.0 && t1 < closestIntersection) { closestIntersection = t1; }
  }
  
  if (closestIntersection == 9999999.0) { closestIntersection = 0.0; }
  return closestIntersection;
}


fn getLod() -> f32 {
    let distance: f32 = length(SPHERE_CENTER - uni.cameraPosition.xyz);
    let lod: f32 = mix(HIGH_LOD, LOW_LOD, clamp(distance / LOD_DISTANCE_THRESHOLD, 0.0, 1.0));
    return lod;
}

fn getScale(altitude: f32, layer: f32) -> f32 {
   if (layer == 1.0) {
      return reMap(altitude, LAYER_1_OFFSET, LAYER_1_BUFFER, 0.0, 1.0);
   } else if (layer == 2.0) {
      return reMap(altitude, LAYER_2_OFFSET, LAYER_2_BUFFER, 0.0, 1.0);
   } else if (layer == 3.0) {
      return reMap(altitude, LAYER_3_OFFSET, SPHERE_OFFSET, 0.0, 1.0);
   }
   return 0.0;
}

fn getLayer(altitude: f32) -> f32 {
    if (altitude < SPHERE_OFFSET && altitude > LAYER_3_OFFSET) {
      return 3.0;
    } else if (altitude < LAYER_2_BUFFER && altitude > LAYER_2_OFFSET) {
      return 2.0;
    } else if (altitude < LAYER_1_BUFFER && altitude > LAYER_1_OFFSET) {
      return 1.0;
    }
    return 0.0;
}

fn getCoverage(layer: f32, coverage: vec4<f32>) -> f32 {
  if(layer == 1.0){
    return coverage.r;
  } else if(layer == 2.0){
    return coverage.g;
  } else if(layer == 3.0){
    return coverage.b;
  }
  return 0.0;
}

fn getSamples(innerSpherePoint: vec3<f32>, sphereUV: vec2<f32>, layer: f32, coverage: f32, lod: f32) -> Samples {
  let coverageFactor: f32 = clamp(1.0 - coverage, 0.7, 1.0);
  let baseCoord: vec3<f32> = innerSpherePoint * lod * coverageFactor;
  
  var noise: vec4<f32> = textureSampleLevel(noise_texture, noise_sampler, baseCoord * (1.0 + layer * 0.2), 0.0);
  var detailNoise: vec4<f32> = textureSampleLevel(detail_noise_texture, detail_noise_sampler, baseCoord * (0.5 + layer * 0.2), 0.0);
  var blueNoise: vec4<f32> = textureSampleLevel(bluenoise_texture, bluenoise_sampler, sphereUV, 0.0);
  
  return Samples(noise, detailNoise, noise, blueNoise);
}

fn getSphereUV(currentPoint: vec3<f32>) -> vec2<f32> {
  let innerSpherePoint: vec3<f32> = SPHERE_CENTER + normalize(currentPoint - SPHERE_CENTER) * SPHERE_RADIUS;
  return vec2<f32>(
    0.5 + atan2(innerSpherePoint.z - SPHERE_CENTER.z, innerSpherePoint.x - SPHERE_CENTER.x) / (2.0 * PI),
    0.5 - asin((innerSpherePoint.y - SPHERE_CENTER.y) / SPHERE_RADIUS) / PI
  );
}

fn calculateLightness(currentPoint: vec3<f32>, lightPosition: vec3<f32>, scale: f32) -> f32 {
    let dotProduct: f32 = dot(lightPosition, currentPoint);
    return 1.0 - (1.0 / (1.0 + exp(-dotProduct * scale)));
}

fn calculateCloudVariables(currentPoint: vec3<f32>, sphereCenter: vec3<f32>, sphereRadius: f32) -> CloudVariables {
  let distanceToCenter: f32 = length(currentPoint - sphereCenter);
  let altitude: f32 = distanceToCenter - sphereRadius;
  let layer: f32 = getLayer(altitude);
  let scale: f32 = getScale(altitude, layer);
  return CloudVariables(altitude, layer, scale);
}


fn sunRaymarch(currentPoint: vec3<f32>, rayDirection: vec3<f32>, cloudDensity: f32, stepLength: f32, lightness: f32, lod: f32) -> SunRaymarchOutput {

  var sunDensity: f32 = 0.0;
  var light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var lightPosition: vec3<f32>;
  let moonPosition: vec3<f32> = vec3<f32>(-lightUniforms.lightPosition.x, -lightUniforms.lightPosition.y, -lightUniforms.lightPosition.z);
        
  if(lightness >= 0.5 || lightUniforms.lightType == 1.0) {
    lightPosition = lightUniforms.lightPosition;
  } else if (lightness < 0.5 || lightUniforms.lightType == 0.0) {
    lightPosition = moonPosition;
  }

  let sunRayDirection: vec3<f32> = normalize(currentPoint - lightPosition);
  var sunPoint: vec3<f32> = currentPoint;
  
  var angle: f32;
  var sunLightness: f32 = calculateLightness(sunPoint, lightUniforms.lightPosition, 20.0);

  if (lightUniforms.lightType == 1.0) {
    angle = 0.5;
    sunLightness = 1.0;
  } else if (lightUniforms.lightType == 0.5) {
    angle = 0.5;
    sunLightness = clamp(lightness, 0.5, 1.0);
  } else if (lightUniforms.lightType == 0.0) {
    angle = 0.5;
    sunLightness = 0.5;
  }

  for (var k: f32 = 0.0; k <= 1.0; k += 1.0) {
        sunPoint += sunRayDirection * stepLength;

        let sphereUV: vec2<f32> = getSphereUV(sunPoint);
        let cloudVars: CloudVariables = calculateCloudVariables(sunPoint, SPHERE_CENTER, SPHERE_RADIUS);
        var coverage: f32 = getCoverage(cloudVars.layer, textureSampleLevel(cloud_texture, cloud_sampler, sphereUV, 0.0));
        
        if (coverage > 0.05) {
          var samples: Samples = getSamples(sunPoint, sphereUV, cloudVars.layer, coverage, lod);
          var newSunColor: vec3<f32> = mix(MOON_COLOR, SUN_COLOR, sunLightness);
          var density: f32 = getDensity(samples.noise, samples.detailNoise, samples.curlNoise, cloudVars.scale, cloudVars.layer, coverage);
          sunDensity += density;

          if (sunDensity > 0.05) {
            light += calculateLight(cloudDensity, sunDensity, angle, 1.0 - cloudVars.scale, samples.blueNoise.r, 1.0, newSunColor) * lightUniforms.rayleighIntensity * sunLightness;  
          }
        }
  }
  
  return SunRaymarchOutput(sunDensity, light);
}


fn raymarch(rayOrigin: vec3<f32>, rayDirection: vec3<f32>, lod: f32) -> RaymarchOutput {

  var maxLength: f32 = calculateStepLength(rayOrigin, rayDirection);
  var stepLength: f32 = cloudUniforms.raymarchSteps;
  var currentPoint: vec3<f32> = rayOrigin; 

  var light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var transmittance: f32 = 1.0;
  var density: f32 = 0.0;
  var distance: f32 = 0.0;

  if (maxLength == 0.0) {
      return RaymarchOutput(vec3(0.0, 0.0, 0.0), 1.0);
  }

  while (distance <= maxLength) {
      // Adaptive step length: larger steps in clear sky, finer in dense cloud
      let densityFactor: f32 = saturate(density * 4.0);
      let curStepLength: f32 = mix(stepLength * FAST_SKIP_MULT, stepLength * 0.5, densityFactor) * (distance + 1.0);

      currentPoint += rayDirection * curStepLength;
      distance += curStepLength;

      let sphereUV: vec2<f32> = getSphereUV(currentPoint);
      let cloudVars: CloudVariables = calculateCloudVariables(currentPoint, SPHERE_CENTER, SPHERE_RADIUS);
      let coverage: f32 = getCoverage(cloudVars.layer, textureSampleLevel(cloud_texture, cloud_sampler, sphereUV, 0.0));

      if (coverage < 0.05) {
          // Skip quickly through almost empty space
          density = 0.0;
          continue;
      }

      var samples: Samples = getSamples(currentPoint, sphereUV, cloudVars.layer, coverage, lod);
      density = getDensity(samples.noise, samples.detailNoise, samples.curlNoise, cloudVars.scale, cloudVars.layer, coverage) * cloudUniforms.density * 2.0;

      if (density > 0.05) {
          let lightness: f32 = calculateLightness(currentPoint, lightUniforms.lightPosition, 1.0);
          let sunRaymarchOutput: SunRaymarchOutput = sunRaymarch(currentPoint, rayDirection, density, curStepLength, lightness, lod);
          light += sunRaymarchOutput.light;
          transmittance *= exp(-density);
          if (transmittance < MIN_TRANSMITTANCE) {
              break;
          }
      }
  } 

  return RaymarchOutput(light, transmittance);
}

@vertex fn vs(input: Input, @builtin(vertex_index) vertexIndex: u32) -> Output {
  var output: Output;
  let mPosition: vec4<f32> = uni.modelMatrix * input.position;
  let displacement: vec4<f32> = vec4<f32>(normalize(mPosition.xyz) * SPHERE_OFFSET, 0.0);
  let worldPosition: vec4<f32> = mPosition + displacement;
  
  output.Position = uni.viewProjectionMatrix * worldPosition;
  output.vPosition = worldPosition;
  output.vNormal = normalize(uni.normalMatrix * input.normal);
  output.vUV = input.uv;
  return output;
} 


@fragment fn fs(output: Output) -> @location(0) vec4<f32> {
  let rayOrigin: vec3<f32> = output.vPosition.xyz;
  let rayDirection: vec3<f32> = normalize(rayOrigin - uni.cameraPosition.xyz);

  // Compute LOD once per-fragment and pass downstream
  let globalLod: f32 = getLod();

  // Cloud raymarching
  let cloudValues: RaymarchOutput = raymarch(rayOrigin, rayDirection, globalLod);

  var cloudColor: vec3<f32> = cloudValues.light + BASE_COLOR; 

  var cloudTransmittance: f32 = clamp(cloudValues.transmittance, 0.0, 1.0);

  // Atmosphere raymarching
  let atmoValues: RayMarchAtmoOutput = atmoRaymarch(rayOrigin, rayDirection);
  var atmoColor: vec3<f32> = atmoValues.light;
  var atmoTransmittance: f32 = atmoValues.transmittance;

  // Blending
  var blendedColor: vec3<f32> = cloudColor * cloudUniforms.visibility * (1.0 - cloudTransmittance);
  blendedColor += atmoColor * (cloudTransmittance + (1.0 - cloudUniforms.visibility)) * cloudUniforms.atmoVisibility;
  
  var blendedTransmittance: f32;
  blendedTransmittance = clamp(cloudTransmittance + (1.0 - cloudUniforms.visibility), 0.0, 1.0) * clamp(atmoTransmittance + (1.0 - cloudUniforms.atmoVisibility), 0.0, 1.0);

  // subtle blue-noise dithering to reduce banding
  let dither: vec3<f32> = textureSampleLevel(bluenoise_texture, bluenoise_sampler, output.vUV * 128.0, 0.0).rgb;
  blendedColor += dither * BLUE_NOISE_INTENSITY;

  // Clamp final colour for safety
  blendedColor = clamp(blendedColor, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0));

  return vec4<f32>(blendedColor, (1.0 - blendedTransmittance));
}


fn atmoRay(point: vec3<f32>, sunDirection: vec3<f32>) -> vec3<f32> {
    let scatteringCoeff: vec3<f32> = vec3<f32>(0.002, 0.003, 0.004); 
    let dotProduct: f32 = dot(point, sunDirection);
    return scatteringCoeff * max(dotProduct, 0.0);
}


fn atmoRaymarch(rayOrigin: vec3<f32>, rayDirection: vec3<f32>) -> RayMarchAtmoOutput {
    var currentPoint: vec3<f32> = rayOrigin; 
    var maxLength: f32 = calculateStepLength(rayOrigin, rayDirection);
    var stepLength: f32 = 1.0 / (20.0 * cloudUniforms.sunDensity);

    var lightPosition: vec3<f32>;
    let moonPosition: vec3<f32> = vec3<f32>(-lightUniforms.lightPosition.x, -lightUniforms.lightPosition.y, -lightUniforms.lightPosition.z);
    var lightness: f32 = calculateLightness(currentPoint, lightUniforms.lightPosition, 2.0);

    if (lightUniforms.lightType == 1.0) {
      lightPosition = lightUniforms.lightPosition;
    } else if (lightUniforms.lightType == 0.0) {
      lightPosition = moonPosition;
    } else {
      lightPosition = mix(lightUniforms.lightPosition, moonPosition, lightness);
    }

    var distance: f32 = 0.0;
    var accumulatedLight: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var transmittance: f32 = 1.0;

    var sunLightness: f32;

    while (distance <= maxLength) {
        var sunDirection: vec3<f32> = normalize(lightUniforms.lightPosition - currentPoint);
        var moonDirection: vec3<f32> = normalize(moonPosition - currentPoint);
        lightness = calculateLightness(currentPoint, lightUniforms.lightPosition, 2.0);
        
        // These theta calculations were unused in original, but keeping code stucture roughly similar just in case
        // var thetaA = angleBetweenVectors(rayDirection, sunDirection);
        // var thetaB = angleBetweenVectors(rayDirection, moonDirection);

        let sunRayDirection: vec3<f32> = normalize(currentPoint - lightUniforms.lightPosition);

        if (lightUniforms.lightType == 1.0) {
          sunLightness = 1.0;
        } else if (lightUniforms.lightType == 0.5) {
          sunLightness = lightness;
        } else if (lightUniforms.lightType == 0.0) {
          sunLightness = 0.00;
        }

        let scatter: vec3<f32> = atmoRay(currentPoint, sunRayDirection);
        accumulatedLight += scatter * (1.0 - transmittance);
        transmittance *= 0.95 * clamp(1.0 - sunLightness, 0.99, 1.0); 
        
        currentPoint += rayDirection * stepLength;
        distance += stepLength;
    } 

    return RayMarchAtmoOutput(accumulatedLight, pow(transmittance, 2.0));
}