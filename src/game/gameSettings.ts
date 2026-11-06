import { GAME } from './config';

/**
 * Các số Quà & Điểm mà chủ kênh đổi được trên panel (mục "Quản lý — Quà & Điểm").
 * - Mặc định = đúng số trong config.ts (lấy trực tiếp từ GAME lúc module nạp, chưa ai đổi).
 * - Chủ kênh đổi thì server lưu vào data/game-settings.json; client tải về bằng
 *   GET /api/settings rồi gộp lên GAME (Object.assign) nên quiz.ts/Classroom thấy
 *   ngay giá trị mới cho các câu/quà tiếp theo, không cần build lại hay tải lại trang.
 * - giftThanksCooldownSec là giây (panel hiển thị giây); trong GAME lưu theo mili-giây.
 */
export interface GameSettings {
  hintGiftCoins: number;
  bigGiftCoins: number;
  giftGoalXu: number;
  giftHonorPoints: number;
  giftRecessPoints: number;
  musicVolume: number;
  likesPerClap: number;
  heartTarget: number;
  heartBoost: number;
  giftThanksCooldownSec: number;
  rankPoints: number[];
  latePoints: number;
  streakEvery: number;
  streakBonus: number;
  rpsPoints: number;
  callUpPoints: number;
  rollPoints: number;
  rollWinners: number;
}

export const GAME_SETTING_DEFAULTS: GameSettings = {
  hintGiftCoins: GAME.hintGiftCoins,
  bigGiftCoins: GAME.bigGiftCoins,
  giftGoalXu: GAME.giftGoalXu,
  giftHonorPoints: GAME.giftHonorPoints,
  giftRecessPoints: GAME.giftRecessPoints,
  musicVolume: GAME.musicVolume,
  likesPerClap: GAME.likesPerClap,
  heartTarget: GAME.heartTarget,
  heartBoost: GAME.heartBoost,
  giftThanksCooldownSec: GAME.giftThanksCooldownMs / 1000,
  rankPoints: [...GAME.rankPoints],
  latePoints: GAME.latePoints,
  streakEvery: GAME.streakEvery,
  streakBonus: GAME.streakBonus,
  rpsPoints: GAME.rpsPoints,
  callUpPoints: GAME.callUpPoints,
  rollPoints: GAME.rollPoints,
  rollWinners: GAME.rollWinners,
};

// Giới hạn hợp lý — server (server.ts, sanitizeGameSettings) validate y hệt.
const LIMITS: Record<string, [number, number]> = {
  hintGiftCoins: [1, 10000],
  bigGiftCoins: [1, 10000],
  giftGoalXu: [10, 100000],
  giftHonorPoints: [0, 100],
  giftRecessPoints: [0, 100],
  musicVolume: [0, 100],
  likesPerClap: [10, 100000],
  heartTarget: [10, 100000],
  heartBoost: [1, 100],
  giftThanksCooldownSec: [1, 300],
  latePoints: [0, 100],
  streakEvery: [2, 20],
  streakBonus: [0, 100],
  rpsPoints: [0, 100],
  callUpPoints: [0, 100],
  rollPoints: [0, 100],
  rollWinners: [1, 30],
};

const clampInt = (v: unknown, min: number, max: number): number | null => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

/** Chỉ giữ các key hợp lệ, số ngoài khoảng thì kẹp vào khoảng (giống server). */
export function sanitizeGameSettings(input: unknown): Partial<GameSettings> {
  if (!input || typeof input !== 'object') return {};
  const o = input as Record<string, unknown>;
  const out: Partial<GameSettings> = {};
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (o[key] === undefined) continue;
    const v = clampInt(o[key], min, max);
    if (v !== null) (out as Record<string, unknown>)[key] = v;
  }
  if (Array.isArray(o.rankPoints) && o.rankPoints.length === 10 && o.rankPoints.every((n) => Number.isFinite(Number(n)))) {
    out.rankPoints = o.rankPoints.map((n) => clampInt(n, 0, 100)!);
  }
  return out;
}

/** Gộp cài đặt lên GAME (đang chạy cũng áp dụng cho câu/quà tiếp theo). */
export function applyGameSettings(patch: Partial<GameSettings>) {
  const clean = sanitizeGameSettings(patch);
  const { giftThanksCooldownSec, ...rest } = clean;
  if (giftThanksCooldownSec !== undefined) GAME.giftThanksCooldownMs = giftThanksCooldownSec * 1000;
  Object.assign(GAME, rest);
}

/** Giá trị đang chạy (đọc từ GAME). */
export function currentGameSettings(): GameSettings {
  return {
    hintGiftCoins: GAME.hintGiftCoins,
    bigGiftCoins: GAME.bigGiftCoins,
    giftGoalXu: GAME.giftGoalXu,
    giftHonorPoints: GAME.giftHonorPoints,
    giftRecessPoints: GAME.giftRecessPoints,
    musicVolume: GAME.musicVolume,
    likesPerClap: GAME.likesPerClap,
    heartTarget: GAME.heartTarget,
    heartBoost: GAME.heartBoost,
    giftThanksCooldownSec: GAME.giftThanksCooldownMs / 1000,
    rankPoints: [...GAME.rankPoints],
    latePoints: GAME.latePoints,
    streakEvery: GAME.streakEvery,
    streakBonus: GAME.streakBonus,
    rpsPoints: GAME.rpsPoints,
    callUpPoints: GAME.callUpPoints,
    rollPoints: GAME.rollPoints,
    rollWinners: GAME.rollWinners,
  };
}

/** Tải cài đặt đã lưu trên server về rồi áp dụng lên GAME. */
export async function fetchGameSettings(): Promise<GameSettings> {
  const d = await (await fetch('/api/settings')).json();
  if (d?.data) applyGameSettings(d.data);
  return currentGameSettings();
}
