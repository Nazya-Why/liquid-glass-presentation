/* ==========================================================================
   Живий фон (світла тема): WebGL-шейдер «перлинний туман + скляне кільце + лінія-хвиля».
   Кожен слайд має data-scene, параметри сцени плавно перетікають між слайдами.
   ========================================================================== */
(() => {
  const canvas = document.getElementById('bg');
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) { document.documentElement.classList.add('no-webgl'); window.BG = { setScene() {} }; return; }

  // ---- Сцени: aur = [x, y, стиснення, сила], ring = [x, y, радіус, сила],
  //      wave = [y, амплітуда, сила, зсув горба], tint 0 = бірюза, 1 = холодний синій
  const SCENES = {
    hero:    { aur: [0.00, -0.30, 1.00, 1.10], ring: [0.00, 0.00, 0.36, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.0 },
    calm:    { aur: [0.55, -0.48, 0.90, 0.55], ring: [0.00, 0.00, 0.36, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.2 },
    ring:    { aur: [0.00, -0.58, 1.20, 0.40], ring: [0.00, 0.00, 0.37, 1], wave: [-0.20, 0.20, 0, 0.00], tint: 0.0 },
    quote:   { aur: [-0.10, -0.62, 0.80, 0.70], ring: [0.00, -1.20, 0.80, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.1 },
    wave:    { aur: [0.20, -0.70, 1.00, 0.30], ring: [0.00, 0.00, 0.36, 0], wave: [-0.16, 0.22, 1, 0.28], tint: 0.0 },
    corner:  { aur: [0.75, 0.42, 0.90, 0.55], ring: [0.00, 0.00, 0.36, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.35 },
    low:     { aur: [-0.40, -0.55, 1.10, 0.60], ring: [0.00, 0.00, 0.36, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.15 },
    arc:     { aur: [0.30, -0.50, 0.90, 0.55], ring: [-0.78, 0.02, 0.58, 1], wave: [-0.20, 0.20, 0, 0.00], tint: 0.25 },
    glow:    { aur: [0.00, 0.05, 0.70, 0.45], ring: [0.00, 0.00, 0.36, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.1 },
    horizon: { aur: [0.00, -0.75, 1.00, 0.25], ring: [0.00, 0.00, 0.36, 0], wave: [-0.30, 0.12, 0.8, -0.35], tint: 0.3 },
    sweep:   { aur: [0.45, -0.40, 1.00, 0.65], ring: [-0.62, 0.55, 0.80, 1], wave: [-0.20, 0.20, 0, 0.00], tint: 0.05 },
    deep:    { aur: [-0.30, -0.80, 1.00, 0.30], ring: [0.00, 0.00, 0.36, 0], wave: [-0.36, 0.10, 0.9, 0.30], tint: 0.1 },
    final:   { aur: [0.00, -0.42, 0.75, 1.35], ring: [0.00, 0.00, 0.36, 0], wave: [-0.20, 0.20, 0, 0.00], tint: 0.0 },
  };

  const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const frag = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uStageH; uniform float uTint;
uniform vec2 uMouse; uniform vec4 uAur; uniform vec4 uRing; uniform vec4 uWave;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uStageH;
  float t = uTime;
  vec2 par = uMouse * 0.025;

  /* --- світла перлинна база --- */
  vec3 col = mix(vec3(0.905,0.918,0.926), vec3(0.962,0.966,0.970), smoothstep(-0.55,0.45,uv.y));

  /* відтінки сірого: срібний, сталевий, графіт (uTint трохи охолоджує тон) */
  vec3 mint  = mix(vec3(0.80,0.815,0.825), vec3(0.78,0.80,0.83), uTint);
  vec3 teal  = mix(vec3(0.36,0.39,0.41), vec3(0.33,0.37,0.41), uTint);
  vec3 pearl = vec3(0.995,0.995,0.997);

  /* --- аврора: м'який кольоровий туман --- */
  vec2 ap = uv - uAur.xy - par;
  float s = 0.055*t;
  vec2 q = vec2(fbm(ap*1.4 + vec2(s,-s)), fbm(ap*1.4 + vec2(-s*0.8, s) + 5.2));
  float n = fbm(ap*1.1 + q*1.8 + vec2(0.0, -s*0.5));
  float band = ap.y*uAur.z + (n-0.5)*0.55;
  float mask = exp(-band*band*9.0) * exp(-ap.x*ap.x*0.9);
  float veil = exp(-dot(ap,ap)*2.4) * 0.35;
  vec3 ac = mix(pearl, mint, smoothstep(0.28,0.62,n));
  ac = mix(ac, teal, smoothstep(0.60,0.92,n)*0.40);
  col = mix(col, ac, clamp((mask*0.9 + veil)*uAur.w, 0.0, 1.0)*0.78);

  /* --- кільце: світла скляна сфера з тонким контуром --- */
  vec2 rp = uv - uRing.xy - par*0.5;
  float r = length(rp);
  float d = r - uRing.z;
  vec2 dir = rp / max(r, 1e-4);
  vec2 L = normalize(vec2(sin(t*0.15)*0.5, -1.0));
  float lit = pow(clamp(dot(dir, L)*0.5 + 0.5, 0.0, 1.0), 2.6);
  float inside = smoothstep(0.003, -0.003, d);
  float w = uRing.w;
  col = mix(col, mix(vec3(0.99), mint, 0.10), inside*w*0.70);
  float glowIn = exp(min(d,0.0)*13.0) * inside;
  float halo   = exp(-max(d,0.0)*7.0) * (1.0 - inside);
  col = mix(col, mint, glowIn*w*0.45*(0.25+lit));
  col *= 1.0 - halo*w*0.07;
  float rimLine = exp(-abs(d)*520.0);
  float rimSoft = exp(-abs(d)*110.0);
  col = mix(col, teal*0.75, clamp(rimLine*(0.25+0.65*lit), 0.0, 1.0)*w);
  col = mix(col, teal, rimSoft*w*0.22*(0.3+lit));

  /* --- лінія-хвиля --- */
  float x = uv.x;
  float bx = x - uWave.w - sin(t*0.12)*0.08;
  float y = uWave.x + uWave.y*( exp(-bx*bx*7.0) - 0.45*exp(-pow(bx+0.6,2.0)*5.0) - 0.45*exp(-pow(bx-0.65,2.0)*5.0) )
          + 0.010*sin(x*4.0 + t*0.45);
  float wd = uv.y - y;
  float below = smoothstep(0.0, -0.012, wd);
  float fadeX = smoothstep(1.25, 0.35, abs(x));
  float z = uWave.z;
  col = mix(col, col*0.94 + mint*0.04, below*z);
  float line  = exp(-abs(wd)*560.0);
  float lsoft = exp(-abs(wd)*130.0);
  float wglow = exp(-abs(wd)*16.0);
  float under = below*exp(wd*6.0);
  col = mix(col, mint, (wglow*0.30 + under*0.35)*z*fadeX);
  col = mix(col, teal, lsoft*0.25*z*fadeX);
  col = mix(col, teal*0.7, clamp(line*0.85*z*fadeX, 0.0, 1.0));

  /* --- легка віньєтка, зерно --- */
  vec2 vv = uv*vec2(0.65,1.0);
  col *= 1.0 - 0.10*dot(vv,vv);
  col += (hash(gl_FragCoord.xy + fract(t*0.37)*91.7) - 0.5) * 0.010;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes','uTime','uStageH','uTint','uMouse','uAur','uRing','uWave'].forEach(n => U[n] = gl.getUniformLocation(prog, n));

  // поточні та цільові значення
  const clone = sc => ({ aur: [...sc.aur], ring: [...sc.ring], wave: [...sc.wave], tint: sc.tint });
  let cur = clone(SCENES.hero), target = clone(SCENES.hero);
  const mouse = [0, 0], mouseT = [0, 0];
  let renderScale = 1, stageH = 1080;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderScale = dpr * (innerWidth * dpr > 2200 ? 0.7 : 0.85);
    canvas.width = Math.round(innerWidth * renderScale);
    canvas.height = Math.round(innerHeight * renderScale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stageH = 1080 * s * renderScale;
  }
  addEventListener('resize', resize); resize();

  addEventListener('pointermove', e => {
    mouseT[0] = (e.clientX / innerWidth) * 2 - 1;
    mouseT[1] = -((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now(); let last = t0;

  function lerpArr(a, b, k) { for (let i = 0; i < a.length; i++) a[i] += (b[i] - a[i]) * k; }

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 2.4);
    lerpArr(cur.aur, target.aur, k); lerpArr(cur.ring, target.ring, k); lerpArr(cur.wave, target.wave, k);
    cur.tint += (target.tint - cur.tint) * k;
    lerpArr(mouse, mouseT, 1 - Math.exp(-dt * 3));

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, reduce ? 12 : (now - t0) / 1000);
    gl.uniform1f(U.uStageH, stageH);
    gl.uniform1f(U.uTint, cur.tint);
    gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
    gl.uniform4fv(U.uAur, cur.aur); gl.uniform4fv(U.uRing, cur.ring); gl.uniform4fv(U.uWave, cur.wave);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.BG = {
    scenes: SCENES,
    setScene(name, instant) {
      const sc = SCENES[name] || SCENES.calm;
      target = clone(sc);
      if (instant) cur = clone(sc);
    },
  };
})();
