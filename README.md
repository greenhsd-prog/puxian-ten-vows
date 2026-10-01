# 普贤十大愿 · 十种广大行愿

一个滚动叙事的阅读实验网站。十愿各成一章，每章三层内容：**经文原文 / 白话 / 今天可以做的**，滚动驱动一幕程序化 3D 场景。

---

## 内容来源与准确性

| 项 | 值 |
|---|---|
| 经名 | 大方广佛华严经·入不思议解脱境界普贤行愿品 |
| 译者 | 唐罽宾国三藏般若 奉诏译 |
| 经号 | CBETA T0293 |
| 篇幅 | 约 6000 字 |

- **经文原文逐字忠实于经本**，未作删改，可随时对照经本核验。
- **白话**与**「今天可以做的」**为编者释义，供参考，不作定解。
- 偈句（每愿末尾可拾取的那句）全部摘自本品原文，非杜撰。

十愿：礼敬诸佛 / 称赞如来 / 广修供养 / 忏悔业障 / 随喜功德 / 请转法轮 / 请佛住世 / 常随佛学 / 恒顺众生 / 普皆回向。

---

## 三套配色（右上角圆点即切）

| 主题 | 底色 | 主色 | 说明 |
|---|---|---|---|
| **玄青金**（默认） | `#0a0d14` 玄青 | `#c9a227` 金 | 华严「光明云、香水海」的意象，深底金光 |
| **宣纸朱砂** | `#efe7d8` 宣纸 | `#9e3b2e` 朱砂 | 经卷感，浅底上粒子呈水墨飞白 |
| **奶油蓝** | `#fef1d0` 奶油 | `#0042af` 蓝 | 致敬参考站 sleep-well-creatives.com 的配色 |

切换即时生效，选择存进 `localStorage`。全部走 CSS 变量，加第四套只需在 `style.css` 里加一个 `html[data-theme="xxx"]` 块 + 在 `scene.js` 的 `THEME_3D` 里加一行。

---

## 十幕场景对照

一套渲染器 + 十二个参数化粒子场景（首屏与收尾各一幕）。每幕 = 一个基础几何 + 一段 GLSL 位移，`uProgress` 由滚动驱动，`uTime` 驱动呼吸。

| 位置 | 场景 | 意象 |
|---|---|---|
| 首屏 | `indra` | 因陀罗网 · 珠珠相映 |
| 一 礼敬诸佛 | `avatars` | 层层圆环，一浪一浪俯身 |
| 二 称赞如来 | `ocean` | 音声海 · 同心波纹铺满 |
| 三 广修供养 | `clouds` | 华云鬘云升腾成盖 |
| 四 忏悔业障 | `wash` | 一道光带扫过，扫过即净 |
| 五 随喜功德 | `kindle` | 一灯引燃万灯 |
| 六 请转法轮 | `wheel` | 法轮轮辐旋转推开 |
| 七 请佛住世 | `lamp` | 长明灯 · 光焰向上湍流 |
| 八 常随佛学 | `steps` | 光阶逐级点亮 |
| 九 恒顺众生 | `tree` | 万类汇聚，缠成发光的树 |
| 十 普皆回向 | `dedication` | 万光收束成束，推出去再散开 |
| 结归 | `bloom` | 光聚成柱，向上开敷 |

---

## 本地预览 —— 别直接双击 index.html

`main.js` 是 ES Module，浏览器对 `file://` 下的模块加载有安全限制，直接双击会导致 3D 与全部交互失效。必须走 HTTP：

```bash
cd puxian-ten-vows
node serve.js 8985
# 浏览器打开 http://127.0.0.1:8985
```

或用 Python：

```bash
python -m http.server 8985
```

---

## 部署到 GitHub Pages

1. GitHub 新建仓库（免费账户必须选 **Public**）
2. 上传**除 `_tools/` 之外**的全部文件（`lib/` 整个目录要一起传）
3. 仓库 Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `main` + `/ (root)` → Save
4. 等 1～10 分钟，访问 `https://<用户名>.github.io/<仓库名>/`

仓库里已放 `.nojekyll`，跳过 Jekyll 处理。

---

## 目录结构

```
puxian-ten-vows/
├── index.html      ← 生成产物，勿手改
├── style.css       三套主题变量 + 全部样式
├── main.js         交互层：门 / 滚动 / 主题 / 偈句 / 入场
├── scene.js        3D 引擎：十二幕参数化粒子场景
├── data.js         ★ 唯一内容数据源
├── serve.js        本地静态服务器
├── lib/            本地化 Three.js r186（不依赖国外 CDN）
│   ├── three.module.min.js
│   └── three.core.js
└── _tools/         构建与验证脚本（不进仓库）
    ├── build.mjs              data.js → index.html
    ├── shot.html              截图包装页（iframe 套截，可指定滚动/主题/偈句）
    ├── metrics.html           度量：章节偏移 / 溢出检测 / 结构计数
    └── test-interaction.html  交互期望值对照测试（26 项）
```

---

## 改内容

`data.js` 是唯一数据源。改完重新生成：

```bash
node _tools/build.mjs
```

注意 `index.html` 是**生成产物**，直接改它会在下次生成时被覆盖。

每愿的字段：

```js
{
  n: 1,                    // 序号
  id: 'vow-1',
  name: '礼敬诸佛',
  pinyin: 'lǐ jìng zhū fó',
  glyph: '礼',             // 偈句按钮上的水印字
  keyword: '无量身',        // 意象标签
  scene: 'avatars',        // 对应 scene.js 里的场景键
  gist: '……',              // 提要（左栏）
  sutra: '……',             // 经文原文
  plain: '……',             // 白话
  practice: ['…', '…', '…'],// 今天可以做的
  seed: '……'               // 可拾取的偈句
}
```

---

## 字体

全部使用**系统字体栈**，零下载、离线可用：

- 衬线（正文与标题）：`Source Han Serif SC / Noto Serif SC / Songti SC / SimSun`
- 无衬线（标签与 UI）：`PingFang SC / Microsoft YaHei / Source Han Sans SC`

参考站用的 Editorial New 与 Neue Montreal 是**商业授权字体**，不能直接搬。若想换成 Web 字体，自备授权后在 `style.css` 的 `--serif` / `--sans` 里替换即可。中文 Web 字体动辄数 MB，建议做子集化再上。

---

## 技术实现

- **Three.js r186**，ES Module + importmap，库已本地化
- **一套渲染器**驱动十二幕；每幕一个 `THREE.Points` + 自定义 ShaderMaterial，靠 uniform 淡入淡出切换
- **点尺寸按透视因子计算**（`绘制缓冲高度 / (2·tan(fov/2))`），保证 `gl_PointSize` 对应真实世界尺寸
- 深色主题用加法混合（发光感），浅色主题用普通混合（防白底上"加法"失效）
- 滚动叙事：`getBoundingClientRect` 计算活动章节与进度，`rAF` 节流
- 章节圆环进度用 SVG `stroke-dashoffset` 驱动
- 3D 主体按章节左右交替站位；正文面板一侧不透明，画面放在编号栏一侧
- **首帧同步渲染**（`draw(0)`），不依赖 `requestAnimationFrame` 是否被触发
- 降级路径：`prefers-reduced-motion`（关动画，滚动时补静态帧）、无 JS（内容全可见，门自动隐藏）、WebGL 不可用（canvas 隐藏，纯文字仍可读）
- 用 `overflow-x: clip`（**不是 hidden**，hidden 会建立滚动容器破坏 sticky）裁掉柔光底的负 inset

---

## 版权

经文属公有领域。本站的排版、3D 场景与文案为原创，非商业用途。
