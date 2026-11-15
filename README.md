# 尘 · Chenxin

手机优先的私人聊天前端。目前是本机交互原型，尚未连接模型或后端。

## 运行

需要 Python 3，启动本地静态服务：

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

打开 http://127.0.0.1:5173 。也可以运行 `npm start`。请通过本地服务访问，不要直接双击 `index.html`。

## 现在可以做什么

- **常用模型弹窗**：检测列表后可搜索、多选常用模型、指定默认模型，也可手动添加 ID；取消或按 Escape 不修改选择。完成选择后点击“保存配置”，列表会保留到下次打开，并可在聊天页切换。旧配置和备份中的单个默认模型会自动兼容。

- **API 配置与模型检测**：在设置的“API 与模型”中填写 HTTPS 基础地址和 Key，支持 OpenAI 兼容、Anthropic、Gemini 的模型列表读取和手动模型 ID。保存默认模型；密钥默认仅本次打开使用，勾选后单独保存在设备 localStorage（未加密），不会进入 ZIP/JSON 备份。检测列表不发送聊天内容，也不验证生成权限。浏览器直连需要服务端支持 CORS；聊天生成仍待接入。

- **水波开屏**：点按或多指拨水，点击「进入」后打开主页；支持壁纸与深色模式。详见[开屏说明](src/splash/README.md)。
- **对话**：管理会话、草稿、引用、图片、表情包和本机语音；线上气泡与线下正文共用一条时间线。格式见[正文格式规范](docs/LIVE_FORMAT.md)。
- **主页与外观**：自定义桌面布局、小组件、壁纸、主题和头像。
- **桌面 App**：日记、音乐、图库、预设、世界书与档案；记忆和外观从底部入口打开。
- **备份**：支持完整 ZIP、轻量 JSON 和本机快照；恢复前可预览与校验。

[主页预览](docs/preview-home.webp) · [夜间预览](docs/preview-night.webp) · [聊天预览](docs/preview-chat-playground.webp)

## 数据与功能边界

聊天、图片和配置保存在当前浏览器的 localStorage，音乐、语音原文件和本机快照保存在 IndexedDB。清除站点数据会丢失这些内容；迁移或清理前请下载完整 ZIP。ZIP 包含本机可用的音乐和语音原文件，轻量 JSON 不包含音频原文件；备份目前不加密。详见[备份格式](docs/BACKUP_FORMAT.md)。

模型调用、自动记忆、云同步、AI 语音合成与转写、MCP 执行和账号登录尚未接入。普通文件附件目前只保留名称、大小和类型，不保存文件内容。当前也没有 APK、PWA 安装或离线缓存。

## 项目结构

- `index.html`、`src/app.js`：应用入口与交互
- `src/store.js`：本机状态和存储
- `src/apps/`：桌面 App
- `src/chat-content/`：聊天内容、线上／线下正文和语音
- `src/backup/`：备份、恢复和快照
- `src/splash/`：水波开屏
- `docs/`：格式、架构与其他说明

项目使用原生 HTML、CSS 和 ES 模块，无需前端构建依赖。图标和第三方代码许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 检查

需要 Node.js：

```sh
npm run check
npm test
```

`npm test` 会自动发现 `src/` 和 `scripts/` 中的 JavaScript 文件并检查语法，包括新增模块；增加文件时无需为了补充检查名单反复修改 `package.json`。`npm run check` 保留原有稳定命令。

安卓打包依赖目前保留在本机。仅更新页面和功能时，保留本地 `package.json` 中的 Capacitor 依赖；`.idea` 和 `.idea-backup` 属于 IDE 本机配置，已统一忽略。
