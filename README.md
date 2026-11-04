# Lớp Học Chữ

Game tương tác cho TikTok LIVE. Màn hình là một lớp học 2D: cô giáo áo dài xáo chữ cái trên bảng đen, người xem gõ đáp án vào bình luận. Ai đúng nhanh nhất được nhiều điểm nhất và được ngồi bàn đầu.

## Tính năng

- 2076 câu hỏi tiếng Việt, 30 chủ đề, mỗi câu là một dòng trong file text (`src/game/cau-hoi/`). Mỗi tiết 20 câu, xen câu toán nhẩm tự sinh, câu tiếng Anh, đố mẹo, lịch sử; câu 20 là câu hỏi vàng nhân đôi điểm.
- Chấm điểm theo giờ TikTok gắn lúc người xem gửi bình luận, nên phòng đông, bình luận tới lệch thứ tự vẫn xếp đúng ai nhanh nhất. Nhất 10 điểm, nhì 7, ba 5; chép đáp án trên khung chat chỉ được 1 điểm.
- Phải gõ có dấu; kiểu bỏ dấu cũ và mới ("hóa" / "hoá") đều tính đúng. Nói chuyện thường không bị tính là trả lời sai.
- Game nhớ câu nào đã hỏi (lưu ra file) để nhiều buổi live liền ít lặp.
- Cô giáo nói bằng giọng Edge TTS tiếng Việt, vài trăm câu thoại để khen, trêu, cảm ơn quà. Đồng hồ dừng trong lúc cô đọc đề; câu chào, câu cảm ơn chỉ chen vào lúc đang chờ người xem trả lời.
- Tương tác: bình luận là có ghế (30 ghế trên 4 dãy bàn dài, hết ghế thì đứng ngoài cửa lớp, vẫn tính điểm), tặng quà thì học sinh lên bục tặng hoa cô, thả tim thì cả lớp vỗ tay, gõ "sinh nhật" thì có bánh kem, đi học nhiều ngày liền thì cô nhớ mặt.
- Giờ ra chơi sau mỗi tiết (oẳn tù tì, kiểm tra miệng, chọn phe, điểm danh, thả tim), lớp trưởng mỗi tiết, bảng học sinh xuất sắc trong ngày, bảng vàng tuần.
- Treo live cả ngày: rớt kết nối TikTok thì tự nối lại, server tắt thì file BAT tự bật lại. Sau buổi live có trang báo cáo câu khó, câu quá dễ.
- Trang điều khiển có nút giả lập (1 bạn trả lời, tặng quà, 1000 người cùng đoán...) để thử trước khi lên live.

## Cần có

- Máy Windows (file chạy sẵn là `BAT-LIVE.bat`; Mac/Linux xem phần cuối).
- [Node.js](https://nodejs.org/) bản 22 LTS (tối thiểu 20.19).
- Mạng internet: giọng đọc lấy từ Edge TTS.
- Tài khoản TikTok được phép LIVE và phần mềm [TikTok LIVE Studio](https://www.tiktok.com/studio/download).

## Cài đặt

1. Cài Node.js: tải bản **LTS** ở nodejs.org, bấm Next tới hết.
2. Tải mã nguồn: trên trang GitHub bấm **Code → Download ZIP** rồi giải nén, hoặc dùng git:
   ```bash
   git clone https://github.com/workaipvlinh-byte/lop-hoc-chu.git
   ```
3. Mở thư mục vừa tải, bấm đúp **`BAT-LIVE.bat`**. Lần đầu máy tự cài thư viện, chờ 1–2 phút.
4. Cửa sổ đen hiện dòng `Server chạy ở http://localhost:3006`, khoảng 8 giây sau trình duyệt tự mở **trang điều khiển** `http://localhost:3006`. Để cửa sổ đen chạy suốt buổi live, đóng nó là tắt game.

## Lên live

1. Trong TikTok LIVE Studio bấm **Phát trực tiếp** (Go LIVE) trước.
2. Ở trang điều khiển, nhập username TikTok (không cần @) rồi bấm **Kết nối**. Báo "chưa LIVE" nghĩa là tài khoản chưa phát trực tiếp.
3. Trong LIVE Studio thêm nguồn **Link**:
   - Đường dẫn: `http://lvh.me:3006/?view=stage`
   - Khổ: **1080 × 1920** (màn hình dọc)

   LIVE Studio không nhận chữ `localhost`; `lvh.me` là tên miền trỏ về chính máy mình nên dùng được.
4. Chỉ trang `?view=stage` phát tiếng. Trang điều khiển im lặng, có khung xem trước, mở bao nhiêu tab cũng được. Đừng mở thêm trang stage ở chỗ khác kẻo hai giọng đọc đè nhau (trang điều khiển sẽ báo nếu bị vậy).

Dùng OBS cũng được: thêm nguồn **Browser**, cùng đường dẫn và khổ trên.

## Trang điều khiển

- **Tên lớp**: đổi chữ trên bảng hiệu.
- **Giọng đọc trên stage**: gõ câu cho cô đọc ngay. Thêm `F: ` ở đầu câu để dùng giọng nữ.
- **Tốc độ giọng**: kéo thanh trượt, có tác dụng ngay khi đang live.
- **⏭ Qua phần tiếp / 🔄 Ván mới / 🚫 Bỏ câu này**: điều khiển lớp bằng tay. Câu bị bỏ sẽ không bao giờ hỏi lại.
- Các nút giả lập để thử khi chưa live.
- **📊 Báo cáo hôm nay** sau buổi live, hoặc mở thẳng `http://localhost:3006/bao-cao`.

## Thêm hoặc sửa câu hỏi

Mỗi file trong `src/game/cau-hoi/` là một chủ đề:

```text
# Món ăn Việt
> Đây là một món ăn.
PHỞ | Món nước nổi tiếng của Hà Nội, bánh dẹt, nước dùng xương. | 1
BÁNH XÈO | Đổ bột kêu xèo xèo, ăn cuốn rau sống. | 2
NEM RÁN | Cuốn bánh đa nem rồi chiên vàng giòn. | 2 | CHẢ GIÒ
```

- Dòng `#` là tên chủ đề, dòng `>` là câu cô nói trước gợi ý.
- Mỗi câu: `ĐÁP ÁN | gợi ý | độ khó (1 dễ, 2 vừa, 3 khó) | cách viết khác cũng tính đúng`.
- Đáp án tối đa 14 chữ cái (không tính khoảng trắng). Gợi ý không được chứa nguyên đáp án.

Sửa xong chạy kiểm tra (mở cửa sổ lệnh trong thư mục game):

```bash
npx tsx src/game/bank.check.ts
```

Lời thoại của cô nằm ở `src/game/loi-thoai.ts`, các con số (thời gian mỗi câu, điểm, giờ ra chơi...) ở `src/game/config.ts`.

## Tuỳ chỉnh khác

Tạo file `.env` cạnh `server.ts` nếu muốn đổi:

```text
PORT=3006
TTS_VOICE=vi-VN-NamMinhNeural
TTS_PITCH=+6%
```

`PORT` đổi ở đây thì nhớ sửa cả dòng `set PORT=3006` trong `BAT-LIVE.bat` và đường dẫn trong LIVE Studio.

Dữ liệu buổi live (câu đã hỏi, bảng vàng tuần, báo cáo) nằm ở thư mục `data/`. Xoá thư mục đó là làm lại từ đầu.

## Mac / Linux

```bash
npm install
PORT=3006 LIVE_MODE=1 npm run dev
```

## Kiểm tra code

```bash
npx tsx src/game/quiz.check.ts
npx tsx src/game/bank.check.ts
npm run lint
```

## Lưu ý

- Kết nối TikTok dùng thư viện [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector). Thư viện này không phải của TikTok, các bạn tự cân nhắc khi dùng. Phòng quá đông thì TikTok có thể không gửi đủ 100% bình luận.
- Giọng đọc dùng Edge TTS qua thư viện `msedge-tts`, cần mạng; lỗi thì tự chuyển sang Google TTS.
- Không bao giờ đọc nguyên văn bình luận của người xem; tên và bình luận đi qua bộ lọc từ cấm (`src/live/bannedWords.ts`) trước khi hiện.

## Giấy phép

Mã nguồn dùng giấy phép [MIT](LICENSE). Ảnh nhân vật và ảnh nền (`nhan-vat/`, `public/assets/`) thuộc về tác giả; muốn dùng cho kênh của mình thì nên thay bằng ảnh riêng.
