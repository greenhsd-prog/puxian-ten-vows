/* ============================================================
   普贤十大愿 · 交互层
   加载门 / 滚动叙事 / 主题切换 / 偈句拾取 / 入场动画
   ============================================================ */
import { createScene } from './scene.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   1. 加载门
   ============================================================ */
function initGate(onEnter) {
  const gate = $('#gate');
  const btn = $('#gateEnter');
  if (!gate) { onEnter(); return; }

  let done = false;
  const enter = () => {
    if (done) return;
    done = true;
    gate.classList.add('is-gone');
    document.body.style.overflow = '';
    setTimeout(() => { gate.style.display = 'none'; }, 950);
    onEnter();
  };

  document.body.style.overflow = 'hidden';
  btn?.addEventListener('click', enter);
  // 键盘可达
  addEventListener('keydown', (e) => {
    if (!done && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) enter();
  });
  // 兜底：8 秒后自动进入，避免任何环境卡在门口
  setTimeout(enter, 8000);
}

/* ============================================================
   2. 主题
   ============================================================ */
const THEMES = ['ink', 'paper', 'cream'];
function initTheme(scene) {
  let saved = null;
  try { saved = localStorage.getItem('px-theme'); } catch (e) { /* 隐私模式 */ }
  const start = THEMES.includes(saved) ? saved : 'ink';
  apply(start);

  function apply(name) {
    document.documentElement.setAttribute('data-theme', name);
    $$('.theme-btn').forEach((b) => b.classList.toggle('is-on', b.dataset.theme === name));
    scene?.applyTheme(name);
    const dark = name === 'ink';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0a0d14' : name === 'paper' ? '#efe7d8' : '#fef1d0');
    try { localStorage.setItem('px-theme', name); } catch (e) { /* 忽略 */ }
  }

  $$('.theme-btn').forEach((b) => {
    b.addEventListener('click', () => apply(b.dataset.theme));
  });
}

/* ============================================================
   3. 偈句拾取
   ============================================================ */
function initSeeds() {
  const seeds = $$('.seed');
  const countEl = $('#seedCount');
  const wrapEl = $('.nav__seeds');
  const toast = $('#toast');
  const got = new Set();

  let toastTimer = null;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  seeds.forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = btn.dataset.seed;
      const open = btn.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.seed__hint').textContent = open ? '已拾取' : '拾取此愿偈句';
      if (open) got.add(n); else got.delete(n);

      if (countEl) countEl.textContent = got.size;
      if (wrapEl) wrapEl.classList.toggle('is-full', got.size === seeds.length);

      if (open) {
        const name = btn.closest('.vow')?.querySelector('.vow__name')?.textContent || '';
        say(got.size === seeds.length
          ? `十愿偈句已全部拾取 · 愿此功德，普及于一切`
          : `已拾取「${name}」偈句 · ${got.size}/10`);
      }
    });
  });
}

/* ============================================================
   4. 入场动画
   ============================================================ */
function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
  els.forEach((el) => io.observe(el));
}

/* ============================================================
   5. 滚动叙事
   ============================================================ */
function initScroll(scene) {
  if (!scene) return;

  const hero = $('.hero');
  const note = $('.note');
  const coda = $('.coda');
  const vows = $$('.vow');

  // 组装「站点」序列
  // 注意：data-side 描述的是「正文面板」在哪侧，3D 主体要放在它的反面
  //（正文面板不透明，会挡住画面；编号栏没面板，画面在那儿才看得见）
  const flip = (s) => (s === 'right' ? 'left' : 'right');
  const stops = [];
  if (hero) stops.push({ el: hero, key: 'indra', side: 'center' });
  if (note) stops.push({ el: note, key: 'indra', side: 'center' });
  vows.forEach((v) => stops.push({ el: v, key: v.dataset.scene, side: flip(v.dataset.side) }));
  if (coda) stops.push({ el: coda, key: 'bloom', side: 'center' });

  const keys = scene.keys;
  const arcs = vows.map((v) => v.querySelector('[data-arc]'));
  const ARcLen = 2 * Math.PI * 57;

  // 一次性把每一幕的左右站位设好（resize 时才会用得上）
  stops.forEach((s) => {
    const ki = keys.indexOf(s.key);
    if (ki >= 0) scene.setSide(ki, s.side);
  });

  let lastIndex = -1;

  function update() {
    const vh = window.innerHeight;
    const focus = vh * 0.5;

    // 活动站：最后一个「顶部已越过焦点线」的
    let idx = 0;
    for (let i = 0; i < stops.length; i++) {
      const r = stops[i].el.getBoundingClientRect();
      if (r.top <= focus) idx = i;
      else break;
    }

    const cur = stops[idx];
    const rect = cur.el.getBoundingClientRect();
    const total = rect.height + vh;
    const p = clamp((vh - rect.top) / total, 0, 1);

    const ki = keys.indexOf(cur.key);
    if (ki >= 0) {
      lastIndex = idx;
      scene.setActive(ki, p);
    }

    // 章节圆环进度
    vows.forEach((v, i) => {
      const arc = arcs[i];
      if (!arc) return;
      const r = v.getBoundingClientRect();
      const tp = clamp((vh - r.top) / (r.height + vh), 0, 1);
      arc.style.strokeDasharray = String(ARcLen);
      arc.style.strokeDashoffset = String(ARcLen * (1 - tp));
    });

    // reduced-motion 下没有 rAF 循环，滚动后手动补一帧静态画面
    if (prefersReduced) scene.redraw();
  }

  // 节流到 rAF
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
  return update;
}

/* ============================================================
   6. 顶栏滚动态 + 指针视差
   ============================================================ */
function initNav() {
  const nav = $('#nav');
  if (!nav) return;
  const sync = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  sync();
  addEventListener('scroll', sync, { passive: true });
}

function initPointer(scene) {
  if (!scene || prefersReduced) return;
  addEventListener('pointermove', (e) => {
    scene.setPointer(
      (e.clientX / window.innerWidth - 0.5) * 2,
      (e.clientY / window.innerHeight - 0.5) * 2
    );
  }, { passive: true });
}

/* ============================================================
   启动
   ============================================================ */
const canvas = $('#scene');
const scene = canvas ? createScene(canvas) : null;

initTheme(scene);
initSeeds();
initReveal();
initNav();

const updateScroll = initScroll(scene);
initPointer(scene);

if (scene) {
  scene.resize();
  addEventListener('resize', () => scene.resize());

  // ★ 先同步渲染一帧：不依赖 requestAnimationFrame，
  //   避免 rAF 被限制（无头/省电/后台标签页）时首屏空白
  scene.draw(0);

  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; })
      .observe(document.body);
  }
  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
  });

  if (!prefersReduced) {
    const clock = scene.clock;
    (function loop() {
      requestAnimationFrame(loop);
      if (visible) scene.draw(clock.getElapsedTime());
    })();
  }
}

// 门开后刷新一次滚动状态（此时布局才稳定）
initGate(() => {
  requestAnimationFrame(() => {
    updateScroll?.();
    scene?.resize();
    scene?.draw(0);
  });
});

// 字体加载完再校正一次尺寸
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    scene?.resize();
    updateScroll?.();
  });
}
