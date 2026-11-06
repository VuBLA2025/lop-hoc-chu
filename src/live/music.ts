/**
 * Nhạc nền piano nhẹ, tự tạo bằng WebAudio (không cần file, không lo bản quyền).
 * - Đệm hợp âm (pad) đổi mỗi 8 giây: Đô – La thứ – Fa – Sol.
 * - Nốt nhạc hộp thưa, theo thang ngũ cung Đô trưởng, lặp lại thành câu nhạc.
 * - Âm lượng rất nhỏ (mặc định 12%), tự nhỏ thêm khi cô đang nói (ducking).
 * - Chỉ bắt đầu sau khi chạm lên stage 1 lần (trình duyệt cấm tự phát tiếng).
 */

// Hợp âm đệm (Hz): C, Am, F, G
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66],
];
// Câu nhạc hộp (chỉ số vào thang ngũ cung): nhẹ, lặp lại, không chói
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5 D5 E5 G5 A5 C6
const MELODY = [0, 2, 4, 3, 2, 4, 5, 4, 2, 0, 2, 4, 3, 2, 1, 0];
const CHORD_SEC = 8;
const PLUCK_SEC = 1.5;

class MusicBox {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volumePct = 12;
  private ducked = false;
  private nextChordAt = 0;
  private nextPluckAt = 0;
  private chordIdx = 0;
  private melodyIdx = 0;

  /** Bắt đầu phát (gọi sau 1 lần chạm lên stage); gọi nhiều lần cũng không sao */
  start() {
    if (this.timer !== null) return;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
      }
      void this.ctx.resume();
      const now = this.ctx.currentTime;
      this.nextChordAt = now + 0.1;
      this.nextPluckAt = now + 0.8;
      this.timer = setInterval(() => this.schedule(), 250);
      this.applyGain();
    } catch {
      // trình duyệt không cho phát tiếng thì thôi, game vẫn chạy bình thường
    }
  }

  /** Dừng hẳn (giữ lại AudioContext để bật lại nhanh) */
  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      void this.ctx.suspend();
    }
  }

  /** % âm lượng trong panel (0 là tắt) */
  setVolume(pct: number) {
    this.volumePct = Math.max(0, Math.min(100, Math.round(pct)));
    this.applyGain();
  }

  /** Cô đang nói thì nhỏ nhạc xuống, cô im thì to lên lại */
  setDucked(ducked: boolean) {
    if (this.ducked === ducked) return;
    this.ducked = ducked;
    this.applyGain();
  }

  /** Gọi mỗi nhịp game: chỉ để chỉnh độ to theo giọng cô (không tự bắt đầu nhạc) */
  update(voiceBusy: boolean) {
    this.setDucked(voiceBusy);
  }

  private applyGain() {
    if (!this.ctx || !this.master) return;
    const base = this.volumePct <= 0 ? 0 : (this.volumePct / 100) * 0.5;
    const target = base * (this.ducked ? 0.35 : 1);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.6;
    while (this.nextChordAt < horizon) {
      this.pad(CHORDS[this.chordIdx % CHORDS.length], this.nextChordAt);
      this.chordIdx++;
      this.nextChordAt += CHORD_SEC;
    }
    while (this.nextPluckAt < horizon) {
      this.pluck(PENTA[MELODY[this.melodyIdx % MELODY.length]], this.nextPluckAt);
      this.melodyIdx++;
      this.nextPluckAt += PLUCK_SEC;
    }
  }

  /** Đệm hợp âm: nốt lên từ từ, ngân 8 giây rồi tắt dần */
  private pad(freqs: number[], when: number) {
    const ctx = this.ctx!;
    const master = this.master!;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.16, when + 2);
      g.gain.setValueAtTime(0.16, when + CHORD_SEC - 2);
      g.gain.linearRampToValueAtTime(0, when + CHORD_SEC);
      osc.connect(g);
      g.connect(master);
      osc.start(when);
      osc.stop(when + CHORD_SEC + 0.1);
    }
    // nốt gốc trầm cho ấm
    const root = ctx.createOscillator();
    root.type = 'sine';
    root.frequency.value = freqs[0] / 2;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0, when);
    rg.gain.linearRampToValueAtTime(0.12, when + 2);
    rg.gain.setValueAtTime(0.12, when + CHORD_SEC - 2);
    rg.gain.linearRampToValueAtTime(0, when + CHORD_SEC);
    root.connect(rg);
    rg.connect(master);
    root.start(when);
    root.stop(when + CHORD_SEC + 0.1);
  }

  /** Nốt nhạc hộp: vang lên rồi tắt dần trong ~1,4 giây */
  private pluck(freq: number, when: number) {
    const ctx = this.ctx!;
    const master = this.master!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 1.4);
    osc.connect(g);
    g.connect(master);
    osc.start(when);
    osc.stop(when + 1.5);
    // hoạ âm nhẹ cho tiếng trong hơn
    const h = ctx.createOscillator();
    h.type = 'sine';
    h.frequency.value = freq * 2;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.12, when);
    hg.gain.exponentialRampToValueAtTime(0.001, when + 0.8);
    h.connect(hg);
    hg.connect(master);
    h.start(when);
    h.stop(when + 0.9);
  }
}

export const music = new MusicBox();
