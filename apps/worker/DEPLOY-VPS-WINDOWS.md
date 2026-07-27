# Dựng worker trên VPS Windows Server (chuyển khỏi máy cá nhân)

> Cho VPS **Windows Server 2019/2022** (đăng nhập qua Remote Desktop). Worker vốn
> đã chạy trên Windows nên môi trường giống hệt máy dev: dùng `FFMPEG_DIR`,
> `YTDLP_PATH`, chạy qua pm2. Khác biệt duy nhất cần lo: **tự chạy lại sau reboot**
> (mục 5) — trên Windows pm2 không tự sống lại như Linux.
>
> ⚠️ **CHỈ CHẠY MỘT worker.** Mục 6 phải tắt worker trên máy cá nhân, nếu không
> hai worker tranh job trên cùng Redis → lỗi khó hiểu (yt-dlp exit 3221225794).
>
> Mọi lệnh chạy trong **PowerShell** trên VPS (Start → gõ `powershell`).

## 1. Node 24 + Git

> ⚠️ Dùng **Node 24** (khớp máy dev), KHÔNG phải Node 20. pnpm 11.10.0 cần Node
> ≥ 22.13 (dùng built-in `node:sqlite`) — cài Node 20 sẽ lỗi `ERR_UNKNOWN_BUILTIN_MODULE`.

```powershell
cd $env:TEMP
# Node 24 (đúng phiên bản máy dev: v24.16.0)
Invoke-WebRequest https://nodejs.org/dist/v24.16.0/node-v24.16.0-x64.msi -OutFile node.msi
Start-Process msiexec.exe -ArgumentList '/i','node.msi','/qn' -Wait
# Git for Windows
Invoke-WebRequest https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe -OutFile git-setup.exe
Start-Process .\git-setup.exe -ArgumentList '/VERYSILENT','/NORESTART' -Wait
```

**Đóng PowerShell, mở lại** (để nhận PATH mới) rồi kiểm:

```powershell
node -v   # v24.16.0
git --version
```

## 2. pnpm + tải mã nguồn

> ⚠️ ĐỪNG dùng `corepack` — corepack đi kèm Node hiện bị lỗi xác thực chữ ký
> (`Cannot find matching keyid`). Cài pnpm thẳng bằng npm.

```powershell
# Cho phép PowerShell chạy script (pnpm.ps1) — mặc định Windows Server chặn
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
npm install -g pnpm@11.10.0
pnpm -v   # 11.10.0

cd $env:USERPROFILE
git clone https://github.com/anhhoanq99-jpg/dichvideoai.git
cd dichvideoai
pnpm install
```

> Nếu trước đó đã lỡ chạy `corepack enable`, gỡ vỏ pnpm giả bằng `corepack disable`
> trước khi cài pnpm qua npm.

## 3. ffmpeg + yt-dlp

```powershell
# Thư mục chứa binary
New-Item -ItemType Directory -Force "C:\tools\bin" | Out-Null

# ffmpeg (kèm ffprobe)
cd $env:TEMP
Invoke-WebRequest https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip -OutFile ffmpeg.zip
Expand-Archive ffmpeg.zip -DestinationPath ffmpeg-extract -Force
Copy-Item (Get-ChildItem ffmpeg-extract -Recurse -Filter ffmpeg.exe)[0].FullName "C:\tools\bin\"
Copy-Item (Get-ChildItem ffmpeg-extract -Recurse -Filter ffprobe.exe)[0].FullName "C:\tools\bin\"

# yt-dlp
Invoke-WebRequest https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -OutFile "C:\tools\bin\yt-dlp.exe"

# kiểm
C:\tools\bin\ffmpeg.exe -version
C:\tools\bin\yt-dlp.exe --version
```

Worker đọc `FFMPEG_DIR` và `YTDLP_PATH` từ `.env` (mục 4) → không cần thêm vào PATH.

## 4. File `.env` ở GỐC repo

Tạo `C:\Users\Administrator\dichvideoai\.env`. Copy TOÀN BỘ `.env` production từ
máy cá nhân sang, chỉ sửa 2 dòng đường dẫn cho khớp VPS:

```
FFMPEG_DIR=C:\tools\bin
YTDLP_PATH=C:\tools\bin\yt-dlp.exe
```

- `YTDLP_COOKIES=...` — chỉ giữ nếu có copy `cookies.txt` lên VPS (cần cho Douyin).
  Chưa có thì bỏ; import Douyin báo lỗi hướng dẫn, nguồn khác vẫn chạy.
- Key BẮT BUỘC: `DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY` (+ `GEMINI_API_KEYS`
  nếu có), `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `GOOGLE_TTS_API_KEY`,
  `WORKER_HEALTH_PORT`.

Mở bằng Notepad: `notepad C:\Users\Administrator\dichvideoai\.env`

## 5. pm2 + tự chạy khi reboot

```powershell
npm install -g pm2

cd $env:USERPROFILE\dichvideoai\apps\worker
pm2 start ecosystem.config.cjs
pm2 save
pm2 status   # dichvideo-worker = online
```

**Sống lại sau reboot** (Windows pm2 KHÔNG tự resurrect như Linux). Dùng
pm2-installer chạy pm2 như dịch vụ Windows:

```powershell
npm install -g @jessety/pm2-installer
pm2-installer install
```

> Sau đó pm2 chạy dưới dạng Windows Service, tự lên khi VPS khởi động lại và tự
> `resurrect` danh sách app đã `pm2 save`. Kiểm bằng cách reboot VPS rồi
> `pm2 status` thấy worker vẫn online.

## 6. Cắt chuyển — TẮT worker cũ TRƯỚC

```powershell
# TRÊN MÁY CÁ NHÂN (không phải VPS):
pm2 stop dichvideo-worker
pm2 save
```

Chờ tắt xong, **trên VPS** đảm bảo worker đang chạy (`pm2 status` = online).
Chỉ một nơi online tại một thời điểm.

## 7. Xác minh đầu-cuối

- VPS: `pm2 logs dichvideo-worker` → thấy log lắng nghe queue.
- Web production: upload/dán link 1 video ngắn → theo dõi `pm2 logs` trên VPS
  thấy job chạy → video ra `ready`.

## Vận hành về sau

```powershell
# cập nhật code sau khi push main:
cd $env:USERPROFILE\dichvideoai; git pull; pnpm install
pm2 restart dichvideo-worker

# cập nhật yt-dlp khi nguồn đổi:
C:\tools\bin\yt-dlp.exe -U
```

### Cạm bẫy
- **Hai worker song song** = tranh job. Luôn kiểm `pm2 status` cả VPS lẫn máy cá
  nhân, chỉ một nơi `online`.
- Worker KHÔNG có bước build — chạy `.ts` trực tiếp qua tsx. `git pull` +
  `pm2 restart` là đủ.
- Máy cá nhân sau khi cắt: để `pm2 stop`, đừng `pm2 delete` vội — giữ đường lùi
  tới khi chắc VPS ổn.
