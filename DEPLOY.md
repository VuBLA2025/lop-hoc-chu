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

Push lên `VuBLA2025/lop-hoc-chu` nhánh `master` (112 file text qua GitHub
connector + 25 ảnh PNG trong `nhan-vat/` tải lên bằng trình duyệt), rồi tạo
project `Lop Hoc Chu LIVE` + compose `lop-hoc-chu` trên Dokploy
(sourceType github, owner VuBLA2025, repo lop-hoc-chu, branch master,
composePath `./docker-compose.yml`, domain `lophoc.bla.io.vn` port 4181,
env `PANEL_KEY`) và deploy bằng **`compose.deploy`** (KHÔNG dùng
`compose.redeploy` — bài học từ DamCuoi: redeploy rebuild từ composeFile cũ
lưu trong Dokploy; push GitHub cũng không tự kích hoạt deploy dù autoDeploy
true). Theo dõi deployment tới `done` rồi kiểm tra live:

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

## Chưa kiểm chứng

- Kết nối TikTok live thật (cần tài khoản đang live + username thật).
- Nghe giọng cô giáo bằng tai trên thiết bị thật.
