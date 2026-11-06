import { useEffect, useState } from 'react';
import { panelHeaders } from './page';
import { GAME_SETTING_DEFAULTS, type GameSettings } from '../game/gameSettings';

type Form = { [K in keyof GameSettings]: string };
type NumKey = Exclude<keyof GameSettings, 'rankPoints'>;

const GIFT_FIELDS: Array<{ key: NumKey; label: string; hint: string; min: number; max: number }> = [
  { key: 'hintGiftCoins', label: 'Quà mở chữ', hint: 'xu — quà từ từng này xu thì cô mở thêm 1 chữ', min: 1, max: 10000 },
  { key: 'giftDoubleCoins', label: 'Quà mở 2 chữ', hint: 'xu — quà từ từng này xu cô mở 2 chữ', min: 1, max: 10000 },
  { key: 'giftThankCoins', label: 'Quà cảm ơn tên', hint: 'xu — quà từ từng này xu cô gọi tên cảm ơn', min: 1, max: 10000 },
  { key: 'bigGiftCoins', label: 'Quà lớn', hint: 'xu — từ từng này xu cô khen to', min: 1, max: 10000 },
  { key: 'giftGoalXu', label: 'Mục tiêu quà', hint: 'xu — đủ từng này xu cả lớp thì câu tiếp theo thành câu vàng', min: 10, max: 100000 },
  { key: 'giftHonorPoints', label: 'Thưởng quà lớn', hint: 'điểm danh dự khi tặng từ quà lớn lúc đang hỏi', min: 0, max: 100 },
  { key: 'musicVolume', label: 'Nhạc nền', hint: '% âm lượng — 0 là tắt nhạc', min: 0, max: 100 },
  { key: 'likesPerClap', label: 'Tim vỗ tay', hint: 'tim — đủ từng này tim cả lớp vỗ tay', min: 10, max: 100000 },
  { key: 'heartTarget', label: 'Thử thách thả tim', hint: 'tim — mục tiêu lúc ra chơi', min: 10, max: 100000 },
  { key: 'heartBoost', label: 'Nhân tim thật', hint: 'mỗi tim thật tính thành từng này tim', min: 1, max: 100 },
  { key: 'giftThanksCooldownSec', label: 'Cảm ơn quà', hint: 'giây — cùng 1 người chỉ cảm ơn 1 lần mỗi từng này giây', min: 1, max: 300 },
];

const POINT_FIELDS: Array<{ key: NumKey; label: string; hint: string; min: number; max: number }> = [
  { key: 'latePoints', label: 'Đúng sau hạng 10', hint: 'điểm — thường là chép đáp án trên khung chat', min: 0, max: 100 },
  { key: 'streakEvery', label: 'Chuỗi đúng thưởng', hint: 'câu — đúng liền từng này câu thì thưởng', min: 2, max: 20 },
  { key: 'streakBonus', label: 'Thưởng chuỗi', hint: 'điểm thưởng thêm', min: 0, max: 100 },
  { key: 'rpsPoints', label: 'Oẳn tù tì thắng', hint: 'điểm', min: 0, max: 100 },
  { key: 'callUpPoints', label: 'Kiểm tra miệng đúng', hint: 'điểm', min: 0, max: 100 },
  { key: 'giftRecessPoints', label: 'Quà giờ ra chơi', hint: 'điểm — tặng quà lúc ra chơi được từng này điểm', min: 0, max: 100 },
  { key: 'rollPoints', label: 'Điểm danh', hint: 'điểm', min: 0, max: 100 },
  { key: 'rollWinners', label: 'Điểm danh được điểm', hint: 'bạn — số bạn đầu tiên được điểm', min: 1, max: 30 },
];

const toForm = (s: GameSettings): Form => {
  const f = {} as Form;
  (Object.keys(s) as Array<keyof GameSettings>).forEach((k) => {
    f[k] = Array.isArray(s[k]) ? (s[k] as number[]).join(',') : String(s[k]);
  });
  return f;
};

/** Card "Quản lý — Quà & Điểm": đổi số quà/điểm, lưu lên máy chủ (deploy lại không mất). */
export function ManageGifts() {
  const [form, setForm] = useState<Form>(() => toForm(GAME_SETTING_DEFAULTS));
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [armReset, setArmReset] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d?.data) setForm(toForm(d.data));
        setLoaded(true);
      })
      .catch(() => setLoaded(true)); // máy chủ chưa có cài đặt: dùng mặc định
  }, []);

  const set = (key: keyof GameSettings, v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setMsg('');
  };

  const parseForm = (): { patch: Partial<GameSettings>; error?: string } => {
    const patch: Partial<GameSettings> = {};
    for (const f of [...GIFT_FIELDS, ...POINT_FIELDS]) {
      const raw = form[f.key].trim();
      if (raw === '') return { patch, error: `Chưa nhập "${f.label}"` };
      const n = Number(raw);
      if (!Number.isFinite(n)) return { patch, error: `"${f.label}": phải là số` };
      if (n < f.min || n > f.max) return { patch, error: `"${f.label}": nhập từ ${f.min} tới ${f.max}` };
      (patch as Record<string, unknown>)[f.key] = Math.round(n);
    }
    const parts = form.rankPoints.split(',').map((s) => s.trim());
    if (parts.length !== 10 || parts.some((p) => p === '' || !Number.isFinite(Number(p)))) {
      return { patch, error: 'Điểm hạng 1–10: nhập đúng 10 số, cách nhau bằng dấu phẩy' };
    }
    const ranks = parts.map((p) => Math.round(Number(p)));
    if (ranks.some((n) => n < 0 || n > 100)) return { patch, error: 'Điểm hạng 1–10: mỗi số từ 0 tới 100' };
    patch.rankPoints = ranks;
    return { patch };
  };

  const postSettings = async (patch: Partial<GameSettings>, okMsg: string) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...panelHeaders() },
        body: JSON.stringify(patch),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) {
        setMsg(
          d.error === 'Sai mật khẩu panel'
            ? 'Sai mật khẩu panel — nhập mật khẩu ở ô "Mật khẩu panel" phía trên rồi bấm Lưu lại.'
            : d.error || `Lưu thất bại (HTTP ${r.status})`,
        );
      } else {
        if (d.data) setForm(toForm(d.data));
        setMsg(okMsg);
      }
    } catch (e) {
      setMsg(`Không gọi được máy chủ: ${String(e)}`);
    }
    setBusy(false);
  };

  const save = () => {
    const { patch, error } = parseForm();
    if (error) return setMsg(error);
    void postSettings(patch, 'Đã lưu cài đặt Quà & Điểm — áp dụng ngay cho câu/quà tiếp theo.');
  };

  const reset = () => {
    if (!armReset) {
      setArmReset(true);
      setMsg('Bấm "Về mặc định" lần nữa để xác nhận đưa mọi số về mặc định.');
      setTimeout(() => setArmReset(false), 5000);
      return;
    }
    setArmReset(false);
    void postSettings(GAME_SETTING_DEFAULTS, 'Đã đưa mọi số về mặc định.');
  };

  return (
    <section className="rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
      <h2 className="mb-2 font-semibold">🎁 Quản lý — Quà &amp; Điểm</h2>
      {!loaded && <p className="text-xs text-slate-500">Đang tải cài đặt...</p>}
      <div className="mb-2 text-xs font-medium text-amber-300">Quà &amp; tim</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {GIFT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-slate-400">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={1}
              className="mt-0.5 w-full rounded-lg bg-slate-800 px-2 py-1.5"
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
            <span className="text-[11px] leading-tight text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>
      <div className="mb-2 mt-3 text-xs font-medium text-amber-300">Điểm</div>
      <label className="mb-2 block">
        <span className="text-xs text-slate-400">Điểm hạng 1–10</span>
        <input
          className="mt-0.5 w-full rounded-lg bg-slate-800 px-2 py-1.5"
          value={form.rankPoints}
          onChange={(e) => set('rankPoints', e.target.value)}
          placeholder="10,7,5,3,3,3,3,3,3,3"
        />
        <span className="text-[11px] leading-tight text-slate-500">10 số cách nhau bằng dấu phẩy — hạng 1, 2, 3… 10 (câu hỏi vàng nhân đôi)</span>
      </label>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {POINT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-slate-400">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={1}
              className="mt-0.5 w-full rounded-lg bg-slate-800 px-2 py-1.5"
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
            <span className="text-[11px] leading-tight text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={busy} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40">
          {busy ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
        <button onClick={reset} disabled={busy} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium hover:bg-slate-700 disabled:opacity-40">
          Về mặc định
        </button>
      </div>
      {msg && <div className="mt-2 text-xs text-amber-300">{msg}</div>}
      <p className="mt-1 text-xs text-slate-500">
        Đổi xong áp dụng ngay cho câu/quà tiếp theo, không cần tải lại stage. Cài đặt lưu trên máy chủ nên deploy lại vẫn còn. Cần nhập mật khẩu panel mới lưu được.
      </p>
    </section>
  );
}
