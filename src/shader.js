import { clamp, detectDisplayP3, hashSeed32, _p } from './palettes.js';

const { packScene } = _p;

export const STYLE_MAP = { mesh: 0, sphere: 1, silk: 2, caustic: 3, fluted: 4, prism: 5, topo: 6 };
export const styleToIndex = (s) => STYLE_MAP[s] ?? 0;

const G = globalThis;
const VS_SRC = `#version 300 es
precision highp float;
uniform vec4 u_tr;
out vec2 v_uv;
void main(){float x=gl_VertexID==1?3.:-1.,y=gl_VertexID==2?3.:-1.;v_uv=u_tr.xy+vec2(.5*(x+1.),.5*(1.-y))*u_tr.zw;gl_Position=vec4(x,y,0.,1.);}`;

const FS_BODY = `precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 O;
uniform vec4 u_u[10],u_p[24];
uniform uint u_gs;
vec3 pm(vec3 x){x=(x*34.+10.)*x;return x-floor(x*(1./289.))*289.;}
float N(vec2 v){
  const vec4 C=vec4(.2113249,.3660254,-.5773503,.02439024);
  vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx),i1=x0.x>x0.y?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i-=floor(i*(1./289.))*289.;
  vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.)),m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m*=m;m*=m;
  vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,a=x-floor(x+.5);
  m*=1.792843-.8537347*(a*a+h*h);
  return 130.*dot(m,vec3(a.x*x0.x+h.x*x0.y,a.yz*x12.xz+h.yz*x12.yw));
}
float Q(float x){float t=clamp(x,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
uint P(uint v){uint s=v*747796405u+2891336453u,w=((s>>((s>>28u)+4u))^s)*277803737u;return(w>>22u)^w;}
float T(uvec2 p,uint s){uint b=p.x*1664525u+p.y*1013904223u+s*2246822519u;return float((P(b)>>8u)+(P(b^2654435769u)>>8u))*(1./16777216.)-1.;}
#if STYLE != 1
void F(vec2 u,vec2 mt,vec2 wo,float ml,out vec3 sL,out float sC,out float tW){
  sL=u_u[2].xyz*.58;sC=length(u_u[2].yz)*.58;tW=.58;
  for(int i=0;i<6;i++){
    int b=i*4;vec4 lw=u_p[b];if(lw.w<=1e-4)continue;
    vec4 pp=u_p[b+1],tf=u_p[b+2];
    vec2 v=(u-pp.xy)*mt+wo;
    float d=length(vec2((v.x*tf.z+v.y*tf.w)*tf.x,(-v.x*tf.w+v.y*tf.z)*tf.y)),w=lw.w*exp(-pow(max(d*pp.z,1e-5),u_p[b+3].x))*ml;
    sL+=lw.xyz*w;sC+=length(lw.yz)*w;tW+=w;
  }
}
#endif
void main(){
  vec2 uv=v_uv,mt=u_u[0].zw,fd=u_u[6].xy,fp=vec2(-fd.y,fd.x),td=u_u[6].zw,pm2=(uv-.5)*mt,wo=vec2(0.);
  float dk=u_u[1].x,tm=u_u[1].y,fs=u_u[4].w,wh=u_u[2].w,ws=u_u[5].z,wa=u_u[5].w,sh=0.,tr=0.,cu=0.;
#if STYLE == 4
  float rp=fract(dot(pm2,fp)*(18.+floor(ws*10.)))*6.283185,rs=sin(rp),rc=cos(rp);
#endif
#if STYLE == 1 || STYLE == 4 || STYLE == 5
  vec2 qs=pm2*(ws*.6)+u_u[5].xy+td*.55;
  wo=vec2(N(qs),N(qs+vec2(4.3,-2.1)))*(wa*.62);
#if STYLE == 4
  wo+=fp*(rs*.042)+fd*(rc*.008);
#endif
#else
  vec2 q0=pm2*ws+u_u[5].xy+td;
  float n1=N(q0),n2=N(q0*1.06+vec2(5.2,1.3));
  vec2 q1=q0*1.82+vec2(n1,n2)*.62+vec2(-3.7,4.1)-td*.65,o2=vec2(N(q1),N(q1+vec2(2.9,-4.6))),bw=vec2(n1,n2)*.72+o2*.28+fd*(n1*.22);
  wo=bw*wa;
#if STYLE == 2
  float rph=dot(pm2,fp)*(ws*2.3)+n1*1.58+o2.x*.48+dot(pm2,fd)*.4+tm*.16,fw=sin(rph)+.28*sin(rph*2.+.75),cr=.5+.5*cos(rph+n2*.32),sa=clamp(fs*1.85,0.,1.4);
  sh=pow(cr,2.25)*sa;tr=pow(1.-cr,2.1)*sa;
  wo+=(fp*(fw*.16)+fd*(cos(rph)*.058))*clamp(fs,0.,1.6);
#elif STYLE == 3
  float r1=1.-abs(N(q0*1.08+vec2(n1,n2)*.68)),r2=1.-abs(N(q1*.88-vec2(n2,n1)*.52));
  cu=pow(clamp(r1*.62+r2*.38,0.,1.),3.);
  wo=bw*(wa*.82)+fp*((r1-r2)*.14);
#else
  if(fs>.001)wo+=fp*(sin(dot(pm2,fp)*(ws*1.65)+n1*1.35)*fs*.085);
#endif
#endif
#if STYLE == 1
  const float bW=.82;
  vec3 sL=u_u[2].xyz*bW;float sC=length(u_u[2].yz)*bW,tW=bW;
  for(int i=0;i<6;i++){
    int b=i*4;vec4 lw=u_p[b];if(lw.w<=1e-4)continue;
    vec4 pp=u_p[b+1],tf=u_p[b+2],dv=u_p[b+3];
    vec2 v=(uv-pp.xy)*mt+wo;
    float d=length(vec2((v.x*tf.z+v.y*tf.w)*tf.x,(-v.x*tf.w+v.y*tf.z)*tf.y)),rn=d*pp.z,ch=sqrt(max(0.,1.-min(rn*rn*.55,.85))),rf=clamp(dot(v,dv.zw),-1.,1.),wr=rf*(1.25-.25*rf*rf)*.8;
    vec3 pl=vec3(clamp(lw.x+wr*.078+(ch-.72)*.035,.02,.99),mix(lw.yz,u_u[3].yz,max(0.,wr)*.14));
    float w=lw.w*((1.-Q((rn-dv.x)*dv.y))*(.62+.24*ch)+exp(-pow(max(rn*pp.w,1e-4),2.15))*.3)*2.45;
    sL+=pl*w;sC+=length(pl.yz)*w;tW+=w;
  }
#else
  const float bW=.58;
  vec3 sL;float sC,tW;
  F(uv,mt,wo,STYLE==2?1.58+.26*sh:STYLE==3?1.25+1.15*cu:(STYLE==4||STYLE==5)?1.75:1.65,sL,sC,tW);
#endif
  if(u_u[3].w>1e-4){
    float bn=length((uv-u_u[4].xy)*mt+wo*.35)*u_u[4].z,bf=(.62*exp(-pow(max(bn,1e-4),1.65))+.38/(1.+bn*bn*1.35))*u_u[3].w*(STYLE==1?1.35:1.05);
    sL+=u_u[3].xyz*bf;sC+=length(u_u[3].yz)*bf;tW+=bf;
  }
  vec3 lab=sL/tW;
  float cl=max(0.,sC/tW-length(lab.yz)),rl=max(0.,u_u[8].x);
  lab.x+=cl*(rl<=.22?rl*3.2:.704+(rl-.22)*.85);
  lab.yz+=u_u[7].xy*(cl*u_u[8].y*.42);
#if STYLE == 2
  lab.x+=sh*mix(.052,.078,dk)-tr*mix(.02,.036,dk);lab.yz*=1.+sh*.07;
#elif STYLE == 3
  lab.x+=cu*mix(.068,.115,dk)*(.45+.55*(tW-bW)/max(tW,1e-4))+cl*cu*.35;lab.yz=mix(lab.yz,u_u[3].yz,cu*.16);
#endif
  float ms=(tW-bW)/max(tW,1e-4)+(sh+cu)*.45;
  vec2 gm=vec2(dFdx(ms),-dFdy(ms))*(u_u[0].x/mt.x);
#if STYLE == 4
  float fr=pow(1.-abs(rc),2.4);
  lab.x+=fr*mix(.018,.03,dk)+clamp(dot(gm,fp)*.35+rs*.5,-1.,1.)*.016;lab.yz*=1.+fr*.08;
#elif STYLE == 5
  vec2 dp=clamp(gm*.055,vec2(-.045),vec2(.045))+fp*.013;
  vec3 pA,pB;float cA,cB,wA,wB;
  F(uv+dp,mt,wo,1.75,pA,cA,wA);F(uv-dp,mt,wo,1.75,pB,cB,wB);
  lab.y=mix(lab.y,(pA/wA).y,.72);lab.z=mix(lab.z,(pB/wB).z,.72);
  lab.x+=min(length(gm)*.016,.026);
#elif STYLE == 6
  float tf2=ms+dot(wo,fp)*.35;
  vec2 tg=vec2(dFdx(tf2),-dFdy(tf2));
  float dl=abs(fract(tf2*11.)-.5)/max(length(tg)*11.,1e-4),dm=abs(fract(tf2*2.75)-.5)/max(length(tg)*2.75,1e-4);
  lab.x+=mix(-1.,1.,dk)*((1.-Q((dl-.32)/1.18))*.018+(1.-Q((dm-.38)/1.22))*.02);
#endif
  if(wh>.001){
    vec2 tc=(u_u[7].zw*.5+.5-uv)*mt;
    vec3 sn=normalize(vec3(-gm*.88,1.)),kd=normalize(vec3(tc,.68));
    float r2=exp(-dot(tc,tc)*.42),gz=dot(sn.xy,kd.xy),zn=(pow(max(dot(sn,kd),0.),5.2)-.3)*r2;
    lab.x+=clamp((gz*.048+zn*.042+(r2-.36)*mix(.024,.036,dk))*wh,-.056,.062);
    lab.yz+=(u_u[7].xy*.015+vec2(.005,.015))*((gz*.75+(r2-.38)*.55)*wh);
  }
  float vg=clamp(u_u[8].z,-.25,.35);
  if(abs(vg)>5e-4){vec2 vu=uv-.5;lab.x-=vg*Q((dot(vu,vu)*2.2-.08)/1.18);}
  lab.x=clamp(lab.x,0.,1.);
  bool p3=u_u[1].z>.5;
  vec3 lv=vec3(lab.x+.3963378*lab.y+.2158038*lab.z,lab.x-.1055613*lab.y-.0638542*lab.z,lab.x-.0894842*lab.y-1.2914855*lab.z);
  lv*=lv*lv;
  vec3 c=p3
    ?vec3(dot(lv,vec3(3.127769,-2.257136,.1293668)),dot(lv,vec3(-1.091009,2.413332,-.3223227)),dot(lv,vec3(-.0260108,-.5080413,1.534052)))
    :vec3(dot(lv,vec3(4.076742,-3.307712,.2309699)),dot(lv,vec3(-1.268438,2.609757,-.3413194)),dot(lv,vec3(-.0041961,-.7034186,1.707615)));
  float rY=dot(c,p3?vec3(.2289746,.6917385,.0792869):vec3(.2126,.7152,.0722)),Y=clamp(rY,1e-4,.9999);
  if(rY>.88){float x=rY-.88;Y=.88+.1199*(x/(x+.1199));}
  vec3 h=c-vec3(rY),ev=max(max(vec3(0.),-h)/Y,max(vec3(0.),h)/(1.-Y));
  float e=max(ev.r,max(ev.g,ev.b));
  if(e>.82){float x=e-.82;h*=(.82+.18*(x/(x+.18)))/e;}
  c=clamp(vec3(Y)+h,0.,1.);
  vec3 enc=mix(1.055*pow(max(c,vec3(1e-5)),vec3(1./2.4))-.055,c*12.92,lessThanEqual(c,vec3(.0031308)));
  uvec2 px=uvec2(max(vec2(0.),gl_FragCoord.xy+u_u[9].xy));
  if(u_u[1].w>0.){float lm=dot(enc,vec3(.299,.587,.114));enc+=vec3(T(px,u_gs)*u_u[1].w*mix(.58,1.,clamp(4.*lm*(1.-lm),0.,1.)));}
  O=vec4(clamp(enc+vec3(T(px,u_gs^1597334677u)*(.5/255.)),0.,1.),1.);
}`;

const raf = (fn) => G.requestAnimationFrame?.(fn) || 0;
const caf = (id) => id && G.cancelAnimationFrame?.(id);

export class SphereRenderer {
  constructor(canvas, { onTiming = null, onFirstFrame = null, maxDpr = 3, pixelBudget = 5.2e6, interactiveBudget = 1.6e6, preserveDrawingBuffer = false, gamut = 'auto' } = {}) {
    if (!canvas) throw new Error('canvas?');
    const self = this, ptr = new Float32Array(2), tPtr = new Float32Array(2);
    const U = new Float32Array(40), P = new Float32Array(96), Ua = new Float32Array(40), Pa = new Float32Array(96);
    const gpuWin = [], pendQ = [], poolQ = [], progs = new Map();
    let gl = null, ctx2d = null, backend = 'webgl2', tier = 'static', lastCpu = 0, lastGpu = null, lastSc = null, anim = false, dead = false;
    let firstDone = false, p3 = false, gov = 1, rw = 0, rh = 0, wh = 0, tWh = 0, gs = 1, whOn = false, gm = gamut || 'auto';
    let fbMod = null, fbProm = null, exProm = null, morph = null, mScene = null, mOpts = null;
    let seedS = null, seedU = 0, lRaf = 0, qRaf = 0, cRaf = 0, mTime = 0, lastNow = 0;
    let vao = null, iFbo = null, iRbo = null, iW = 0, iH = 0, tExt = null, pExt = null;

    Object.assign(self, {
      canvas, onTiming: typeof onTiming === 'function' ? onTiming : null,
      maxDpr: Math.max(1, +maxDpr || 3), pixelBudget: Math.max(2.5e5, +pixelBudget || 5.2e6),
      interactiveBudget: Math.max(2.5e5, +interactiveBudget || 1.6e6),
      pointer: ptr, targetPointer: tPtr, _ef: null, _er: null, _ew: 0, _eh: 0, _fs: {},
    });

    const fireFirst = () => { if (!firstDone) { firstDone = true; onFirstFrame?.(); } };
    const getEx = () => exProm || (exProm = import('./export.js'));

    const syncGamut = () => {
      p3 = false;
      try {
        if (gl && 'drawingBufferColorSpace' in gl) {
          gl.drawingBufferColorSpace = gm === 'p3' || (gm === 'auto' && detectDisplayP3()) ? 'display-p3' : 'srgb';
          p3 = gl.drawingBufferColorSpace === 'display-p3';
        }
      } catch {}
    };

    const initGL = () => {
      progs.clear(); vao = gl.createVertexArray();
      for (const c of [2929, 3042, 2884, 3024]) gl.disable(c);
      syncGamut();
      tExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      pExt = gl.getExtension('KHR_parallel_shader_compile');
    };

    const loadFb = () => fbProm || (fbProm = import('./fallback.js').then((m) => {
      fbMod = m;
      if (!dead && lastSc && ctx2d) self.render(lastSc, { grainScale: gs });
      return m;
    }).catch(() => null));

    const evs = [['lost', (e) => { e.preventDefault(); pendQ.length = poolQ.length = 0; progs.clear(); iFbo = iRbo = self._ef = self._er = null; iW = iH = self._ew = self._eh = 0; }], ['restored', () => { if (!dead && backend === 'webgl2') { initGL(); if (lastSc) self.render(lastSc); } }]];
    for (const [k, fn] of evs) canvas.addEventListener?.(`webglcontext${k}`, fn, false);

    try { gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: !!preserveDrawingBuffer, powerPreference: 'high-performance' }); } catch {}
    if (gl) initGL();
    else { backend = 'canvas2d'; try { ctx2d = canvas.getContext('2d', { alpha: false }); } catch {} if (ctx2d) loadFb(); }

    const getProg = (sc) => {
      let e = progs.get(sc);
      if (e) return e;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const vs = sh(35633, VS_SRC), fs = sh(35632, `#version 300 es\n#define STYLE ${sc}\n${FS_BODY}`), pr = gl.createProgram();
      gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
      progs.set(sc, (e = { pr, vs, fs, ok: false, bad: false }));
      return e;
    };

    const linkProg = (e) => {
      if (e.ok || e.bad) return e.ok;
      const ok = gl.getProgramParameter(e.pr, 35714);
      if (!ok) console.error('[sphere-gl]', gl.getShaderInfoLog(e.vs), gl.getShaderInfoLog(e.fs), gl.getProgramInfoLog(e.pr));
      gl.deleteShader(e.vs); gl.deleteShader(e.fs); e.vs = e.fs = null;
      if (!ok) { gl.deleteProgram(e.pr); e.bad = true; return false; }
      for (const n of ['tr', 'u', 'p', 'gs']) e[n] = gl.getUniformLocation(e.pr, `u_${n}`);
      return (e.ok = true);
    };

    const ensureIFbo = (w, h) => {
      if (!iFbo) { iFbo = gl.createFramebuffer(); iRbo = gl.createRenderbuffer(); iW = iH = 0; }
      if (iW < w || iH < h) {
        const cw = Math.max(iW, w), ch = Math.max(iH, h);
        gl.bindRenderbuffer(36161, iRbo); gl.renderbufferStorage(36161, 32856, cw, ch);
        gl.bindFramebuffer(36160, iFbo); gl.framebufferRenderbuffer(36160, 36064, 36161, iRbo);
        const ok = gl.checkFramebufferStatus(36160) === 36053;
        gl.bindFramebuffer(36160, null); gl.bindRenderbuffer(36161, null);
        if (!ok) return false;
        iW = cw; iH = ch;
      }
      return true;
    };

    self.resize = (t = tier) => {
      tier = t === 'interactive' ? 'interactive' : 'static';
      const hasCss = (canvas.clientWidth || 0) > 0 && (canvas.clientHeight || 0) > 0;
      const cw = Math.max(1, hasCss ? canvas.clientWidth : canvas.width || 1280), ch = Math.max(1, hasCss ? canvas.clientHeight : canvas.height || 720);
      const d0 = hasCss ? (G.window?.devicePixelRatio || 1) : 1, area = Math.max(1, cw * ch);
      const sDpr = Math.min(d0, self.maxDpr, Math.sqrt(self.pixelBudget / area));
      const sw = Math.max(1, Math.floor(cw * sDpr)), sh = Math.max(1, Math.floor(ch * sDpr));
      if (canvas.width !== sw || canvas.height !== sh) { canvas.width = sw; canvas.height = sh; }
      if (tier === 'interactive') {
        const iDpr = Math.min(sDpr, Math.min(d0, self.maxDpr, Math.sqrt(self.interactiveBudget / area)) * gov);
        rw = Math.max(1, Math.min(sw, Math.floor(cw * iDpr))); rh = Math.max(1, Math.min(sh, Math.floor(ch * iDpr)));
        return { width: rw, height: rh, dpr: iDpr };
      }
      rw = sw; rh = sh;
      return { width: sw, height: sh, dpr: sDpr };
    };

    const drainQ = () => {
      if (!gl || !tExt || !pendQ.length) return false;
      let upd = false;
      while (pendQ.length) {
        const q = pendQ[0], av = gl.getQueryParameter(q, 34919), dj = gl.getParameter(tExt.GPU_DISJOINT_EXT);
        if (!av && !dj) break;
        pendQ.shift();
        if (av && !dj) {
          const ms = gl.getQueryParameter(q, 34918) / 1e6;
          lastGpu = ms; upd = true;
          if (tier === 'interactive' && Number.isFinite(ms)) {
            gpuWin.push(ms); if (gpuWin.length > 8) gpuWin.shift();
            if (gpuWin.length === 8) {
              const s = [...gpuWin].sort((a, b) => a - b), med = 0.5 * (s[3] + s[4]);
              if ((med > 8 && gov > 0.5) || (med < 4 && gov < 1)) { gov = clamp(gov * (med > 8 ? 0.9 : 1.1), 0.5, 1); gpuWin.length = 0; self.resize('interactive'); }
            }
          }
        }
        if (poolQ.length < 8) poolQ.push(q); else gl.deleteQuery(q);
      }
      return upd;
    };

    const pollQ = (att = 0) => {
      if (dead || lRaf || qRaf || !pendQ.length || att > 5) return;
      qRaf = raf(() => {
        qRaf = 0;
        if (!dead && drainQ()) self.onTiming?.({ cpuMs: lastCpu, gpuMs: lastGpu, width: gl?.drawingBufferWidth || canvas.width, height: gl?.drawingBufferHeight || canvas.height, backend });
        if (pendQ.length && !lRaf) pollQ(att + 1);
      });
    };

    const loop = () => {
      if (dead || lRaf || !G.requestAnimationFrame) return;
      caf(qRaf); qRaf = 0; lastNow = performance.now(); self.resize('interactive');
      const tick = (now) => {
        lRaf = 0;
        if (dead) return;
        const dt = clamp((now - lastNow) / 1e3, 1e-3, 0.08); lastNow = now;
        if (anim) mTime += dt * (mOpts?.speed ?? 1);
        const a = 1 - Math.exp(-dt * 6.2), dx = tPtr[0] - ptr[0], dy = tPtr[1] - ptr[1], dw = tWh - wh;
        if (whOn && !anim && Math.hypot(dx, dy) + Math.abs(dw) < 0.0016) { ptr[0] = tPtr[0]; ptr[1] = tPtr[1]; wh = tWh; whOn = false; }
        else { ptr[0] += dx * a; ptr[1] += dy * a; wh += dw * a; }
        let sc = anim ? mScene : lastSc, g = anim ? (mOpts?.grainScale ?? gs) : gs, mU = 0, mFrom = null, cb = null;
        if (morph) {
          g = morph.gs;
          const rt = clamp((now - morph.t0) / morph.dur, 0, 1);
          if (rt >= 1) { cb = morph; sc = morph.next; morph = null; if (anim) mScene = sc; }
          else { mU = 1 - (1 - rt) ** 3; mFrom = morph.from; sc = morph.next; if (anim) mScene = sc; cb = { u: mU, m: morph }; }
        }
        const run = anim || whOn || !!morph;
        if (!run) self.resize('static');
        if (sc) self.render(sc, { time: mTime, pointer: ptr, whisper: wh, grainScale: g, _mFrom: mFrom, _mU: mU });
        if (cb) { if (cb.m) cb.m.onUpdate?.(cb.u, cb.m.next); else { cb.onUpdate?.(1, cb.next); cb.onComplete?.(cb.next); } }
        if (run) lRaf = raf(tick);
      };
      lRaf = raf(tick);
    };

    for (const [k, g] of [
      ['gl', () => gl], ['ctx2d', () => ctx2d], ['backend', () => backend], ['gamut', () => gm],
      ['lastCpuMs', () => lastCpu], ['lastGpuMs', () => lastGpu], ['_lastScene', () => lastSc],
      ['isAnimating', () => anim], ['_destroyed', () => dead], ['tier', () => tier],
      ['isWhispering', () => whOn], ['isMorphing', () => !!morph], ['_gov', () => gov],
    ]) Object.defineProperty(self, k, { get: g });

    self.setGamut = (g = 'auto') => { gm = g; syncGamut(); };
    self.setPointer = (nx, ny) => {
      const cx = clamp(+nx || 0, -1.5, 1.5), cy = clamp(+ny || 0, -1.5, 1.5);
      tPtr[0] = cx; tPtr[1] = cy;
      if (anim && !tWh) tWh = 1;
      if (!lRaf) { ptr[0] = cx; ptr[1] = cy; }
    };
    self.wakePointer = (nx, ny, { strength = 1, grainScale } = {}) => {
      if (dead) return;
      tPtr[0] = clamp(+nx || 0, -1.5, 1.5); tPtr[1] = clamp(+ny || 0, -1.5, 1.5);
      tWh = clamp(Number.isFinite(strength) ? strength : 1, 0, 1.5);
      if (grainScale !== undefined) gs = grainScale;
      if (lastSc) { whOn = true; loop(); }
    };
    self.morphTo = (next, { duration = 560, grainScale, onUpdate, onComplete } = {}) => {
      if (dead || !next) return;
      if (grainScale !== undefined) gs = grainScale;
      const g = grainScale ?? gs;
      if (!lastSc || duration <= 0 || !G.requestAnimationFrame) {
        morph = null; if (anim) mScene = next;
        self.render(next, { time: mTime, pointer: ptr, whisper: wh, grainScale: g });
        onUpdate?.(1, next); onComplete?.(next); return;
      }
      morph = { t0: performance.now(), dur: Math.max(16, duration), gs: g, from: lastSc, next, onUpdate, onComplete };
      loop();
    };
    self.startMotion = self.startLoop = (sc, opts = {}) => {
      if (dead) return;
      mScene = sc || mScene || lastSc; mOpts = opts;
      if (opts.grainScale !== undefined) gs = opts.grainScale;
      anim = true; loop();
    };
    self.stopMotion = self.stopLoop = () => { anim = whOn = false; morph = null; caf(lRaf); lRaf = 0; tier = 'static'; };
    self.renderOnce = (sc, opts) => self.render(sc, opts);
    self.render = (scene, opts = {}) => {
      const ret = (cpuMs = 0, w = canvas.width || 0, h = canvas.height || 0, pend) => ({ cpuMs, lastGpuMs: lastGpu, width: w, height: h, ...(pend && { pending: true }) });
      if (dead || !scene) return ret();
      lastSc = scene;
      if (opts.grainScale !== undefined) gs = opts.grainScale;
      if (!canvas.width || !canvas.height) self.resize();
      const tm = opts.time ?? 0, p = opts.pointer || ptr, gSc = opts.grainScale ?? 1, wAmt = opts.whisper ?? wh;
      const act = opts._mFrom && opts._mU < 0.5 ? opts._mFrom : scene;

      if (backend === 'canvas2d') {
        const w = canvas.width, h = canvas.height;
        if (!fbMod) { if (ctx2d) loadFb(); return ret(0, w, h, true); }
        const r = fbMod.renderCanvas2DFallback(ctx2d, self._fs, act, w, h, tm, p, gSc);
        lastCpu = r.cpuMs; fireFirst();
        self.onTiming?.({ cpuMs: r.cpuMs, gpuMs: null, width: w, height: h, backend });
        return r;
      }

      if (!gl || gl.isContextLost()) return ret();
      const sc = styleToIndex(act.style), ent = getProg(sc);
      if (!ent.ok) {
        if (pExt && !opts.sync && G.requestAnimationFrame && !gl.getProgramParameter(ent.pr, pExt.COMPLETION_STATUS_KHR)) {
          cRaf ||= raf(() => { cRaf = 0; if (!dead && lastSc) self.render(lastSc, { time: mTime, pointer: ptr, whisper: wh, grainScale: gs }); });
          return ret(0, gl.drawingBufferWidth || canvas.width, gl.drawingBufferHeight || canvas.height, true);
        }
        if (!linkProg(ent)) return ret();
      }

      drainQ();
      const t0 = performance.now(), tile = opts._exportTile || null;
      const dstW = Math.max(1, gl.drawingBufferWidth || canvas.width), dstH = Math.max(1, gl.drawingBufferHeight || canvas.height);
      let vpW = dstW, vpH = dstH, mfW = dstW, mfH = dstH, blit = false;
      if (tile) { gl.bindFramebuffer(36160, tile.fbo); vpW = tile.tw; vpH = tile.th; mfW = tile.fullW; mfH = tile.fullH; }
      else if (tier === 'interactive' && rw > 0 && rh > 0 && (rw < dstW || rh < dstH) && ensureIFbo(dstW, dstH)) {
        blit = true; vpW = mfW = Math.min(dstW, rw); vpH = mfH = Math.min(dstH, rh); gl.bindFramebuffer(36160, iFbo);
      } else gl.bindFramebuffer(36160, null);

      gl.viewport(0, 0, vpW, vpH); gl.useProgram(ent.pr); gl.bindVertexArray(vao);
      gl.uniform4f(ent.tr, tile ? tile.tx / mfW : 0, tile ? tile.ty / mfH : 0, tile ? vpW / mfW : 1, tile ? vpH / mfH : 1);

      const minD = Math.max(1, Math.min(mfW, mfH)), refD = minD + (Math.sqrt(mfW * mfH) - minD) * 0.22, mx = mfW / refD, my = mfH / refD;
      packScene(scene, sc, tm, p, wAmt, gSc, mfW, mfH, mx, my, tile, p3, U, P);
      if (opts._mFrom) {
        const u = opts._mU;
        packScene(opts._mFrom, sc, tm, p, wAmt, gSc, mfW, mfH, mx, my, tile, p3, Ua, Pa);
        const far = Math.hypot(U[20] - Ua[20], U[21] - Ua[21]) > 3.5 || opts._mFrom.style !== scene.style;
        const env = far ? 1 - 0.9 * Math.sin(u * Math.PI) : 1, px = U[20], py = U[21];
        for (let k = 4; k < 36; k++) U[k] = Ua[k] + (U[k] - Ua[k]) * u;
        U[19] *= env; U[23] *= env;
        if (far && u < 0.5) { U[20] = Ua[20]; U[21] = Ua[21]; } else if (far) { U[20] = px; U[21] = py; }
        for (let k = 0; k < 96; k++) P[k] = Pa[k] + (P[k] - Pa[k]) * u;
        for (let b = 0; b < 96; b += 16) { const l = Math.hypot(P[b + 10], P[b + 11]) || 1; P[b + 10] /= l; P[b + 11] /= l; }
      }
      gl.uniform4fv(ent.u, U);
      if (act.seed !== seedS) { seedS = act.seed; seedU = hashSeed32(seedS); }
      gl.uniform1ui(ent.gs, seedU);
      gl.uniform4fv(ent.p, P);

      const q = !tile && tExt && pendQ.length < 4 ? (poolQ.pop() || gl.createQuery()) : null;
      if (q) gl.beginQuery(tExt.TIME_ELAPSED_EXT, q);
      gl.drawArrays(4, 0, 3);
      if (blit) {
        gl.bindFramebuffer(36008, iFbo); gl.bindFramebuffer(36009, null);
        gl.blitFramebuffer(0, 0, vpW, vpH, 0, 0, dstW, dstH, 16384, 9729);
        gl.bindFramebuffer(36008, null);
      }
      if (q) { gl.endQuery(tExt.TIME_ELAPSED_EXT); pendQ.push(q); }
      gl.bindVertexArray(null);

      const cpuMs = performance.now() - t0;
      lastCpu = cpuMs;
      if (!tile) {
        fireFirst();
        self.onTiming?.({ cpuMs, gpuMs: lastGpu, width: vpW, height: vpH, backend });
        if (q && !lRaf) pollQ(0);
      }
      return ret(cpuMs, vpW, vpH);
    };

    for (const [m, d] of [['exportImage', 0], ['exportPNG', 0], ['exportSVG', 1], ['exportCSS', 1]]) {
      self[m] = async (sc, o = {}) => {
        const isS = sc && (sc.poles || sc.baseLab);
        return (await getEx())[m](...(d ? [isS ? sc : lastSc, isS ? o : sc || o] : [self, isS ? sc : lastSc, isS ? o : sc || o]));
      };
    }

    self.destroy = () => {
      if (dead) return;
      dead = true; self.stopMotion(); caf(qRaf); caf(cRaf); qRaf = cRaf = 0;
      for (const [k, fn] of evs) canvas.removeEventListener?.(`webglcontext${k}`, fn, false);
      if (gl && !gl.isContextLost()) {
        for (const q of [...pendQ, ...poolQ]) gl.deleteQuery(q);
        if (vao) gl.deleteVertexArray(vao);
        for (const f of [iFbo, self._ef]) if (f) gl.deleteFramebuffer(f);
        for (const r of [iRbo, self._er]) if (r) gl.deleteRenderbuffer(r);
        for (const e of progs.values()) { if (e.vs) gl.deleteShader(e.vs); if (e.fs) gl.deleteShader(e.fs); if (e.pr) gl.deleteProgram(e.pr); }
      }
      pendQ.length = poolQ.length = 0; progs.clear();
      vao = iFbo = iRbo = self._ef = self._er = gl = ctx2d = lastSc = mScene = null;
      self._fs = {};
    };
  }
}

export default SphereRenderer;
export { SphereRenderer as AuraRenderer };
