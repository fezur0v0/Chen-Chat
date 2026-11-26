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

## 给 Android APK 部署专用服务

`services/netease` 提供一个只开放「尘」使用的音乐接口的 Node 服务。Cloud Run 允许 APK
发起 HTTPS 请求，服务再校验「尘」发送的访问密钥。密钥是部署时自己生成的随机字符串，
和网易云账号无关。它只保留在「尘」当前运行期间，重开后需重新填写。
不要将密钥放进 Git、服务地址或备份。

在包含新版代码的 Cloud Shell 中，从仓库根目录操作。将下面的项目 ID 和地区换成你的值。
命令会创建单独的服务账号、一个 Secret Manager 密钥和一个新的 Cloud Run 服务。
如果这些资源已存在，复用它们即可。部署需要项目的 Cloud Run、Cloud Build、Artifact Registry
和 Secret Manager 权限。部署及请求可能产生费用。

```bash
project='你的项目ID'
region='asia-east1'
runtime_sa="chen-music@$project.iam.gserviceaccount.com"
music_key="$(openssl rand -hex 32)"

gcloud iam service-accounts create chen-music --project="$project"
printf '%s' "$music_key" | gcloud secrets create chen-music-key --data-file=- --project="$project"
gcloud secrets add-iam-policy-binding chen-music-key \
  --project="$project" --member="serviceAccount:$runtime_sa" --role=roles/secretmanager.secretAccessor
gcloud run deploy chen-music --project="$project" --region="$region" \
  --source=services/netease --service-account="$runtime_sa" \
  --allow-unauthenticated --set-secrets=CHEN_MUSIC_KEY=chen-music-key:1 \
  --min-instances=0 --max-instances=1
```

部署完，从 Cloud Run 的服务详情复制 `https://…run.app` 根地址。把根地址填进「音乐 →
网易云音乐 → 网易云服务地址与访问密钥」，并填入刚生成的音乐服务密钥。首次试用可以让电脑上的
「尘」展示二维码，用 iQOO 的网易云音乐 App 扫码并确认，再验证 APK。每个「尘」实例的登录会话分别保存。

如果需要在自己的终端取回密钥，使用 `gcloud secrets versions access 1 --secret=chen-music-key --project="$project"`。
把值直接填进「尘」，别粘进聊天。服务支持默认 Android 来源 `https://localhost` 和
电脑默认的本地预览来源。若 APK 自定义了来源，可用服务环境变量 `CHEN_MUSIC_ORIGINS`
填写实际来源，多个来源用逗号分隔。以 `/healthz` 返回 `{"ok":true}` 确认服务启动，
再从「尘」生成二维码确认服务能连到网易云。
