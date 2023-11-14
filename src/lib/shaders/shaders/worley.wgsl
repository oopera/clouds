

fn rq(dividend: vec3<i32>, divisor: i32) -> vec3<u32> {
    let quotient: vec3<i32> = dividend / divisor;
    let remainder: vec3<i32> = dividend - (quotient * divisor);
    return vec3<u32>(remainder);
}

fn hash33(p: vec3<u32>) -> vec3<f32> {
    var q: vec3<u32> = p * vec3<u32>(1597334673u, 3812015801u, 2798796415u);
    q = vec3<u32>(q.x ^ q.y ^ q.z) * vec3<u32>(1597334673u, 3812015801u, 2798796415u);
    return vec3<f32>(-1.0 + 2.0 * vec3<f32>(q) / 4294967295.0);
}

fn remap(x: f32, a: f32, b: f32, c: f32, d: f32) -> f32 {
    return (((x - a) / (b - a)) * (d - c)) + c;
}

// Gradient noise by iq (modified to be tileable)
fn gradientNoise(x: vec3<f32>, freq: f32) -> f32 {
    // grid
    let p: vec3<i32> = vec3<i32>(floor(x));
    let w: vec3<f32> = fract(x);

    // quintic interpolant
    let u: vec3<f32> = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);

    // gradients
    let ga: vec3<f32> = hash33(rq(p + vec3<i32>(0, 0, 0), i32(freq))) * 0.5 + 0.5;
    let gb: vec3<f32> = hash33(rq(p + vec3<i32>(1, 0, 0), i32(freq))) * 0.5 + 0.5;
    let gc: vec3<f32> = hash33(rq(p + vec3<i32>(0, 1, 0), i32(freq))) * 0.5 + 0.5;
    let gd: vec3<f32> = hash33(rq(p + vec3<i32>(1, 1, 0), i32(freq))) * 0.5 + 0.5;
    let ge: vec3<f32> = hash33(rq(p + vec3<i32>(0, 0, 1), i32(freq))) * 0.5 + 0.5;
    let gf: vec3<f32> = hash33(rq(p + vec3<i32>(1, 0, 1), i32(freq))) * 0.5 + 0.5;
    let gg: vec3<f32> = hash33(rq(p + vec3<i32>(0, 1, 1), i32(freq))) * 0.5 + 0.5;
    let gh: vec3<f32> = hash33(rq(p + vec3<i32>(1, 1, 1), i32(freq))) * 0.5 + 0.5;

    // projections
    let va: f32 = dot(ga, w - vec3<f32>(0.0, 0.0, 0.0));
    let vb: f32 = dot(gb, w - vec3<f32>(1.0, 0.0, 0.0));
    let vc: f32 = dot(gc, w - vec3<f32>(0.0, 1.0, 0.0));
    let vd: f32 = dot(gd, w - vec3<f32>(1.0, 1.0, 0.0));
    let ve: f32 = dot(ge, w - vec3<f32>(0.0, 0.0, 1.0));
    let vf: f32 = dot(gf, w - vec3<f32>(1.0, 0.0, 1.0));
    let vg: f32 = dot(gg, w - vec3<f32>(0.0, 1.0, 1.0));
    let vh: f32 = dot(gh, w - vec3<f32>(1.0, 1.0, 1.0));

    // interpolation
    return va +
           u.x * (vb - va) +
           u.y * (vc - va) +
           u.z * (ve - va) +
           u.x * u.y * (va - vb - vc + vd) +
           u.y * u.z * (va - vc - ve + vg) +
           u.z * u.x * (va - vb - ve + vf) +
           u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
}

// Tileable 3D worley noise
fn worleyNoise(uv: vec3<f32>, freq: f32) -> f32 {
    let id: vec3<i32> = vec3<i32>(floor(uv));
    let p: vec3<f32> = fract(uv);
    var minDist: f32 = 10000.0;

    for (var x: f32 = -1.0; x <= 1.0; x += 1.0) {
        for (var y: f32 = -1.0; y <= 1.0; y += 1.0) {
            for (var z: f32 = -1.0; z <= 1.0; z += 1.0) {
                let offset: vec3<f32> = vec3<f32>(x, y, z);
                var h: vec3<f32> = hash33(rq(id + vec3<i32>(offset), i32(freq))) * 0.5 + 0.5;
                h += offset;
                let d: vec3<f32> = p - h;
                minDist = min(minDist, dot(d, d));
            }
        }
    }

    // inverted worley noise
    return 1.0 - minDist;
}

// Fbm for Perlin noise based on iq's blog
fn perlinfbm(p: vec3<f32>, freq: f32, octaves: i32) -> f32 {
    let G: f32 = exp2(-0.85);
    var amp: f32 = 1.0;
    var noise: f32 = 0.0;
    var newfreg: f32 = freq;

    for (var i: i32 = 0; i < octaves; i = i + 1) {
        noise = noise + amp * gradientNoise(p * freq, freq);
        newfreg = freq * 2.0;
        amp = amp * G;
    }

    return noise;
}

// Tileable Worley fbm inspired by Andrew Schneider's Real-Time Volumetric Cloudscapes
// chapter in GPU Pro 7.
fn worleyFbm(p: vec3<f32>, freq: f32) -> f32 {
    return worleyNoise(p * freq, freq) * 0.625 +
           worleyNoise(p * freq * 2.0, freq * 2.0) * 0.25 +
           worleyNoise(p * freq * 4.0, freq * 4.0) * 0.125;
}