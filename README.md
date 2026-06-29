# Bible · 和合本阅读器

精简版圣经阅读应用，Notion 风格 UI，仅包含经文阅读功能。

## 技术栈

- Vite + React 18
- React Router（根路径 `/` 部署）
- 静态 JSON 数据（`public/json/cunp/`）

## 开发

```bash
npm install
npm run dev
```

访问 http://localhost:5173 ，路由格式：`/书卷ID/章` 或 `/书卷ID/章/节`

示例：`/1/1` 创世记第一章，`/43/3/16` 约翰福音 3:16

## 构建与部署

```bash
npm run build
```

`dist/` 目录可部署到任意静态托管。SPA 回退已配置 `public/_redirects`（Netlify）及构建时生成的 `404.html`（GitHub Pages）。

### GitHub Pages（项目站 `/bible/`）

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
2. push 到 `main` 后，`.github/workflows/static.yml` 会自动构建并部署
3. 访问地址：`https://<username>.github.io/bible/`

本地模拟 GitHub Pages 构建：

```bash
VITE_BASE=/bible/ npm run build
npm run preview
```

## 阅读与对照

- **主阅读**（顶栏切换）：和合本（简体）、和合本（繁体）、NIV
- **对照阅读**（点击经节后）：中文主版本对照 新译本 / 当代译本 / 标准译本；英文主版本对照 ESV / NASB

对照数据来自 `verses/` 逐节 JSON。开发时自动读取同目录下的 `biblebase` 仓库；**生产部署**需生成精简版 `public/json/verses`（约 27 MB，仅含对照译本）：

```bash
npm run build:verses
# 或
python scripts/copy-verses.py
```

脚本从 `../biblebase/public/json/verses` 复制，仅保留 `cnv`、`ccb`、`csbs`、`esv`、`nasb` 的经文文本。

| 目录 | 大小 | 用途 |
|------|------|------|
| `public/json/cunp/` | ~7 MB | 和合本整章（繁体），结构模板 |
| `public/json/{ccb,cnv,csbs,esv,...}/` | ~7 MB/版本 | 由脚本从 verses 生成 |
| biblebase `verses/`（源） | ~965 MB | 逐节源数据（含 analytics 等） |
| `public/json/verses/`（精简） | ~27 MB | 对照阅读（5 个译本，由 `npm run build:verses` 生成） |

生成其他译本整章 JSON（需本机有 biblebase 的 `verses/`）：

```bash
npm run build:versions
```

生成**简体和合本**（从繁体 `cunp` 经 OpenCC 转换，无需 verses）：

```bash
npm run build:cunps
```

原理：保留 `cunp` 的章节结构（标题、段落划分），从 `verses/{书}/{章}/{节}.json` 的 `versions` 字段填入对应译本正文；简体和合本则对 cunp 全文做繁→简转换。
