import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { optimizeAnswer, fetchFollowUpQuestion } from '../api';
import { isSpeechRecognitionSupported, startSpeechRecognition, stopSpeechRecognition } from '../useSpeechRecognition';
import {
  getTrainingState,
  saveTrainingState,
  clearTrainingState,
  createSession,
  updateSession,
  getCurrentSessionId,
} from '../storage';
import type { QuestionItem, OptimizeResult, QuestionBankInfo } from '../types';
import { FOLLOW_UP_LABELS } from '../types';
import type { FeedbackHistoryItem } from './Summary';

type TrainingData = {
  questions: QuestionItem[];
  job: string;
  questionBank: QuestionBankInfo | null;
  companyStyle: string | null;
  index: number;
  answers: Record<number, string>;
  feedbackHistory: FeedbackHistoryItem[];
};

function getInitialTrainingData(locationState: unknown): TrainingData {
  const s = locationState as {
    questions?: QuestionItem[];
    job?: string | null;
    companyStyle?: string | null;
    questionBank?: QuestionBankInfo | null;
  } | undefined;
  if (s?.questions?.length) {
    return {
      questions: s.questions,
      job: s.job ?? '',
      questionBank: s.questionBank ?? null,
      companyStyle: s.companyStyle ?? null,
      index: 0,
      answers: {},
      feedbackHistory: [],
    };
  }
  const saved = getTrainingState();
  if (saved?.questions?.length) {
    return {
      questions: saved.questions as QuestionItem[],
      job: saved.job ?? '',
      questionBank: saved.questionBank ?? null,
      companyStyle: saved.companyStyle ?? null,
      index: saved.index ?? 0,
      answers: saved.answers ?? {},
      feedbackHistory: (saved.feedbackHistory ?? []) as FeedbackHistoryItem[],
    };
  }
  return {
    questions: [],
    job: '',
    questionBank: null,
    companyStyle: null,
    index: 0,
    answers: {},
    feedbackHistory: [],
  };
}

export default function Training() {
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  const [trainingData, setTrainingData] = useState<TrainingData>(() => getInitialTrainingData(locationState));
  const [sessionId, setSessionId] = useState<string | null>(() => getCurrentSessionId());
  const { questions, job, questionBank, index, answers, feedbackHistory } = trainingData;
  const answer = answers[index] ?? '';

  // 从首页进入时创建新会话记录（从开始就保留）；从历史继续则已有 sessionId
  useEffect(() => {
    const fromNav = (locationState as { questions?: unknown[] })?.questions?.length;
    if (fromNav && questions.length > 0 && !getCurrentSessionId()) {
      const id = createSession({
        questions,
        index,
        answers,
        feedbackHistory,
        job,
        companyStyle: trainingData.companyStyle,
        questionBank,
        updatedAt: Date.now(),
      });
      setSessionId(id);
    }
  }, []);

  // 有当前会话时，定期同步进度到会话记录
  useEffect(() => {
    if (!sessionId || questions.length === 0) return;
    updateSession(sessionId, {
      questions,
      index,
      answers,
      feedbackHistory,
      job,
      companyStyle: trainingData.companyStyle,
      questionBank,
      updatedAt: Date.now(),
    });
  }, [sessionId, questions.length, index, answers, feedbackHistory, job, questionBank, trainingData.companyStyle]);

  const setAnswer = useCallback((value: string) => {
    setTrainingData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [prev.index]: value },
    }));
  }, []);

  const setIndex = useCallback((updater: (i: number) => number) => {
    setTrainingData((prev) => ({ ...prev, index: updater(prev.index) }));
  }, []);

  const setFeedbackHistory = useCallback((updater: (h: FeedbackHistoryItem[]) => FeedbackHistoryItem[]) => {
    setTrainingData((prev) => ({ ...prev, feedbackHistory: updater(prev.feedbackHistory) }));
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      saveTrainingState({
        questions,
        index,
        answers,
        feedbackHistory,
        job,
        companyStyle: trainingData.companyStyle,
        questionBank,
        updatedAt: 0,
      });
    }
  }, [questions.length, index, answers, feedbackHistory, job, questionBank, trainingData.companyStyle]);

  const [feedback, setFeedback] = useState<OptimizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackCollapsed, setFeedbackCollapsed] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [followUpFeedback, setFollowUpFeedback] = useState<OptimizeResult | null>(null);
  const [followUpFeedbackLoading, setFollowUpFeedbackLoading] = useState(false);
  const [showLogicBreakdown, setShowLogicBreakdown] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const speechStartAnswerRef = useRef('');
  const voiceQuestionIndexRef = useRef(0);

  const current = questions[index];
  const isLastQuestion = index >= questions.length - 1;
  const isProjectQuestion = current?.category === '项目拆解题';
  const showDeepDive = isProjectQuestion && feedback != null;

  const handleSubmit = async () => {
    if (!current || !answer.trim()) return;
    setFeedbackError('');
    setFeedback(null);
    setFollowUpQuestion('');
    setFollowUpFeedback(null);
    setFollowUpAnswer('');
    setFeedbackCollapsed(false);
    setLoading(true);
    try {
      const result = await optimizeAnswer(current.question, answer.trim(), current.category, job || '');
      setFeedback(result);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : '优化分析失败');
    } finally {
      setLoading(false);
    }
  };

  const clearTransientState = () => {
    setFeedback(null);
    setFeedbackError('');
    setFollowUpQuestion('');
    setFollowUpFeedback(null);
    setFollowUpAnswer('');
    setFeedbackCollapsed(false);
  };

  const goToSummary = (history: FeedbackHistoryItem[]) => {
    if (sessionId) {
      updateSession(sessionId, {
        questions,
        index,
        answers,
        feedbackHistory: history,
        job,
        companyStyle: trainingData.companyStyle,
        questionBank,
        updatedAt: Date.now(),
      });
    }
    clearTrainingState();
    setSessionId(null);
    navigate('/summary', {
      state: {
        feedbackHistory: history,
        questions: { length: questions.length },
        job: job || null,
        questionBank: questionBank || null,
        sessionId: sessionId || undefined,
      },
    });
  };

  const handleSaveAndExit = () => {
    if (sessionId) {
      updateSession(sessionId, {
        questions,
        index,
        answers,
        feedbackHistory,
        job,
        companyStyle: trainingData.companyStyle,
        questionBank,
        updatedAt: Date.now(),
      });
    }
    clearTrainingState();
    setSessionId(null);
    navigate('/history');
  };

  const handleNextQuestion = () => {
    const nextHistory = [...feedbackHistory];
    if (current && feedback) {
      nextHistory.push({
        questionIndex: index,
        question: current.question,
        category: current.category,
        feedback,
      });
    }
    clearTransientState();
    if (isLastQuestion) {
      setTrainingData((prev) => ({ ...prev, feedbackHistory: nextHistory }));
      goToSummary(nextHistory);
      return;
    }
    setTrainingData((prev) => ({
      ...prev,
      index: prev.index + 1,
      answers: { ...prev.answers, [prev.index]: answer },
      feedbackHistory: nextHistory,
    }));
  };

  const handleSkip = () => {
    clearTransientState();
    if (isLastQuestion) {
      goToSummary(feedbackHistory);
      return;
    }
    setTrainingData((prev) => ({
      ...prev,
      index: Math.min(prev.index + 1, questions.length - 1),
    }));
  };

  const handleFollowUp = async (direction: string) => {
    if (!answer.trim()) return;
    setFollowUpFeedback(null);
    setFollowUpAnswer('');
    setFollowUpLoading(true);
    setFollowUpQuestion('');
    try {
      const { question } = await fetchFollowUpQuestion(answer.trim(), direction);
      setFollowUpQuestion(question);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : '生成追问失败');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleVoiceInput = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setSpeechError('当前浏览器不支持语音输入，请使用 Chrome 或 Edge');
      return;
    }
    setSpeechError('');
    if (isListening) {
      stopSpeechRecognition();
      setIsListening(false);
      return;
    }
    speechStartAnswerRef.current = answer;
    voiceQuestionIndexRef.current = index;
    startSpeechRecognition({
      lang: 'zh-CN',
      onResult: (text) => {
        const base = speechStartAnswerRef.current;
        const newVal = base ? base + ' ' + text : text;
        setTrainingData((prev) => ({
          ...prev,
          answers: { ...prev.answers, [voiceQuestionIndexRef.current]: newVal },
        }));
      },
      onError: (msg) => {
        setSpeechError(msg);
        setIsListening(false);
      },
      onEnd: () => setIsListening(false),
    });
    setIsListening(true);
  }, [isListening, answer, index]);

  const handleSubmitFollowUpAnswer = async () => {
    if (!followUpQuestion || !followUpAnswer.trim()) return;
    setFollowUpFeedbackLoading(true);
    setFollowUpFeedback(null);
    try {
      const result = await optimizeAnswer(followUpQuestion, followUpAnswer.trim(), '项目深挖追问', job);
      setFollowUpFeedback(result);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : '优化分析失败');
    } finally {
      setFollowUpFeedbackLoading(false);
    }
  };

  if (!questions.length) {
    return (
      <div style={styles.page}>
        <p>暂无题目，请从首页开始训练。</p>
        <button style={styles.linkBtn} onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <span style={styles.progress}>当前题数：{index + 1} / {questions.length}</span>
          {questionBank && (
            <span style={styles.bankTag}>
              {questionBank.company} - {questionBank.name}
            </span>
          )}
          {!questionBank && job && (
            <span style={styles.jobTag}>岗位：{job}</span>
          )}
        </div>
        <div style={styles.headerBtns}>
          <button type="button" style={styles.saveExitBtn} onClick={handleSaveAndExit}>
            保存并退出
          </button>
          <button type="button" style={styles.linkBtn} onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.qTitle}>{current.category}</h2>
        <p style={styles.question}>{current.question}</p>
        <p style={styles.meta}><strong>为什么会被问：</strong>{current.whyAsked}</p>
        <p style={styles.meta}><strong>对应考察能力：</strong>{current.ability}</p>

        {/* 底层逻辑拆解：开关控制是否显示，帮助理解出题意图与回答模版 */}
        <div style={styles.logicBreakdownRow}>
          <span style={styles.logicBreakdownLabel}>底层逻辑拆解</span>
          <label style={styles.switchWrap}>
            <input
              type="checkbox"
              checked={showLogicBreakdown}
              onChange={(e) => setShowLogicBreakdown(e.target.checked)}
              style={styles.switchInput}
            />
            <span style={{ ...styles.switchSlider, background: showLogicBreakdown ? '#2563eb' : '#ccc' }} />
            <span style={{ ...styles.switchThumb, left: showLogicBreakdown ? 22 : 2 }} />
          </label>
          <span style={styles.switchHint}>{showLogicBreakdown ? '提示开启' : '提示关闭（更贴近真实面试）'}</span>
        </div>
        {showLogicBreakdown && current.logicBreakdown && (
          <div style={styles.logicBreakdownBox}>
            <p style={styles.logicBreakdownTitle}>面试官意图</p>
            <p style={styles.logicBreakdownText}>{current.logicBreakdown.intent}</p>
            <p style={styles.logicBreakdownTitle}>建议回答模版</p>
            <p style={styles.logicBreakdownText}>{current.logicBreakdown.template}</p>
          </div>
        )}

        <textarea
          placeholder="请输入你的回答（可简洁表述，后续将优化）"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={5}
          style={styles.textarea}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {isSpeechRecognitionSupported() ? (
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={loading}
              style={{
                ...styles.secondaryBtn,
                background: isListening ? 'var(--danger, #c53030)' : undefined,
                color: isListening ? '#fff' : undefined,
              }}
            >
              {isListening ? '正在听… 点击结束' : '语音输入'}
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>语音输入需使用 Chrome / Edge</span>
          )}
          {speechError && <span style={{ fontSize: 12, color: 'var(--danger, #c53030)' }}>{speechError}</span>}
        </div>
        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span>
                <span style={styles.loadingDot}>●</span> 正在分析（约 15-30 秒）...
              </span>
            ) : (
              '提交回答'
            )}
          </button>
          <button style={styles.secondaryBtn} onClick={handleSkip} disabled={loading}>跳过本题</button>
        </div>
        {loading && <p style={styles.loadingHint}>请稍候…</p>}
      </div>

      {feedbackError && <p style={styles.error}>{feedbackError}</p>}

      {feedback != null && (
        <div style={styles.feedbackSection}>
          <button
            style={styles.collapseBtn}
            onClick={() => setFeedbackCollapsed((c) => !c)}
          >
            {feedbackCollapsed ? '展开优化反馈' : '折叠反馈'}
          </button>
          {!feedbackCollapsed && (
            <>
              <h3 style={styles.feedbackTitle}>优化反馈</h3>
              <div style={styles.layer}>
                <h4>一、结构评分</h4>
                <ul style={styles.structureList}>
                  {Object.entries(feedback.structure || {}).map(([k, v]) => (
                    <li key={k}>{k}：{v}</li>
                  ))}
                </ul>
              </div>
              <div style={styles.layer}>
                <h4>二、能力映射</h4>
                <p><strong>当前展示能力：</strong>{feedback.abilityShown?.join('、') || '-'}</p>
                <p><strong>缺失能力：</strong>{feedback.abilityMissing?.join('、') || '-'}</p>
              </div>
              <div style={styles.layer}>
                <h4>三、逻辑漏洞检测</h4>
                {feedback.logicFlaws?.length ? (
                  <ul>{feedback.logicFlaws.map((f, i) => (
                    <li key={i}><strong>{f.type}</strong>：{f.desc}</li>
                  ))}</ul>
                ) : <p>未发现明显逻辑漏洞。</p>}
              </div>
              <div style={styles.layer}>
                <h4>四、升级示范</h4>
                <p style={styles.revised}>{feedback.upgrade?.revisedAnswer}</p>
                {feedback.upgrade?.changes?.length ? (
                  <ul style={styles.changesList}>
                    {feedback.upgrade.changes.map((c, i) => (
                      <li key={i}><strong>{c.point}</strong>：{c.reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {showDeepDive && (
                <div style={styles.deepDive}>
                  <h4>可点选追问，深化训练</h4>
                  <div style={styles.deepDiveButtons}>
                    {FOLLOW_UP_LABELS.map((label) => (
                      <button
                        key={label}
                        style={styles.deepDiveBtn}
                        onClick={() => handleFollowUp(label)}
                        disabled={followUpLoading}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {followUpLoading && <p>生成追问中…</p>}
                  {followUpQuestion && (
                    <div style={styles.followUpQ}>
                      <p><strong>追问：</strong>{followUpQuestion}</p>
                      <textarea
                        placeholder="请输入对追问的回答"
                        value={followUpAnswer}
                        onChange={(e) => setFollowUpAnswer(e.target.value)}
                        rows={3}
                        style={styles.textarea}
                      />
                      <button
                        style={styles.primaryBtn}
                        onClick={handleSubmitFollowUpAnswer}
                        disabled={followUpFeedbackLoading}
                      >
                        {followUpFeedbackLoading ? '分析中…' : '提交追问回答'}
                      </button>
                    </div>
                  )}
                  {followUpFeedback && (
                    <div style={styles.followUpFeedback}>
                      <h4>追问回答 · 优化反馈</h4>
                      <div style={styles.layer}>
                        <h4>结构评分</h4>
                        <ul style={styles.structureList}>
                          {Object.entries(followUpFeedback.structure || {}).map(([k, v]) => (
                            <li key={k}>{k}：{v}</li>
                          ))}
                        </ul>
                      </div>
                      <div style={styles.layer}>
                        <h4>能力映射</h4>
                        <p>展示：{followUpFeedback.abilityShown?.join('、') || '-'}</p>
                        <p>缺失：{followUpFeedback.abilityMissing?.join('、') || '-'}</p>
                      </div>
                      <div style={styles.layer}>
                        <h4>逻辑漏洞</h4>
                        {followUpFeedback.logicFlaws?.length ? (
                          <ul>{followUpFeedback.logicFlaws.map((f, i) => (
                            <li key={i}>{f.type}：{f.desc}</li>
                          ))}</ul>
                        ) : <p>未发现明显逻辑漏洞。</p>}
                      </div>
                      <div style={styles.layer}>
                        <h4>升级示范</h4>
                        <p style={styles.revised}>{followUpFeedback.upgrade?.revisedAnswer}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={styles.nextRow}>
                <button style={styles.nextBtn} onClick={handleNextQuestion}>
                  {isLastQuestion ? '完成本轮，查看总结' : '下一题'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: '0 auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progress: { fontSize: 14, color: '#666', marginRight: 12 },
  bankTag: { fontSize: 13, color: '#2563eb', background: '#e0e7ff', padding: '4px 8px', borderRadius: 4 },
  jobTag: { fontSize: 13, color: '#666', marginLeft: 8 },
  headerBtns: { display: 'flex', alignItems: 'center', gap: 12 },
  saveExitBtn: { padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 },
  section: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  qTitle: { margin: '0 0 12px', fontSize: 16, color: '#2563eb' },
  question: { fontSize: 17, lineHeight: 1.5, marginBottom: 12 },
  meta: { fontSize: 13, color: '#555', marginBottom: 8 },
  textarea: { width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 12, resize: 'vertical' },
  actions: { display: 'flex', gap: 12 },
  primaryBtn: { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  secondaryBtn: { padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer' },
  error: { color: '#c00', marginBottom: 12 },
  feedbackSection: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  collapseBtn: { marginBottom: 16, background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' },
  feedbackTitle: { margin: '0 0 16px' },
  layer: { marginBottom: 20 },
  structureList: { margin: 0, paddingLeft: 20 },
  revised: { whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: 12, borderRadius: 8 },
  changesList: { paddingLeft: 20, marginTop: 8 },
  deepDive: { marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee' },
  deepDiveButtons: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  deepDiveBtn: { padding: '8px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  followUpQ: { marginTop: 16 },
  followUpFeedback: { marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 },
  loadingDot: { display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite', marginRight: 6 },
  loadingHint: { marginTop: 8, fontSize: 12, color: '#666', textAlign: 'center' },
  logicBreakdownRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 12 },
  logicBreakdownLabel: { fontSize: 14, fontWeight: 500 },
  switchWrap: { position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' },
  switchInput: { opacity: 0, position: 'absolute', zIndex: 2, width: '100%', height: '100%', margin: 0, cursor: 'pointer' },
  switchSlider: { position: 'absolute', top: 0, left: 0, width: 44, height: 24, borderRadius: 12, transition: 'background 0.2s' },
  switchThumb: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left 0.2s' },
  switchHint: { fontSize: 12, color: '#888' },
  logicBreakdownBox: { marginBottom: 16, padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 },
  logicBreakdownTitle: { fontSize: 13, fontWeight: 600, color: '#0369a1', margin: '0 0 6px' },
  logicBreakdownText: { fontSize: 13, color: '#0c4a6e', lineHeight: 1.5, margin: '0 0 12px' },
  nextRow: { marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee' },
  nextBtn: {
    width: '100%',
    padding: 14,
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
};
