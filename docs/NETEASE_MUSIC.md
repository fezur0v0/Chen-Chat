# 网易云音乐

「音乐 → 网易云音乐」连接一个独立运行的 [NeteaseCloudMusicApi Enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 服务。输入服务根地址后可以搜索歌曲，或用网易云音乐 App 扫码，读取该账号的歌单。

## 在电脑上运行

在 PowerShell 中启动一个仅监听本机的服务。这里假设「尘」的预览地址是 `http://127.0.0.1:5173`。

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
$env:CORS_ALLOW_ORIGIN = 'http://127.0.0.1:5173'
npx.cmd --yes --package @neteasecloudmusicapienhanced/api@4.41.1 api
```

然后在「网易云服务地址」里填入 `http://127.0.0.1:3000`。手机 APK 需要能从手机访问的 HTTPS 服务地址。部署方式见 [服务上游文档](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced#readme)，跨域来源配置为「尘」的网页来源，Capacitor Android 默认来源为 `https://localhost`。

扫码登录时使用自己控制的服务。当前会话的登录凭据随账号请求发给这个服务，通过 POST 请求体传递，并保存在 App 内存中。退出或重开应用后可重新扫码。歌曲到播放器时才请求网易云 CDN 提供的播放地址。试听曲目会标注「试听」，曲库和备份保留在线歌曲的索引，播放时重新请求音源。
