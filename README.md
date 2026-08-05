# Bible · 圣经阅读器

一个以静态经文数据为核心的圣经阅读应用。项目使用 Vite + React 构建，支持 Web / PWA / Cloudflare Workers 静态部署，也可以通过 Capacitor 打包为 Android APK。

应用目标偏向日常读经：启动快、阅读界面干净、可离线、可收藏经节，并保留阅读设置、朗读和阅读续航等本地数据。

## 主要功能

| 模块     | 功能                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 经文阅读 | 按书卷、章节阅读；支持上一章 / 下一章导航；根路径 `/` 自动回到上次阅读位置 |
| 译本切换 | 内置和合本简体、和合本繁体、NIV；可通过环境变量限制可选译本                |
| 经节操作 | 点击选择经节，Shift 连选；移动端 App 支持长按进入选择；支持复制和收藏      |
| 经文收藏 | 收藏按译本、书卷、章节、经节保存，可在“经文收藏”面板中跳转                 |
| 阅读设置 | 字号、行距、阅读字体、背景颜色、Notion / Kindle 两种界面风格               |
| 朗读     | Web 使用 Web Speech API；Android 使用系统 TTS，支持音色和倍速              |
| 阅读续航 | 记录有效停留阅读时间，展示连续天数、最佳连续天数和月历热力图               |
| 阅读进度 | 顶部进度条展示当前章节滚动进度，章节标题旁显示预计阅读量                   |
| 离线缓存 | Web 可按译本下载整本经文，读过章节也会自动缓存；Android APK 内置整章经文   |
| 数据备份 | 导出 / 导入收藏、续航、阅读位置、阅读设置、朗读设置等本地数据              |
| PWA      | Web 端可添加到主屏幕，并提供 Service Worker 更新提示                       |

## 技术栈

- Vite 8 + React 18
- React Router 6
- vite-plugin-pwa + Workbox
- Cloudflare Workers Static Assets + Wrangler
- Capacitor 8 Android
- 静态 JSON 经文数据，本地偏好数据主要存放在 `localStorage` 和 IndexedDB

## 快速开始

环境要求：

- Node.js 22+
- npm

```bash
npm install
npm run dev
```

开发服务器默认端口为 `3650`：

```text
http://localhost:3650
```

常用路由：

| 路由       | 说明                                                    |
| ---------- | ------------------------------------------------------- |
| `/`        | 跳转到上次阅读位置；没有记录时使用 `VITE_DEFAULT_ROUTE` |
| `/1/1`     | 创世记第 1 章                                           |
| `/43/3/16` | 约翰福音 3:16，并选中该节                               |

## 常用命令

| 命令                         | 用途                                          |
| ---------------------------- | --------------------------------------------- |
| `npm run dev`                | 本地开发，启动 Vite                           |
| `npm run build`              | Web 生产构建，输出到 `dist/`                  |
| `npm run preview`            | 预览 `dist/` 构建结果                         |
| `npm run preview:cloudflare` | 构建后用 Wrangler 本地预览 Cloudflare Workers |
| `npm run deploy`             | 构建并部署到 Cloudflare Workers               |
| `npm run build:manifest`     | 重新生成离线缓存清单                          |
| `npm run build:icons`        | 从 `public/favicon.svg` 生成 PWA 图标         |
| `npm run build:versions`     | 从逐节源数据生成整章译本 JSON                 |
| `npm run build:cunps`        | 从繁体和合本生成简体和合本                    |
| `npm run version`            | 交互式提升 `package.json` 版本号              |

`dev` 和 `build` 会自动生成缓存清单与 PWA 图标。`build` 还会复制 `dist/index.html` 为 `dist/404.html`，用于 GitHub Pages 的 SPA fallback。

## 项目结构

```text
.
├─ src/
│  ├─ components/          # 阅读器、顶部栏、设置、缓存、收藏、朗读、续航面板
│  ├─ context/             # 译本、阅读设置、朗读、PWA 更新、续航状态
│  ├─ data/                # 书卷索引、译本定义、阅读主题
│  ├─ hooks/               # 滚动进度、停留计时、弹层动画、长按选择等
│  └─ lib/                 # 经文加载、缓存、收藏、备份、朗读、路由辅助
├─ public/
│  ├─ json/                # 运行时经文数据与缓存清单
│  └─ icon-*.png           # PWA 图标
├─ scripts/                # 数据生成、图标生成、Android 构建辅助脚本
├─ config/defaults.mjs     # 环境变量默认值
├─ capacitor.config.json   # Capacitor Android 配置
├─ vite.config.js          # Vite / PWA / Cloudflare 配置
└─ wrangler.jsonc          # Cloudflare Workers 配置
```

## 译本与数据

内置译本定义在 `src/data/versions.js`：

| ID      | 名称        | 语言     |
| ------- | ----------- | -------- |
| `cunps` | 和合本 简体 | 中文简体 |
| `cunp`  | 和合本 繁体 | 中文繁体 |
| `niv`   | NIV         | 英文     |

运行时读取整章 JSON：

| 目录                              | 说明                                         |
| --------------------------------- | -------------------------------------------- |
| `public/json/cunps/`              | 和合本简体整章数据                           |
| `public/json/cunp/`               | 和合本繁体整章数据，也保留章节结构和段落标题 |
| `public/json/niv/`                | NIV 整章数据                                 |
| `public/json/cache-manifest.json` | 离线缓存面板使用的章节清单                   |

`public/json/verses/` 是逐节源数据，主要给维护脚本使用。Web 和 Android 生产构建都会从 `dist/` 移除该目录，以减少包体和静态文件数量；线上阅读只依赖整章目录。

## 配置

复制 `.env.example` 为 `.env` 后按需修改。未配置时会读取 `config/defaults.mjs` 的默认值。

| 变量                       | 说明                                | 默认值             |
| -------------------------- | ----------------------------------- | ------------------ |
| `VITE_APP_TITLE`           | 页面标题 / PWA 名称                 | `Bible · Reader`   |
| `VITE_APP_NAME`            | 顶栏短名称                          | `Bible`            |
| `VITE_APP_ICON`            | 顶栏图标，支持 emoji 或路径         | `/favicon.svg`     |
| `VITE_APP_FAVICON`         | Favicon 路径                        | `/favicon.svg`     |
| `VITE_APP_LANG`            | `html lang`                         | `zh-Hant`          |
| `VITE_DEFAULT_ROUTE`       | 无上次阅读位置时的默认路由          | `/1/1`             |
| `VITE_JSON_BASE`           | 经文 JSON 根路径                    | `/json`            |
| `VITE_DEFAULT_VERSION`     | 默认译本 ID                         | `cunps`            |
| `VITE_PRIMARY_VERSIONS`    | 可选译本 ID，逗号分隔               | `cunps,cunp,niv`   |
| `VITE_STORAGE_KEY_VERSION` | 译本偏好的 localStorage key         | `bible-version-v2` |
| `VITE_CONTENT_MAX`         | 正文最大宽度                        | `720px`            |
| `VITE_HEADER_HEIGHT`       | 顶栏高度                            | `56px`             |
| `VITE_ACCENT_COLOR`        | 主题强调色                          | `#2383e2`          |
| `VITE_FONT_FAMILY`         | 全局字体覆盖，留空则使用默认字体栈  | 空                 |
| `VITE_BASE`                | 部署子路径，GitHub Pages 项目站常用 | `/`                |
| `DEV_PORT`                 | Vite 开发端口                       | `3650`             |

注意：`VITE_PRIMARY_VERSIONS` 中的 ID 必须存在于 `src/data/versions.js`，否则界面无法正确读取译本元信息。

## 本地存储

应用没有业务后端，用户数据都保存在本机：

| 数据                             | 存储位置       | 说明                           |
| -------------------------------- | -------------- | ------------------------------ |
| 阅读设置、译本偏好、上次阅读位置 | `localStorage` | 可通过缓存面板导出 / 导入      |
| 经文收藏、续航、朗读设置         | `localStorage` | 可通过缓存面板导出 / 导入      |
| 经文离线缓存                     | IndexedDB      | 不包含在备份文件中，可重新下载 |
| PWA 页面缓存                     | Cache Storage  | 可在缓存面板清理               |

卸载 Android App、清浏览器站点数据或更换设备前，请先在“缓存管理 → 数据备份”里导出备份文件。

## Web 构建与部署

### 普通构建

```bash
npm run build
npm run preview
```

Web 构建流程：

1. 生成 `public/json/cache-manifest.json`
2. 生成 PWA 图标
3. 执行 Vite 生产构建
4. 从 `dist/` 移除 `json/verses/` 和 `_redirects`
5. 复制 `dist/index.html` 为 `dist/404.html`

### Cloudflare Workers

Cloudflare 配置在 `wrangler.jsonc`。项目使用 Workers Static Assets，SPA fallback 由下面配置处理：

```json
"assets": {
  "not_found_handling": "single-page-application"
}
```

本地预览：

```bash
npm run preview:cloudflare
```

首次部署前先登录：

```bash
npx wrangler login
npm run deploy
```

`npm run deploy` 会先构建，再执行 `wrangler deploy`。

### GitHub Pages

仓库已包含 `.github/workflows/static.yml`：

1. 在仓库 Settings → Pages 中将 Source 设置为 GitHub Actions
2. push 到 `main`，或手动触发 workflow
3. workflow 会根据仓库类型设置 `VITE_BASE`

如果是项目站，例如仓库名为 `bible`，访问路径通常是：

```text
https://<username>.github.io/bible/
```

本地模拟项目站子路径：

```powershell
$env:VITE_BASE="/bible/"
npm run build
npm run preview
```

macOS / Linux 可写为：

```bash
VITE_BASE=/bible/ npm run build
npm run preview
```

## Android APK

项目通过 Capacitor 打包 Android。Web 代码仍是同一套 React 应用，但 Android 使用 `--mode capacitor` 构建，并内置经文数据到 APK。

### 环境要求

- Node.js 22+
- JDK 17
- Android Studio
- Android SDK
- `ANDROID_HOME` 已正确配置

Windows 常见 SDK 路径：

```text
%LOCALAPPDATA%\Android\Sdk
```

### 推荐流程

```bash
npm run version
npm run preview:android
```

`preview:android` 会执行：

1. 生成缓存清单、PWA 图标、Android 图标和 Splash
2. 清理 `dist/`
3. 使用 `vite build --mode capacitor --base /` 构建
4. 精简 Android 用 `dist/`
5. `cap sync android`
6. 同步 Android 版本号
7. 写入 Android TTS Manifest 声明
8. 打开 Android Studio

### Android 相关命令

| 命令                           | 用途                                            |
| ------------------------------ | ----------------------------------------------- |
| `npm run add:android`          | 首次创建 `android/` 工程                        |
| `npm run build:android:assets` | 生成 Android 图标和启动图                       |
| `npm run sync:android:version` | 将 `package.json` 版本写入 Gradle               |
| `npm run sync:android`         | `cap sync android` + 同步版本 + 补 TTS Manifest |
| `npm run build:android`        | 完整构建并同步 Android                          |
| `npm run open:android`         | 打开 Android Studio                             |
| `npm run preview:android`      | 完整构建并打开 Android Studio，日常推荐         |

在 Android Studio 中：

1. 等待 Gradle 同步完成
2. 连接真机或启动模拟器
3. 调试包可直接 Run，或使用 Generate APKs
4. 正式包使用 Build → Generate Signed Bundle / APK → APK

APK 输出通常位于：

```text
android/app/release/
android/app/build/outputs/apk/
```

具体以 Android Studio 的构建提示为准。

### 版本号规则

只维护根目录 `package.json` 的 `version`。

| Android 字段       | 来源                                  |
| ------------------ | ------------------------------------- |
| `versionName`      | 与 `package.json` 的 `version` 相同   |
| `versionCode`      | `major * 10000 + minor * 100 + patch` |
| release APK 文件名 | `bible_reader_<version>.apk`          |
| debug APK 文件名   | `bible_reader_<version>-debug.apk`    |

示例：`1.0.1` 会生成 `versionCode 10001`。

注意事项：

- `minor` 和 `patch` 不要超过 `99`
- 覆盖安装需要同包名、同签名，并且新 `versionCode` 更大
- debug 和 release 签名不同，不能互相覆盖，必要时先卸载
- keystore 和密码不要提交到仓库，丢失后无法用同一签名继续更新

### Android 朗读

Android App 使用系统文字转语音。若无声或无法启动朗读：

1. 到系统设置中打开“文字转语音”输出
2. 安装或启用 TTS 引擎
3. 下载中文语音包

注意“语音转文字”和“文字转语音”不是同一项功能。

## 数据维护

常见数据脚本：

```bash
npm run build:versions
npm run build:cunps
npm run build:manifest
python scripts/copy-verses.py --source-dir /path/to/full/verses
```

维护逻辑：

- `build:versions` 从 `public/json/verses/` 逐节源数据生成 `cunp` / `cunps` / `niv` 整章 JSON
- `build:cunps` 基于繁体和合本生成简体和合本
- `build:manifest` 扫描整章 JSON，生成离线下载清单
- `copy-verses.py` 用于从完整逐节源数据中精简复制项目需要的内容

生成或替换经文数据后，建议执行：

```bash
npm run build
```

这样可以同时验证数据、缓存清单和最终构建。

## 常见问题

### 为什么构建后没有 `dist/json/verses/`？

`public/json/verses/` 是维护脚本使用的逐节源数据，运行时不依赖。构建时移除它可以减少包体，也可以避免 Cloudflare Workers 静态资源文件数量过多。

### Android 白屏怎么办？

确认使用的是 Android 专用构建：

```bash
npm run build:android
```

不要用普通 `npm run build` 后直接 `cap sync`。Android 构建会额外处理 `crossorigin`、PWA 残留文件和内置数据。

### 改了图标为什么 App 没变？

修改 `public/favicon.svg` 后执行：

```bash
npm run build:icons
npm run build:android:assets
```

然后重新构建或同步 Android。

## 开发约定

- 新增译本时先更新 `src/data/versions.js`，再补齐 `public/json/<versionId>/`
- 会出现在译本切换中的 ID 需要加入 `VITE_PRIMARY_VERSIONS`
- 用户数据 key 以 `bible-` 开头，备份导入只接受应用允许的 key
- Web 端经文缓存保存在 IndexedDB，页面壳缓存由 Service Worker 管理
- Android 包名为 `app.bible.reader`，见 `capacitor.config.json`
