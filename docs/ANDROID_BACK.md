# Android 系统返回

原因：src/app.js 的 goto() 只替换界面，没有浏览器路由栈。此前也没有注册 Capacitor App 的 backButton 监听，因此原生 Activity 收到返回手势时不会调用页面上的返回按钮。

src/system-back.js 在 Android 上通过原生桥接的 Capacitor.Plugins.App 注册一次 backButton。Web 与 iOS 不接管返回。顺序为：最后打开的 dialog（沿用 cancel 和 Escape，支持阻止关闭／动画）→ 文字格式面板／图库选择／桌面编辑 → 页面既有 Escape 处理 → 当前公共页头的返回按钮 → 非桌面页回桌面。桌面再返回调用 minimizeApp()，不调用 exitApp()。不根据浏览器 canGoBack 决定内部页面，也不伪造浏览器历史。

## 首次安装原生插件

本机 Android 工程与依赖由用户维护，仓库根 package.json 不改动，避免覆盖本机 Capacitor 依赖。已确认当前本机 Capacitor 为 8.x；需要额外运行一次：

```powershell
Set-Location -LiteralPath 'D:\chat-chen\chenxin-app'
npm.cmd install @capacitor/app@8
Copy-Item -LiteralPath index.html,icon.svg,src,assets -Destination dist -Recurse -Force
npx.cmd cap sync android
```

先在 GitHub Desktop 拉取本次 main，再运行上述命令，最后在 Android Studio 选手机、点运行覆盖安装。仅刷新 Web 或只复制 dist，无法给旧 APK 添加原生插件。之后未改变原生依赖时回到原来的三行同步流程。

Capacitor 原生注入的 App 代理自带 addListener 和 minimizeApp，因此静态网页无需再加载 npm JS 包或 CDN；原生插件仍必须安装并同步进 APK。缺少插件时返回绑定结果为 missing-app-plugin，不调用不存在的原生方法。

验证包括模拟原生回调下的弹窗层级、日记草稿确认／逐层返回、Aa 面板、聊天抽屉、侧边栏、设置与桌面最小化，以及浏览器环境不注册、缺失插件、原生异常、重复回调。手机实体返回手势与 IME 需安装后实机确认。

官方文档：https://capacitorjs.com/docs/apis/app#addlistenerbackbutton-
