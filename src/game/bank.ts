import { parseBank } from './questions';

// Vite gom mọi file câu hỏi lúc chạy; thêm file .txt vào cau-hoi/ là tự có
const files = import.meta.glob('./cau-hoi/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const QUESTIONS = parseBank(files);
