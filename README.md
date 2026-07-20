# Bible · 和合本阅读器

精简版圣经阅读应用，Notion / Kindle 风格 UI，支持和合本（简繁）与 NIV 三译本。经文数据与 PWA 能力均包含在仓库内，克隆后即可本地开发与部署。

## 功能

| 能力 | 说明 |
|------|------|
| 主阅读 | 设置中切换：和合本（简体）、和合本（繁体）、NIV |
| 经节操作 | 点击多选经节，工具栏支持复制、高亮、分享本章 |
| 高亮标记 | 本地保存高亮，可在标记面板中查看与跳转 |
| 阅读设置 | 字号、行距、阅读字体（系统黑体 / 宋体）、背景主题、Notion / Kindle UI |
| 朗读 | 浏览器语音合成朗读当前章（支持时显示入口） |
| 阅读续航 | 停留计时打卡、连续天数与周统计，可生成分享海报 |
| 阅读进度 | 顶栏显示本章滚动进度与预估阅读量 |
| 离线缓存 | 按译本下载章节；读过的章节也会自动缓存 |
| PWA | 可安装到主屏幕，支持更新提示 |
| 路由 | `/{书卷ID}/{章}` 或 `/{书卷ID}/{章}/{节}`；`/` 回到上次阅读位置 |

## 译本

| ID | 名称 | 语言 |
|----|------|------|
| `cunps` | 和合本（简体） | 中文 |
| `cunp` | 和合本（繁体） | 中文 |
| `niv` | 新国际版本（NIV） | 英文 |

译本列表可通过 `.env` 中的 `VITE_PRIMARY_VERSIONS` 配置，ID 须与 `src/data/versions.js` 一致。

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
| `VITE_APP_NAME` | 短名称（PWA） | `Bible` |
| `VITE_APP_ICON` | 顶栏图标（emoji 或路径） | `/favicon.svg` |
| `VITE_APP_FAVICON` | Favicon | `/favicon.svg` |
| `VITE_APP_LANG` | `html lang` | `zh-Hant` |
| `VITE_DEFAULT_ROUTE` | 无上次位置时的默认路由 | `/1/1` |
| `VITE_JSON_BASE` | 经文 JSON 根路径 | `/json` |
| `VITE_DEFAULT_VERSION` | 默认译本 | `cunps` |
| `VITE_PRIMARY_VERSIONS` | 可选译本（逗号分隔） | `cunps,cunp,niv` |
| `VITE_STORAGE_KEY_VERSION` | 译本偏好 localStorage 键 | `bible-version-v2` |
| `VITE_CONTENT_MAX` | 正文最大宽度 | `720px` |
| `VITE_HEADER_HEIGHT` | 顶栏高度 | `56px` |
| `VITE_ACCENT_COLOR` | 主题色 | `#2383e2` |
| `VITE_FONT_FAMILY` | 覆盖界面字体（可选） | 空（中文黑体 + 英文 Inter） |
| `VITE_BASE` | 部署子路径（CI 自动设置） | `/` |
| `DEV_PORT` | 开发服务器端口 | `3650` |

## 数据说明

经文以静态 JSON 存放在 `public/json/`，主阅读译本各一个目录，按 `/{书卷ID}/{章}.json` 组织：

| 目录 | 说明 |
|------|------|
| `public/json/cunp/` | 和合本繁体，章节结构模板（标题、段落划分） |
| `public/json/cunps/` | 和合本简体，由 cunp 经 OpenCC 转换 |
| `public/json/niv/` | 新国际版本（NIV） |

`public/json/verses/` 为逐节源数据（维护脚本用），运行时主阅读不依赖该目录。

### 维护脚本（可选）

```bash
npm run build:cunps      # 繁体 cunp → 简体 cunps（OpenCC）
npm run build:versions   # 从 public/json/verses 生成各译本整章 JSON
npm run build:manifest   # 生成离线缓存清单
npm run build:icons      # 生成 PWA 图标
python scripts/copy-verses.py --source-dir /path/to/full/verses  # 精简 verses 源数据
```

`build:versions` 保留 `cunp` 的章节结构，从逐节数据的 `versions` 字段填入对应译本正文。`dev` / `build` 会自动跑 manifest 与图标生成。

## 技术栈

- Vite 8 + React 18
- React Router 6
- vite-plugin-pwa（可安装、离线壳）
- 静态 JSON，无后端；阅读偏好与高亮存 localStorage
