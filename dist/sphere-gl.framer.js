/*! sphere-gl v1.2.0 | MIT License | (c) 2026 Denis S. | https://github.com/denissitnikov/sphere-gl */
import{createElement as kt,useEffect as tt,useRef as ot}from"react";import{addPropertyControls as At,ControlType as V}from"framer";var Ve={mesh:0,sphere:1,silk:2},ht={light:0,split:1,dark:2},ut=`#version 300 es
precision highp float;

out vec2 v_uv;

void main() {
    float x = (gl_VertexID == 1) ? 3.0 : -1.0;
    float y = (gl_VertexID == 2) ? 3.0 : -1.0;
    // CSS UV convention: (0, 0) top-left -> (1, 1) bottom-right
    v_uv = vec2(0.5 * (x + 1.0), 0.5 * (1.0 - y));
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,mt=`#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
out vec4 fragColor;

// xy = framebuffer (width, height), zw = isotropic metric scale (width/ref, height/ref)
uniform vec4 u_viewport;
// x = style (0=mesh, 1=sphere, 2=silk), y = isDark (0|1), z = time, w = mood (0|1|2)
uniform vec4 u_modeTime;
// Base & atmospheric bloom colors in perceptual OKLab (L, a, b)
uniform vec3 u_baseLab;
uniform vec3 u_bloomLab;
// xy = bloomPos (CSS UV 0..1), z = bloomRadius, w = bloomStrength
uniform vec4 u_bloomGeom;
// xy = bridgeDir (2D unit vector in OKLab a,b), zw = pointer offset (-1..1)
uniform vec4 u_bridgePointer;
// xy = warp.phase, z = warp.scale, w = warp.amount
uniform vec4 u_warpParams;
// xy = flowDir (cos(flowAngle), sin(flowAngle)), z = warp.foldStrength, w = unused
uniform vec4 u_flowFold;
// x = scatterLift, y = chromaPreserve, z = vignette, w = effectiveGrain
uniform vec4 u_lighting;
// 32-bit PCG seed derived from scene.seed
uniform uint u_grainSeed;

// Prepacked 6-pole uniform arrays (zero per-pixel trig or division):
// u_poleLabWeight[i]  = (L, a, b, weight)
// u_polePosRadSoft[i] = (posX, posY, radius, softness)
// u_poleTransform[i]  = (invStretchX, invStretchY, cosAngle, sinAngle)
uniform vec4 u_poleLabWeight[6];
uniform vec4 u_polePosRadSoft[6];
uniform vec4 u_poleTransform[6];

// -----------------------------------------------------------------------------
// Analytical 2D Simplex Noise (Gustavson / Ashima, origin-bias-free +10 permute)
// -----------------------------------------------------------------------------
vec3 mod289_3(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289_2(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289_3(((x * 34.0) + 10.0) * x);
}

float snoise(vec2 v) {
    const vec4 C = vec4(
        0.211324865405187,
        0.366025403784439,
       -0.577350269189626,
        0.024390243902439
    );
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod289_2(i);
    vec3 p = permute(
        permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
    );

    vec3 m = max(
        0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
        0.0
    );
    m = m * m;
    m = m * m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// C2-continuous quintic smootherstep (zero 1st & 2nd derivative kinks -> zero Mach bands)
float smootherstep01(float x) {
    float t = clamp(x, 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// -----------------------------------------------------------------------------
// Exact Bj\xF6rn Ottosson OKLab -> Linear sRGB
// -----------------------------------------------------------------------------
vec3 oklabToLinearSRGB(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;

    return vec3(
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

// -----------------------------------------------------------------------------
// Hue-Preserving C1 Soft-Shoulder Gamut Compression in Linear sRGB
// Smoothly compresses out-of-gamut excursions (<0 or >1) toward perceptual
// luminance Y so vivid sunset oranges, cerulean blues, and magentas never flat-clip.
// -----------------------------------------------------------------------------
vec3 softGamutCompress(vec3 rgb) {
    // 1. Gentle highlight roll-off if total luminance approaches 1.0
    float rawY = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    float Y = clamp(rawY, 1e-4, 0.9999);
    if (rawY > 0.88) {
        float excess = rawY - 0.88;
        Y = 0.88 + 0.1199 * (excess / (excess + 0.1199));
    }

    vec3 chroma = rgb - vec3(rawY);

    // Measure relative excursion toward lower (0.0) and upper (1.0) gamut faces
    vec3 eLow = max(vec3(0.0), -chroma) / Y;
    vec3 eHigh = max(vec3(0.0), chroma) / (1.0 - Y);
    vec3 eVec = max(eLow, eHigh);
    float e = max(eVec.r, max(eVec.g, eVec.b));

    // C1 rational shoulder starting at 82% of gamut boundary, asymptotic to 1.0
    const float KNEE = 0.82;
    const float HEADROOM = 1.0 - KNEE;
    if (e > KNEE) {
        float x = e - KNEE;
        float eComp = KNEE + HEADROOM * (x / (x + HEADROOM));
        chroma *= (eComp / e);
    }

    return clamp(vec3(Y) + chroma, 0.0, 1.0);
}

// Exact IEC 61966-2-1 Linear sRGB -> sRGB transfer
vec3 linearToSRGB(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(1e-5)), vec3(1.0 / 2.4)) - 0.055;
    return mix(hi, lo, lessThanEqual(c, vec3(0.0031308)));
}

// -----------------------------------------------------------------------------
// 32-bit PCG Integer Bit-Mixing Hash -> Zero-Mean Triangular-PDF Film Grain
// Crisp, artifact-free across 4K/5K Retina on Apple Silicon Metal & mobile GPUs.
// -----------------------------------------------------------------------------
uint pcgHash(uint v) {
    uint state = v * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float triangularFilmGrain(uvec2 px, uint seed) {
    uint base = px.x * 1664525u + px.y * 1013904223u + seed * 2246822519u;
    uint h1 = pcgHash(base);
    uint h2 = pcgHash(base ^ 2654435769u);
    float u1 = float(h1 >> 8u) * (1.0 / 16777216.0);
    float u2 = float(h2 >> 8u) * (1.0 / 16777216.0);
    return (u1 + u2) - 1.0;
}

void main() {
    vec2 uv = v_uv;
    vec2 metric = u_viewport.zw;
    int style = int(u_modeTime.x + 0.5);
    float isDark = u_modeTime.y;
    float time = u_modeTime.z;

    vec2 flowDir = u_flowFold.xy;
    vec2 flowPerp = vec2(-flowDir.y, flowDir.x);
    float foldStrength = u_flowFold.z;

    float warpScale = u_warpParams.z;
    float warpAmount = u_warpParams.w;
    vec2 pointer = u_bridgePointer.zw;

    // Centered isotropic coordinates for aspect-invariant noise & ribbon topology
    vec2 pMetric = (uv - 0.5) * metric;

    // Gentle laminar time drift (identically zero when time == 0.0)
    vec2 timeDrift = flowDir * (time * 0.055) + flowPerp * (sin(time * 0.21) * 0.045);

    // -------------------------------------------------------------------------
    // Stage 1: Style-Specific Domain Warp & Harmonic Silk Ribbon Field
    // -------------------------------------------------------------------------
    vec2 warpOffset = vec2(0.0);
    float silkSheen = 0.0;
    float silkTrough = 0.0;

    if (style == 1) {
        // SPHERE mode: whisper-subtle low-frequency atmospheric mist drift only
        vec2 qSphere = pMetric * (warpScale * 0.60) + u_warpParams.xy + timeDrift * 0.55;
        float m1 = snoise(qSphere);
        float m2 = snoise(qSphere + vec2(4.3, -2.1));
        warpOffset = vec2(m1, m2) * (warpAmount * 0.62);
    } else {
        // MESH & SILK modes: smooth 2-octave iterative curl/flow simplex warp
        vec2 q0 = pMetric * warpScale + u_warpParams.xy + timeDrift;
        float n1 = snoise(q0);
        float n2 = snoise(q0 * 1.06 + vec2(5.2, 1.3));

        vec2 q1 = q0 * 1.82 + vec2(n1, n2) * 0.62 + vec2(-3.7, 4.1) - timeDrift * 0.65;
        vec2 oct2 = vec2(
            snoise(q1),
            snoise(q1 + vec2(2.9, -4.6))
        );

        vec2 billow = vec2(n1, n2) * 0.72 + oct2 * 0.28 + flowDir * (n1 * 0.22);
        warpOffset = billow * warpAmount;

        if (style == 2) {
            // SILK mode: harmonic ribbon folds along warped flow lines + satin crest lift
            float along = dot(pMetric, flowDir);
            float across = dot(pMetric, flowPerp);
            float ribbonPhase = across * (warpScale * 2.30)
                              + n1 * 1.58
                              + oct2.x * 0.48
                              + along * 0.40
                              + time * 0.16;

            float foldWave = sin(ribbonPhase) + 0.28 * sin(ribbonPhase * 2.0 + 0.75);
            float crestRaw = 0.5 + 0.5 * cos(ribbonPhase + n2 * 0.32);
            float foldAmt = clamp(foldStrength, 0.0, 1.6);
            float sheenAmt = clamp(foldStrength * 1.85, 0.0, 1.4);

            silkSheen = pow(crestRaw, 2.25) * sheenAmt;
            silkTrough = pow(1.0 - crestRaw, 2.10) * sheenAmt;

            warpOffset += (flowPerp * (foldWave * 0.16) + flowDir * (cos(ribbonPhase) * 0.058)) * foldAmt;
        } else if (foldStrength > 0.001) {
            // Optional gentle watercolor wave modulation in MESH mode
            float meshWave = sin(dot(pMetric, flowPerp) * (warpScale * 1.65) + n1 * 1.35);
            warpOffset += flowPerp * (meshWave * foldStrength * 0.085);
        }
    }

    // Effective bloom position with subtle parallax
    vec2 bloomPos = u_bloomGeom.xy + pointer * 0.018;

    // -------------------------------------------------------------------------
    // Stage 2: Perceptual OKLab Field Accumulation (Base + 6 Poles + Bloom)
    // -------------------------------------------------------------------------
    float baseW = (style == 1) ? 0.82 : 0.58;
    vec3 sumLab = u_baseLab * baseW;
    float sumChroma = length(u_baseLab.yz) * baseW;
    float totalW = baseW;

    for (int i = 0; i < 6; i++) {
        vec4 lw = u_poleLabWeight[i];
        float poleWeight = lw.w;
        if (poleWeight <= 0.0001) {
            continue;
        }

        vec4 prs = u_polePosRadSoft[i];
        vec4 tr = u_poleTransform[i];
        float fi = float(i);

        // Subtle per-pole orbital breath (0 when time == 0) + layered pointer parallax
        vec2 motionShift = vec2(0.0);
        if (abs(time) > 1e-5) {
            float rate = 0.17 + 0.031 * fi;
            float ph = fi * 2.0943951;
            motionShift = vec2(sin(time * rate + ph), cos(time * (rate * 0.83) + ph)) * (0.022 + 0.004 * fi);
        }
        float depthParallax = 0.012 + 0.005 * fi;
        vec2 polePos = prs.xy + motionShift + pointer * depthParallax;
        float radius = max(prs.z, 0.05);
        float softness = clamp(prs.w, 0.05, 1.6);

        // Aspect-corrected vector from pole center to warped fragment
        vec2 dVec = (uv - polePos) * metric + warpOffset;

        // Rotate by -angle and scale by inverse stretch (precomputed on CPU)
        vec2 local = vec2(
            ( dVec.x * tr.z + dVec.y * tr.w) * tr.x,
            (-dVec.x * tr.w + dVec.y * tr.z) * tr.y
        );
        float dist = length(local);

        vec3 poleLab = lw.xyz;
        float w = 0.0;

        if (style == 1) {
            // SPHERE mode: wide-aperture 3D volumetric sphere + optical halo + 3D light bias
            float sphereR = max(radius * 0.52, 0.04);
            float rNorm = dist / sphereR;
            float blurW = 0.24 + 0.62 * softness;

            float tEdge = (rNorm - (1.0 - blurW * 0.85)) / max(1.75 * blurW, 1e-3);
            float apertureDisc = 1.0 - smootherstep01(tEdge);

            // Soft 3D spherical chord thickness profile
            float chord = sqrt(max(0.0, 1.0 - min(rNorm * rNorm * 0.55, 0.85)));
            // Wide Gaussian atmospheric scattering veil
            float halo = exp(-pow(max(rNorm, 1e-4) / (1.06 + 0.52 * softness), 2.15));

            float density = apertureDisc * (0.62 + 0.24 * chord) + halo * 0.30;

            // Internal 3D directional illumination bias toward bloomPos
            vec2 toBloom = (bloomPos - polePos) * metric;
            float toBloomLen = length(toBloom);
            vec2 lightDir = (toBloomLen > 1e-3) ? (toBloom / toBloomLen) : vec2(0.0, -1.0);

            float rawFacing = clamp(
                dot(dVec / max(sphereR * (1.08 + 0.38 * softness), 0.04), lightDir),
                -1.0,
                1.0
            );
            float lightWrap = rawFacing * (1.25 - 0.25 * rawFacing * rawFacing) * 0.80;

            poleLab.x = clamp(
                poleLab.x + lightWrap * 0.078 + (chord - 0.72) * 0.035,
                0.02,
                0.99
            );
            poleLab.yz = mix(poleLab.yz, u_bloomLab.yz, max(0.0, lightWrap) * 0.14);

            w = poleWeight * density * 2.45;
        } else if (style == 2) {
            // SILK mode: elongated flowing ribbon fields modulated along fold crests
            float effRadius = max(radius * (0.44 + 0.24 * softness), 0.035);
            float p = clamp(1.98 - 0.42 * softness, 1.38, 2.20);
            float falloff = exp(-pow(max(dist / effRadius, 1e-5), p));
            w = poleWeight * falloff * (1.58 + 0.26 * silkSheen);
        } else {
            // MESH mode: ultra-feathered super-Gaussian watercolor clouds
            float effRadius = max(radius * (0.40 + 0.22 * softness), 0.035);
            float p = clamp(2.10 - 0.50 * softness, 1.35, 2.28);
            float falloff = exp(-pow(max(dist / effRadius, 1e-5), p));
            w = poleWeight * falloff * 1.65;
        }

        sumLab += poleLab * w;
        sumChroma += length(poleLab.yz) * w;
        totalW += w;
    }

    // Wide diffused atmospheric bloom glow around bloomPos
    float bloomStrength = max(u_bloomGeom.w, 0.0);
    if (bloomStrength > 0.0001) {
        vec2 bloomDelta = (uv - bloomPos) * metric + warpOffset * 0.35;
        float bNorm = length(bloomDelta) / max(u_bloomGeom.z * 0.68, 0.05);
        float bloomFalloff = 0.62 * exp(-pow(max(bNorm, 1e-4), 1.65))
                           + 0.38 / (1.0 + bNorm * bNorm * 1.35);
        float bloomW = bloomStrength * bloomFalloff * ((style == 1) ? 1.35 : 1.05);

        sumLab += u_bloomLab * bloomW;
        sumChroma += length(u_bloomLab.yz) * bloomW;
        totalW += bloomW;
    }

    vec3 blendedLab = sumLab / totalW;
    float avgChroma = sumChroma / totalW;

    // -------------------------------------------------------------------------
    // Stage 3: Anti-Muddy Chroma-Loss Scatter Lift & Opposing-Chord Bridge Arc
    // Analytically detects opposing hue transitions (e.g. cerulean <-> tangerine)
    // and lifts L + arcs (a,b) along bridgeDir instead of collapsing through gray.
    // -------------------------------------------------------------------------
    float chromaLoss = max(0.0, avgChroma - length(blendedLab.yz));
    float rawLift = max(0.0, u_lighting.x);
    float liftGain = (rawLift <= 0.22) ? (rawLift * 3.2) : (0.704 + (rawLift - 0.22) * 0.85);
    blendedLab.x += chromaLoss * liftGain;
    blendedLab.yz += u_bridgePointer.xy * (chromaLoss * u_lighting.y * 0.42);

    // Satin ribbon crest sheen & trough depth in SILK mode
    if (style == 2) {
        float crestGain = mix(0.052, 0.078, isDark);
        float troughGain = mix(0.020, 0.036, isDark);
        blendedLab.x += silkSheen * crestGain - silkTrough * troughGain;
        blendedLab.yz *= (1.0 + silkSheen * 0.07);
    }

    // Smooth optical lens vignette in perceptual lightness L (supports negative edge lift in light mood)
    float vignette = clamp(u_lighting.z, -0.25, 0.35);
    if (abs(vignette) > 0.0005) {
        vec2 vigUv = uv - 0.5;
        float vigR2 = dot(vigUv, vigUv) * 2.2;
        float vigMask = smootherstep01((vigR2 - 0.08) / 1.18);
        blendedLab.x -= vignette * vigMask;
    }

    blendedLab.x = clamp(blendedLab.x, 0.0, 1.0);

    // -------------------------------------------------------------------------
    // Stage 4: OKLab -> Linear sRGB -> Soft Gamut Compression -> sRGB + Grain
    // -------------------------------------------------------------------------
    vec3 linRGB = oklabToLinearSRGB(blendedLab);
    linRGB = softGamutCompress(linRGB);
    vec3 srgb = linearToSRGB(linRGB);

    // Physical-pixel monochromatic triangular-PDF film grain
    float effectiveGrain = u_lighting.w;
    if (effectiveGrain > 0.0) {
        float g = triangularFilmGrain(uvec2(gl_FragCoord.xy), u_grainSeed);
        // Subtle emulsion response roll-off at extreme black/white endpoints
        float luma = dot(srgb, vec3(0.299, 0.587, 0.114));
        float emulsionMask = mix(0.58, 1.0, clamp(4.0 * luma * (1.0 - luma), 0.0, 1.0));
        srgb = clamp(srgb + vec3(g * effectiveGrain * emulsionMask), 0.0, 1.0);
    }

    fragColor = vec4(srgb, 1.0);
}
`;function Ye(e){let t=String(e??"sphere-default"),o=2166136261;for(let a=0;a<t.length;a++)o^=t.charCodeAt(a),o=Math.imul(o,16777619)>>>0;return o>>>0}function Qe(e,t){let o=Math.max(0,Number.isFinite(t)?t:1);if(o===0)return 0;let a=Math.max(0,Number.isFinite(e)?e:.026),s=a<=.065?a:.065+.03*Math.tanh((a-.065)*2.5);return Math.max(1/255,s*o)}function ft(e,t){let o=Math.max(1,Math.min(e,t)),a=Math.sqrt(Math.max(1,e*t)),s=o+(a-o)*.22;return[e/s,t/s]}function dt(e,t,o,a,s){let n=e+.3963377774*t+.2158037573*o,i=e-.1055613458*t-.0638541728*o,r=e-.0894841775*t-1.291485548*o,l=n*n*n,c=i*i*i,u=r*r*r,h=4.0767416621*l-3.3077115913*c+.2309699292*u,f=-1.2684380046*l+2.6097574011*c-.3413193965*u,p=-.0041960863*l-.7034186147*c+1.707614701*u,d=.2126*h+.7152*f+.0722*p,g=Math.min(.9999,Math.max(1e-4,d));if(d>.88){let R=d-.88;g=.88+.1199*(R/(R+.1199))}let b=h-d,_=f-d,M=p-d,F=Math.max(b<0?-b/g:b/(1-g),_<0?-_/g:_/(1-g),M<0?-M/g:M/(1-g));if(F>.82){let R=F-.82,x=(.82+.18*(R/(R+.18)))/F;b*=x,_*=x,M*=x}h=Math.min(1,Math.max(0,g+b)),f=Math.min(1,Math.max(0,g+_)),p=Math.min(1,Math.max(0,g+M)),a[s]=Math.round((h<=.0031308?12.92*h:1.055*Math.pow(h,1/2.4)-.055)*255),a[s+1]=Math.round((f<=.0031308?12.92*f:1.055*Math.pow(f,1/2.4)-.055)*255),a[s+2]=Math.round((p<=.0031308?12.92*p:1.055*Math.pow(p,1/2.4)-.055)*255),a[s+3]=255}var he=class e{constructor(t,{onTiming:o=null,maxDpr:a=2,preserveDrawingBuffer:s=!1}={}){if(!t)throw new Error("SphereRenderer requires a valid canvas element.");this.canvas=t,this.onTiming=typeof o=="function"?o:null,this.maxDpr=Math.max(1,Number.isFinite(a)?a:2),this._preserveDrawingBuffer=!!s,this.backend="webgl2",this.gl=null,this.ctx2d=null,this.lastCpuMs=0,this.lastGpuMs=null,this.pointer=new Float32Array(2),this.targetPointer=new Float32Array(2),this._poleLabWeight=new Float32Array(24),this._polePosRadSoft=new Float32Array(24),this._poleTransform=new Float32Array(24),this._cachedSeedStr=null,this._cachedSeedUint=0,this.isAnimating=!1,this._motionRafId=0,this._queryPollRafId=0,this._motionScene=null,this._motionOptions=null,this._motionTime=0,this._lastFrameNow=0,this._lastScene=null,this._destroyed=!1,this._timerExt=null,this._pendingQueries=[],this._queryPool=[],this._onContextLost=n=>{n.preventDefault(),this._pendingQueries.length=0,this._queryPool.length=0},this._onContextRestored=()=>{!this._destroyed&&this.backend==="webgl2"&&(this._initWebGLResources(),this._lastScene&&this.render(this._lastScene))},typeof t.addEventListener=="function"&&(t.addEventListener("webglcontextlost",this._onContextLost,!1),t.addEventListener("webglcontextrestored",this._onContextRestored,!1)),this._initBackend()}_initBackend(){let t=null;try{t=this.canvas.getContext("webgl2",{alpha:!1,depth:!1,stencil:!1,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:this._preserveDrawingBuffer,powerPreference:"high-performance"})}catch{t=null}if(t){if(this.gl=t,this.backend="webgl2",this._initWebGLResources())return;this.gl=null}this.backend="canvas2d",this.ctx2d=this.canvas.getContext("2d",{alpha:!1}),this._fallbackW=0,this._fallbackH=0,this._fallbackCanvas=null,this._fallbackCtx=null,this._fallbackImageData=null,this._grainCanvas=null}_compileShader(t,o){let a=this.gl,s=a.createShader(t);if(a.shaderSource(s,o),a.compileShader(s),!a.getShaderParameter(s,a.COMPILE_STATUS)){let n=a.getShaderInfoLog(s);return a.deleteShader(s),console.error("[SphereRenderer] GLSL compile error:",n),null}return s}_initWebGLResources(){let t=this.gl,o=this._compileShader(t.VERTEX_SHADER,ut),a=this._compileShader(t.FRAGMENT_SHADER,mt);if(!o||!a)return o&&t.deleteShader(o),a&&t.deleteShader(a),!1;let s=t.createProgram();if(t.attachShader(s,o),t.attachShader(s,a),t.linkProgram(s),t.deleteShader(o),t.deleteShader(a),!t.getProgramParameter(s,t.LINK_STATUS)){let n=t.getProgramInfoLog(s);return t.deleteProgram(s),console.error("[SphereRenderer] GLSL link error:",n),!1}return this._program=s,this._vao=t.createVertexArray(),t.disable(t.DEPTH_TEST),t.disable(t.BLEND),t.disable(t.CULL_FACE),t.disable(t.DITHER),this._locs={viewport:t.getUniformLocation(s,"u_viewport"),modeTime:t.getUniformLocation(s,"u_modeTime"),baseLab:t.getUniformLocation(s,"u_baseLab"),bloomLab:t.getUniformLocation(s,"u_bloomLab"),bloomGeom:t.getUniformLocation(s,"u_bloomGeom"),bridgePointer:t.getUniformLocation(s,"u_bridgePointer"),warpParams:t.getUniformLocation(s,"u_warpParams"),flowFold:t.getUniformLocation(s,"u_flowFold"),lighting:t.getUniformLocation(s,"u_lighting"),grainSeed:t.getUniformLocation(s,"u_grainSeed"),poleLabWeight:t.getUniformLocation(s,"u_poleLabWeight"),polePosRadSoft:t.getUniformLocation(s,"u_polePosRadSoft"),poleTransform:t.getUniformLocation(s,"u_poleTransform")},this._timerExt=t.getExtension("EXT_disjoint_timer_query_webgl2"),!0}resize(){let t=typeof window<"u"&&window.devicePixelRatio||1,o=Math.min(t,this.maxDpr),a=this.canvas.clientWidth||this.canvas.width||1280,s=this.canvas.clientHeight||this.canvas.height||720,n=Math.max(1,Math.round(a*o)),i=Math.max(1,Math.round(s*o));return(this.canvas.width!==n||this.canvas.height!==i)&&(this.canvas.width=n,this.canvas.height=i),this.gl&&this.gl.viewport(0,0,n,i),{width:n,height:i,dpr:o}}setPointer(t,o){let a=Math.max(-1.5,Math.min(1.5,Number.isFinite(t)?t:0)),s=Math.max(-1.5,Math.min(1.5,Number.isFinite(o)?o:0));this.targetPointer[0]=a,this.targetPointer[1]=s,this.isAnimating||(this.pointer[0]=a,this.pointer[1]=s)}_drainGpuTimerQueries(){let t=this.gl,o=this._timerExt;if(!t||!o||this._pendingQueries.length===0)return!1;let a=!1;for(;this._pendingQueries.length>0;){let s=this._pendingQueries[0],n=t.getQueryParameter(s,t.QUERY_RESULT_AVAILABLE),i=t.getParameter(o.GPU_DISJOINT_EXT);if(!n&&!i)break;if(this._pendingQueries.shift(),n&&!i){let r=t.getQueryParameter(s,t.QUERY_RESULT);this.lastGpuMs=r/1e6,a=!0}this._queryPool.length<8?this._queryPool.push(s):t.deleteQuery(s)}return a}_scheduleStaticQueryPoll(t=0){this._destroyed||this.isAnimating||this._queryPollRafId||this._pendingQueries.length===0||typeof requestAnimationFrame!="function"||t>5||(this._queryPollRafId=requestAnimationFrame(()=>{if(this._queryPollRafId=0,this._destroyed)return;this._drainGpuTimerQueries()&&this.onTiming&&this.onTiming({cpuMs:this.lastCpuMs,gpuMs:this.lastGpuMs,width:this.canvas.width,height:this.canvas.height,backend:this.backend}),this._pendingQueries.length>0&&!this.isAnimating&&this._scheduleStaticQueryPoll(t+1)}))}render(t,o={}){if(this._destroyed||!t)return{cpuMs:0,lastGpuMs:this.lastGpuMs,width:this.canvas.width||0,height:this.canvas.height||0};this._lastScene=t,(!this.canvas.width||!this.canvas.height)&&this.resize();let a=this.canvas.width,s=this.canvas.height,n=o.time!==void 0?o.time:0,i=o.pointer||this.pointer,r=o.grainScale!==void 0?o.grainScale:1;if(this.backend==="canvas2d")return this._renderCanvas2D(t,a,s,n,i,r);let l=this.gl;if(!l||l.isContextLost())return{cpuMs:0,lastGpuMs:this.lastGpuMs,width:a,height:s};this._drainGpuTimerQueries();let c=performance.now();l.viewport(0,0,a,s),l.useProgram(this._program),l.bindVertexArray(this._vao);let u=Math.max(1,Math.min(a,s)),h=Math.sqrt(a*s),f=u+(h-u)*.22,p=this._locs;l.uniform4f(p.viewport,a,s,a/f,s/f);let d=Ve[t.style]??0,g=ht[t.mood]??(t.isDark?2:0);l.uniform4f(p.modeTime,d,t.isDark?1:0,n,g);let b=t.baseLab||[.95,0,0];l.uniform3f(p.baseLab,b[0],b[1],b[2]);let _=t.bloomLab||b;l.uniform3f(p.bloomLab,_[0],_[1],_[2]);let M=t.bloomPos||[.5,.4];l.uniform4f(p.bloomGeom,M[0],M[1],t.bloomRadius??.65,t.bloomStrength??.5);let F=t.bridgeDir||[0,1];l.uniform4f(p.bridgePointer,F[0],F[1],i[0]||0,i[1]||0);let R=t.warp||{},x=R.phase||[0,0];l.uniform4f(p.warpParams,x[0],x[1],R.scale??1.35,R.amount??.24);let O=R.flowAngle??0;l.uniform4f(p.flowFold,Math.cos(O),Math.sin(O),R.foldStrength??0,0);let P=t.lighting||{},G=Qe(P.grain,r);l.uniform4f(p.lighting,P.scatterLift??.42,P.chromaPreserve??.78,P.vignette??.25,G),t.seed!==this._cachedSeedStr&&(this._cachedSeedStr=t.seed,this._cachedSeedUint=Ye(t.seed)),l.uniform1ui(p.grainSeed,this._cachedSeedUint);let Y=t.poles||[],T=this._poleLabWeight,B=this._polePosRadSoft,m=this._poleTransform;for(let z=0;z<6;z++){let A=z*4,E=Y[z];if(E){let Q=E.lab||b;T[A]=Q[0],T[A+1]=Q[1],T[A+2]=Q[2],T[A+3]=E.weight??1;let q=E.pos||[.5,.5];B[A]=q[0],B[A+1]=q[1],B[A+2]=E.radius??.4,B[A+3]=E.softness??.65;let J=E.stretch||[1,1],ne=Math.max(.08,Math.abs(J[0]||1)),re=Math.max(.08,Math.abs(J[1]||1)),$=E.angle??0;m[A]=1/ne,m[A+1]=1/re,m[A+2]=Math.cos($),m[A+3]=Math.sin($)}else T[A]=0,T[A+1]=0,T[A+2]=0,T[A+3]=0,B[A]=.5,B[A+1]=.5,B[A+2]=.4,B[A+3]=.5,m[A]=1,m[A+1]=1,m[A+2]=1,m[A+3]=0}l.uniform4fv(p.poleLabWeight,T),l.uniform4fv(p.polePosRadSoft,B),l.uniform4fv(p.poleTransform,m);let k=this._timerExt,I=null;k&&this._pendingQueries.length<4&&(I=this._queryPool.pop()||l.createQuery(),I&&l.beginQuery(k.TIME_ELAPSED_EXT,I)),l.drawArrays(l.TRIANGLES,0,3),I&&(l.endQuery(k.TIME_ELAPSED_EXT),this._pendingQueries.push(I)),l.bindVertexArray(null);let U=performance.now()-c;return this.lastCpuMs=U,this.onTiming&&this.onTiming({cpuMs:U,gpuMs:this.lastGpuMs,width:a,height:s,backend:"webgl2"}),I&&!this.isAnimating&&this._scheduleStaticQueryPoll(0),{cpuMs:U,lastGpuMs:this.lastGpuMs,width:a,height:s}}renderOnce(t,o){return this.render(t,o)}startMotion(t,o={}){if(this._destroyed||(t?this._motionScene=t:this._motionScene||(this._motionScene=this._lastScene),this._motionOptions=o,this._queryPollRafId&&typeof cancelAnimationFrame=="function"&&(cancelAnimationFrame(this._queryPollRafId),this._queryPollRafId=0),this.isAnimating))return;this.isAnimating=!0,this._lastFrameNow=performance.now();let a=s=>{if(!this.isAnimating||this._destroyed)return;let n=Math.min(.1,Math.max(0,(s-this._lastFrameNow)/1e3));this._lastFrameNow=s;let i=this._motionOptions?.speed??1;this._motionTime+=n*i;let r=1-Math.exp(-n*6.5);this.pointer[0]+=(this.targetPointer[0]-this.pointer[0])*r,this.pointer[1]+=(this.targetPointer[1]-this.pointer[1])*r,this._motionScene&&this.render(this._motionScene,{grainScale:this._motionOptions?.grainScale??1,time:this._motionTime,pointer:this.pointer}),this._motionRafId=requestAnimationFrame(a)};this._motionRafId=requestAnimationFrame(a)}startLoop(t,o){return this.startMotion(t,o)}stopMotion(){this.isAnimating=!1,this._motionRafId&&typeof cancelAnimationFrame=="function"&&(cancelAnimationFrame(this._motionRafId),this._motionRafId=0)}stopLoop(){return this.stopMotion()}async exportPNG(t,{width:o=3840,height:a=2160,grainScale:s=1,time:n=0,pointer:i=[0,0]}={}){let r=t||this._lastScene;if(!r)throw new Error("SphereRenderer.exportPNG requires a valid scene.");let l=Math.max(1,Math.round(o)),c=Math.max(1,Math.round(a)),u;if(typeof OffscreenCanvas<"u"&&typeof document>"u")u=new OffscreenCanvas(l,c);else if(typeof document<"u")u=document.createElement("canvas"),u.width=l,u.height=c;else throw new Error("Cannot allocate export canvas in this environment.");let f=new e(u,{maxDpr:1,preserveDrawingBuffer:!0});try{return f.render(r,{time:n,pointer:i,grainScale:s}),f.gl&&f.gl.finish(),typeof u.convertToBlob=="function"?await u.convertToBlob({type:"image/png"}):await new Promise((p,d)=>{u.toBlob(g=>{g?p(g):d(new Error("Failed to encode PNG blob."))},"image/png")})}finally{if(f.gl){let p=f.gl.getExtension("WEBGL_lose_context");f.destroy(),p&&p.loseContext()}else f.destroy()}}_renderCanvas2D(t,o,a,s,n,i){let r=this.ctx2d;if(!r)return{cpuMs:0,lastGpuMs:null,width:o,height:a};let l=performance.now(),c=o/Math.max(1,a),u=108,h=Math.max(64,Math.min(256,Math.round(u*c)));(!this._fallbackCanvas||this._fallbackW!==h||this._fallbackH!==u)&&(this._fallbackW=h,this._fallbackH=u,this._fallbackCanvas=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(h,u),this._fallbackCanvas.width=h,this._fallbackCanvas.height=u,this._fallbackCtx=this._fallbackCanvas.getContext("2d"),this._fallbackImageData=this._fallbackCtx.createImageData(h,u));let f=this._fallbackImageData.data,[p,d]=ft(o,a),g=Ve[t.style]??0,b=!!t.isDark,_=t.baseLab||[.95,0,0],M=t.bloomLab||_,F=t.bloomPos||[.5,.4],R=Math.max(.05,t.bloomRadius??.65),x=Math.max(0,t.bloomStrength??.5),O=t.bridgeDir||[0,1],P=t.warp||{},G=P.scale??1.35,Y=P.amount??.24,T=P.foldStrength??0,B=P.phase||[0,0],m=P.flowAngle??0,k=Math.cos(m),I=Math.sin(m),U=t.lighting||{},z=U.scatterLift??.42,A=U.chromaPreserve??.78,E=U.vignette??.25,Q=(t.poles||[]).slice(0,6).map((N,X)=>{let v=N.stretch||[1,1],S=N.angle??0,L=N.lab||_;return{L:L[0],a:L[1],b:L[2],chroma:Math.hypot(L[1],L[2]),posX:(N.pos?.[0]??.5)+(n[0]||0)*(.012+.005*X),posY:(N.pos?.[1]??.5)+(n[1]||0)*(.012+.005*X),radius:Math.max(.035,N.radius??.4),softness:Math.min(1.6,Math.max(.05,N.softness??.65)),invSx:1/Math.max(.08,Math.abs(v[0]||1)),invSy:1/Math.max(.08,Math.abs(v[1]||1)),cosA:Math.cos(S),sinA:Math.sin(S),weight:N.weight??1}}),q=g===1?.82:.58,J=Math.hypot(_[1],_[2]),ne=Math.hypot(M[1],M[2]),re=0;for(let N=0;N<u;N++){let X=(N+.5)/u;for(let v=0;v<h;v++){let S=(v+.5)/h,L=(S-.5)*p,W=(X-.5)*d,le=L*G+B[0]+k*s*.055,ae=W*G+B[1]+I*s*.055,Z=Math.sin(le*2.1+Math.cos(ae*1.9+.7))*.65,st=Math.cos(ae*2-Math.sin(le*1.8-.4))*.65,We=g===1?Y*.5:Y,Me=Z*We,Se=st*We,ze=0;if(g===2){let C=(-L*I+W*k)*G*2.3+Z*1.5+s*.16;ze=Math.pow(.5+.5*Math.cos(C),2.25)*Math.min(1.4,T*1.85),Me+=-I*Math.sin(C)*.15*T,Se+=k*Math.sin(C)*.15*T}let xe=_[0]*q,_e=_[1]*q,Le=_[2]*q,Pe=J*q,se=q;for(let K=0;K<Q.length;K++){let C=Q[K];if(C.weight<=1e-4)continue;let j=(S-C.posX)*p+Me,ie=(X-C.posY)*d+Se,ee=(j*C.cosA+ie*C.sinA)*C.invSx,nt=(-j*C.sinA+ie*C.cosA)*C.invSy,Ue=Math.hypot(ee,nt),te=0,rt=C.L;if(g===1){let De=Math.max(.04,C.radius*.52),fe=Ue/De,qe=.24+.62*C.softness,ce=Math.min(1,Math.max(0,(fe-(1-qe*.85))/(1.75*qe))),lt=1-ce*ce*ce*(ce*(ce*6-15)+10),ct=Math.exp(-Math.pow(Math.max(1e-4,fe)/(1.06+.52*C.softness),2.15));te=C.weight*(lt*.78+ct*.3)*2.45}else{let De=Math.max(.035,C.radius*(.42+.23*C.softness)),fe=Math.max(1.35,2.05-.46*C.softness);te=C.weight*Math.exp(-Math.pow(Math.max(1e-5,Ue/De),fe))*1.62}xe+=rt*te,_e+=C.a*te,Le+=C.b*te,Pe+=C.chroma*te,se+=te}if(x>1e-4){let K=(S-F[0])*p+Me*.35,C=(X-F[1])*d+Se*.35,j=Math.hypot(K,C)/Math.max(.05,R*.68),ie=.62*Math.exp(-Math.pow(Math.max(1e-4,j),1.65))+.38/(1+j*j*1.35),ee=x*ie*(g===1?1.35:1.05);xe+=M[0]*ee,_e+=M[1]*ee,Le+=M[2]*ee,Pe+=ne*ee,se+=ee}let ke=xe/se,Ae=_e/se,Ce=Le/se,Ee=Math.max(0,Pe/se-Math.hypot(Ae,Ce)),Re=Math.max(0,z),it=Re<=.22?Re*3.2:.704+(Re-.22)*.85;if(ke+=Ee*it+ze*(b?.068:.048),Ae+=O[0]*Ee*A*.42,Ce+=O[1]*Ee*A*.42,Math.abs(E)>5e-4){let K=S-.5,C=X-.5,j=Math.min(1,Math.max(0,((K*K+C*C)*2.2-.08)/1.18)),ie=j*j*(3-2*j);ke-=Math.max(-.25,Math.min(.35,E))*ie}dt(Math.min(1,Math.max(0,ke)),Ae,Ce,f,re),re+=4}}this._fallbackCtx.putImageData(this._fallbackImageData,0,0),r.imageSmoothingEnabled=!0,r.imageSmoothingQuality="high",r.drawImage(this._fallbackCanvas,0,0,o,a);let $=Qe(U.grain,i);if($>0&&typeof document<"u"){this._ensureFallbackGrainTile(t.seed),r.save(),r.globalAlpha=Math.min(.25,$*1.8),r.globalCompositeOperation="overlay";let N=r.createPattern(this._grainCanvas,"repeat");N&&(r.fillStyle=N,r.fillRect(0,0,o,a)),r.restore()}let oe=performance.now()-l;return this.lastCpuMs=oe,this.lastGpuMs=null,this.onTiming&&this.onTiming({cpuMs:oe,gpuMs:null,width:o,height:a,backend:"canvas2d"}),{cpuMs:oe,lastGpuMs:null,width:o,height:a}}_ensureFallbackGrainTile(t){let o=Ye(t);if(this._grainCanvas&&this._grainTileSeed===o)return;this._grainTileSeed=o;let a=128,s=document.createElement("canvas");s.width=a,s.height=a;let n=s.getContext("2d"),i=n.createImageData(a,a),r=i.data,l=o||123456789;for(let c=0;c<r.length;c+=4){l=Math.imul(l,1664525)+1013904223>>>0;let u=(l>>>8)/16777216;l=Math.imul(l,1664525)+1013904223>>>0;let h=(l>>>8)/16777216,f=Math.round(127.5+(u+h-1)*127);r[c]=f,r[c+1]=f,r[c+2]=f,r[c+3]=255}n.putImageData(i,0,0),this._grainCanvas=s}destroy(){if(this._destroyed)return;this._destroyed=!0,this.stopMotion(),this._queryPollRafId&&typeof cancelAnimationFrame=="function"&&(cancelAnimationFrame(this._queryPollRafId),this._queryPollRafId=0),typeof this.canvas?.removeEventListener=="function"&&(this.canvas.removeEventListener("webglcontextlost",this._onContextLost,!1),this.canvas.removeEventListener("webglcontextrestored",this._onContextRestored,!1));let t=this.gl;if(t&&!t.isContextLost()){for(let o of this._pendingQueries)t.deleteQuery(o);for(let o of this._queryPool)t.deleteQuery(o);this._vao&&t.deleteVertexArray(this._vao),this._program&&t.deleteProgram(this._program)}this._pendingQueries.length=0,this._queryPool.length=0,this._vao=null,this._program=null,this.gl=null,this.ctx2d=null,this._lastScene=null,this._motionScene=null}};var de=["mesh","sphere","silk"],pe=["light","split","dark"];function ye(){if(typeof document<"u"&&document.documentElement){let e=document.documentElement,t=document.body,o=(e.getAttribute("data-theme")||e.getAttribute("data-color-scheme")||e.getAttribute("data-bs-theme")||t?.getAttribute("data-theme")||t?.getAttribute("data-color-scheme")||"").trim().toLowerCase();if(o==="dark")return"dark";if(o==="light")return"light";if(e.classList?.contains("dark")||t?.classList?.contains("dark"))return"dark";if(e.classList?.contains("light")||t?.classList?.contains("light"))return"light"}if(typeof window<"u"&&typeof window.matchMedia=="function")try{if(window.matchMedia("(prefers-color-scheme: dark)").matches)return"dark"}catch{}return"light"}var pt="23456789ABCDEFGHJKLMNPQRSTUVWXYZ",je=Math.PI/180,Et=Math.PI*2,Ie=[{id:"alabaster-honey",name:"Alabaster & Honey Coral",mood:"light",defaultStyle:"mesh",hueDrift:7,base:[.976,.013,84],bloom:[.986,.015,80],bridgeHue:62,poles:[[.865,.138,76],[.805,.142,29],[.848,.128,52],[.862,.068,152],[.938,.048,70],[.892,.076,18]]},{id:"porcelain-peach-sage",name:"Porcelain Peach & Celadon",mood:"light",defaultStyle:"mesh",hueDrift:8,base:[.974,.011,94],bloom:[.986,.012,88],bridgeHue:74,poles:[[.822,.132,42],[.858,.078,168],[.908,.104,86],[.872,.062,230],[.946,.028,78],[.882,.082,22]]},{id:"morning-lilac-pearl",name:"Morning Lilac & Pearl",mood:"light",defaultStyle:"silk",hueDrift:9,base:[.972,.012,286],bloom:[.986,.014,312],bridgeHue:326,poles:[[.818,.118,278],[.846,.114,348],[.888,.078,232],[.878,.094,48],[.922,.054,306],[.958,.02,258]]},{id:"solstice-ochre-mist",name:"Solstice Ochre & Chalk",mood:"light",defaultStyle:"sphere",hueDrift:7,base:[.962,.016,80],bloom:[.984,.014,76],bridgeHue:44,poles:[[.788,.146,66],[.772,.152,35],[.878,.058,244],[.886,.088,78],[.896,.046,302],[.952,.022,74]]},{id:"cerulean-tangerine",name:"Cerulean & Sunset Tangerine",mood:"split",defaultStyle:"sphere",hueDrift:6,base:[.868,.042,256],bloom:[.968,.018,268],bridgeHue:332,poles:[[.595,.186,252],[.722,.184,46],[.762,.116,246],[.828,.126,64],[.884,.054,320],[.952,.018,250]]},{id:"steel-lavender-amber",name:"Nordic Steel & Warm Amber",mood:"split",defaultStyle:"sphere",hueDrift:7,base:[.842,.036,272],bloom:[.96,.016,292],bridgeHue:326,poles:[[.565,.098,248],[.748,.146,55],[.742,.096,292],[.768,.118,30],[.882,.044,322],[.946,.014,266]]},{id:"aegean-coral-horizon",name:"Aegean Teal & Coral Dusk",mood:"split",defaultStyle:"mesh",hueDrift:8,base:[.882,.034,224],bloom:[.97,.018,56],bridgeHue:348,poles:[[.585,.148,228],[.712,.172,26],[.822,.134,66],[.748,.114,214],[.892,.052,350],[.952,.022,74]]},{id:"twilight-violet-citrine",name:"Twilight Violet & Citrine",mood:"split",defaultStyle:"silk",hueDrift:8,base:[.806,.048,284],bloom:[.954,.026,342],bridgeHue:342,poles:[[.532,.168,282],[.818,.148,68],[.724,.152,356],[.588,.146,256],[.848,.072,326],[.926,.044,78]]},{id:"electric-sapphire",name:"Midnight Electric Sapphire",mood:"dark",defaultStyle:"silk",hueDrift:5,base:[.136,.034,260],bloom:[.615,.138,232],bridgeHue:246,poles:[[.365,.176,262],[.535,.204,255],[.665,.14,222],[.245,.096,274],[.345,.126,286],[.182,.054,252]]},{id:"velvet-ember-obsidian",name:"Velvet Ember & Obsidian",mood:"dark",defaultStyle:"sphere",hueDrift:6,base:[.138,.028,274],bloom:[.558,.136,42],bridgeHue:342,poles:[[.445,.168,32],[.348,.138,258],[.538,.148,54],[.402,.138,14],[.305,.104,328],[.182,.036,262]]},{id:"abyssal-aurora-jade",name:"Abyssal Jade & Ultramarine",mood:"dark",defaultStyle:"mesh",hueDrift:7,base:[.142,.032,234],bloom:[.562,.118,202],bridgeHue:216,poles:[[.478,.132,184],[.362,.168,264],[.442,.138,228],[.568,.114,198],[.272,.094,286],[.215,.062,178]]},{id:"nocturne-amethyst-rose",name:"Nocturne Amethyst & Rose Gold",mood:"dark",defaultStyle:"silk",hueDrift:7,base:[.138,.032,302],bloom:[.575,.106,26],bridgeHue:345,poles:[[.385,.158,296],[.442,.154,352],[.556,.122,46],[.285,.112,268],[.512,.106,332],[.196,.062,320]]}],we=[...Ie.map(({id:e,name:t,mood:o,defaultStyle:a})=>({id:e,name:t,mood:o,defaultStyle:a})),{id:"harmonic-wild",name:"Harmonic Wildcard",mood:"auto",defaultStyle:"auto"}];function Xe(){let e=new Uint8Array(6);if(globalThis.crypto&&typeof globalThis.crypto.getRandomValues=="function")globalThis.crypto.getRandomValues(e);else for(let o=0;o<6;o++)e[o]=Math.floor(Math.random()*256);let t="";for(let o=0;o<6;o++)t+=pt[e[o]&31];return t}function gt(e){let t=1779033703,o=3144134277,a=1013904242,s=2773480762;for(let n=0;n<e.length;n++){let i=e.charCodeAt(n);t=o^Math.imul(t^i,597399067),o=a^Math.imul(o^i,2869860233),a=s^Math.imul(a^i,951274213),s=t^Math.imul(s^i,2716044179)}return t=Math.imul(a^t>>>18,597399067),o=Math.imul(s^o>>>22,2869860233),a=Math.imul(t^a>>>17,951274213),s=Math.imul(o^s>>>19,2716044179),[(t^o^a^s)>>>0,(o^t)>>>0,(a^t)>>>0,(s^t)>>>0]}function bt(e){let[t,o,a,s]=gt(`sphere-gl-v1:${e}`),n=()=>{t>>>=0,o>>>=0,a>>>=0,s>>>=0;let i=t+o|0;return t=o^o>>>9,o=a+(a<<3)|0,a=a<<21|a>>>11,s=s+1|0,i=i+s|0,a=a+i|0,(i>>>0)/4294967296};for(let i=0;i<8;i++)n();return{next:n,range(i,r){return i+(r-i)*n()},jitter(i,r){let l=n()+n()-1;return i+l*r},pick(i){return i[Math.floor(n()*i.length)]},chance(i){return n()<i},sign(){return n()<.5?-1:1}}}function y(e,t,o){return e<t?t:e>o?o:e}function D(e){let t=e%360;return t<0?t+360:t}function w(e){return Math.round(e*1e6)/1e6}function me(e,t,o){let a=e+.3963377774*t+.2158037573*o,s=e-.1055613458*t-.0638541728*o,n=e-.0894841775*t-1.291485548*o,i=a*a*a,r=s*s*s,l=n*n*n,c=4.0767416621*i-3.3077115913*r+.2309699292*l,u=-1.2684380046*i+2.6097574011*r-.3413193965*l,h=-.0041960863*i-.7034186147*r+1.707614701*l;return[c,u,h]}function Be(e,t,o){return e>=0&&e<=1&&t>=0&&t<=1&&o>=0&&o<=1}function ue(e,t,o){let a=y(Number(e)||0,0,1);if(a<=1e-4)return[0,0,0];if(a>=.9999)return[1,0,0];let s=Math.max(0,Number(t)||0),n=D(Number(o)||0)*je,i=Math.cos(n),r=Math.sin(n),[l,c,u]=me(a,s*i,s*r);if(Be(l,c,u))return[a,s*i,s*r];let h=0,f=s;for(let d=0;d<22;d++){let g=.5*(h+f),[b,_,M]=me(a,g*i,g*r);Be(b,_,M)?h=g:f=g}let p=h*.999;return[a,p*i,p*r]}function Te(e){let t=y(e,0,1),o=t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055;return y(Math.round(o*255),0,255)}function Ge(e){return e.toString(16).padStart(2,"0").toUpperCase()}function ge(e,t,o){let a=y(Number(e)||0,0,1),s=Number(t)||0,n=Number(o)||0,[i,r,l]=me(a,s,n);if(!Be(i,r,l)){let c=Math.hypot(s,n),u=Math.atan2(n,s)*180/Math.PI,[h,f,p]=ue(a,c,u);[i,r,l]=me(h,f,p)}return`#${Ge(Te(i))}${Ge(Te(r))}${Ge(Te(l))}`}function Fe(e){let t=y(e/255,0,1);return t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function Oe(e){if(typeof e!="string")return null;let t=e.trim();if(!t)return null;if(t.startsWith("#")){let a=t.slice(1);return/^[0-9a-fA-F]{3}$/.test(a)?[parseInt(a[0]+a[0],16),parseInt(a[1]+a[1],16),parseInt(a[2]+a[2],16)]:/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(a)?[parseInt(a.slice(0,2),16),parseInt(a.slice(2,4),16),parseInt(a.slice(4,6),16)]:null}let o=t.match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);return o?[y(Math.round(Number(o[1])),0,255),y(Math.round(Number(o[2])),0,255),y(Math.round(Number(o[3])),0,255)]:null}function Ke(e){let t=Oe(e);if(!t)return null;let o=Fe(t[0]),a=Fe(t[1]),s=Fe(t[2]),n=.4122214708*o+.5363325363*a+.0514459929*s,i=.2119034982*o+.6806995451*a+.1073969566*s,r=.0883024619*o+.2817188376*a+.6299787005*s,l=Math.cbrt(Math.max(0,n)),c=Math.cbrt(Math.max(0,i)),u=Math.cbrt(Math.max(0,r));return[.2104542553*l+.793617785*c-.0040720468*u,1.9779984951*l-2.428592205*c+.4505937099*u,.0259040371*l+.7827717662*c-.808675766*u]}function yt([e,t,o]){let a=Math.hypot(t,o),s=a>1e-5?D(Math.atan2(o,t)*180/Math.PI):0;return[e,a,s]}function wt(e,t,o,a){let s=Oe(t)||(e?[10,15,26]:[252,250,246]),n=Math.round(e?s[0]*.35+10*.65:s[0]*.22+255*.78),i=Math.round(e?s[1]*.35+14*.65:s[1]*.22+255*.78),r=Math.round(e?s[2]*.35+24*.65:s[2]*.22+255*.78),l=e?.5:.6,c=a[1]||a[0]||t,u=-1;for(let h of o){let f=Math.hypot(h.lab[1],h.lab[2]),p=e?h.lab[0]>.48?1.2:.7:h.lab[0]<.78?1.2:.75,d=f*p*h.weight;d>u&&(u=d,c=h.hex)}return{theme:e?"dark":"light",bg:t,ink:e?"#FFFFFF":"#0F172A",inkMuted:e?"rgba(255, 255, 255, 0.70)":"rgba(15, 23, 42, 0.68)",glass:`rgba(${n}, ${i}, ${r}, ${l})`,glassBorder:e?"rgba(255, 255, 255, 0.15)":"rgba(15, 23, 42, 0.10)",accent:c}}function H(e,t,o,a){let s=y(e,.08,.99),n=Math.max(0,t),i=D(o);if(i>92&&i<146){let r=1-Math.abs(i-119)/27;a==="dark"||s<.72?(i=i<118?i-22*r:i+28*r,n*=1-.35*r):n=Math.min(n,.088-.018*r)}if(a==="dark"&&i>46&&i<96&&s<.54){let r=1-Math.abs(i-71)/25;s=Math.max(s,.5+.08*r),i-=12*r}if(i>308&&i<336){let r=1-Math.abs(i-322)/14;n*=1-.16*r}return[s,n,D(i)]}function He(e,t,o){let a=D(e),n=(D(t)-a+540)%360-180,i=D(a+n*.5),r=D(i+180),l=c=>{let u=0;return c>=95&&c<=165&&(u-=2*(1-Math.abs(c-130)/35)),(c>=300||c<=25)&&(u+=1.1),o==="light"&&c>=40&&c<=82&&(u+=1.25),o==="dark"&&c>=210&&c<=285&&(u+=.9),u};return Math.abs(n)>125?l(i)>=l(r)?i:r:Math.abs(n)>85&&i>105&&i<145?r:i}function vt(e,t){let o=e.pick(["split-atmosphere","analogous-cascade","botanical-contrast","iridescent-arc"]),a,s,n,i;if(o==="split-atmosphere"||t==="split"){let c=e.range(198,298),u=e.range(16,76);e.chance(.5)?(a=c,s=u):(a=u,s=c),n=D(a+e.range(-24,24)),i=D(s+e.range(-22,22))}else if(o==="botanical-contrast")a=e.range(18,78),s=e.range(156,238),n=D(a+e.range(18,38)*e.sign()),i=D(s+e.range(-24,24));else if(o==="iridescent-arc"){let c=e.range(205,345),u=e.sign();a=c,s=D(c+u*e.range(72,118)),n=D(c+u*e.range(28,52)),i=D(c+u*e.range(115,148))}else{let c=e.range(0,360);a=c,s=D(c+e.range(32,58)*e.sign()),n=D(c-e.range(26,48)),i=D(c+155+e.range(-20,20))}let r=He(a,s,t);if(t==="light"){let c=e.chance(.72)?e.range(68,95):D(a);return{base:[e.range(.964,.98),e.range(.009,.016),c],bloom:[e.range(.98,.99),e.range(.01,.018),r],bridgeHue:r,poles:[H(e.range(.79,.86),e.range(.118,.152),a,"light"),H(e.range(.78,.86),e.range(.112,.148),s,"light"),H(e.range(.84,.9),e.range(.09,.128),n,"light"),H(e.range(.85,.91),e.range(.062,.098),i,"light"),H(e.range(.91,.95),e.range(.035,.062),r,"light"),H(e.range(.94,.97),e.range(.016,.034),c,"light")]}}if(t==="split"){let c=e.range(228,286);return{base:[e.range(.82,.88),e.range(.032,.048),c],bloom:[e.range(.952,.974),e.range(.014,.024),r],bridgeHue:r,poles:[H(e.range(.55,.64),e.range(.135,.186),a,"split"),H(e.range(.7,.78),e.range(.14,.184),s,"split"),H(e.range(.73,.81),e.range(.098,.136),n,"split"),H(e.range(.77,.85),e.range(.102,.138),i,"split"),H(e.range(.87,.91),e.range(.042,.068),r,"split"),H(e.range(.93,.96),e.range(.014,.026),c,"split")]}}let l=e.range(235,300);return{base:[e.range(.13,.15),e.range(.026,.038),l],bloom:H(e.range(.54,.62),e.range(.105,.142),n,"dark"),bridgeHue:r,poles:[H(e.range(.36,.46),e.range(.145,.188),a,"dark"),H(e.range(.42,.54),e.range(.148,.198),s,"dark"),H(e.range(.5,.63),e.range(.118,.152),n,"dark"),H(e.range(.28,.38),e.range(.102,.142),i,"dark"),H(e.range(.3,.42),e.range(.092,.132),r,"dark"),H(e.range(.17,.22),e.range(.042,.072),l,"dark")]}}function be([e,t],o,a){return[o?1-e:e,a?1-t:t]}function Mt(e,t){let o=e.chance(.5),a=e.chance(.32),s=e.pick(["flanking-horizon","diagonal-eclipse","triad-orbit"]),n,i;if(s==="flanking-horizon"){let u=e.range(.36,.66),h=y(1.02-u+e.jitter(0,.08),.3,.7),f=[e.range(.02,.25),u],p=[e.range(.75,.98),h],d=.5*(f[0]+p[0])+e.jitter(0,.05),g=.5*(f[1]+p[1])-e.range(.04,.13);n=[{pos:f,radius:e.range(.74,1.04),softness:e.range(.48,.78),weight:e.range(1.08,1.28)},{pos:p,radius:e.range(.72,1.02),softness:e.range(.48,.78),weight:e.range(1.06,1.26)},{pos:[f[0]+e.range(.16,.28),y(f[1]-e.range(.06,.18),.18,.82)],radius:e.range(.54,.78),softness:e.range(.56,.84),weight:e.range(.66,.9)},{pos:[p[0]-e.range(.16,.28),y(p[1]+e.range(-.14,.16),.2,.82)],radius:e.range(.52,.76),softness:e.range(.56,.84),weight:e.range(.64,.88)},{pos:[y(d,.34,.66),y(g,.24,.62)],radius:e.range(.62,.92),softness:e.range(.68,.96),weight:e.range(.56,.82)},{pos:[e.range(.32,.68),e.range(.06,.24)],radius:e.range(.64,1.02),softness:e.range(.74,1.04),weight:t==="dark"?e.range(.42,.68):e.range(.52,.82)}],i=[y(d,.36,.64),y(g-.08,.16,.48)]}else if(s==="diagonal-eclipse"){let u=[e.range(.04,.26),e.range(.56,.8)],h=[e.range(.74,.96),e.range(.2,.44)];n=[{pos:u,radius:e.range(.76,1.05),softness:e.range(.46,.76),weight:e.range(1.08,1.3)},{pos:h,radius:e.range(.74,1.02),softness:e.range(.46,.78),weight:e.range(1.06,1.28)},{pos:[e.range(.18,.42),e.range(.22,.48)],radius:e.range(.56,.84),softness:e.range(.52,.82),weight:e.range(.68,.92)},{pos:[e.range(.58,.82),e.range(.54,.8)],radius:e.range(.54,.8),softness:e.range(.54,.84),weight:e.range(.64,.88)},{pos:[e.range(.4,.6),e.range(.38,.6)],radius:e.range(.62,.9),softness:e.range(.68,.96),weight:e.range(.55,.8)},{pos:[e.range(.1,.34),e.range(.06,.24)],radius:e.range(.64,.98),softness:e.range(.72,1.02),weight:e.range(.45,.74)}],i=[e.range(.38,.62),e.range(.24,.5)]}else n=[{pos:[e.range(.06,.28),e.range(.26,.54)],radius:e.range(.72,1),softness:e.range(.46,.78),weight:e.range(1.06,1.28)},{pos:[e.range(.7,.94),e.range(.48,.78)],radius:e.range(.74,1.04),softness:e.range(.46,.78),weight:e.range(1.06,1.28)},{pos:[e.range(.58,.84),e.range(.16,.38)],radius:e.range(.56,.86),softness:e.range(.5,.82),weight:e.range(.74,.98)},{pos:[e.range(.2,.44),e.range(.64,.86)],radius:e.range(.54,.8),softness:e.range(.56,.85),weight:e.range(.64,.86)},{pos:[e.range(.38,.62),e.range(.36,.58)],radius:e.range(.6,.88),softness:e.range(.68,.96),weight:e.range(.54,.78)},{pos:[e.range(.26,.56),e.range(.06,.24)],radius:e.range(.64,.98),softness:e.range(.72,1.04),weight:e.range(.46,.74)}],i=[e.range(.36,.62),e.range(.2,.46)];let r=e.range(-Math.PI,Math.PI),l=n.map(u=>{let h=be(u.pos,o,a);return{pos:[y(h[0],-.18,1.18),y(h[1],-.18,1.18)],radius:y(u.radius,.52,1.05),softness:y(u.softness,.42,1.06),stretch:[e.range(.96,1.07),e.range(.96,1.07)],angle:e.range(-Math.PI,Math.PI),weight:y(u.weight,.35,1.32)}}),c=be(i,o,a);return{polesLayout:l,bloomPos:[y(c[0],.12,.88),y(c[1],.12,.88)],bloomRadius:e.range(.62,1.02),bloomStrength:t==="dark"?e.range(.2,.36):e.range(.44,.78),warp:{scale:e.range(.46,.84),amount:e.range(.032,.088),foldStrength:0,phase:[e.range(-48,48),e.range(-48,48)],flowAngle:r}}}function St(e,t){let o=e.chance(.5),a=e.chance(.5),s=e.pick(["golden-c-curve","diagonal-bay","archipelago-pool"]),n,i;s==="golden-c-curve"?(n=[{pos:[.76,.68],r:[.56,.82],s:[.52,.82],w:[.96,1.24],ang:-.55},{pos:[.38,.82],r:[.52,.78],s:[.5,.8],w:[.92,1.18],ang:.25},{pos:[.84,.26],r:[.48,.74],s:[.54,.84],w:[.78,1.04],ang:-1.15},{pos:[.6,.48],r:[.44,.68],s:[.58,.88],w:[.68,.94],ang:-.42},{pos:[.48,.3],r:[.5,.76],s:[.66,.96],w:[.54,.8],ang:-.3},{pos:[.16,.66],r:[.44,.7],s:[.64,.94],w:[.48,.74],ang:.65}],i=[.24,.24]):s==="diagonal-bay"?(n=[{pos:[.82,.76],r:[.58,.86],s:[.52,.82],w:[.98,1.26],ang:-.68},{pos:[.66,.24],r:[.52,.78],s:[.5,.8],w:[.9,1.16],ang:-.45},{pos:[.28,.78],r:[.5,.76],s:[.54,.84],w:[.8,1.06],ang:.42},{pos:[.88,.46],r:[.46,.7],s:[.56,.86],w:[.7,.94],ang:-.95},{pos:[.52,.56],r:[.5,.76],s:[.66,.96],w:[.54,.8],ang:-.58},{pos:[.38,.4],r:[.46,.72],s:[.68,.98],w:[.44,.7],ang:-.52}],i=[.2,.22]):(n=[{pos:[.74,.32],r:[.56,.82],s:[.52,.82],w:[.96,1.22],ang:-.35},{pos:[.54,.78],r:[.54,.8],s:[.52,.82],w:[.92,1.18],ang:.28},{pos:[.88,.72],r:[.48,.74],s:[.54,.84],w:[.76,1.02],ang:-.78},{pos:[.22,.76],r:[.46,.72],s:[.56,.86],w:[.72,.96],ang:.55},{pos:[.58,.5],r:[.5,.76],s:[.66,.95],w:[.56,.82],ang:-.25},{pos:[.44,.22],r:[.46,.72],s:[.68,.98],w:[.45,.72],ang:-.15}],i=[.22,.26]);let r=e.range(-1.15,1.15),l=n.map(u=>{let h=[u.pos[0]+e.jitter(0,.065),u.pos[1]+e.jitter(0,.065)],f=be(h,o,a),p=u.ang+e.jitter(0,.32);return o&&(p=Math.PI-p),a&&(p=-p),{pos:[y(f[0],-.1,1.1),y(f[1],-.1,1.1)],radius:e.range(u.r[0],u.r[1]),softness:e.range(u.s[0],u.s[1]),stretch:[e.range(1.14,1.46),e.range(.76,.96)],angle:Math.atan2(Math.sin(p),Math.cos(p)),weight:e.range(u.w[0],u.w[1])}}),c=be([i[0]+e.jitter(0,.06),i[1]+e.jitter(0,.06)],o,a);return{polesLayout:l,bloomPos:[y(c[0],.08,.92),y(c[1],.08,.92)],bloomRadius:e.range(.52,.92),bloomStrength:t==="dark"?e.range(.18,.34):e.range(.32,.66),warp:{scale:t==="light"?e.range(.56,.94):e.range(.64,1.12),amount:t==="light"?e.range(.22,.36):e.range(.26,.42),foldStrength:t==="light"?e.range(.045,.105):e.range(.055,.14),phase:[e.range(-48,48),e.range(-48,48)],flowAngle:r}}}function xt(e,t){let o=e.range(.28,.86)*e.sign(),a=e.chance(.5)?0:Math.PI,s=Math.atan2(Math.sin(o+a),Math.cos(o+a)),n=Math.cos(s),i=Math.sin(s),r=-i,l=n,c=e.sign(),h=[{u:-.16,v:-.18*c,r:[.54,.78],s:[.42,.68],w:[1,1.26]},{u:.18,v:.14*c,r:[.52,.76],s:[.42,.68],w:[.96,1.22]},{u:-.28,v:.04*c,r:[.46,.68],s:[.46,.72],w:[.76,1.02]},{u:.28,v:-.06*c,r:[.44,.66],s:[.48,.74],w:[.72,.96]},{u:.02,v:-.02*c,r:[.48,.72],s:[.54,.82],w:[.58,.86]},{u:-.06,v:.32*c,r:[.44,.68],s:[.58,.88],w:[.42,.68]}].map(b=>{let _=b.u+e.jitter(0,.08),M=b.v+e.jitter(0,.06),F=.5+_*n+M*r,R=.5+_*i+M*l,x=s+e.jitter(0,.22);return{pos:[y(F,-.12,1.12),y(R,-.12,1.12)],radius:e.range(b.r[0],b.r[1]),softness:e.range(b.s[0],b.s[1]),stretch:[e.range(1.42,1.98),e.range(.66,.89)],angle:Math.atan2(Math.sin(x),Math.cos(x)),weight:e.range(b.w[0],b.w[1])}}),f=e.jitter(.04,.16),p=-.12*c+e.jitter(0,.08),d=y(.5+f*n+p*r,.14,.86),g=y(.5+f*i+p*l,.14,.86);return{polesLayout:h,bloomPos:[d,g],bloomRadius:e.range(.46,.86),bloomStrength:t==="dark"?e.range(.2,.38):e.range(.3,.62),warp:{scale:e.range(.86,1.54),amount:e.range(.35,.54),foldStrength:e.range(.29,.47),phase:[e.range(-48,48),e.range(-48,48)],flowAngle:s}}}function _t(e,t){return Math.hypot(e[0]-t[0],e[1]-t[1],e[2]-t[2])}function Lt(e,t,o,a,s){let n=[{lab:e,hex:t,score:2},...o.map(r=>({lab:r.lab,hex:r.hex,score:r.weight*r.radius})).sort((r,l)=>l.score-r.score),{lab:a,hex:s,score:.4}],i=[];for(let r of n){if(i.length>=5)break;i.some(c=>c.hex===r.hex||_t(c.lab,r.lab)<.042)||i.push(r)}if(i.length<4)for(let r of n){if(i.length>=4)break;i.some(l=>l.hex===r.hex)||i.push(r)}for(;i.length<4;)i.push(n[i.length%n.length]);return i.slice(0,5).map(r=>r.hex)}function Pt(e,t){return t==="light"?{scatterLift:w(e.range(.085,.145)),chromaPreserve:w(e.range(.36,.58)),vignette:w(e.range(-.045,.025)),grain:w(e.range(.0195,.0245))}:t==="split"?{scatterLift:w(e.range(.1,.158)),chromaPreserve:w(e.range(.46,.68)),vignette:w(e.range(-.025,.055)),grain:w(e.range(.02,.0255))}:{scatterLift:w(e.range(.042,.076)),chromaPreserve:w(e.range(.32,.56)),vignette:w(e.range(.032,.095)),grain:w(e.range(.02,.0258))}}function $e({seed:e,style:t="auto",mood:o="system",archetype:a="auto",colors:s=null,colorScheme:n=null}={}){let i=typeof e=="string"&&e.trim().length>0?e.trim().toUpperCase():Xe(),r=bt(i),l=Array.isArray(s)?s.map(Ke).filter(Boolean):[],c=l.length>=2,u=typeof o=="string"?o.trim().toLowerCase():"system",h=de.includes(t)?t:"auto",f=null;u==="system"?f=n==="dark"||n==="light"?n:ye():u==="daylight"&&(f="light");let p=pe.includes(u)?u:f==="dark"?"dark":f==="light"?"daylight":"any",d=null,g=!1;c||(a==="harmonic-wild"?g=!0:a&&a!=="auto"&&(d=Ie.find(v=>v.id===a)||null));let b;if(c)if(pe.includes(p))b=p;else{let v=l.reduce((S,L)=>S+L[0],0)/l.length;b=v<.45?"dark":v>.78?"light":"split"}else d?b=d.mood:pe.includes(p)?b=p:p==="daylight"?b=r.chance(.64)?"light":"split":b=r.pick(pe);if(!c&&!d&&!g)if(r.chance(.16))g=!0;else{let v=Ie.filter(S=>S.mood===b);d=r.pick(v)}let _=!!(a&&a!=="auto"),M;h!=="auto"?M=h:d&&de.includes(d.defaultStyle)?_?M=d.defaultStyle:M=r.chance(.72)?d.defaultStyle:r.pick(de):b==="split"||c?M=r.chance(.6)?"sphere":r.pick(["mesh","silk"]):M=r.pick(de);let F,R,x,O,P,G;if(c){F="custom-palette",R="Custom Brand Palette";let v=l.map(yt);if(v.length>=3){x=v[0];let S=v.slice(1),L=S[0],W=S[1%S.length];P=He(L[2],W[2],b),O=[b==="dark"?y(Math.max(L[0],W[0])+.12,.38,.72):.965,Math.min(.035,(L[1]+W[1])*.2),P],G=[L,W,S[2%S.length],S[3%S.length]||[y(L[0]+.06,.15,.95),L[1]*.82,D(L[2]+14)],[y((L[0]+W[0])*.5+.08,.22,.94),Math.min(.065,(L[1]+W[1])*.35),P],x]}else{let[S,L]=v;P=He(S[2],L[2],b);let W=.5*(S[0]+L[0]);x=W<.48?[.14,.025,S[2]]:[.968,.014,P],O=W<.48?[.55,.08,P]:[.982,.016,P],G=[S,L,[y(S[0]+.08,.18,.92),S[1]*.78,D(S[2]+16)],[y(L[0]+.08,.18,.92),L[1]*.78,D(L[2]-16)],[y(W+.1,.25,.93),Math.min(.06,(S[1]+L[1])*.32),P],x]}}else if(g){F="harmonic-wild",R="Harmonic Wildcard";let v=vt(r,b);x=v.base,O=v.bloom,P=v.bridgeHue,G=v.poles}else{F=d.id,R=d.name;let v=r.jitter(0,d.hueDrift||6);x=[y(d.base[0]+r.jitter(0,.008),.08,.99),Math.max(0,d.base[1]+r.jitter(0,.004)),D(d.base[2]+v*.5)],O=[y(d.bloom[0]+r.jitter(0,.01),.15,.992),Math.max(0,d.bloom[1]+r.jitter(0,.006)),D(d.bloom[2]+v*.6)],P=D(d.bridgeHue+v*.6),G=d.poles.map(([S,L,W])=>[y(S+r.jitter(0,.022),.12,.98),Math.max(.005,L*r.range(.91,1.09)),D(W+v+r.jitter(0,5.5))]),r.chance(.5)&&([G[0],G[1]]=[G[1],G[0]]),r.chance(.5)&&([G[2],G[3]]=[G[3],G[2]])}let Y=ue(x[0],x[1],x[2]),T=[w(Y[0]),w(Y[1]),w(Y[2])],B=ge(T[0],T[1],T[2]),m=ue(O[0],O[1],O[2]),k=[w(m[0]),w(m[1]),w(m[2])],I=ge(k[0],k[1],k[2]),U=P*je,z=[w(Math.cos(U)),w(Math.sin(U))],A=Math.hypot(z[0],z[1])||1;z[0]=w(z[0]/A),z[1]=w(z[1]/A);let E;M==="sphere"?E=Mt(r,b):M==="silk"?E=xt(r,b):E=St(r,b);let Q=E.polesLayout.map((v,S)=>{let[L,W,le]=G[S],ae=ue(L,W,le),Z=[w(ae[0]),w(ae[1]),w(ae[2])];return{lab:Z,hex:ge(Z[0],Z[1],Z[2]),pos:[w(v.pos[0]),w(v.pos[1])],radius:w(y(v.radius,.3,1.15)),softness:w(y(v.softness,.3,1.15)),stretch:[w(v.stretch[0]),w(v.stretch[1])],angle:w(v.angle),weight:w(y(v.weight,0,1.35))}}),q=0,J=0;for(let v of Q){let S=v.weight*v.radius;q+=S,J+=v.lab[0]*S}let ne=q>0?J/q:T[0],$=.38*T[0]+.5*ne+.12*(k[0]*E.bloomStrength+T[0]*(1-E.bloomStrength))<.54,oe=Lt(T,B,Q,k,I),N=Pt(r,b),X=wt($,B,Q,oe);return{seed:i,style:M,mood:b,archetypeId:F,archetypeName:R,isDark:$,baseLab:T,baseHex:B,bloomLab:k,bloomHex:I,bloomPos:[w(E.bloomPos[0]),w(E.bloomPos[1])],bloomRadius:w(y(E.bloomRadius,.4,1.05)),bloomStrength:w(y(E.bloomStrength,.15,.85)),bridgeDir:z,poles:Q,paletteSwatches:oe,uiTokens:X,warp:{scale:w(E.warp.scale),amount:w(E.warp.amount),foldStrength:w(E.warp.foldStrength),phase:[w(E.warp.phase[0]),w(E.warp.phase[1])],flowAngle:w(E.warp.flowAngle)},lighting:N}}function Ne(e,t=!1){if(e==null||e==="")return t;if(typeof e=="boolean")return e;let o=String(e).trim().toLowerCase();return o==="true"||o==="1"||o==="yes"||o==="on"?!0:o==="false"||o==="0"||o==="no"||o==="off"?!1:t}function ve(e,t){if(e==null||e==="")return t;let o=Number(e);return Number.isFinite(o)?o:t}function Je(e){if(typeof e!="string"||!e.trim())return{};let t=e.trim(),o=new URLSearchParams,a=n=>{if(!n)return;let i=n.replace(/^[?#]+/,"");if(!i)return;let r=new URLSearchParams(i);for(let[l,c]of r.entries())o.set(l,c)};try{if(t.includes("://")){let n=new URL(t);a(n.search),a(n.hash)}else{let[n,i]=t.split("#");n&&(n.includes("=")||n.startsWith("?"))&&a(n),i&&a(i)}}catch{a(t)}let s={};if(o.has("seed")){let n=o.get("seed").trim();n&&n!=="auto"&&n!=="random"&&(s.seed=n.toUpperCase())}if(o.has("style")&&(s.style=o.get("style").trim().toLowerCase()),o.has("mood")&&(s.mood=o.get("mood").trim().toLowerCase()),(o.has("harmony")||o.has("arch")||o.has("archetype"))&&(s.harmony=(o.get("harmony")||o.get("arch")||o.get("archetype")).trim()),o.has("grain")){let n=Number(o.get("grain"));Number.isFinite(n)&&(s.grain=n)}if(o.has("motion")&&(s.motion=Ne(o.get("motion"),!1)),o.has("colors")){let n=o.get("colors").split(",").map(i=>i.trim()).filter(Boolean);n.length>=2&&(s.colors=n)}return s}function Ze(e){if(typeof window>"u"||typeof window.getComputedStyle!="function"||!e)return{};let t=window.getComputedStyle(e),o=[];for(let l=1;l<=6;l++){let c=t.getPropertyValue(`--sphere-color-${l}`).trim()||t.getPropertyValue(`--gradient-color-${l}`).trim();c&&o.push(c)}let a={};o.length>=2&&(a.colors=o);let s=t.getPropertyValue("--sphere-style").trim();s&&(a.style=s);let n=t.getPropertyValue("--sphere-mood").trim();n&&(a.mood=n);let i=t.getPropertyValue("--sphere-harmony").trim();i&&(a.harmony=i);let r=t.getPropertyValue("--sphere-grain").trim();if(r!==""){let l=Number(r);Number.isFinite(l)&&(a.grain=l)}return a}function et(e,t={}){let o=typeof e=="string"?document.querySelector(e):e||document.body;if(!o)throw new Error(`mountSphereBackground: target "${e}" not found.`);if(o.__sphereInstance)return o.__sphereInstance;let a=o.dataset||{},s=o.tagName==="CANVAS",n=s?o.parentElement||document.body:o,i=!s&&(n===document.body||n===document.documentElement),r=t.url??t.preset??a.spherePreset??a.sphereUrl??"",l=r?Je(r):{},c=Ze(o),u=a.sphereColors?a.sphereColors.split(",").map(m=>m.trim()).filter(Boolean):void 0,h={seed:t.seed??l.seed??a.sphereSeed??void 0,style:t.style??l.style??a.sphereStyle??c.style??"auto",mood:t.mood??l.mood??a.sphereMood??c.mood??"system",archetype:t.harmony??t.archetype??l.harmony??a.sphereHarmony??a.sphereArchetype??c.harmony??"auto",colors:t.colors??l.colors??u??c.colors??null,grainScale:ve(t.grain??t.grainScale??l.grain??a.sphereGrain??c.grain,1),motion:Ne(t.motion??l.motion??a.sphereMotion,!1),transitionIn:Ne(t.transitionIn??(o.hasAttribute?.("data-transition-in")?!0:a.sphereTransitionIn),!1),maxDpr:ve(t.maxDpr??a.sphereMaxDpr,2)},f;if(s)f=o;else{if(i)document.body.style.isolation="isolate",document.body.style.backgroundColor="transparent";else{let m=window.getComputedStyle(n);m.position==="static"&&(n.style.position="relative"),m.isolation==="auto"&&(n.style.isolation="isolate")}f=document.createElement("canvas"),f.className="sphere-gl-canvas",f.setAttribute("aria-hidden","true"),Object.assign(f.style,{position:i?"fixed":"absolute",inset:"0",width:i?"100vw":"100%",height:i?"100vh":"100%",display:"block",pointerEvents:"none",zIndex:"-1"}),n.prepend(f)}let p=typeof window<"u"&&window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;h.transitionIn&&!p&&(f.style.opacity="0",f.style.transition="opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)");let d=new he(f,{maxDpr:h.maxDpr,onTiming:t.onTiming}),g=null,b=!1;function _(m,k){if(!m||!m.style)return;let I=k.uiTokens;m.dataset.sphereTheme=I.theme,m.dataset.sphereMood=k.mood,m.dataset.sphereStyle=k.style,m.dataset.sphereSeed=k.seed,m.style.setProperty("--sphere-base",k.baseHex),m.style.setProperty("--sphere-bloom",k.bloomHex),m.style.setProperty("--sphere-accent",I.accent),m.style.setProperty("--sphere-ink",I.ink),m.style.setProperty("--sphere-ink-muted",I.inkMuted),m.style.setProperty("--sphere-glass",I.glass),m.style.setProperty("--sphere-glass-border",I.glassBorder)}function M(m){return g=$e({seed:m,style:h.style,mood:h.mood,archetype:h.archetype,colors:h.colors}),_(n,g),s&&_(f,g),i&&(_(document.documentElement,g),document.documentElement.style.backgroundColor=g.baseHex),d.resize(),h.motion&&!p?(d.stopMotion(),d.startMotion(g,{grainScale:h.grainScale})):(d.stopMotion(),d.renderOnce(g,{grainScale:h.grainScale})),h.transitionIn&&!b&&(b=!0,typeof requestAnimationFrame=="function"?requestAnimationFrame(()=>{f.style.opacity="1"}):f.style.opacity="1"),typeof t.onScene=="function"&&t.onScene(g),typeof CustomEvent=="function"&&o.dispatchEvent(new CustomEvent("sphere:change",{detail:g,bubbles:!0})),g}let F=ye();M(h.seed);let R=()=>{if(String(h.mood||"system").trim().toLowerCase()!=="system")return;let k=ye();k!==F&&(F=k,M(h.seed))},x=null;if(typeof window<"u"&&typeof window.matchMedia=="function")try{x=window.matchMedia("(prefers-color-scheme: dark)"),typeof x.addEventListener=="function"?x.addEventListener("change",R):typeof x.addListener=="function"&&x.addListener(R)}catch{x=null}let O=typeof MutationObserver=="function"&&typeof document<"u"&&document.documentElement?new MutationObserver(R):null;O&&O.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme","data-color-scheme","data-bs-theme"]});let P=0,G=typeof ResizeObserver=="function"?new ResizeObserver(()=>{P&&cancelAnimationFrame(P),P=requestAnimationFrame(()=>{d.resize(),g&&!d.isAnimating&&d.renderOnce(g,{grainScale:h.grainScale})})}):null;G&&G.observe(i?document.documentElement:o);let Y=()=>{P&&cancelAnimationFrame(P),P=requestAnimationFrame(()=>{d.resize(),g&&!d.isAnimating&&d.renderOnce(g,{grainScale:h.grainScale})})};i&&window.addEventListener("resize",Y,{passive:!0});let T=m=>{if(!d.isAnimating)return;let k=f.getBoundingClientRect();if(!k.width||!k.height)return;let I=(m.clientX-k.left)/k.width*2-1,U=(m.clientY-k.top)/k.height*2-1;d.setPointer(I,U)};t.interactivePointer!==!1&&window.addEventListener("pointermove",T,{passive:!0});let B={canvas:f,renderer:d,get scene(){return g},regenerate(m={}){return(m.url||m.preset)&&Object.assign(h,Je(m.url||m.preset)),m.style!==void 0&&(h.style=m.style),m.mood!==void 0&&(h.mood=m.mood),m.harmony!==void 0&&(h.archetype=m.harmony),m.archetype!==void 0&&(h.archetype=m.archetype),m.colors!==void 0&&(h.colors=m.colors),m.grain!==void 0&&(h.grainScale=ve(m.grain,1)),m.grainScale!==void 0&&(h.grainScale=ve(m.grainScale,1)),m.motion!==void 0&&(h.motion=!!m.motion),M(m.seed)},refreshCssVariables(){let m=Ze(o);return m.colors&&(h.colors=m.colors),m.style&&(h.style=m.style),m.mood&&(h.mood=m.mood),m.harmony&&(h.archetype=m.harmony),m.grain!==void 0&&(h.grainScale=m.grain),M(h.seed)},exportPNG(m={}){return d.exportPNG(g,{grainScale:h.grainScale,...m})},destroy(){P&&cancelAnimationFrame(P),G&&G.disconnect(),O&&O.disconnect(),x&&(typeof x.removeEventListener=="function"?x.removeEventListener("change",R):typeof x.removeListener=="function"&&x.removeListener(R)),i&&window.removeEventListener("resize",Y),window.removeEventListener("pointermove",T),d.destroy(),s||f.remove(),delete o.__sphereInstance}};return o.__sphereInstance=B,B}function at(e){let{sourceMode:t="generative",presetUrl:o="",seed:a="",shaderStyle:s="sphere",mood:n="system",harmony:i="auto",color1:r="#FBF8F0",color2:l="#3B82F6",color3:c="#FF7A45",color4:u="#A855F7",grain:h=1.65,motion:f=!1,style:p}=e,d=ot(null),g=ot(null),b=t==="url"?o:"",_=t==="locked"&&a?a:void 0,M=t==="custom"?[r,l,c,u].filter(Boolean):null;return tt(()=>{if(!d.current)return;let F=et(d.current,{url:b,seed:_,style:s,mood:n,harmony:i,colors:M,grain:h,motion:f,transitionIn:!1});return g.current=F,()=>{F.destroy(),g.current=null}},[]),tt(()=>{g.current&&g.current.regenerate({url:b,seed:_,style:s,mood:n,harmony:i,colors:M,grain:h,motion:f})},[t,b,_,s,n,i,r,l,c,u,h,f]),kt("div",{ref:d,style:{width:"100%",height:"100%",minHeight:200,position:"relative",overflow:"hidden",...p}})}At(at,{sourceMode:{type:V.Enum,title:"Palette",options:["generative","locked","url","custom"],optionTitles:["Fresh Each Visit","Lock Seed","Studio URL","Custom Colors"],defaultValue:"generative"},presetUrl:{type:V.String,title:"Studio URL",placeholder:"https://denissitnikov.github.io/sphere-gl/#seed=...",hidden:e=>e.sourceMode!=="url"},seed:{type:V.String,title:"Seed ID",placeholder:"7F3K9A",hidden:e=>e.sourceMode!=="locked"},shaderStyle:{type:V.Enum,title:"Style",options:["sphere","mesh","silk","auto"],optionTitles:["Sphere (f/0.95)","Mesh (Watercolor)","Silk (Ribbon)","Auto"],defaultValue:"sphere",hidden:e=>e.sourceMode==="url"},mood:{type:V.Enum,title:"Mood",options:["system","any","light","split","dark"],optionTitles:["System (OS Light/Dark)","Any Mood","Light","Split Horizon","Dark"],defaultValue:"system",hidden:e=>e.sourceMode==="url"||e.sourceMode==="custom"},harmony:{type:V.Enum,title:"Harmony",options:["auto",...we.map(e=>e.id)],optionTitles:["All Harmonies",...we.map(e=>e.name)],defaultValue:"auto",hidden:e=>e.sourceMode==="url"||e.sourceMode==="custom"},color1:{type:V.Color,title:"Base Color",defaultValue:"#FBF8F0",hidden:e=>e.sourceMode!=="custom"},color2:{type:V.Color,title:"Primary A",defaultValue:"#3B82F6",hidden:e=>e.sourceMode!=="custom"},color3:{type:V.Color,title:"Primary B",defaultValue:"#FF7A45",hidden:e=>e.sourceMode!=="custom"},color4:{type:V.Color,title:"Accent",defaultValue:"#A855F7",hidden:e=>e.sourceMode!=="custom"},grain:{type:V.Number,title:"Film Grain",min:0,max:2.5,step:.05,defaultValue:1.65},motion:{type:V.Boolean,title:"Motion",enabledTitle:"60fps Drift",disabledTitle:"0% Static",defaultValue:!1}});export{at as default};
