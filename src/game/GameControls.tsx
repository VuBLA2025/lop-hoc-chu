import { useState } from 'react';
import { emitTest, sendControl } from '../live/page';
import type { StageView } from './useGame';
import { GAME } from './config';

// Nút riêng của Lớp Học Chữ ở trang điều khiển: điều khiển ván + giả lập phòng đông để thử bot
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const TEN = ['Lan Anh', 'Minh Tuấn', 'Thu Trang', 'Quốc Bảo', 'Ngọc Hân', 'Gia Huy', 'Khánh Linh', 'Hải Yến', 'Đức Anh', 'Bảo Ngọc', 'Thanh Hà', 'Văn Toàn'];
const CHAT = ['khó quá cô ơi', 'chữ gì vậy trời', 'hay quá', 'vào lớp', 'cô xinh quá', 'ủa là gì', '???', 'hihi'];
const fake = (i: number) => ({ username: `hs${i}`, nickname: `${HO[i % HO.length]} ${TEN[i % TEN.length]}`, avatar: '' });
const shuffleWord = (w: string) => [...w].sort(() => Math.random() - 0.5).join('');

export function GameControls({ view, stageCount = 0 }: { view: StageView | null; stageCount?: number }) {
  const [sent, setSent] = useState(0);
  const [running, setRunning] = useState(false);
  const [bdName, setBdName] = useState('');

  /** Giả lập n người xem cùng bình luận trong 20 giây: 15% đúng, 20% đoán sai, còn lại nói chuyện */
  const flood = async (n: number) => {
    if (!view?.answer || running) return;
    setRunning(true);
    setSent(0);
    const answer = view.answer.toLowerCase();
    const start = Date.now();
    let done = 0;
    await Promise.all(
      Array.from({ length: n }, (_, i) => {
        const r = Math.random();
        const comment = r < 0.15 ? answer : r < 0.35 ? shuffleWord(answer) : CHAT[i % CHAT.length];
        const delay = Math.random() * 20_000;
        return new Promise<void>((ok) =>
          setTimeout(async () => {
            // TikTok gắn giờ lúc gửi; tới tay bot có thể trễ tới 1,5 giây và lệch thứ tự
            await emitTest('chat', { ...fake(i), comment, createTime: start + delay - Math.random() * 1500 }).catch(() => {});
            setSent(++done);
            ok();
          }, delay),
        );
      }),
    );
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {stageCount > 1 && <div className="rounded-lg bg-red-600 p-2 text-white">Đang mở {stageCount} trang stage, sẽ có 2 giọng. Đóng bớt đi.</div>}
      {view && (
        <div className="rounded-lg bg-slate-800 p-3 text-sm leading-6">
          <div>
            Ván {view.round} · câu {view.qNo}/{view.total} · {view.phase}
          </div>
          <div>
            Đáp án (chỉ mình thấy): <b className="text-amber-300">{view.answer || '—'}</b>
          </div>
          <div>
            Bot nhận câu này: <b>{view.stats.received}</b> comment · {view.stats.attempts} lượt trả lời · {view.correctCount} đúng
          </div>
          <div>
            Đang chơi: <b>{view.players}</b> bạn
            {view.players < GAME.smallRoomPlayers && <span className="text-amber-300"> · phòng vắng: có người đúng là {GAME.smallRoomEndAfterSec} giây sau chốt câu</span>}
          </div>
          {view.topic && <div>Chủ đề cả lớp chọn: {view.topic}</div>}
          {sent > 0 && <div>Giả lập đã gửi: {sent}</div>}
        </div>
      )}
      {/* Chủ kênh dùng trong lúc live */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => confirm(`Bỏ câu "${view?.answer}"? Câu này sẽ không bao giờ được hỏi lại.`) && sendControl('custom', 'ban')}
          disabled={!view?.answer || !!view.math || !['question', 'bonus', 'reveal'].includes(view.phase)}
          className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
        >
          🚫 Bỏ câu này
        </button>
        <input
          value={bdName}
          onChange={(e) => setBdName(e.target.value)}
          placeholder="Tên bạn nhỏ sinh nhật"
          className="w-48 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <Btn
          onClick={() => {
            if (bdName.trim()) sendControl('custom', `birthday:${bdName.trim()}`);
            setBdName('');
          }}
        >
          🎂 Chúc sinh nhật
        </Btn>
        <a href="/bao-cao" target="_blank" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600">
          📊 Báo cáo hôm nay
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => sendControl('custom', 'skip')}>⏭ Qua phần tiếp</Btn>
        <Btn onClick={() => sendControl('custom', 'newRound')}>🔄 Ván mới</Btn>
        <Btn onClick={() => emitTest('chat', { ...fake(Math.floor(Math.random() * 50)), comment: view?.answer.toLowerCase() ?? '' })}>✅ 1 bạn trả lời đúng</Btn>
        <Btn onClick={() => emitTest('chat', { ...fake(Math.floor(Math.random() * 50)), comment: 'vào lớp' })}>🙋 1 bạn vào lớp</Btn>
        <Btn onClick={() => emitTest('gift', { ...fake(3), giftName: 'Hoa hồng', giftId: 1, diamondCount: 1, repeatCount: 1 })}>🌹 Tặng hoa</Btn>
        <Btn onClick={() => emitTest('gift', { ...fake(4), giftName: 'Mũ', giftId: 2, diamondCount: 30, repeatCount: 1 })}>🎁 Quà to (mở chữ)</Btn>
        <Btn onClick={() => emitTest('like', { ...fake(5), likeCount: 300 })}>❤️ 300 tim</Btn>
        <Btn onClick={() => emitTest('chat', { ...fake(Math.floor(Math.random() * 50)), comment: 'hôm nay sinh nhật con cô ơi' })}>🎂 Thử: 1 bạn báo sinh nhật</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:rps')}>✊ Ra chơi: oẳn tù tì</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:callup')}>📢 Ra chơi: kiểm tra miệng</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:pick')}>⚖️ Ra chơi: chọn phe</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:roll')}>🙋 Ra chơi: điểm danh</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:heart')}>❤️ Ra chơi: thả tim</Btn>
        <Btn onClick={() => flood(100)} disabled={running}>👥 100 người cùng đoán</Btn>
        <Btn onClick={() => flood(1000)} disabled={running}>👥 1000 người cùng đoán</Btn>
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-40">
      {children}
    </button>
  );
}
