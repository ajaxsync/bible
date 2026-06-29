# Bible · 和合本阅读器

精简版圣经阅读应用，Notion 风格 UI，支持多译本阅读与经节对照。所有经文数据均包含在仓库内，克隆后即可本地开发与部署。

## 功能

| 能力 | 说明 |
|------|------|
| 主阅读 | 顶栏切换：和合本（简体）、和合本（繁体）、NIV |
| 对照阅读 | 点击经节后展开对照面板 |
| 路由 | `/{书卷ID}/{章}` 或 `/{书卷ID}/{章}/{节}` |
| 配置 | 通过 `.env` 自定义标题、默认版本、主题等 |

## 译本

| ID | 名称 | 语言 | 用途 |
|----|------|------|------|
| `cunps` | 和合本（简体） | 中文 | 主阅读 |
| `cunp` | 和合本（繁体） | 中文 | 主阅读 |
| `niv` | 新国际版本（NIV） | 英文 | 主阅读 |
| `cnv` | 新译本 | 中文 | 对照（中文主版本时） |
| `ccb` | 当代译本 | 中文 | 对照（中文主版本时） |
| `csbs` | 标准译本 | 中文 | 对照（中文主版本时） |
| `esv` | 英文标准版（ESV） | 英文 | 对照（英文主版本时） |
| `nasb` | 新美国标准圣经（NASB） | 英文 | 对照（英文主版本时） |

顶栏切换主阅读译本；点击经节后，对照面板按主版本语言自动展示对应译本（中文 → 新译本 / 当代译本 / 标准译本，英文 → ESV / NASB）。

## 快速开始

```bash
npm install
npm run dev
```

默认访问 http://localhost:3650 。路由示例：

- `/1/1` — 创世记第一章
- `/43/3/16` — 约翰福音 3:16

## 构建与部署

```bash
npm run build    # 输出到 dist/
npm run preview  # 本地预览构建结果
```

`dist/` 可部署到任意静态托管。已配置 SPA 回退：`public/_redirects`（Netlify）及构建时复制的 `404.html`（GitHub Pages）。

### GitHub Pages

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
2. push 到 `main` 后，`.github/workflows/static.yml` 自动构建并部署
3. 访问 `https://<username>.github.io/bible/`（项目站自动设置 `VITE_BASE=/bible/`）

本地模拟 GitHub Pages：

```bash
VITE_BASE=/bible/ npm run build
npm run preview
```

## 配置

复制 `.env.example` 为 `.env` 后按需修改。常用项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_APP_TITLE` | 页面标题 | `Bible · Reader` |
| `VITE_DEFAULT_VERSION` | 默认主译本 | `cunps` |
| `VITE_PRIMARY_VERSIONS` | 可选主译本（逗号分隔） | `cunps,cunp,niv` |
| `VITE_COMPARE_ZH_VERSIONS` | 中文对照译本 | `cnv,ccb,csbs` |
| `VITE_COMPARE_EN_VERSIONS` | 英文对照译本 | `esv,nasb` |
| `VITE_BASE` | 部署子路径（CI 自动设置） | `/` |
| `DEV_PORT` | 开发服务器端口 | `3650` |

译本 ID 须与 `src/data/versions.js` 一致。

## 数据说明

经文以静态 JSON 存放在 `public/json/`，分两类：

### 整章 JSON（主阅读）

每个译本一个目录，按 `/{书卷ID}/{章}.json` 组织。仓库已包含上表全部译本，目录约 7 MB/版本：

| 目录 | 说明 |
|------|------|
| `public/json/cunp/` | 和合本繁体，章节结构模板（标题、段落划分） |
| `public/json/cunps/` | 和合本简体，由 cunp 经 OpenCC 转换 |
| `public/json/{niv,cnv,ccb,...}/` | 各译本整章数据 |

### 逐节 JSON（对照阅读）

对照功能读取 `public/json/verses/{书}/{章}/{节}.json`（约 27 MB），每文件含 `cnv`、`ccb`、`csbs`、`esv`、`nasb` 的经文文本。开发与生产均直接使用仓库内数据。

### 维护脚本（可选）

如需从外部完整 verses 数据重新生成，可使用：

```bash
npm run build:cunps     # 繁体 cunp → 简体 cunps（OpenCC）
npm run build:versions  # 从 public/json/verses 生成各译本整章 JSON
python scripts/copy-verses.py --source-dir /path/to/full/verses  # 精简对照用 verses
```

`build:versions` 保留 `cunp` 的章节结构，从逐节数据的 `versions` 字段填入对应译本正文。

## 技术栈

- Vite 8 + React 18
- React Router 6
- 静态 JSON，无后端
