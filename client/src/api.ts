import type { QuestionItem, OptimizeResult, QuestionBankItem, QuestionBankInfo } from './types';
import { getToken } from './auth';

const API = '/api';

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function uploadResume(file: File): Promise<{ text: string; filename: string }> {
  const form = new FormData();
  form.append('resume', file);
  const res = await fetch(`${API}/parse-resume`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

export async function fetchQuestionBankList(): Promise<{ list: QuestionBankItem[] }> {
  const res = await fetch(`${API}/question-bank`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '获取真题库失败');
  }
  return res.json();
}

export async function fetchQuestions(
  resumeText: string,
  job: string | null,
  companyStyle: string | null,
  useQuestionBank = false,
  questionBankInfo: QuestionBankInfo | null = null
): Promise<{ questions: QuestionItem[]; questionBank?: QuestionBankInfo }> {
  const res = await fetch(`${API}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText,
      job,
      companyStyle,
      useQuestionBank,
      questionBankInfo,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '生成问题失败');
  }
  return res.json();
}

export async function optimizeAnswer(
  question: string,
  answer: string,
  questionCategory: string,
  job: string
): Promise<OptimizeResult> {
  const res = await fetch(`${API}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, questionCategory, job }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '优化分析失败');
  }
  return res.json();
}

export async function fetchFollowUpQuestion(
  projectAnswer: string,
  direction: string
): Promise<{ question: string }> {
  const res = await fetch(`${API}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectAnswer, direction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '生成追问失败');
  }
  return res.json();
}

export interface SessionSummaryResult {
  score: number;
  scoreDesc: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export async function fetchMe(): Promise<{ resume: { text: string; fileName: string } | null; sessions: unknown[] }> {
  const res = await fetch(`${API}/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('请先登录');
  return res.json();
}

export async function saveResumeToServer(text: string, fileName: string): Promise<void> {
  const res = await fetch(`${API}/me/resume`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ text, fileName }),
  });
  if (!res.ok) throw new Error('保存简历失败');
}

export async function saveSessionToServer(session: {
  score: number;
  scoreDesc: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  job: string | null;
  questionBankName: string;
  questionCount: number;
}): Promise<void> {
  const res = await fetch(`${API}/me/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error('保存记录失败');
}

export async function fetchSessionSummary(
  feedbackHistory: { question: string; category: string; feedback: unknown }[],
  job: string,
  questionBankName: string
): Promise<SessionSummaryResult> {
  const res = await fetch(`${API}/session-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feedbackHistory,
      job: job || '',
      questionBankName: questionBankName || '',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '生成总结失败');
  }
  return res.json();
}
