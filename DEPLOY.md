# Lớp Học Chữ trên lophoc.bla.io.vn

Game live TikTok **Lớp Học Chữ**: cô giáo áo dài xáo chữ trên bảng đen,
người xem gõ đáp án vào bình luận, ai đúng nhanh nhất được nhiều điểm nhất
và được ngồi bàn đầu. 2.076 câu hỏi tiếng Việt, 30 chủ đề.

## Nguồn

- Upstream: https://github.com/workaipvlinh-byte/lop-hoc-chu — nhánh `master`,
  commit `caa8a416daca746e185b8e31e506efb1ed6503f8` (MIT).
- Repo deploy: `VuBLA2025/lop-hoc-chu`, nhánh `master`, build bền từ Git trên
  Dokploy (compose `lop-hoc-chu`, project `Lop Hoc Chu LIVE`, cổng 4181,
  domain `lophoc.bla.io.vn`, không hotfix vào container).
- Stack: TypeScript + React 19 + Vite 8 + Tailwind 4, Express,
  `tiktok-live-connector` 2.5.0, giọng đọc Edge TTS tiếng Việt (cô giáo,
  giọng NamMinh, cao +6%).

## Những chỗ đã sửa so với upstream (để chạy được trên Dokploy)

1. **Host allowlist** (`server.ts`): thêm `lophoc.bla.io.vn` vào `LOCAL_HOSTS`
   (giữ `localhost` / `127.0.0.1` / `lvh.me`). Không sửa thì mọi request tới
   domain live bị 403.
2. **Mật khẩu panel** (`server.ts` + `src/live/page.ts` + `src/live/Dashboard.tsx`,
   theo đúng pattern đã dùng ở Cưới Liền Tay):
   upstream không có mật khẩu — ai mở được site cũng gọi được các endpoint ghi.
   Nay các endpoint `POST /api/control`, `/api/test/emit`, `/api/tiktok/connect`,
   `/api/tiktok/disconnect` yêu cầu đúng `PANEL_KEY` trong env (nhận qua header
   `Authorization: Bearer <key>` hoặc `x-panel-key`), sai/thiếu thì 403
   `{"success":false,"error":"Sai mật khẩu panel"}`. Khi `PANEL_KEY` không đặt
   (chạy local) thì cho qua. Dashboard có thêm ô **Mật khẩu panel** (lưu
   `sessionStorage`, đóng tab là mất) và gửi kèm mỗi lệnh; nút Đọc ngay đã sửa
   để báo lỗi thay vì báo "Đã gửi" khi server từ chối. Các endpoint đọc
   (`/api/tiktok/status`, `/api/tiktok/events`, `/api/tts`, `/`) và các endpoint
   lưu sổ lớp do chính trang stage gọi (`/api/game/state`, `/api/game/save`,
   `/api/game/attend`) vẫn mở vì trang stage trong OBS/LIVE Studio cần gọi mà
   không có mật khẩu.
3. **Bind `0.0.0.0`** (`server.ts` `start()`): upstream chỉ nghe `127.0.0.1`,
   Traefik trên Dokploy gọi tới IP container sẽ bị từ chối. Nay nghe `0.0.0.0`.
   (Production đã tự serve `dist/` + SPA fallback cho `/` và `/?view=stage`
   nên không cần sửa thêm.)
4. **Link stage theo host đang mở** (`Dashboard.tsx`): hiển thị
   `${protocol}//${host}/?view=stage` thay vì `http://lvh.me:<port>/?view=stage`,
   nên trên live hiện đúng `https://lophoc.bla.io.vn/?view=stage`.
5. **Dockerfile + docker-compose.yml mới** (root repo): base `node:22-alpine`,
   `npm ci` (đủ cả devDependencies vì `tsx` chạy server và `vite` build đều
   nằm ở devDependencies), `npm run build`, `NODE_ENV=production`, chạy
   `npx tsx server.ts`, `PORT 4181`, `PANEL_KEY=${PANEL_KEY}`, volume
   `lop-hoc-chu-data:/app/data` để sổ lớp (`data/so-lop.json`) và báo cáo ngày
   (`data/bao-cao/*.json`) không mất mỗi lần redeploy, `restart: unless-stopped`,
   image `lop-hoc-chu:1.0.0`.
6. **Đã xóa `BAT-LIVE.bat`** (chỉ dùng trên Windows) và thêm `.dockerignore`.
   `vite.config.ts`: thêm `lophoc.bla.io.vn` vào `allowedHosts` (chỉ ảnh
   hưởng dev server).
7. `settings.json` (tên lớp, server tự ghi lúc chạy) đã có trong `.gitignore`
   của upstream nên không commit; trong container nó ghi được vì `/app` ghi được.
8. **Upstream KHÔNG có `package-lock.json`** nên `npm ci` trong Dockerfile sẽ
   lỗi nếu thiếu file này — lockfile đã được tạo local bằng `npm install`
   (npm 10.9.4, 186 packages) và commit kèm trong repo này để Docker build
   được bằng `npm ci` như Cưới Liền Tay.
9. **Mục "🎁 Quản lý — Quà & Điểm"** (2026-11-05, theo yêu cầu của chủ kênh):
   Card mới trong Dashboard cho đổi các số quà/điểm mà trước đây cứng trong
   `src/game/config.ts`, lưu lên máy chủ nên deploy lại không mất:
   - Quà & tim: `hintGiftCoins` (30 — quà từ từng này xu thì mở thêm 1 chữ),
     `bigGiftCoins` (99 — quà lớn, cô khen to), `likesPerClap` (300 — đủ tim thì
     cả lớp vỗ tay), `heartTarget` (300 — thử thách thả tim), `heartBoost` (5 —
     mỗi tim thật tính thành từng này tim), `giftThanksCooldownSec` (30 —
     cùng 1 người chỉ cảm ơn 1 lần mỗi từng này giây).
   - Điểm: `rankPoints` (10,7,5,3,3,3,3,3,3,3 — hạng 1..10), `latePoints` (1 —
     đúng sau hạng 10), `streakEvery` (3) + `streakBonus` (5), `rpsPoints` (2),
     `callUpPoints` (5), `rollPoints` (3), `rollWinners` (10).
   - Server: `GET /api/settings` (mở, stage đọc không cần key) trả về cài đặt
     đã gộp với mặc định; `POST /api/settings` yêu cầu đúng `PANEL_KEY`
     (đã thêm vào `PANEL_WRITE_PATHS`, cùng mẫu gate với `/api/control`),
     validate số trong khoảng hợp lý (số ngoài khoảng bị kẹp vào khoảng,
     `rankPoints` phải đúng 10 số 0..100), lưu overrides vào
     `data/game-settings.json` (nằm trong volume `lop-hoc-chu-data` nên giữ
     được qua deploy), rồi broadcast SSE `settings` để stage đang mở áp dụng
     ngay. Khi chưa có cài đặt lưu thì mọi giá trị đúng y mặc định cũ.
   - Client: `src/game/gameSettings.ts` (`fetchGameSettings` /
     `applyGameSettings` gộp lên đối tượng `GAME` bằng `Object.assign` nên
     `quiz.ts`/`Classroom` thấy giá trị mới cho câu/quà tiếp theo; stage tải
     cài đặt trước khi tạo lớp học, nghe sự kiện SSE `settings`, và poll lại
     mỗi 60 giây dự phòng khi SSE rớt; `GiftThanker.update()` để ngưỡng
     `bigGiftCoins`/cooldown đổi giữa live). Panel: `src/live/ManageGifts.tsx`
     (ô nhập số + nút Lưu / Về mặc định, gửi kèm panel key qua
     `panelHeaders()`, báo đã lưu/thất bại rõ ràng).

## Kết quả test local (2026-11-05, mục Quản lý — Quà & Điểm)

Chạy `NODE_ENV=production PORT=4182 PANEL_KEY=testkey123 DATA_DIR=/tmp/lhc-settings-test`
(`tsc --noEmit` sạch, `vite build` xong, bundle chứa "Quản lý — Quà & Điểm"):
`GET /api/settings` trả đúng 14 giá trị mặc định; `POST` không key 403, sai key
403, đúng key lưu `hintGiftCoins=50, latePoints=2` rồi `GET` trả đúng giá trị mới;
`POST` sai (`hintGiftCoins=0`, `rankPoints` chỉ 2 số) → kẹp thành 1, `rankPoints`
giữ nguyên; tắt rồi mở lại server thì giá trị đã lưu vẫn còn (đọc từ
`data/game-settings.json`); panel + stage 200. Test lõi game bằng
`npx tsx /tmp/lhc-game-test.ts` (8/8 đạt): quà 20 xu với ngưỡng 30 không mở chữ,
đổi ngưỡng xuống 10 thì quà 20 xu mở chữ ngay; `pointsForRank` đổi theo
`rankPoints`/`latePoints` mới; `giftThanksCooldownSec=60` thành 60000ms;
`GiftThanker.update()` đổi ngưỡng quà lớn giữa live; giá trị sai bị kẹp/bỏ.
`npx tsx src/game/quiz.check.ts` gốc vẫn đạt (không hồi quy). Dữ liệu test ở
`/tmp` đã xóa; server live không bị động tới trong lúc test.

## Kết quả test local (2026-11-04, trước khi push)

`npm ci` (từ lockfile đã tạo) → `tsc --noEmit` sạch → `vite build` xong →
chạy `NODE_ENV=production PORT=4181 PANEL_KEY=<key-test>`: 14/14 đạt — `/`
với Host `lophoc.bla.io.vn` và `localhost` đều 200 (`<title>Lớp Học Chữ</title>`),
`/?view=stage` 200, `/api/tiktok/status` JSON, test/emit và control không key
403 / có key 200 (cả `x-panel-key` lẫn `Authorization: Bearer`), connect không
key 403, connect có key với username giả → 400 thân thiện, disconnect có key
200, Host lạ → 403, `/api/tts` 200 audio/mpeg MP3 hợp lệ 25.056 byte,
`/api/game/state` không key vẫn 200 (stage tự lưu sổ lớp được), bundle build
có ô "Mật khẩu panel" và link stage theo host đang mở.

## Chạy local (test trước khi push)

Máy này không có docker daemon nên test bằng Node trực tiếp:

```bash
npm ci
npx tsc --noEmit
npm run build
NODE_ENV=production PORT=4181 PANEL_KEY=<mat-khau-test> npx tsx server.ts
```

Kiểm tra:

- `curl -H "Host: lophoc.bla.io.vn" http://localhost:4181/` → 200, giao diện Lớp Học Chữ
- `curl "http://localhost:4181/?view=stage"` → 200 (stage 9:16)
- `curl http://localhost:4181/api/tiktok/status` → JSON `{success:true,...}`
- `curl -X POST http://localhost:4181/api/test/emit -H 'Content-Type: application/json' -d '{"type":"chat","data":{"nickname":"Test","comment":"xin chào"}}'` → 403 (không key)
- Cùng lệnh trên kèm `-H "x-panel-key: <mat-khau-test>"` → 200
- `curl "http://localhost:4181/api/tts?text=Xin%20ch%C3%A0o"` → audio/mpeg (hoặc lỗi TTS rõ ràng, không 500 do code)

## Deploy

Push lên `VuBLA2025/lop-hoc-chu` nhánh `master` (75 file text qua GitHub
connector + 66 file nhị phân tải lên bằng trình duyệt: 41 file webp trong
`public/assets/` — ảnh nhân vật + nền lớp học mà stage dùng lúc chạy — và
25 ảnh PNG gốc trong `nhan-vat/`, chỉ dùng làm nguồn cho `tools/tach-nen.py`),
rồi tạo project `Lop Hoc Chu LIVE` + compose `lop-hoc-chu` trên Dokploy
(sourceType github, owner VuBLA2025, repo lop-hoc-chu, branch master,
composePath `./docker-compose.yml`, domain `lophoc.bla.io.vn` port 4181,
env `PANEL_KEY`) và deploy bằng **`compose.deploy`** (KHÔNG dùng
`compose.redeploy` — bài học từ DamCuoi: redeploy rebuild từ composeFile cũ
lưu trong Dokploy; push GitHub cũng không tự kích hoạt deploy dù autoDeploy
true). Theo dõi deployment tới `done` rồi kiểm tra live:

## Trạng thái deploy 2026-11-04 (buổi tối) — ĐÃ LIVE

- File text: đã push đủ 75/75 lên nhánh `master`, commit
  `1df0828cb505288382288ece9d367aa5b04f1796` (đối chiếu cây file GitHub khớp
  100% với local). Provider tự tạo thêm nhánh `main` chỉ có 1 file
  `README.md` mẫu — không dùng, nhánh deploy là `master`.
- File nhị phân: 41 file webp `public/assets/` (4 commit: bg `df289b6`,
  nv/co-giao `a8d73d5`, nv/nam `7961de9`, nv/nu `12d8279`) + 25 ảnh PNG
  `nhan-vat/` (4 commit: nhan-vat `bd257e5`, co-giao-ao-dai-trang `09ffaa6`,
  hoc-sinh-nam `0573808`, hoc-sinh-nu `67134c3`). Đối chiếu cây file bằng
  GitHub API: remote 141/141 file khớp 100% với local (75 text + 66 nhị
  phân), không thiếu không thừa. Head master: `67134c3`.
- Dokploy: project `Lop Hoc Chu LIVE` (`fg5xfSqrgDG5Tdxac_lXm`,
  environment production `PgRCIPb5k0ObpTE700I1k`), compose `lop-hoc-chu`
  (`9db--2J0QEqjSOK73mIbe`, sourceType github, repo VuBLA2025/lop-hoc-chu
  nhánh master, composePath `./docker-compose.yml`, `PANEL_KEY` đã đặt trong
  env), domain `lophoc.bla.io.vn` (`32sS3IP6YIJIKZRhD9xNN`, port 4181,
  Let's Encrypt).
- Deploy 1: `f5SZzMka17wMHjGvfjjiD` (commit `67134c3`) status `done`
  2026-11-04 17:05:49 UTC — container chạy ngay, nhưng HTTPS 404 trong khi
  HTTP 200 đúng panel. Nguyên nhân: domain lúc tạo có `https: false` nên
  Traefik không tạo router HTTPS. Đã sửa bằng `domain.update`
  (`https: true`, kèm host/port/serviceName/certificateType) rồi chạy
  `compose.deploy` lần 2 để Traefik tạo lại router.
- Deploy 2: `qMdrEvOCcE6HNIRnOgbAb` status `done` 2026-11-04 17:19:27 UTC.
  **LIVE: https://lophoc.bla.io.vn/ — kiểm chứng cùng ngày:**

## Trạng thái deploy 2026-11-05 — Mục "Quản lý — Quà & Điểm" ĐÃ LIVE

- Code: commit `159f35582568e4858c13548c5690468b4f86a1b1` trên nhánh `master`
  (9 file: `server.ts`, `src/game/gameSettings.ts` mới, `src/game/useGame.ts`,
  `src/live/ManageGifts.tsx` mới, `src/live/Dashboard.tsx`,
  `src/live/chatter.ts`, `src/live/types.ts`, `src/live/useLiveEvents.ts`,
  `DEPLOY.md`).
- Deploy: `compose.deploy` cho compose `9db--2J0QEqjSOK73mIbe`, deployment
  `kEXUvY_Fe8LHt2EJCSxJp` status `done` 2026-11-05 01:04:19 UTC.
- Kiểm chứng live cùng ngày: panel `/` 200 `<title>Lớp Học Chữ</title>`,
  bundle JS chứa "Quản lý" + `api/settings`; `GET /api/settings` 200 trả đúng
  14 giá trị mặc định; `POST /api/settings` không key 403, sai key 403, đúng
  key lưu `hintGiftCoins=45, latePoints=2` rồi `GET` trả đúng giá trị mới,
  sau đó trả về mặc định (`hintGiftCoins=30, latePoints=1`) và `GET` xác nhận;
  stage `/?view=stage` 200; 4 game còn lại vẫn 200 (Chùa, Sàn Vui, Xuyên Việt,
  Đám Cưới).
- Lưu ý: file `data/game-settings.json` trên live hiện chỉ chứa overrides bằng
  đúng mặc định (30/1) do bước trả giá trị test về mặc định; hành vi game
  không đổi so với trước khi thêm mục Quản lý.
  panel `/` 200 `<title>Lớp Học Chữ</title>`, bundle JS chứa ô
  "Mật khẩu panel" + link stage `?view=stage`; stage `/?view=stage` 200;
  `/api/tiktok/status` 200 JSON (`isConnected: false` — chưa nối TikTok);
  gate mật khẩu: test/emit không key 403, sai key 403
  (`{"success":false,"error":"Sai mật khẩu panel"}`), đúng key 200;
  `/api/control` đúng key 200; `/api/tts` 200 audio/mpeg MP3 hợp lệ
  24.480 byte; ảnh webp live 200 (`/assets/nv/co-giao/01-dung.webp`,
  `/assets/bg/lop.webp`, `/assets/nv/nam/sau-01-dung.webp`);
  POST `/api/game/state` không key 200 `{"success":true}` (stage tự lưu
  sổ lớp được). 4 game còn lại kiểm tra cùng lúc vẫn 200
  (Chùa, Sàn Vui, Xuyên Việt, Đám Cưới).
- **Bài học:** khi tạo domain trên Dokploy, nhớ bật `https: true` ngay từ
  đầu (mặc định tạo qua API là `false`); nếu quên, sửa bằng
  `domain.update` rồi chạy lại `compose.deploy` (KHÔNG dùng
  `compose.redeploy`) để Traefik tạo router HTTPS.

- https://lophoc.bla.io.vn/ — panel Lớp Học Chữ (nhập mật khẩu panel ở ô
  "Mật khẩu panel" rồi mới Kết nối / Đọc ngay / Giả lập)
- https://lophoc.bla.io.vn/?view=stage — stage 9:16 cho TikTok LIVE Studio / OBS

## Luật chơi (tóm tắt từ README upstream)

- Mỗi tiết 20 câu, xen câu toán nhẩm, câu tiếng Anh, đố mẹo, lịch sử; câu 20
  là câu hỏi vàng nhân đôi điểm. Nhất 10 điểm, nhì 7, ba 5; chép đáp án trên
  khung chat chỉ được 1 điểm. Chấm theo giờ TikTok gắn lúc gửi bình luận.
- Tặng quà thì học sinh lên bục tặng hoa cô, thả tim thì cả lớp vỗ tay,
  gõ `sinh nhật` thì có bánh kem, đi học nhiều ngày liền thì cô nhớ mặt.
- Giờ ra chơi sau mỗi tiết (oẳn tù tì, kiểm tra miệng, chọn phe, điểm danh,
  thả tim), lớp trưởng mỗi tiết, bảng học sinh xuất sắc trong ngày, bảng vàng tuần.
- Trang báo cáo sau buổi live: `/bao-cao` (câu khó, câu quá dễ).

## 2026-11-06: Gói quà + sửa đứng hình + nhạc nền

Buổi live đầu tiên (112 người vào, 103 chat, 0 quà) + đại ca thấy stage đứng
hình lúc chuyển câu → làm cả 3:

- **Thu hút quà (Gói 1+2+3):**
  - Stage có bảng "🎁 Tặng quà được gì" (góc phải trên): 1 xu hoa lên bàn cô,
    30 xu cô mở 1 chữ, 99 xu khen to + 5 điểm danh dự; thanh mục tiêu quà
    cả lớp (mặc định 100 xu) + top 3 người tặng hôm nay.
  - Đủ mục tiêu quà → câu tiếp theo thành câu vàng nhân đôi điểm (chỉ 1 câu).
    Tặng quà lúc ra chơi được điểm.
  - Cô rủ tặng quà khi câu khó quá nửa giờ chưa ai đúng; cuối tiết vinh danh
    người tặng nhiều nhất hôm nay. Tổng xu + top tặng quà lưu ở localStorage
    của stage (qua ngày làm lại).
  - Số quà/điểm/nhạc đổi được ở panel "Quản lý — Quà & Điểm" (không cần build
    lại): `giftGoalXu` (100), `giftHonorPoints` (5), `giftRecessPoints` (2),
    `musicVolume` (12). MC nhắc quyền lợi quà mỗi 5 phút (watch_lophoc.mjs).
- **Sửa đứng hình khi chuyển câu:** nguyên nhân là bảng chữ câu mới chỉ hiện
  khi giọng cô bắt đầu đọc câu hô "bắt đầu", mà file giọng phải tải từ server
  (Edge TTS, lúc chậm thì chờ mấy giây, có khi thử lại tới 10 giây); trong lúc
  cô đọc thì đồng hồ cũng dừng, nên màn hình đứng ở câu cũ. Sửa 3 chỗ:
  (1) hiện bảng chữ ngay khi sang câu mới; (2) tải sẵn giọng câu tiếp theo
  trong lúc hiện đáp án (prefetch, dùng chung cache `/api/tts`);
  (3) câu chính đã cũ (sang phần khác rồi) thì bỏ, không đọc dồn.
  Kiểm chứng local bằng Chrome headless + giả lập chat/quà: chuyển câu trong
  402 ms, bảng hiện ngay ở sự kiện đầu tiên của câu mới.
- **Nhạc nền:** tự tạo bằng WebAudio, không cần file, không lo bản quyền
  (đệm hợp âm Đô–La thứ–Fa–Sol + nốt nhạc hộp ngũ cung, lặp lại). Mặc định
  12% âm lượng, tự nhỏ xuống khi cô đang nói, to lên khi cô im. Bắt đầu sau
  1 lần chạm lên stage (giống giọng cô). Tắt bằng cách chỉnh "Nhạc nền" về 0
  ở panel. Kiểm chứng local: AudioContext chạy, có sóng âm thật (RMS ~0.005).

## Chưa kiểm chứng

- Nghe giọng cô giáo + nhạc nền bằng tai trên thiết bị thật.
- Quà thật theo tên, mốc 100 xu và câu vàng trong live thật.
