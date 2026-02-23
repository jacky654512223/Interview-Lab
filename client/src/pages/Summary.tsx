import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchSessionSummary, type SessionSummaryResult } from '../api';
import { saveHistoryItem, markSessionCompleted } from '../storage';
import { isLoggedIn } from '../auth';
import { saveSessionToServer } from '../api';
import type { OptimizeResult } from '../types';

export interface FeedbackHistoryItem {
  questionIndex: number;
  question: string;
  category: string;
  feedback: OptimizeResult;
}

export default function Summary() {
  const { state } = useLocation() as {
    state?: {
      feedbackHistory: FeedbackHistoryItem[];
      questions: { length: number };
      job: string | null;
      questionBank: { company: string; name: string } | null;
      sessionId?: string;
    };
  };
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SessionSummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const feedbackHistory = state?.feedbackHistory || [];
  const job = state?.job || '';
  const questionBank = state?.questionBank;
  const questionBankName = questionBank ? `${questionBank.company} - ${questionBank.name}` : '';
  const sessionId = state?.sessionId;

  const savedRef = useRef(false);
  useEffect(() => {
    const payload = feedbackHistory.map((item) => ({
      question: item.question,
      category: item.category,
      feedback: item.feedback,
    }));
    fetchSessionSummary(payload, job, questionBankName)
      .then((result) => {
        setSummary(result);
        if (!savedRef.current && result) {
          savedRef.current = true;
          const item = {
            score: result.score,
            scoreDesc: result.scoreDesc,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            suggestions: result.suggestions,
            job,
            questionBankName,
            questionCount: feedbackHistory.length,
          };
          if (sessionId) {
            markSessionCompleted(sessionId, item);
          } else {
            saveHistoryItem(item);
          }
          if (isLoggedIn()) {
            saveSessionToServer(item).catch(() => {});
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : '生成总结失败'))
      .finally(() => setLoading(false));
  }, [feedbackHistory, job, questionBankName]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.loadingText}>正在生成本轮面试总结，请稍候…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.error}>{error}</p>
          <button style={styles.primaryBtn} onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p>暂无总结数据</p>
          <button style={styles.primaryBtn} onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  const scoreColor = summary.score >= 80 ? '#16a34a' : summary.score >= 60 ? '#ca8a04' : '#dc2626';

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>本轮面试总结</h1>
      <div style={styles.card}>
        <div style={styles.scoreSection}>
          <span style={{ ...styles.score, color: scoreColor }}>{summary.score}</span>
          <span style={styles.scoreUnit}>分</span>
        </div>
        <p style={styles.scoreDesc}>{summary.scoreDesc}</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>你的优势</h2>
          <ul style={styles.list}>
            {summary.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            {summary.strengths.length === 0 && <li style={styles.empty}>本轮反馈中暂无突出优势，多练习会更好</li>}
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>待改进之处</h2>
          <ul style={styles.list}>
            {summary.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {summary.weaknesses.length === 0 && <li style={styles.empty}>本轮反馈中暂无明显不足</li>}
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>优化建议</h2>
          <ul style={styles.list}>
            {summary.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>

        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={() => navigate('/')}>
            返回首页，继续练习
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate('/history')}>
            查看历史记录
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 600, margin: '0 auto', padding: 24 },
  title: { fontSize: 22, fontWeight: 600, marginBottom: 24, textAlign: 'center' },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  loadingText: { textAlign: 'center', color: '#666' },
  error: { color: '#dc2626', marginBottom: 16 },
  scoreSection: { textAlign: 'center', marginBottom: 12 },
  score: { fontSize: 48, fontWeight: 700 },
  scoreUnit: { fontSize: 20, color: '#666', marginLeft: 4 },
  scoreDesc: { textAlign: 'center', color: '#555', marginBottom: 28 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 10, color: '#1a1a1a' },
  list: { margin: 0, paddingLeft: 20, lineHeight: 1.8, color: '#333' },
  empty: { color: '#888' },
  actions: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 },
  primaryBtn: {
    width: '100%',
    padding: 14,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%',
    padding: 12,
    background: '#f0f0f0',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    cursor: 'pointer',
  },
};
