import { IS_STAGE } from './page';
import { containsBanned } from './bannedWords';

/**
 * Hàng đợi giọng đọc. Chỉ phát trên trang stage.
 *   voice.say('Chào bạn A')            -> xếp cuối hàng
 *   voice.say('Cảm ơn quà', true)      -> ưu tiên, chen lên đầu (dùng cho quà)
 *   voice.say('Trời ơi! | ^Hoan hô!') -> "|" tách đoạn; "^" hô to hơn một chút
 *   voice.say('M: Anh nói | F: Em nói')  -> 2 MC: "M:" giọng nam, "F:" giọng nữ (giữ tới khi đổi)
 *   voice.say('F: Đáp án là | E: cat')   -> "E:" giọng tiếng Anh, đọc từ tiếng Anh cho chuẩn
 * Câu nào chờ quá lâu (mặc định 60 giây) thì bỏ, để không đọc chuyện đã cũ.
 */
interface Line {
  text: string;
  at: number;
  done?: () => void;
  start?: () => void; // gọi khi câu bắt đầu đọc (để camera lia tới người được nói tới)
  valid?: () => boolean; // tới lượt đọc mà trả về false thì bỏ câu (chuyện đã cũ, vd. đã bị cướp mà vẫn "sắp trả lời")
  keep?: boolean; // không bỏ dù chờ lâu (lời dẫn khai mạc dài)
}

// M nam, F nữ, E tiếng Anh (cô đọc từ tiếng Anh)
type Who = 'M' | 'F' | 'E';

const MAX_WAIT_MS = 60_000;
const MAX_QUEUE = 30;

class Voice {
  private normal: Line[] = [];
  private priority: Line[] = [];
  private playing = false;
  private current: HTMLAudioElement | null = null;
  private lastSpokeAt = Date.now();
  rate = readRate(); // mặc định 1.25: MC nói nhanh cho tiết tấu dồn dập (chủ kênh chốt); chỉnh ở trang điều khiển
  volume = 1;
  enabled = IS_STAGE;
  /** báo MC nào đang nói (để nhân vật MC trên sân khấu nhún nhảy) */
  onSpeaker?: (who: 'M' | 'F' | null) => void;
  /** đếm dòng giọng đã phát / bị bỏ (gỡ lỗi khi giọng im giữa live): xem ở console __lophocVoice.stats */
  readonly stats = { played: 0, dropped: 0, guardDrops: 0, errors: 0 };

  /** `done`: gọi khi câu đọc xong, bị bỏ, hoặc trang này không phát tiếng */
  say(text: string, priority = false, done?: () => void, keep = false, start?: () => void, valid?: () => boolean) {
    if (!this.enabled || !text.trim()) {
      if (start) setTimeout(start, 0);
      if (done) setTimeout(done, 0);
      return;
    }
    const q = priority ? this.priority : this.normal;
    q.push({ text: text.trim(), at: Date.now(), done, keep, start, valid });
    // câu ưu tiên: tạo giọng sẵn ngay lúc xếp hàng, tới lượt là phát liền không phải chờ server
    if (priority) for (const p of this.parts(text)) fetch(this.urlOf(p)).catch(() => {});
    if (q.length > MAX_QUEUE) q.shift()?.done?.();
    void this.next();
  }

  /** Tải sẵn giọng của 1 câu (để tới lượt đọc là phát liền): dùng chung cache với phát thật */
  prefetch(text: string) {
    if (!this.enabled || !text.trim()) return;
    for (const p of this.parts(text)) fetch(this.urlOf(p)).catch(() => {});
  }

  stop() {
    for (const l of [...this.normal, ...this.priority]) l.done?.();
    this.normal = [];
    this.priority = [];
    this.current?.pause();
    this.current = null;
    this.playing = false;
  }

  get busy() {
    return this.playing || this.normal.length + this.priority.length > 0;
  }

  /** Số câu thường đang chờ (không tính câu đang đọc) */
  get waiting() {
    return this.normal.length;
  }

  /** Số câu ưu tiên (quà) đang chờ */
  get waitingPriority() {
    return this.priority.length;
  }

  /** Giọng đã im bao lâu (0 khi đang đọc hoặc còn câu chờ) */
  quietForMs(now = Date.now()) {
    return this.busy ? 0 : now - this.lastSpokeAt;
  }

  // "M: Trời ơi! | ^Hoan hô!" -> từng đoạn: ai nói (M nam, F nữ), có hô to không
  private parts(text: string) {
    let who: Who = 'M';
    const out: { who: Who; hype: boolean; text: string }[] = [];
    for (let raw of text.split('|')) {
      raw = raw.trim();
      const sp = /^(M|F|E):\s*/.exec(raw);
      if (sp) {
        who = sp[1] as Who;
        raw = raw.slice(sp[0].length);
      }
      const t = raw.replace(/^\^+/, '');
      if (t) out.push({ who, hype: raw.startsWith('^'), text: t });
    }
    return out;
  }

  private urlOf(p: { who: Who; hype: boolean; text: string }) {
    const v = p.who === 'F' ? '&v=f' : p.who === 'E' ? '&v=en' : '';
    return `/api/tts?rate=${this.rate}${p.hype ? '&hype=1' : ''}${v}&text=${encodeURIComponent(p.text)}`;
  }

  private async next() {
    if (this.playing) return;
    const now = Date.now();
    let line: Line | undefined;
    while ((line = this.priority.shift() ?? this.normal.shift())) {
      if (line.valid && !line.valid()) {
        this.stats.dropped++;
        line.done?.();
        continue;
      }
      if (line.keep || now - line.at < MAX_WAIT_MS) break;
      this.stats.dropped++;
      line.done?.();
    }
    if (!line) return;
    this.playing = true;
    line.start?.();
    try {
      for (const part of this.parts(line.text)) {
        this.onSpeaker?.(part.who === 'E' ? 'F' : part.who); // giọng tiếng Anh là cô đọc
        const audio = new Audio(this.urlOf(part));
        audio.volume = this.volume;
        this.current = audio;
        await new Promise<void>((resolve) => {
          // Tự gỡ kẹt: 1 câu treo (không tải xong, không báo lỗi) sẽ làm MC im cả buổi live.
          // Nhưng đừng bỏ câu chỉ vì giọng về chậm: lúc Edge bị chặn (429) server phải thử
          // lại tới 17 giây mới có file giọng, trình duyệt vẫn đang tải thì chờ thêm
          // (tối đa 40 giây); chỉ bỏ câu khi đã quá hạn, sang phần khác rồi, hoặc tải lỗi hẳn.
          let started = false;
          const waitedSince = Date.now();
          const MAX_WAIT_MS = 40_000;
          const finish = () => {
            clearTimeout(guard);
            if (!started) this.stats.guardDrops++;
            if (!audio.ended) audio.pause();
            resolve();
          };
          const checkGuard = () => {
            if (started) return;
            if (line.valid && !line.valid()) return finish(); // sang phần khác: bỏ câu cũ
            if (Date.now() - waitedSince >= MAX_WAIT_MS) return finish(); // treo thật: bỏ
            // vẫn đang tải giọng từ server, hoặc đã có dữ liệu mà chưa phát: chờ thêm
            if (audio.networkState === 2 || audio.readyState >= 2) {
              guard = setTimeout(checkGuard, 4000);
              return;
            }
            return finish(); // không tải nữa mà cũng không phát: bỏ
          };
          let guard = setTimeout(checkGuard, 8000);
          audio.onplaying = () => {
            if (!started) {
              started = true;
              this.stats.played++;
            }
            clearTimeout(guard);
            const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 + 4000 : 40_000;
            guard = setTimeout(finish, ms);
          };
          audio.onended = finish;
          audio.onerror = () => {
            this.stats.errors++;
            finish();
          };
          // trình duyệt chặn tự phát tiếng: thử lại vài lần thay vì bỏ câu
          const tryPlay = (left: number) =>
            audio.play().catch(() => (left > 0 ? setTimeout(() => tryPlay(left - 1), 1500) : finish()));
          tryPlay(4);
        });
        if (this.current !== audio) break; // stop() giữa chừng
      }
    } finally {
      this.onSpeaker?.(null);
      line.done?.();
      this.current = null;
      this.playing = false;
      this.lastSpokeAt = Date.now();
      void this.next();
    }
  }
}

function readRate() {
  try {
    const r = Number(localStorage.getItem('voice-rate'));
    return r >= 0.5 && r <= 1.5 ? r : 1.1; // cô giáo đọc đề: chậm hơn MC đám cưới (1.35)
  } catch {
    return 1.1;
  }
}

export const voice = new Voice();

export { speakableName } from './names';
