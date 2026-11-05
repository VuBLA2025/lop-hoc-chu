import { useEffect, useRef, useState } from 'react';
import { useLiveEvents } from '../live/useLiveEvents';
import type { GiftEvent, LiveStatus } from '../live/types';
import { voice, speakableName } from '../live/voice';
import { containsBanned } from '../live/bannedWords';
import { NameBatcher } from '../live/scoreboard';
import { GiftThanker, OncePerPerson } from '../live/chatter';
import { IS_STAGE } from '../live/page';
import { GAME } from './config';
import { fetchGameSettings } from './gameSettings';
import { QUESTIONS } from './bank';
import { Classroom, plain, type ClassView, type RecessGame, type Say } from './quiz';
import { sfx } from './sfx';

// ?view=stage&mute=1: xem thử trang stage không phát tiếng
const MUTED = new URLSearchParams(window.location.search).get('mute') === '1';

export type WeekRow = { username: string; nickname: string; points: number };
export type StageView = ClassView & { weekTop: WeekRow[]; todayTop: WeekRow[] };

/** Top 5 hôm nay: điểm server đã lưu + điểm vừa ghi chưa kịp gửi lên (bảng cập nhật ngay, không chờ 20 giây) */
function dayBoard(saved: WeekRow[], pending: Map<string, { nickname: string; points: number }>): WeekRow[] {
  const all = new Map(saved.map((r) => [r.username, { ...r }]));
  for (const [username, p] of pending) {
    const cur = all.get(username) ?? { username, nickname: p.nickname, points: 0 };
    cur.points += p.points;
    cur.nickname = p.nickname || cur.nickname;
    all.set(username, cur);
  }
  return [...all.values()].sort((a, b) => b.points - a.points).slice(0, 5);
}

/**
 * Trang stage chạy game thật (lõi ở quiz.ts), đọc/ghi sổ lớp trên server và gửi ảnh chụp trạng thái lên.
 * Trang điều khiển không tự chạy game, chỉ vẽ lại ảnh chụp đó, nên xem trước luôn khớp với live.
 */
export function useGame() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [view, setView] = useState<StageView | null>(null);
  const [lastGift, setLastGift] = useState<(GiftEvent & { at: number }) | null>(null);
  const [stageCount, setStageCount] = useState(0);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);

  const roomRef = useRef<Classroom | null>(null);
  const weekTop = useRef<WeekRow[]>([]);
  const todayTop = useRef<WeekRow[]>([]); // điểm cả ngày (server), cho bảng Học sinh xuất sắc hôm nay
  const likeBase = useRef<number | null>(null);
  const dirty = useRef(true);

  const [talk] = useState(() => ({
    greeter: new NameBatcher(
      GAME.greetEveryMs,
      GAME.namesPerGreeting,
      (names) => roomRef.current && say([roomRef.current.greet(joinNames(names))]),
      () => chatter.current.length >= 2, // còn câu nói thêm đang chờ thì gom tên lượt sau
    ),
    gifts: new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins),
    follows: new OncePerPerson(),
  }));

  // Nhịp giọng bám chương trình:
  // - Câu chính (đề, đáp án, tổng kết, ra chơi) đọc ngay; trong lúc cô đọc, đồng hồ phần đó dừng lại.
  // - Câu nói thêm (chào, cảm ơn, cà khịa) giữ ở đây, chỉ nói khi đang chờ học sinh trả lời và còn hơn 5 giây.
  const mainSpeaking = useRef(0);
  const chatter = useRef<{ text: string; priority: boolean; until: number }[]>([]);
  function say(lines: Say[]) {
    const now = Date.now();
    for (const l of lines) {
      if (l.main) {
        mainSpeaking.current++;
        // câu hô bắt đầu: cô vừa mở miệng hô thì hiện bảng chữ
        const onStart = l.go
          ? () => {
              roomRef.current?.showBoard();
              dirty.current = true;
            }
          : undefined;
        voice.say(l.text, true, () => mainSpeaking.current--, false, onStart);
      } else if (l.warn) {
        voice.say(l.text, true); // nhắc sắp hết giờ: chen lên đọc liền, đồng hồ vẫn chạy
      } else {
        const ttl = l.ttl ?? (l.priority ? GAME.giftLineMaxWaitMs : GAME.chatterMaxWaitMs);
        chatter.current.push({ text: l.text, priority: !!l.priority, until: now + ttl });
      }
    }
    dirty.current = true;
  }
  /** Nhả 1 câu nói thêm nếu đang tới lúc (gọi mỗi nhịp game) */
  function flushChatter(room: Classroom, now: number) {
    chatter.current = chatter.current.filter((c) => c.until > now);
    if (voice.busy || mainSpeaking.current > 0 || !room.chatterWindow(now)) return;
    const i = Math.max(0, chatter.current.findIndex((c) => c.priority)); // cảm ơn quà trước
    const next = chatter.current.splice(i, 1)[0];
    if (next) voice.say(next.text);
  }

  // Tên an toàn để hiện/đọc: tên có từ cấm thì dùng username
  const person = (e: { nickname: string; username: string; avatar: string }) => {
    const nickname = containsBanned(e.nickname) ? e.username : e.nickname;
    return { username: e.username, nickname, spoken: speakableName(nickname), avatar: e.avatar };
  };

  useLiveEvents({
    onStatus: setStatus,
    onSpeaker: (d) => setStageCount(d.count),
    onGameState: (s) => {
      if (!IS_STAGE) setView(s as StageView);
    },

    // Panel Quản lý vừa lưu cài đặt Quà & Điểm: stage tải lại rồi áp dụng cho câu/quà tiếp theo
    onSettings: () => {
      if (!IS_STAGE) return;
      fetchGameSettings()
        .then(() => talk.gifts.update(GAME.giftThanksCooldownMs, GAME.bigGiftCoins))
        .catch(() => {});
    },

    onChat: (e) => {
      const room = roomRef.current;
      if (!room) return;
      const p = person(e);
      const isNew = !room.students.has(e.username);
      say(room.chat({ ...p, comment: e.comment, createTime: e.createTime ?? e.timestamp, safe: !containsBanned(e.comment) }, Date.now()));
      if (isNew && p.spoken !== 'bạn' && GAME.joinKeywords.includes(plain(e.comment))) talk.greeter.add(e.username, p.spoken);
      // chuyên cần: lần đầu bình luận trong buổi thì báo server, server trả về số ngày đi học liền
      if (isNew && IS_STAGE) {
        fetch('/api/game/attend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: e.username, nickname: p.nickname }) })
          .then((r) => r.json())
          .then((d) => roomRef.current && say(roomRef.current.attendance(p, Number(d.days) || 0, Date.now())))
          .catch(() => {});
      }
    },

    onGift: (e) => {
      const room = roomRef.current;
      if (!room) return;
      const p = person(e);
      const coins = e.diamondCount * e.repeatCount;
      setLastGift({ ...e, nickname: p.nickname, at: Date.now() });
      const hint = room.gift(p, coins, Date.now());
      say(hint);
      // combo / tặng liên tục chỉ cảm ơn 1 lần mỗi 30 giây; quà to luôn cảm ơn
      if (!hint.length && talk.gifts.shouldThank(e.username, coins, chatter.current.filter((c) => c.priority).length)) say([room.thank(p, e.giftName, coins)]);
    },

    onFollow: (e) => {
      const room = roomRef.current;
      if (room && talk.follows.first(e.username)) say([room.follow(person(e))]);
    },

    onLike: (e) => {
      const room = roomRef.current;
      if (!room) return;
      if (likeBase.current === null) likeBase.current = e.totalLikes - e.likeCount;
      // tim thật x GAME.heartBoost: đủ 300 tim (60 tim thật) là cả lớp vỗ tay
      const reached = (e.totalLikes - likeBase.current) * GAME.heartBoost >= GAME.likesPerClap;
      if (reached) likeBase.current = e.totalLikes;
      say(room.like(e.likeCount, Date.now(), reached));
    },

    onControl: (c) => {
      if (c.action === 'setName' && c.text) setChannelName(c.text);
      const room = roomRef.current;
      if (!room) return;
      if (c.action === 'speak' && c.text) voice.say(c.text, true);
      if (c.action === 'setRate' && c.text) voice.rate = Number(c.text) || 1;
      if (c.action === 'reset' || (c.action === 'custom' && c.text === 'newRound')) {
        voice.stop();
        chatter.current = [];
        say(room.newRound(Date.now()));
      }
      if (c.action === 'custom' && c.text === 'skip') say(room.skip(Date.now()));
      if (c.action === 'custom' && c.text === 'ban') say(room.banCurrent(Date.now()));
      // chủ kênh tự bấm chúc sinh nhật: tên trùng bạn đang trong lớp thì bánh kem đặt lên bàn bạn đó
      if (c.action === 'custom' && c.text?.startsWith('birthday:')) {
        const name = c.text.slice(9).trim().slice(0, 40);
        const s = [...room.students.values()].find((x) => x.nickname.toLowerCase() === name.toLowerCase());
        if (name) say(room.celebrate(s ?? person({ username: `kenh:${name}`, nickname: name, avatar: '' }), Date.now()));
      }
      if (c.action === 'custom' && c.text?.startsWith('recess:')) say(room.forceRecess(c.text.slice(7) as RecessGame, Date.now()));
    },
  });

  // Mở trang stage: đọc sổ lớp (câu đã hỏi, bảng vàng tuần) rồi mới vào học
  useEffect(() => {
    if (!IS_STAGE) return;
    if (MUTED) {
      voice.volume = 0;
      sfx.volume = 0;
    }
    sfx.loadFiles();
    let prevView: StageView | null = null;
    let stop = false;
    const timers: ReturnType<typeof setInterval>[] = [];

    const save = async () => {
      const room = roomRef.current;
      if (!room) return;
      const used = room.usedLog.splice(0);
      const week = [...room.weekDelta].map(([username, v]) => ({ username, ...v }));
      room.weekDelta.clear();
      const banned = room.banLog.splice(0);
      const report = room.reportLog.splice(0);
      try {
        const r = await fetch('/api/game/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ used, week, banned, report }) });
        const d = await r.json();
        weekTop.current = d.weekTop ?? [];
        todayTop.current = d.todayTop ?? [];
        room.weekLeader = weekTop.current[0] ? speakableName(weekTop.current[0].nickname) : '';
      } catch {
        room.usedLog.unshift(...used); // server tắt: giữ lại, lần sau gửi
        for (const w of week) room.weekDelta.set(w.username, w);
        room.banLog.unshift(...banned);
        room.reportLog.unshift(...report);
      }
    };

    (async () => {
      // Tải cài đặt Quà & Điểm đã lưu trên server TRƯỚC khi tạo lớp học,
      // để tiết đầu tiên đã chạy đúng số chủ kênh đã chỉnh (lỗi thì giữ mặc định).
      try {
        await fetchGameSettings();
        talk.gifts.update(GAME.giftThanksCooldownMs, GAME.bigGiftCoins);
      } catch {
        // giữ mặc định trong config.ts
      }
      let used: Record<string, number> = {};
      let banned: string[] = [];
      try {
        const d = await (await fetch('/api/game/save')).json();
        used = d.used ?? {};
        banned = d.banned ?? [];
        weekTop.current = d.weekTop ?? [];
        todayTop.current = d.todayTop ?? [];
      } catch {
        // server cũ chưa có sổ: chơi bình thường, chỉ không nhớ câu đã hỏi
      }
      if (stop) return;
      const room = new Classroom(QUESTIONS, Date.now(), Math.random, used, banned);
      room.weekLeader = weekTop.current[0] ? speakableName(weekTop.current[0].nickname) : '';
      roomRef.current = room;
      say(room.newRound(Date.now()));

      // Nhịp game: 5 lần/giây đẩy đồng hồ, có đổi thì vẽ lại và gửi ảnh chụp cho trang điều khiển
      let lastSent = 0;
      let lastTick = Date.now();
      timers.push(
        setInterval(() => {
          const now = Date.now();
          // cô đang đọc câu chính: dừng đồng hồ (vd đọc đề xong mới đếm 20 giây)
          if (mainSpeaking.current > 0) {
            room.hold(now - lastTick);
            dirty.current = true;
          }
          lastTick = now;
          say(room.tick(now));
          flushChatter(room, now);
          sfx.clock(room.phase, room.boardShown, room.phaseEndsAt, now);
          if (!dirty.current && now - lastSent < 1000) return;
          dirty.current = false;
          const v = { ...room.view(now), weekTop: weekTop.current, todayTop: dayBoard(todayTop.current, room.weekDelta) };
          sfx.watch(prevView, v);
          prevView = v;
          setView(v);
          if (now - lastSent >= 400) {
            lastSent = now;
            fetch('/api/game/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }).catch(() => {});
          }
        }, 200),
        setInterval(() => say([room.share()]), GAME.shareReminderEveryMs),
        setInterval(save, 20_000),
        // Dự phòng khi SSE rớt: 60 giây tải lại cài đặt 1 lần (nhẹ, 1 request nhỏ)
        setInterval(() => {
          fetchGameSettings()
            .then(() => talk.gifts.update(GAME.giftThanksCooldownMs, GAME.bigGiftCoins))
            .catch(() => {});
        }, 60_000),
      );
    })();

    window.addEventListener('beforeunload', save);
    return () => {
      stop = true;
      timers.forEach(clearInterval);
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  return { status, view, lastGift, stageCount, channelName };
}

export type GameState = ReturnType<typeof useGame>;

// ['An', 'Bình', 'Chi'] -> 'bạn An, bạn Bình và bạn Chi'
function joinNames(names: string[]) {
  const spoken = names.map((n) => `bạn ${n}`);
  return spoken.length > 1 ? `${spoken.slice(0, -1).join(', ')} và ${spoken[spoken.length - 1]}` : spoken[0] ?? '';
}
