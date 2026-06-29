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

`dist/` 目录可部署到任意静态托管（根域名）。SPA 回退已配置 `public/_redirects`（Netlify）及构建时生成的 `404.html`（GitHub Pages）。

## 阅读与对照

- **主阅读**（顶栏切换）：和合本（简体）、和合本（繁体）、NIV
- **对照阅读**（点击经节后）：中文主版本对照 新译本 / 当代译本 / 标准译本；英文主版本对照 ESV / NASB

对照数据来自 `verses/` 逐节 JSON。开发时自动读取同目录下的 `biblebase` 仓库；**生产部署**需将 `biblebase/public/json/verses` 复制到 `public/json/verses`（约 965 MB），或仅部署对照功能所需路径。

```bash
# 生产环境可选：复制对照数据
robocopy ..\biblebase\public\json\verses public\json\verses /E
```

| 目录 | 大小 | 用途 |
|------|------|------|
| `public/json/cunp/` | ~7 MB | 和合本整章（繁体），结构模板 |
| `public/json/{ccb,cnv,csbs,esv,...}/` | ~7 MB/版本 | 由脚本从 verses 生成 |
| biblebase `verses/` | ~965 MB | **源数据**（逐节，含多版本文本 + 学习 metadata） |

生成其他译本整章 JSON（需本机有 biblebase 的 `verses/`）：

```bash
npm run build:versions
```

生成**简体和合本**（从繁体 `cunp` 经 OpenCC 转换，无需 verses）：

```bash
npm run build:cunps
```

原理：保留 `cunp` 的章节结构（标题、段落划分），从 `verses/{书}/{章}/{节}.json` 的 `versions` 字段填入对应译本正文；简体和合本则对 cunp 全文做繁→简转换。
