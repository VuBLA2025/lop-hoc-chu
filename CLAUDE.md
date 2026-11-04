# Lớp Học Chữ: ghi chú cho Claude

> File này mô tả RIÊNG game này. Luật chung cho mọi game nằm ở `E:\VibeCode\CLAUDE.md`.
> Khi chủ kênh chốt một quyết định (câu đọc, màu, luật chơi), ghi vào mục "Quyết định của chủ kênh".

## Ý tưởng

Lớp học 2D cho TikTok LIVE. Cô giáo áo dài đố chữ: chữ cái xáo trộn trên bảng đen, người xem gõ đáp án vào bình luận. Ai đúng nhanh nhất được nhiều điểm nhất, điểm cao ngồi bàn đầu. Luật gốc: `C:\Users\phaml\Documents\Codex\2026-11-03\xe\outputs\luat-choi-lop-hoc-chu.md` (đã chỉnh theo quyết định bên dưới).

## Luật chơi

- Comment bất kỳ là vào lớp (có tên trên đầu học sinh). Gõ `vào lớp` thì cô chào.
- Mỗi tiết 20 câu: 10 câu chữ (4 dễ, 2 vừa, 4 khó) + 4 câu toán nhẩm khó dần ở câu 5, 10, 15, 19 + 2 câu tiếng Anh ở câu 3, 12 + 2 câu đố mẹo ở câu 7, 13 + 2 câu lịch sử ở câu 9, 17; câu 20 là câu hỏi vàng (điểm x2). Mỗi câu 20 giây. Hết giờ chưa ai đúng: mở 1 chữ (câu toán không mở số), thêm 10 giây.
- Cô đọc: "Câu 3. Đây là một món ăn. <gợi ý>" (câu "Đây là..." ghi ở dòng `>` trong file câu hỏi).
- Sau mỗi tiết là giờ ra chơi 1 phút, bốc 1 trong 5 trò (không lặp trò vừa chơi): oẳn tù tì (+2), kiểm tra miệng gọi 1 bạn đang ngồi (+5), chọn phe (vui, không điểm), điểm danh "có mặt" (10 bạn đầu +3), thả tim 300 trong 30 giây (+1 cả lớp). Xong trò thì hiện "Học sinh giỏi hôm nay".
- Xếp hạng 3 tầng: điểm tiết (xếp ghế, xoá mỗi tiết) · điểm buổi (👑 lớp trưởng, ⭐ lớp phó) · bảng vàng tuần (lưu file `data/so-lop.json`, tự xoá khi sang tuần mới).
- Comment dài đúng bằng đáp án (không tính khoảng trắng) mới tính là trả lời; nói chuyện thường không bị tính sai. Mỗi người chỉ tính lần trả lời đầu tiên của câu đó. Phải gõ đủ dấu.
- Điểm theo thứ tự đúng, xếp theo giờ TikTok gắn lúc gửi (`createTime`), không theo lúc bot nhận: 10 / 7 / 5 / hạng 4–10 được 3 / sau đó 1. Đúng 3 câu liền +5.
- Quà: luôn là "tặng hoa cô" (cô cầm hoa, cảm ơn). Quà từ 30 xu lúc chưa ai đúng: cô mở thêm 1 chữ cho cả lớp. Quà không cộng điểm.
- 300 tim: cả lớp vỗ tay.

## File

- `src/game/quiz.ts`: lõi game (pha, chấm điểm, chỗ ngồi). Test: `npx tsx src/game/quiz.check.ts`.
- `src/game/cau-hoi/*.txt`: 2076 câu, 30 chủ đề (gồm 101 câu đố mẹo 23-do-meo.txt và 101 câu lịch sử 24-lich-su-su.txt; file tên đuôi -meo / -su chỉ hỏi ở vị trí meo / su trong roundPlan). Kiểm tra: `npx tsx src/game/bank.check.ts` (gợi ý lộ đáp án, trùng, đáp án quá 14 chữ, thiếu câu "Đây là").
- `src/game/math.ts`: sinh câu toán nhẩm 4 cấp (cộng trừ 1 chữ số, 2 chữ số, nhân chia, 2 bước). Tự sinh nên không hết câu, không ghi vào sổ lớp.
- `src/game/loi-thoai.ts`: toàn bộ lời cô (khoảng 330 câu, bốc kiểu xáo bài nên ít lặp). `src/game/config.ts`: số liệu.
- `src/game/sfx.ts`: hiệu ứng âm thanh tự tạo (ting, trống, tích tắc, chuông, bụp quà, vỗ tay, kèn). Bỏ file mp3 cùng tên vào `public/assets/sfx/` là dùng file thay.
- Trang báo cáo sau buổi live: http://localhost:3006/bao-cao (nút 📊 ở trang điều khiển). File `data/bao-cao/<ngày>.json`.
- Chạy thử không đụng sổ lớp thật: đặt biến `DATA_DIR` sang thư mục khác.
- `data/so-lop.json`: câu nào hỏi lúc nào (game ưu tiên câu lâu chưa hỏi; khoảng 50 tiết liền không lặp (câu đố mẹo hết trước)) + điểm tuần. Không đưa lên git.
- `src/game/GameStage.tsx`: màn hình. Toạ độ bàn đo trên ảnh nền gốc 941x1672 (`ROWS`).
- `src/game/GameControls.tsx`: nút thử ở trang điều khiển, có "1000 người cùng đoán" để đo bot nhận đủ comment không.
- `tools/tach-nen.py`: tách nền xám ảnh trong `nhan-vat/` ra `public/assets/nv/`. Thay ảnh thì chạy lại.
- Trang stage chạy game thật và gửi ảnh chụp trạng thái lên `/api/game/state`; trang điều khiển chỉ vẽ lại ảnh chụp đó (xem trước luôn khớp live).
- `?view=stage&mute=1`: xem stage không phát tiếng (để Claude thử).
- Cổng riêng: **3006** (BAT-LIVE.bat đặt PORT=3006). Link LIVE Studio: http://lvh.me:3006/?view=stage. Thử trong khung preview của Claude: cổng 3500 (hoặc cấu hình "lop-hoc-3006").

## Quyết định của chủ kênh

- 20 giây mỗi câu (đổi từ 25, 2026-11-04), luôn chạy đủ giờ (`endAfterFirstSec: 0`).
- Tên lớp đổi được ở ô "Tên lớp" trang điều khiển (hiện trên bảng hiệu).
- Cô cà khịa nhiều: 60% số câu cô gọi tên trêu 1 bạn trả lời sai; đúng trong 4 giây đầu thì cô khen "thần đồng" kiểu khen bé (không nghi quay cóp nữa, 2026-11-04); lớp im 75 giây thì cô nhắc.
- Dấu kiểu cũ/mới (hóa/hoá, thủy/thuỷ) đều tính đúng; không dấu thì không tính.
- Điểm giảm dần theo thứ tự đúng để chép đáp án trên khung chat chỉ được 1 điểm.
- Quà = tặng hoa cô giáo; quà to mở chữ.
- Chưa làm phần cắt clip.
- Học sinh ngồi ghế QUAY LƯNG ra khán giả, mặt nhìn cô giáo (2026-11-04). Bộ ảnh chỉ có mặt trước nên thân sau lưng là ảnh gốc lật ngang + xoá đầu (`sau-*.webp`), tóc vẽ bằng SVG ở `src/game/Hair.tsx`: nam 4 kiểu (ngắn, đầu đinh, xoăn, mũ lưỡi trai ngược), nữ 6 kiểu (đuôi ngựa, búi, 2 bím nơ, xoã, bob, 2 chùm), 12 màu tóc có vài màu nhuộm. Kiểu tóc cố định theo tên tài khoản.
- Hết 20 ghế: tới 60 bạn tiếp theo chen chúc đứng ngoài 2 bên cửa lớp (30 mỗi bên, 10 hàng so le), vẫn tính điểm. Chỉ 6 bạn đứng đầu có bảng tên, còn lại không hiện tên (2026-11-04).
- Bảng đỏ chữ vàng "TIÊN HỌC LỄ – HẬU HỌC VĂN" phía trên bảng đen.
- Chỗ ngồi: điểm cao bàn đầu; cùng điểm thì bạn còn tương tác (bình luận trong 10 phút) ngồi trước bạn đã im lâu, rồi ai vào lớp trước ngồi trước (không đổi chỗ mỗi lần comment). Dưới khung Nhanh nhất có dòng nhắc ngắn đổi mỗi 8 giây: đoán nhanh, điểm cao, tương tác nhiều được vào lớp ngồi (2026-11-04).
- Muốn nhân vật đẹp hơn: làm ảnh học sinh nhìn từ sau lưng cùng nét vẽ, bỏ vào nhan-vat/ rồi sửa tools/tach-nen.py.
- Giọng đọc bám chương trình (chủ kênh chốt 2026-11-04): câu chính (giới thiệu tiết, đề, đáp án + cà khịa lúc hiện đáp án, tổng kết, ra chơi) đọc ngay, đồng hồ phần đó DỪNG trong lúc cô đọc (đọc đề xong mới đếm 20 giây). Câu chào, cảm ơn quà, follow, khen người đúng đầu tiên chỉ nói khi đang chờ học sinh trả lời và còn hơn 5 giây (`chatterWindow`, `chatterMinLeftMs`); chờ quá lâu thì bỏ.
- Có thêm 10 câu khen kiểu khen bé nhỏ tuổi trong nhóm `firstCorrect`.
- Tiết 20 câu, xen 4 câu toán nhẩm (2026-11-04): bảng đen hiện phép tính to, người xem gõ số; cô đọc "36 cộng 47 bằng mấy?", hiện đáp án đọc cả phép tính.
- Đọc đề xong cô hô "bắt đầu" (nhóm `go`), hô xong mới đếm giờ. Còn 5 giây cô nhắc "chuẩn bị hết giờ nhé các bạn nhỏ ơi" (nhóm `timeWarn`, `warnLeftSec`), câu này KHÔNG dừng đồng hồ (2026-11-04).
- Xưng hô: cô gọi học sinh là "bạn nhỏ" / "các bạn nhỏ", không dùng em, con, mấy đứa (2026-11-04).
- Cô khen kiểu thưởng quà: kẹo, bánh, sữa, phiếu bé ngoan, ngôi sao, điểm mười (`REWARDS` trong loi-thoai.ts). Chép phạt bốc ngẫu nhiên từ 10 tới 1 triệu lần (`penalty()`), số nhỏ hay gặp hơn (2026-11-04).
- Cô đọc đề trước, bảng chữ xáo / phép tính / ô đáp án CHƯA hiện; lúc cô bắt đầu hô "bắt đầu" mới hiện (Say.go -> showBoard). Giọng hỏng thì đồng hồ chạy lại là tự hiện (2026-11-04).
- Cứ 5 câu (sau câu 5, 10, 15) cô dừng lại điểm danh 3 bạn nhỏ điểm cao nhất, tặng mỗi bạn 1 món quà, mời cả lớp chào cô / thả tim; đọc xong chờ thêm 8 giây (praiseSec) rồi mới ra câu tiếp. Pha praise (2026-11-04).
- Quà cô thưởng (kẹo, nơ, bánh, sữa, phiếu bé ngoan, gấu bông...: REWARDS trong loi-thoai.ts) bay từ tay cô xuống đặt trên bàn bạn nhỏ, tối đa 4 món/bàn, xoá khi sang tiết mới. Ngoài điểm danh, bạn đúng đầu tiên / đúng 3 câu liền có 40% được quà (giftChance), câu hỏi vàng 50% (2026-11-04).
- Câu đố mẹo (2026-11-04): câu 7 và 13 mỗi tiết, bảng hiện nhãn "🤪 Đố mẹo", cô có lời riêng lúc hiện đáp án (riddleReveal), không ai đúng (riddleNobody: "bị cô lừa hết rồi"), trêu bạn sai (riddleWrong). Câu có nhiều đáp án hợp lý thì ghi thêm ở cột cách viết khác.
- Câu lịch sử (2026-11-04): câu 9 và 17 mỗi tiết, nhãn "📜 Lịch sử". Chỉ lịch sử Việt Nam tới 1945, kiến thức sách giáo khoa. Chi tiết các nguồn ghi khác nhau thì KHÔNG đưa vào gợi ý (đã bỏ: lý do tên Hắc Đế, năm xây Chùa Cầu); không dùng nhân vật còn tranh cãi (vd Lê Văn Tám). Thêm câu mới thì phải tra lại.
- Nút "🚫 Bỏ câu này" ở trang điều khiển (2026-11-04): bỏ câu đang hỏi, không ai được điểm, sang câu tiếp, không bao giờ hỏi lại (sổ lớp `banned`). Sửa đáp án trong file là thành câu mới. Câu toán không bỏ được.
- Tự đổi nhịp (2026-11-04): dưới 5 bạn đang chơi (bình luận trong 2 phút) thì có người đúng là 8 giây sau chốt câu; đông thì chạy đủ 20 giây.
- Chuyên cần (2026-11-04): lần đầu bình luận mỗi buổi thì server ghi ngày; đi học liền từ ngày thứ 2 cô nhận ra và gọi tên, mốc 3, 5, 7, 10, 14, 21, 30 ngày thì khen to + tặng quà. Bảng tên hiện 🎒 số ngày.
- Sinh nhật (2026-11-04): bạn nhỏ gõ có chữ "sinh nhật" (không có "chúc"/"mừng") thì cô chúc, bánh kem 🎂 lên bàn, vỗ tay, biểu ngữ 10 giây. Mỗi bạn 1 lần mỗi buổi, 2 lần chúc cách nhau ít nhất 1 phút. Trang điều khiển có ô nhập tên để chủ kênh tự chúc.
- Cả lớp chọn chủ đề (2026-11-04): sau giờ ra chơi có 15 giây bình chọn 2 chủ đề (gõ 1 hoặc 2), chủ đề thắng chiếm 5 câu chữ thường của tiết sau. Không ai chọn thì trộn như cũ.
- Âm thanh (2026-11-04): tự tạo trong trình duyệt, nhỏ hơn giọng cô (sfx.volume 0.35).
- Lớp trưởng / lớp phó chỉ tính điểm 20 câu của tiết đang học (2026-11-04): sang tiết mới tranh lại từ đầu. Cuối giờ ra chơi hiện bảng "Lớp trưởng các tiết" (tiết mấy, ai, bao nhiêu điểm, 👑xN nếu làm nhiều lần), cô trêu bạn làm lớp trưởng nhiều lần. Điểm ra chơi không tính vào lớp trưởng. Bảng vàng tuần vẫn cộng dồn như cũ.
- Câu tiếng Anh (2026-11-04): câu 3 và 12, file 25-tieng-anh.txt (đuôi -anh), 175 từ vựng tiểu học, hỏi "Con mèo tiếng Anh là gì?" gõ CAT. Lúc hiện đáp án cô đọc từ tiếng Anh bằng giọng en-US-AnaNeural (trong lời thoại viết "| E: từ | F:").
- Lớp vắng (2026-11-04): 5 phút không ai bình luận/quà/tim thì tiết sau là "ôn bài" (hỏi lại câu đã hỏi, không tốn câu mới); có bạn vào thì từ câu kế đổi sang câu mới.
- Chào theo giờ (2026-11-04): sáng 5-10h, trưa 10-13h, chiều 13-17h, tối 17-22h, khuya 22-5h; đổi buổi hoặc cứ 4 tiết thì chào một lần đầu tiết.
- "Ai yêu cô thì gõ số 1 nào, các bé iu ơi" (2026-11-04): mỗi 4 phút, chỉ lúc đang chờ trả lời câu chữ (câu toán thì không, vì gõ số bị tính là trả lời); đếm trong 15 giây, tim bay lên, cô cảm ơn kèm tên.
- Treo live cả ngày (2026-11-04): server tự kết nối lại TikTok khi rớt / hết phiên (15 giây, 30, 60, tối đa 2 phút một lần), nhớ tài khoản trong settings.json nên bật lại server cũng tự kết nối; bấm Ngắt kết nối thì thôi. BAT-LIVE.bat tự bật lại server khi bị tắt.
- Đọc đề (2026-11-04): cô nói "Đây là một từ gồm 5 chữ cái, là một món ăn." rồi gợi ý (Classroom.intro), hô bắt đầu xong mới hiện chữ.
- Bảng "🏆 Học sinh xuất sắc hôm nay" ghim ở góc trái trên đầu cô (2026-11-04): tổng điểm CẢ NGÀY (server, qua 0 giờ làm lại), khác lớp trưởng chỉ tính tiết.
- Lấp im lặng (2026-11-04): mỗi 100 giây lúc chờ câu chữ, xoay vòng: rủ gõ số 1 / chuyện vui, mẹo tiếng Anh (funFact) / bình chọn vui gõ 1 chữ (POLLS, đọc kết quả) / gọi bạn ngủ gật dậy.
- Học sinh tương tác (2026-11-04): tặng hoa thì bạn đó đi lên bục đưa cô rồi về chỗ, hoa cắm vào bình trên bàn cô (tối đa 12 bông); đúng đầu tiên thì nhảy lên; bình luận hiện bong bóng 5 giây (không hiện câu trả lời, không hiện từ cấm); ngồi im 5 phút thì 💤; trêu sai có 30% phạt lên đứng cạnh bảng 45 giây với bảng "😅 Học sinh cá biệt" (tối đa 2 bạn).
- Bộ câu mới (2026-11-04), trộn vào câu chữ thường: 26-tieng-keu (đoán con vật/đồ vật qua tiếng kêu), 27-trai-nghia, 28-bai-hat (chỉ tả nội dung, KHÔNG chép lời bài hát), 29-quoc-gia (món ăn, biểu tượng), 30-tinh-thanh (chỉ tỉnh giữ nguyên tên sau sáp nhập 1/7/2025 và TP lớn giữ tên).
- Tim x5 (2026-11-04): mỗi tim thật tính thành 5 tim (GAME.heartBoost), trò thả tim 300 chỉ cần 60 tim thật; vỗ tay cả lớp cũng vậy.
- Bàn dài + ghế băng (2026-11-04, làm ở bản tiếng Anh trước rồi chuyển sang): 4 dãy 7, 7, 8, 8 bạn = 30 ghế (`GAME.rowSeats`), các bạn nhỏ lại (KID = 0.82), bàn vẽ SVG đè lên bàn lẻ của ảnh nền (`LongDesk` trong GameStage.tsx).
- Giọng Edge bị chặn (lỗi 429) khi gọi dồn (2026-11-04): server cho Edge đọc từng câu một, câu giống nhau dùng chung, bị chặn thì chờ 2/5/10 giây thử lại; vẫn lỗi thì Google ĐÚNG ngôn ngữ (từ tiếng Anh dùng tl=en), không lưu bản dự phòng. Log "[giọng dự phòng]" để xem sau buổi live.
- Repo GitHub CÔNG KHAI từ 2026-11-04: https://github.com/workaipvlinh-byte/lop-hoc-chu (MIT cho mã nguồn; ảnh nhân vật/nền thuộc tác giả). README có hướng dẫn cài đặt, sửa tính năng thì cập nhật README theo.
