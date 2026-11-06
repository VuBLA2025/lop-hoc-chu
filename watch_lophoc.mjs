#!/usr/bin/env node
// Canh live Lop Hoc Chu (lophoc.bla.io.vn) cho den khi het live.
// Nguon su kien: SSE GET /api/tiktok/events (chat/gift/member/follow/share/like/status/gamestate).
// Noi qua POST /api/control {action:'speak'} bang lophoc_say.py (lay PANEL_KEY tu Dokploy).
// Luu y: co giao trong game da tu noi khi co su kien (tra loi, tang qua, follow,
// vo tay du 300 tim), nen watcher ngoai nay noi THUA, ngan, cach nhau it nhat
// 45s, chi lam nhung viec game KHONG lam:
// - Share: game khong cam on theo ten -> watcher cam on (15 phut/lan).
// - Qua lon >= 30 xu: hoan ho them mot cau.
// - Chat: chi tra loi chao hoi / hoi cach choi / goi co (10 phut/nguoi).
//   Dap an quiz thi game tu xu ly, watcher khong chen vao.
// - Moi 5 phut: nhac cach choi (dap an, thang qua 5/10/20/30 xu,
//   vo tay 300 tim, diem chuyen can).
// - Het live (mat ket noi qua 60s): in TOM TAT roi thoat. Toi da 6 gio.
import { execFile } from 'node:child_process';

const SAY = '/home/hatch/workspace/lop-hoc-chu-deploy/lophoc_say.py';
const startedAt = Date.now();
let wasLive = false;
let startLikes = 0;
let maxViewers = 0;
let lastLikes = 0;
let sharesThanked = [];
let follows = 0;
let gifts = 0;
let giftXu = 0;
let joins = 0;
let reminders = 0;
let chats = [];
let chatReplies = 0;
let lastShareThanks = new Map();
let lastChatReply = new Map();
let likesByUser = new Map();
let lastSayAt = 0;
let greeted = false;
let endTimer = null;
let lastQuestion = '';
let questionsSeen = 0;

const REMINDERS = [
  'Các bạn nhỏ ơi, cô đang hỏi rồi đấy, gõ đáp án vào chat nhé, ai trả lời nhanh nhất được nhiều điểm nhất!',
  'Tặng quà 5 xu là cô gọi tên cảm ơn, 10 xu cô mở 1 chữ, 20 xu mở 2 chữ, 30 xu cô khen to và cộng 5 điểm danh dự, đủ 30 xu cả lớp mở câu vàng nhé!',
  'Thả tim đủ 300 là cả lớp cùng vỗ tay, các bạn nhớ thả tim và follow lớp nhé!',
  'Bạn nào mới vào thì chào cô một tiếng nhé, comment là có tên trong lớp, đi học đều được điểm chuyên cần!',
];

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function say(text) {
  const wait = 45000 - (Date.now() - lastSayAt);
  if (wait > 0) await sleep(wait);
  lastSayAt = Date.now();
  return new Promise((resolve) => {
    execFile('python3', [SAY, text], (err, stdout, stderr) => {
      if (err) console.log(`[${ts()}] SAY LOI:`, (stderr || err.message).slice(0, 2000));
      else console.log(`[${ts()}] DA DOC: ${text}`);
      resolve(!err);
    });
  });
}
function ts() {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function summary() {
  console.log('=== TOM TAT CANH LOP HOC ===');
  console.log(JSON.stringify({
    watchedMin: Math.round((Date.now() - startedAt) / 60000),
    startLikes, lastLikes, likesGained: lastLikes - startLikes, maxViewers,
    sharesThanked, follows, gifts, giftXu, joins, reminders,
    chats: chats.slice(-30), chatReplies,
    questionsSeen,
    topLikers: [...likesByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  }, null, 2));
}
function finish(reason) {
  console.log(`[${ts()}] ${reason}`);
  clearInterval(remTimer);
  summary();
  process.exit(0);
}

async function onStatus(s) {
  if (!s) return;
  if (typeof s.totalLikes === 'number' && s.totalLikes > lastLikes) lastLikes = s.totalLikes;
  if (typeof s.viewerCount === 'number') maxViewers = Math.max(maxViewers, s.viewerCount);
  if (s.isConnected) {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; }
    if (!wasLive) {
      wasLive = true; startLikes = lastLikes;
      console.log(`[${ts()}] LIVE BAT DAU/CONFIRM: @${s.username} viewers=${s.viewerCount} likes=${s.totalLikes}`);
    }
    if (!greeted) {
      greeted = true;
      await say('Xin chào cả lớp đã đến với Lớp Học Chữ! Mời các bạn nhỏ vào lớp, gõ đáp án vào chat để thi với cô nhé, ai nhanh nhất được nhiều điểm nhất!');
    }
  } else if (wasLive && !endTimer) {
    console.log(`[${ts()}] MAT KET NOI LIVE, doi 60s xem co noi lai khong...`);
    endTimer = setTimeout(async () => {
      try {
        const r = await fetch('https://lophoc.bla.io.vn/api/tiktok/status');
        const j = await r.json();
        if (j?.data?.isConnected) { endTimer = null; return; }
      } catch {}
      finish('LIVE DA KET THUC');
    }, 60000);
  }
}

async function onEvent(type, data) {
  const name = data?.nickname || data?.username || 'bạn';
  if (type === 'status') return onStatus(data);
  if (type === 'gamestate') {
    const q = `${data?.phase || ''}#${data?.round || ''}/${data?.qNo || ''}`;
    if (q !== lastQuestion) {
      lastQuestion = q;
      if (data?.phase === 'question') questionsSeen += 1;
      console.log(`[${ts()}] CAU HOI: vong ${data?.round} cau ${data?.qNo}/${data?.total}${data?.golden ? ' (VONG VANG)' : ''} players=${data?.players ?? '?'}`);
    }
    return;
  }
  if (type === 'chat') {
    const text = String(data?.comment || data?.text || '').trim();
    if (!text) return;
    chats.push(`${name}: ${text}`);
    if (chats.length > 200) chats.shift();
    console.log(`[${ts()}] CHAT: ${name}: ${text}`);
    if (!wasLive) return;
    const key = data?.username || name;
    if (Date.now() - (lastChatReply.get(key) || 0) < 10 * 60 * 1000) return;
    const t = norm(text);
    let reply = '';
    if (t.includes('cach choi') || t.includes('choi sao') || t.includes('luat') || t.includes('huong dan') || t.includes('thi sao') || t.includes('lam sao')) {
      reply = `${name} ơi, cô đọc câu hỏi rồi các bạn gõ đáp án vào chat nhé, ai nhanh nhất được nhiều điểm nhất, tặng 10 xu là cô mở chữ gợi ý cho cả lớp đấy!`;
    } else if (t.includes('co oi') || t === 'co' || t.includes('chao co')) {
      reply = `Cô chào ${name} nhé, vào lớp ngồi ngay ngắn nào, câu hỏi tiếp theo sắp tới rồi!`;
    } else if (t.includes('chao') || t.startsWith('hello') || t === 'hi' || t.includes('xin chao')) {
      reply = `Chào ${name} đã đến lớp học, mời bạn gõ đáp án vào chat để thi với cô nhé!`;
    }
    if (!reply) return;
    lastChatReply.set(key, Date.now());
    chatReplies += 1;
    await say(reply);
  } else if (type === 'gift') {
    gifts += 1;
    const xu = (data?.diamondCount || 0) * (data?.repeatCount || 1);
    giftXu += xu;
    console.log(`[${ts()}] GIFT: ${name} - ${data?.giftName} x${data?.repeatCount || 1} (${xu} xu)`);
    if (!wasLive) return;
    if (xu >= 30) {
      await say(`Hoan hô! Cảm ơn ${name} đã tặng ${data?.giftName}, ${xu} xu, quà lớn của lớp! Cô cảm ơn bạn nhiều lắm, cả lớp vỗ tay nào!`);
    }
  } else if (type === 'share') {
    const key = data?.username || name;
    if (Date.now() - (lastShareThanks.get(key) || 0) < 15 * 60 * 1000) return;
    lastShareThanks.set(key, Date.now());
    sharesThanked.push(name);
    console.log(`[${ts()}] SHARE: ${name}`);
    if (wasLive) await say(`Cảm ơn ${name} đã chia sẻ lớp học! Rủ thêm bạn bè vào thi với lớp mình nhé, lớp đông mới vui!`);
  } else if (type === 'follow') {
    follows += 1;
    console.log(`[${ts()}] FOLLOW: ${name}`);
  } else if (type === 'member') {
    joins += 1;
    console.log(`[${ts()}] JOIN: ${name}`);
  } else if (type === 'like') {
    const key = data?.username || name;
    likesByUser.set(key, (likesByUser.get(key) || 0) + (data?.likeCount || 1));
    if (typeof data?.totalLikes === 'number' && data.totalLikes > lastLikes) lastLikes = data.totalLikes;
  } else if (type === 'roomUser') {
    if (typeof data?.viewerCount === 'number') maxViewers = Math.max(maxViewers, data.viewerCount);
  }
}

async function runSSE() {
  console.log('Canh Lop Hoc bat dau — doi live...');
  while (true) {
    try {
      const res = await fetch('https://lophoc.bla.io.vn/api/tiktok/events');
      if (!res.ok || !res.body) throw new Error(`SSE HTTP ${res.status}`);
      console.log(`[${ts()}] SSE connected`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let curEvent = 'message';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let dataStr = '';
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event:')) curEvent = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          }
          if (dataStr) {
            try { await onEvent(curEvent, JSON.parse(dataStr)); } catch (e) { console.log(`[${ts()}] EVENT LOI:`, String(e).slice(0, 150)); }
          }
          curEvent = 'message';
        }
      }
      console.log(`[${ts()}] SSE dong, noi lai sau 5s...`);
    } catch (e) {
      console.log(`[${ts()}] SSE LOI:`, String(e).slice(0, 200), '— thu lai sau 5s');
    }
    await sleep(5000);
  }
}

let remIdx = 0;
const remTimer = setInterval(async () => {
  if (!wasLive) return;
  reminders += 1;
  await say(REMINDERS[remIdx++ % REMINDERS.length]);
}, 5 * 60 * 1000);

setTimeout(() => finish('Het 6 gio canh, dung va tong ket.'), 6 * 60 * 60 * 1000);

runSSE();
