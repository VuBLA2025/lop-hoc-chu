"""Một lần: gắn câu "Đây là..." theo chủ đề, bỏ đáp án quá dài, bỏ cách viết khác thừa."""
import re, unicodedata, pathlib
D = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'game' / 'cau-hoi'
TONES = '\u0300\u0301\u0303\u0309\u0323'
def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = re.sub(f'o([{TONES}])([ae])(?![a-zđ])', r'o\2\1', s)
    s = re.sub(f'u([{TONES}])y(?![a-zđ])', r'uy\1', s)
    return re.sub(r'[\W_]', '', unicodedata.normalize('NFC', s))
KIND = {  # file: {đáp án bắt đầu đoạn: câu}, '' = từ đầu file
 '01-truong-lop': {'': 'Đây là thứ ở trường lớp.'},
 '02-con-vat': {'': 'Đây là một con vật.'},
 '03-cay-trai': {'': 'Đây là một loại quả.', 'CÀ RỐT': 'Đây là một loại rau củ.', 'CÂY TRE': 'Đây là một loại cây.', 'HOA SEN': 'Đây là một loài hoa.', 'CÂY CAU': 'Đây là một loại cây cỏ.', 'QUẢ ĐÀO': 'Đây là một loại quả.', 'HẠT ĐIỀU': 'Đây là một loại hạt hoặc củ.', 'QUẢ BƠ': 'Đây là một loại quả.'},
 '04-mon-an': {'': 'Đây là món ăn trong bữa cơm người Việt.'},
 '05-do-uong-an-vat': {'': 'Đây là đồ uống hoặc món ăn vặt.'},
 '06-nghe-nghiep': {'': 'Đây là một nghề.'},
 '07-dia-danh': {'': 'Đây là địa danh của Việt Nam.', 'MÚA RỐI NƯỚC': 'Đây là thứ gắn với đất nước Việt Nam.', 'CHỢ NỔI': 'Đây là địa danh của Việt Nam.'},
 '08-do-vat': {'': 'Đây là một đồ vật.'},
 '09-giao-thong': {'': 'Đây là thứ liên quan tới xe cộ, đi lại.'},
 '10-thien-nhien': {'': 'Đây là thứ trong thiên nhiên, trời đất.'},
 '11-co-the': {'': 'Đây là bộ phận cơ thể.', 'NỤ CƯỜI': 'Đây là chuyện cơ thể, sức khỏe.'},
 '12-the-thao-tro-choi': {'': 'Đây là một môn thể thao.', 'NHẢY DÂY': 'Đây là một trò chơi.'},
 '13-le-tet': {'': 'Đây là thứ gắn với lễ Tết, phong tục.'},
 '14-thanh-ngu': {'': 'Đây là ca dao tục ngữ, điền chữ còn thiếu.', 'NƯỚC CHẢY ĐÁ MÒN': 'Đây là một câu thành ngữ, tục ngữ.'},
 '15-tuoi-tho': {'': 'Đây là kỷ niệm tuổi thơ thế hệ 8x 9x.'},
 '16-gen-z': {'': 'Đây là từ của giới trẻ, dân mạng.'},
 '17-am-nhac': {'': 'Đây là thứ thuộc về âm nhạc, nghệ thuật.', 'RẠP CHIẾU PHIM': 'Đây là thứ thuộc về phim ảnh, sách truyện.'},
 '18-mau-hinh-so': {'': 'Đây là một màu sắc.', 'HÌNH TRÒN': 'Đây là kiến thức hình học.', 'SỐ KHÔNG': 'Đây là con số hoặc phép tính.', 'GIÂY': 'Đây là đơn vị đo.', 'LA BÀN': 'Đây là thứ trong giờ toán, giờ địa.'},
 '19-the-gioi': {'': 'Đây là một quốc gia.', 'TOKYO': 'Đây là một thành phố trên thế giới.', 'KIM TỰ THÁP': 'Đây là kỳ quan, danh thắng thế giới.', 'CHÂU Á': 'Đây là châu lục, vùng đất trên trái đất.', 'HỘ CHIẾU': 'Đây là thứ gắn với nước ngoài.'},
 '20-gia-dinh': {'': 'Đây là người trong gia đình, họ hàng.', 'HÀNG XÓM': 'Đây là người quen quanh mình.', 'MẸ CHỒNG': 'Đây là người trong gia đình, họ hàng.', 'VUI VẺ': 'Đây là một cảm xúc.', 'HIỀN': 'Đây là một tính cách.'},
 '21-khoa-hoc': {'': 'Đây là thứ thuộc về khoa học, công nghệ.'},
}
MAXL = 14
for f in sorted(D.glob('*.txt')):
    kinds = KIND.get(f.stem, {})
    out, dropped = [], []
    for line in f.read_text(encoding='utf-8').split('\n'):
        s = line.strip()
        if s.startswith('>'):
            continue  # chạy lại thì gắn lại từ đầu
        if not s or s.startswith('#'):
            out.append(line)
            if s.startswith('# ') and not any(l.startswith('>') for l in out) and '' in kinds:
                pass
            continue
        parts = [p.strip() for p in s.split('|')]
        ans = parts[0]
        if len(norm(ans)) > MAXL:
            dropped.append(ans); continue
        if len(parts) > 3:
            alts = [a.strip() for a in parts[3].split(',') if a.strip() and norm(a) != norm(ans)]
            parts = parts[:3] + ([', '.join(alts)] if alts else [])
        if ans in kinds and ans != '':
            out.append(f'> {kinds[ans]}')
        out.append(' | '.join(parts))
    # câu "Đây là..." mặc định: ngay sau các dòng # đầu file
    if '' in kinds:
        i = 0
        while i < len(out) and out[i].strip().startswith('#'):
            i += 1
        out.insert(i, f"> {kinds['']}")
    f.write_text('\n'.join(out).rstrip('\n') + '\n', encoding='utf-8')
    if dropped: print(f.stem, 'bỏ', dropped)
