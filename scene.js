/* ============================================================
   3D 场景引擎
   一套渲染器 · 十种参数化粒子场景
   每幕 = 一个基础几何 + 一段 GLSL 位移
   滚动进度（uProgress）驱动形变，时间（uTime）驱动呼吸
   ============================================================ */
import * as THREE from 'three';

/* ---------- 主题 → 3D 配色 ---------- */
const THEME_3D = {
  ink:   { c1: 0xc9a227, c2: 0x4a7f80, dark: true,  intensity: 1.0 },
  paper: { c1: 0x9e3b2e, c2: 0x2f5d63, dark: false, intensity: 0.62 },
  cream: { c1: 0x0042af, c2: 0x2f6fd0, dark: false, intensity: 0.66 }
};

/* ---------- 通用顶点着色器骨架 ---------- */
const VERT_HEAD = /* glsl */ `
attribute float aRand;
attribute float aSize;
uniform float uTime;
uniform float uProgress;
uniform float uOpacity;
uniform float uScale;   // 透视因子 = 绘制缓冲高度 / (2*tan(fov/2))
uniform float uSize;    // 世界单位下的点直径
uniform float uAlpha;   // 每幕的亮度上限（加法混合下防过曝）
varying float vAlpha;
varying float vMix;

mat2 rot2(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
`;

const VERT_TAIL = /* glsl */ `
void main(){
  vec3 p = position;
  float vm = 0.0;
  // __BODY__ 由各场景注入，写入 p 与 vm
  BODY_PLACEHOLDER
  vMix = clamp(vm, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.001);
  gl_PointSize = clamp(uSize * aSize * uScale / dist, 0.5, 22.0);
  vAlpha = uOpacity * uAlpha;
}
`;

/* ---------- 通用片元着色器 ---------- */
const FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uSoft;
varying float vAlpha;
varying float vMix;

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, uSoft, d);
  vec3 col = mix(uC1, uC2, vMix);
  gl_FragColor = vec4(col, a * a * vAlpha);
}
`;

/* ============================================================
   十种场景：几何 + 位移
   ============================================================ */
const SCENES = {

  /* 0 首屏 · 因陀罗网 —— 珠珠相映，一珠现一切珠 */
  indra: {
    count: 7200,
    build() {
      // 斐波那契球面分布，保证均匀
      const i = Math.random();
      const y = 1 - 2 * i;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.random() * Math.PI * 2;
      const R = 1.95 + Math.random() * 0.42;
      return [Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R, Math.random()];
    },
    body: /* glsl */ `
      float breathe = 1.0 + sin(uTime * 0.55 + aRand * 9.0) * 0.035 + uProgress * 0.2;
      p *= breathe;
      p.xz = rot2(uTime * 0.055) * p.xz;
      p.y += sin(uTime * 0.45 + aRand * 15.0) * 0.055;
      float twinkle = 0.5 + 0.5 * sin(uTime * 1.7 + aRand * 60.0);
      vm = 0.18 + twinkle * 0.62 + uProgress * 0.18;
    `,
    size: 0.029, soft: 0.11, alpha: 0.90, yOff: 0
  },

  /* 11 结归 · 光聚成柱，向上开敷 */
  bloom: {
    count: 5000,
    build() {
      const a = Math.random() * Math.PI * 2;
      const r = 0.35 + Math.pow(Math.random(), 0.6) * 4.2;
      return [Math.cos(a) * r, (Math.random() - 0.5) * 1.6, Math.sin(a) * r, Math.min(1, r / 4.5)];
    },
    body: /* glsl */ `
      float rr = aRand;
      float gather = smoothstep(0.0, 0.6, uProgress);
      float open = smoothstep(0.45, 1.0, uProgress);
      p.xz *= 1.0 - gather * 0.82 + open * rr * 1.7;
      p.y += gather * 1.7 + open * 1.5 * (1.0 - rr);
      p.xz = rot2(uTime * 0.085 + open * 0.55) * p.xz;
      p.y += sin(uTime * 0.8 + aRand * 24.0) * 0.05;
      vm = 0.18 + gather * 0.4 + open * 0.5 + sin(uTime * 1.25 + aRand * 36.0) * 0.18;
    `,
    size: 0.026, soft: 0.11, alpha: 0.86, yOff: -0.2
  },

  /* 1 礼敬诸佛 · 无量分身 —— 层层圆环，一浪一浪俯身 */
  avatars: {
    count: 4200,
    build(i, n) {
      const layers = 7;
      const layer = Math.floor(Math.random() * layers);
      const r = 0.55 + layer * 0.42 + Math.random() * 0.1;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.4 * (1 - layer / (layers + 2));
      return [Math.cos(a) * r, y - 0.4, Math.sin(a) * r, layer / layers];
    },
    body: /* glsl */ `
      float layer = aRand;
      float phase = uProgress * 4.2 - layer * 0.55;
      float bow = max(0.0, sin(phase));
      p.y -= bow * (0.55 + layer * 0.18);
      p.xz *= 1.0 - bow * 0.12;
      p.xz = rot2(uTime * 0.045 + layer * 0.06) * p.xz;
      p.y += sin(uTime * 0.7 + aRand * 24.0) * 0.035;
      vm = bow * 0.85 + 0.12;
    `,
    size: 0.027, soft: 0.13, alpha: 0.86, yOff: 0
  },

  /* 2 称赞如来 · 音声海 —— 同心波纹自中心扩散铺满 */
  ocean: {
    count: 5000,
    build() {
      const r = Math.pow(Math.random(), 0.62) * 5.4;
      const a = Math.random() * Math.PI * 2;
      return [Math.cos(a) * r, 0, Math.sin(a) * r, r / 5.4];
    },
    body: /* glsl */ `
      float r = length(p.xz);
      float amp = 0.16 + uProgress * 0.42;
      float wave = sin(r * 1.9 - uTime * 1.5) * amp * exp(-r * 0.18);
      float ring = sin(r * 3.6 - uTime * 2.4) * 0.5 + 0.5;
      p.y = wave;
      p.y -= uProgress * 0.3;
      vm = ring * 0.75 + 0.15 + uProgress * 0.2;
    `,
    size: 0.023, soft: 0.07, alpha: 0.80, yOff: -1.4
  },

  /* 3 广修供养 · 云供 —— 云团自下方升起，缓缓环绕 */
  clouds: {
    count: 4600,
    build() {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.pow(Math.random(), 0.5);
      const r = 0.5 + rr * 3.2;
      return [Math.cos(a) * r, (Math.random() - 0.5) * 2.0 - 1.0, Math.sin(a) * r, rr];
    },
    body: /* glsl */ `
      float rr = aRand;
      float rise = uProgress * (1.1 + rr * 1.6);
      p.y += rise + sin(uTime * 0.35 + rr * 30.0) * 0.16;
      p.xz = rot2(uTime * 0.07 + rr * 0.5) * p.xz;
      p.xz *= 1.0 - uProgress * 0.22 * rr;
      p.y += sin(uTime * 0.9 + aRand * 40.0) * 0.05;
      vm = 0.25 + rr * 0.6 + sin(uTime * 0.5 + rr * 12.0) * 0.18;
    `,
    size: 0.025, soft: 0.11, alpha: 0.82, yOff: 0.2
  },

  /* 4 忏悔业障 · 洗濯 —— 一道光带自上而下扫过，扫过即净 */
  wash: {
    count: 5200,
    build() {
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.55) * 2.8;
      return [Math.cos(a) * r, (Math.random() - 0.5) * 6.0, Math.sin(a) * r, r / 2.8];
    },
    body: /* glsl */ `
      float bandY = 2.4 - uProgress * 5.2;
      float band = exp(-pow((p.y - bandY) * 0.85, 2.0));
      float cleaned = step(p.y, bandY);
      p.xz = rot2(uTime * 0.05 + cleaned * 0.4) * p.xz;
      p.y += cleaned * 0.28 + band * 0.2;
      p.xz *= 1.0 + cleaned * 0.10;
      p.x += sin(uTime * 1.1 + aRand * 30.0) * 0.04;
      vm = cleaned * 0.85 + band * 0.95;
    `,
    size: 0.023, soft: 0.13, alpha: 0.80, yOff: 0
  },

  /* 5 随喜功德 · 传灯 —— 一点引燃，光按距离依次蔓延 */
  kindle: {
    count: 5000,
    build() {
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5) * 5.0;
      return [Math.cos(a) * r, (Math.random() - 0.5) * 2.6, Math.sin(a) * r, r / 5.0];
    },
    body: /* glsl */ `
      float d = length(p.xz) / 5.0;
      float front = uProgress * 1.28 - 0.14;
      float lit = smoothstep(front + 0.16, front - 0.05, d);
      float flicker = 0.72 + sin(uTime * 2.4 + aRand * 60.0) * 0.28;
      p.y += lit * 0.42 * flicker + sin(uTime * 0.8 + aRand * 20.0) * 0.04;
      p.xz = rot2(uTime * 0.06 * lit) * p.xz;
      vm = lit * flicker;
    `,
    size: 0.027, soft: 0.09, alpha: 0.84, yOff: 0
  },

  /* 6 请转法轮 · 法轮 —— 轮辐旋转，一圈一圈推开 */
  wheel: {
    count: 4800,
    build() {
      const spokes = 12;
      const spoke = Math.floor(Math.random() * spokes);
      const r = Math.pow(Math.random(), 0.7) * 4.2 + 0.25;
      const jitter = (Math.random() - 0.5) * 0.11;
      const a = (spoke / spokes) * Math.PI * 2 + jitter;
      return [Math.cos(a) * r, (Math.random() - 0.5) * 0.22, Math.sin(a) * r, r / 4.4];
    },
    body: /* glsl */ `
      float rr = aRand;
      float spin = uTime * 0.22 + uProgress * 1.6;
      p.xz = rot2(spin * (1.0 - rr * 0.45)) * p.xz;
      float pulse = 1.0 + sin(uTime * 1.2 - rr * 5.0) * 0.05 + uProgress * 0.22;
      p.xz *= pulse;
      p.y += sin(uTime * 0.9 + rr * 8.0) * 0.06;
      vm = 0.18 + rr * 0.72 + sin(uTime * 1.5 - rr * 6.0) * 0.2;
    `,
    size: 0.025, soft: 0.11, alpha: 0.82, yOff: 0
  },

  /* 7 请佛住世 · 长明灯 —— 一柱稳定的光焰，向上湍流 */
  lamp: {
    count: 4400,
    build() {
      const h = Math.pow(Math.random(), 0.65);
      const rad = (1 - h) * 0.85 + 0.04;
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6) * rad;
      return [Math.cos(a) * r, h * 4.0 - 1.6, Math.sin(a) * r, h];
    },
    body: /* glsl */ `
      float h = aRand;
      float turb = (1.0 - h) * 0.34 + 0.05;
      p.x += sin(uTime * 1.5 + p.y * 2.2 + aRand * 30.0) * turb * 0.5;
      p.z += cos(uTime * 1.25 + p.y * 2.0 + aRand * 26.0) * turb * 0.5;
      p.y += sin(uTime * 1.9 + aRand * 18.0) * 0.07 + uProgress * 0.25 * h;
      float flick = 0.7 + sin(uTime * 3.1 + aRand * 44.0) * 0.3;
      vm = (1.0 - h) * flick * 0.9 + h * 0.35;
    `,
    size: 0.025, soft: 0.15, alpha: 0.80, yOff: 0.1
  },

  /* 8 常随佛学 · 光阶 —— 阶梯逐级点亮，拾级而上 */
  steps: {
    count: 4600,
    build() {
      const steps = 11;
      const s = Math.floor(Math.random() * steps);
      const x = (Math.random() - 0.5) * 2.6;
      const z = (Math.random() - 0.5) * 1.5;
      return [x, s * 0.42 - 2.1, z, s / steps];
    },
    body: /* glsl */ `
      float s = aRand;
      float front = uProgress * 1.15 - 0.06;
      float lit = smoothstep(front + 0.09, front - 0.02, s);
      p.y += lit * 0.14 + sin(uTime * 0.7 + aRand * 16.0) * 0.03;
      p.x += sin(uTime * 0.5 + s * 6.0) * 0.05;
      float flick = 0.68 + sin(uTime * 1.8 + aRand * 50.0) * 0.32;
      vm = lit * flick * 0.95 + (1.0 - lit) * 0.12;
    `,
    size: 0.023, soft: 0.09, alpha: 0.82, yOff: 0.1
  },

  /* 9 恒顺众生 · 树根 —— 万类汇聚，缠成发光的树 */
  tree: {
    count: 5600,
    build() {
      const a = Math.random() * Math.PI * 2;
      const r = 2.6 + Math.random() * 2.6;
      const y = (Math.random() - 0.5) * 3.4;
      // 树形目标位：主干 + 分叉
      const branch = Math.floor(Math.random() * 7);
      const ba = (branch / 7) * Math.PI * 2;
      const th = Math.pow(Math.random(), 0.8);
      const tx = Math.cos(ba) * th * 1.5;
      const tz = Math.sin(ba) * th * 1.5;
      const ty = th * 3.2 - 1.7;
      return [Math.cos(a) * r, y, Math.sin(a) * r, 0, tx, ty, tz];
    },
    body: /* glsl */ `
      // aRand 携带汇聚进度；目标树形坐标存在下面两个 attribute 里（用 p 的余量推导）
      float rr = aRand;
      // 用球面收敛 + 竖直生长的合成：progress 越大越像树
      float k = smoothstep(0.0, 1.0, uProgress);
      vec3 radial = normalize(vec3(p.x, 0.001, p.z));
      float height = p.y;
      vec3 treeP = vec3(radial.x * (0.10 + abs(height) * 0.30),
                        height * 1.15 + 0.9,
                        radial.z * (0.10 + abs(height) * 0.30));
      p = mix(p, treeP, k * 0.88);
      float sway = sin(uTime * 0.5 + height * 0.9) * 0.06 * k;
      p.x += sway;
      p.z += sway * 0.6;
      p.y += sin(uTime * 0.75 + aRand * 22.0) * 0.035;
      vm = 0.2 + k * 0.7 + sin(uTime * 0.9 + aRand * 30.0) * 0.15;
    `,
    size: 0.024, soft: 0.11, alpha: 0.80, yOff: 0
  },

  /* 10 普皆回向 · 回向 —— 万光收束成一束，推出去，再散开 */
  dedication: {
    count: 5200,
    build() {
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5) * 4.6;
      const y = (Math.random() - 0.5) * 4.4;
      return [Math.cos(a) * r, y, Math.sin(a) * r, r / 4.6];
    },
    body: /* glsl */ `
      float rr = aRand;
      float gather = smoothstep(0.0, 0.52, uProgress);
      float shoot  = smoothstep(0.52, 1.0, uProgress);
      // 收束：径向压到轴心附近
      p.xz *= 1.0 - gather * 0.94;
      p.y  *= 1.0 - gather * 0.72;
      // 射出：沿 +Z 冲出去
      p.z += shoot * (7.0 + rr * 6.0);
      // 散开：末端重新张开
      p.xz *= 1.0 + shoot * rr * 1.4;
      p.y  += shoot * sin(rr * 20.0) * 0.8;
      p.xz = rot2(uTime * 0.05) * p.xz;
      vm = 0.2 + gather * 0.35 + shoot * 0.6 + sin(uTime * 1.4 + aRand * 40.0) * 0.18;
    `,
    size: 0.025, soft: 0.09, alpha: 0.84, yOff: 0
  }
};

/* ============================================================
   引擎
   ============================================================ */
export function createScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL 初始化失败，页面将退化为纯文字', err);
    canvas.style.display = 'none';
    return null;
  }

  renderer.setClearAlpha(0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.3, 8.6);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  scene.add(root);

  /* ---- 构建十幕 ---- */
  const layers = [];
  const keys = Object.keys(SCENES);

  keys.forEach((key) => {
    const def = SCENES[key];
    const n = def.count;
    const pos = new Float32Array(n * 3);
    const rnd = new Float32Array(n);
    const sz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = def.build(i, n);
      pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2];
      rnd[i] = r[3] !== undefined ? r[3] : Math.random();
      sz[i] = 0.55 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    const uni = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 0 },
      uScale: { value: 1000 },
      uSize: { value: def.size },
      uAlpha: { value: def.alpha ?? 0.6 },
      uSoft: { value: def.soft },
      uC1: { value: new THREE.Color(0xc9a227) },
      uC2: { value: new THREE.Color(0x4a7f80) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: uni,
      vertexShader: VERT_HEAD + VERT_TAIL.replace('BODY_PLACEHOLDER', def.body),
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.visible = false;
    points.userData = { key, yOff: def.yOff || 0, opacity: 0, target: 0, baseAlpha: def.alpha ?? 0.6 };
    root.add(points);
    layers.push(points);
  });

  /* ---- 主题 ---- */
  let themeName = 'ink';
  function applyTheme(name) {
    themeName = name;
    const t = THEME_3D[name] || THEME_3D.ink;
    layers.forEach((pts) => {
      pts.material.uniforms.uC1.value.setHex(t.c1);
      pts.material.uniforms.uC2.value.setHex(t.c2);
      pts.material.uniforms.uAlpha.value = pts.userData.baseAlpha * t.intensity;
      pts.material.blending = t.dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      pts.material.needsUpdate = true;
    });
    return t;
  }

  /* ---- 尺寸 ---- */
  let sideOffset = 2.05;

  function resize() {
    const w = Math.round(window.innerWidth);
    const h = Math.round(window.innerHeight);
    if (!w || !h) return;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const aspect = w / h;
    // 宽屏才把主体推到一侧给文字让位；窄屏居中
    sideOffset = aspect > 1.5 ? 2.55 : aspect > 1.15 ? 1.9 : 0;
    layers.forEach((pts) => {
      const side = pts.userData.side;
      if (side === undefined) return;
      pts.position.x = side === 'right' ? sideOffset : side === 'left' ? -sideOffset : 0;
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // 透视因子：让 gl_PointSize 与真实世界尺寸对应，避免点被算成巨型光斑
    const pr = renderer.getPixelRatio();
    const scale = (h * pr) / (2 * Math.tan((camera.fov * Math.PI / 180) / 2));
    layers.forEach((p) => { p.material.uniforms.uScale.value = scale; });
  }

  /* ---- 指针视差 ---- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---- 状态 ---- */
  let activeIndex = 0;
  let activeProgress = 0;

  function setSide(index, side) {
    const pts = layers[index];
    if (!pts) return;
    pts.userData.side = side;
    pts.position.x = side === 'right' ? sideOffset : side === 'left' ? -sideOffset : 0;
  }

  function setActive(index, progress) {
    activeIndex = Math.max(0, Math.min(layers.length - 1, index));
    activeProgress = Math.max(0, Math.min(1, progress));
    layers.forEach((pts, i) => {
      const ud = pts.userData;
      ud.target = i === activeIndex ? 1 : 0;
      if (i === activeIndex) {
        pts.visible = true;
        // 首次出现直接给满不透明度 —— 保证 reduced-motion（无 rAF 循环）下也看得见
        if (!ud.shown) { ud.opacity = 1; ud.shown = true; }
      }
    });
  }

  /* ---- 渲染 ---- */
  const clock = new THREE.Clock();

  function draw(t) {
    // 视差平滑
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    root.rotation.y = pointer.x * 0.16;
    root.rotation.x = -pointer.y * 0.1;
    camera.position.x = pointer.x * 0.5;
    camera.position.y = 0.3 - pointer.y * 0.35;
    camera.lookAt(0, 0, 0);

    let anyVisible = false;
    layers.forEach((pts) => {
      const ud = pts.userData;
      const u = pts.material.uniforms;
      u.uTime.value = t;
      // 只有活动幕推进进度，其余保持，避免切换时跳变
      if (pts.visible || ud.opacity > 0.004) {
        u.uProgress.value = ud.target > 0.5 ? activeProgress : u.uProgress.value;
      }
      ud.opacity += (ud.target - ud.opacity) * 0.12;
      u.uOpacity.value = ud.opacity;
      pts.position.y = ud.yOff;
      if (ud.opacity < 0.004 && ud.target === 0) {
        pts.visible = false;
      } else {
        pts.visible = true;
        anyVisible = true;
      }
    });

    if (anyVisible) renderer.render(scene, camera);
  }

  return {
    setActive,
    setSide,
    applyTheme,
    resize,
    draw,
    redraw() { draw(0); },
    setPointer(nx, ny) { pointer.tx = nx; pointer.ty = ny; },
    get clock() { return clock; },
    get layerCount() { return layers.length; },
    get keys() { return keys; }
  };
}
