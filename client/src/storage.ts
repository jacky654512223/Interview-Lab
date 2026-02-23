/**
 * 本地持久化：从开始就记录每轮会话，支持中途保存退出、从历史继续答题
 */
const KEY_RESUME = 'interview-lab-resume';
const KEY_TRAINING = 'interview-lab-training';
const KEY_SESSIONS = 'interview-lab-sessions';
const KEY_CURRENT_SESSION_ID = 'interview-lab-current-session-id';

// 兼容旧版完成记录
const KEY_HISTORY = 'interview-lab-history';

export interface SavedResume {
  text: string;
  fileName: string;
  updatedAt: number;
}

export interface SavedTrainingState {
  questions: unknown[];
  index: number;
  answers: Record<number, string>;
  feedbackHistory: unknown[];
  job: string | null;
  companyStyle: string | null;
  questionBank: { company: string; position: string; stage: string; name: string } | null;
  resumeText?: string;
  updatedAt: number;
}

/** 会话：进行中或已完成 */
export interface SessionItem {
  id: string;
  status: 'in_progress' | 'completed';
  startedAt: number;
  updatedAt: number;
  // 进行中时有题目与进度
  questions?: unknown[];
  index?: number;
  answers?: Record<number, string>;
  feedbackHistory?: unknown[];
  job?: string | null;
  companyStyle?: string | null;
  questionBank?: { company: string; position: string; stage: string; name: string } | null;
  // 已完成时有总结
  score?: number;
  scoreDesc?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  questionBankName?: string;
  questionCount?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  score: number;
  scoreDesc: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  job: string | null;
  questionBankName: string;
  questionCount: number;
}

function readJson(key: string, defaultVal: unknown = null): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (_) {
    return defaultVal;
  }
}

function writeJson(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
}

// ---------- 简历 ----------
export function saveResume(text: string, fileName: string): void {
  writeJson(KEY_RESUME, { text, fileName, updatedAt: Date.now() });
}

export function getResume(): SavedResume | null {
  const data = readJson(KEY_RESUME) as SavedResume | null;
  return data?.text ? data : null;
}

// ---------- 当前训练状态（用于刷新恢复）----------
export function saveTrainingState(state: SavedTrainingState): void {
  writeJson(KEY_TRAINING, { ...state, updatedAt: Date.now() });
}

export function getTrainingState(): SavedTrainingState | null {
  const data = readJson(KEY_TRAINING) as SavedTrainingState | null;
  return data?.questions?.length ? data : null;
}

export function clearTrainingState(): void {
  try {
    localStorage.removeItem(KEY_TRAINING);
    localStorage.removeItem(KEY_CURRENT_SESSION_ID);
  } catch (_) {}
}

// ---------- 会话列表（从开始就记录，可进行中可已完成）----------
function getSessionsRaw(): SessionItem[] {
  const data = readJson(KEY_SESSIONS);
  if (Array.isArray(data)) return data as SessionItem[];
  // 兼容旧版：把 KEY_HISTORY 里的已完成记录转成 SessionItem
  const old = readJson(KEY_HISTORY) as HistoryItem[] | null;
  if (Array.isArray(old) && old.length > 0) {
    const converted: SessionItem[] = old.map((h) => ({
      id: h.id,
      status: 'completed' as const,
      startedAt: h.timestamp,
      updatedAt: h.timestamp,
      score: h.score,
      scoreDesc: h.scoreDesc,
      strengths: h.strengths,
      weaknesses: h.weaknesses,
      suggestions: h.suggestions,
      job: h.job,
      questionBankName: h.questionBankName,
      questionCount: h.questionCount,
    }));
    writeJson(KEY_SESSIONS, converted);
    try {
      localStorage.removeItem(KEY_HISTORY);
    } catch (_) {}
    return converted;
  }
  return [];
}

export function getSessions(): SessionItem[] {
  const list = getSessionsRaw();
  const inProgress = list.filter((s) => s.status === 'in_progress');
  const completed = list.filter((s) => s.status === 'completed').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return [...inProgress, ...completed].slice(0, 50);
}

/** 创建新会话（进入训练页时调用） */
export function createSession(state: SavedTrainingState): string {
  const id = `session-${Date.now()}`;
  const now = Date.now();
  const item: SessionItem = {
    id,
    status: 'in_progress',
    startedAt: now,
    updatedAt: now,
    questions: state.questions,
    index: state.index,
    answers: state.answers,
    feedbackHistory: state.feedbackHistory,
    job: state.job,
    companyStyle: state.companyStyle,
    questionBank: state.questionBank,
  };
  const list = getSessionsRaw();
  list.unshift(item);
  if (list.length > 50) list.length = 50;
  writeJson(KEY_SESSIONS, list);
  writeJson(KEY_CURRENT_SESSION_ID, id);
  return id;
}

/** 更新会话（保存并退出 或 答题过程中同步） */
export function updateSession(sessionId: string, state: Partial<SavedTrainingState>): void {
  const list = getSessionsRaw();
  const idx = list.findIndex((s) => s.id === sessionId);
  if (idx < 0) return;
  const now = Date.now();
  list[idx] = {
    ...list[idx],
    ...state,
    updatedAt: now,
  };
  writeJson(KEY_SESSIONS, list);
}

/** 将会话标记为已完成（生成总结后调用） */
export function markSessionCompleted(
  sessionId: string,
  summary: {
    score: number;
    scoreDesc: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    job: string | null;
    questionBankName: string;
    questionCount: number;
  }
): void {
  const list = getSessionsRaw();
  const idx = list.findIndex((s) => s.id === sessionId);
  if (idx < 0) return;
  const now = Date.now();
  list[idx] = {
    ...list[idx],
    status: 'completed',
    updatedAt: now,
    score: summary.score,
    scoreDesc: summary.scoreDesc,
    strengths: summary.strengths,
    weaknesses: summary.weaknesses,
    suggestions: summary.suggestions,
    job: summary.job,
    questionBankName: summary.questionBankName,
    questionCount: summary.questionCount,
  };
  writeJson(KEY_SESSIONS, list);
}

export function getCurrentSessionId(): string | null {
  return localStorage.getItem(KEY_CURRENT_SESSION_ID);
}

/** 从历史进入某会话继续答题：把该会话写入 KEY_TRAINING 并设为当前会话 */
export function loadSessionIntoTraining(sessionId: string): boolean {
  const list = getSessionsRaw();
  const session = list.find((s) => s.id === sessionId && s.status === 'in_progress');
  if (!session?.questions?.length) return false;
  const state: SavedTrainingState = {
    questions: session.questions,
    index: session.index ?? 0,
    answers: session.answers ?? {},
    feedbackHistory: session.feedbackHistory ?? [],
    job: session.job ?? null,
    companyStyle: session.companyStyle ?? null,
    questionBank: session.questionBank ?? null,
    updatedAt: Date.now(),
  };
  saveTrainingState(state);
  writeJson(KEY_CURRENT_SESSION_ID, sessionId);
  return true;
}

/** 兼容：完成一轮后仍写入旧格式，供需要处使用 */
export function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
  const list = getSessionsRaw();
  const completed = list.filter((s) => s.status === 'completed');
  const newItem: HistoryItem = {
    ...item,
    id: `session-${Date.now()}`,
    timestamp: Date.now(),
  };
  completed.unshift(newItem as unknown as SessionItem);
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    const oldList = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    oldList.unshift(newItem);
    if (oldList.length > 50) oldList.length = 50;
    localStorage.setItem(KEY_HISTORY, JSON.stringify(oldList));
  } catch (_) {}
}

export function getHistory(): HistoryItem[] {
  const sessions = getSessionsRaw().filter((s) => s.status === 'completed');
  return sessions.map((s) => ({
    id: s.id,
    timestamp: s.updatedAt || 0,
    score: s.score || 0,
    scoreDesc: s.scoreDesc || '',
    strengths: s.strengths || [],
    weaknesses: s.weaknesses || [],
    suggestions: s.suggestions || [],
    job: s.job ?? null,
    questionBankName: s.questionBankName || '',
    questionCount: s.questionCount || 0,
  }));
}
