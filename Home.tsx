import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResume, fetchQuestions, fetchQuestionBankList } from '../api';
import { getResume, saveResume } from '../storage';
import { isLoggedIn, getUser, clearToken } from '../auth';
import { fetchMe, saveResumeToServer } from '../api';
import type { CompanyStyle, QuestionItem, QuestionBankItem, QuestionBankInfo } from '../types';

type Mode = 'custom' | 'questionBank';

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('custom');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [job, setJob] = useState('');
  const [companyStyle, setCompanyStyle] = useState<CompanyStyle>('落地型');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 真题库相关
  const [questionBankList, setQuestionBankList] = useState<QuestionBankItem[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [loadingBank, setLoadingBank] = useState(false);
  const [lastResume, setLastResume] = useState<{ text: string; fileName: string } | null>(null);

  useEffect(() => {
    const saved = getResume();
    if (saved?.text) setLastResume({ text: saved.text, fileName: saved.fileName });
    if (isLoggedIn()) {
      fetchMe().then(({ resume }) => {
        if (resume?.text) setLastResume({ text: resume.text, fileName: resume.fileName || '已保存的简历' });
      }).catch(() => {});
    }
  }, []);

  const useLastResume = () => {
    if (!lastResume) return;
    setResumeText(lastResume.text);
    setResumeFile(null);
    setError('');
  };

  useEffect(() => {
    if (mode === 'questionBank') {
      setLoadingBank(true);
      fetchQuestionBankList()
        .then(({ list }) => {
          setQuestionBankList(list);
          if (list.length > 0) {
            setSelectedCompany(list[0].company);
            setSelectedPosition(list[0].position);
            if (list[0].stages.length > 0) {
              setSelectedStage(list[0].stages[0].key);
            }
          }
        })
        .catch((err) => setError(err.message || '加载真题库失败'))
        .finally(() => setLoadingBank(false));
    }
  }, [mode]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResumeFile(file);
    setLoading(true);
    try {
      const { text } = await uploadResume(file);
      setResumeText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : '简历解析失败');
      setResumeFile(null);
      setResumeText('');
    } finally {
      setLoading(false);
    }
  };

  const onStart = async () => {
    setError('');
    let text = resumeText;
    
    // 简历必填
    if (!resumeFile && !text) {
      setError('请上传简历');
      return;
    }
    
    // 解析简历
    if (resumeFile && !text) {
      setLoading(true);
      try {
        const r = await uploadResume(resumeFile);
        text = r.text;
        setResumeText(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : '简历解析失败');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    if (!text?.trim()) {
      setError('请上传简历');
      return;
    }

    // 验证模式相关必填项
    if (mode === 'custom' && !job.trim()) {
      setError('请填写岗位或选择真题库');
      return;
    }
    if (mode === 'questionBank' && (!selectedCompany || !selectedPosition || !selectedStage)) {
      setError('请选择真题库的面试阶段');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'questionBank') {
        const questionBankInfo: QuestionBankInfo = {
          company: selectedCompany,
          position: selectedPosition,
          stage: selectedStage,
          name: questionBankList
            .find((item) => item.company === selectedCompany && item.position === selectedPosition)
            ?.stages.find((s) => s.key === selectedStage)?.name || '',
        };
        result = await fetchQuestions(text, null, null, true, questionBankInfo);
      } else {
        result = await fetchQuestions(text, job.trim(), companyStyle, false, null);
      }
      
      if (!result.questions?.length) throw new Error('未生成到问题');
      saveResume(text, resumeFile?.name || lastResume?.fileName || '简历');
      if (isLoggedIn()) {
        saveResumeToServer(text, resumeFile?.name || lastResume?.fileName || '简历').catch(() => {});
      }
      navigate('/training', {
        state: {
          questions: result.questions as QuestionItem[],
          job: mode === 'custom' ? job.trim() : null,
          companyStyle: mode === 'custom' ? companyStyle : null,
          resumeText: text,
          questionBank: result.questionBank || null,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成问题失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const currentBankItem = questionBankList.find(
    (item) => item.company === selectedCompany && item.position === selectedPosition
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Interview Lab v0.1</h1>
        <div style={styles.headerLinks}>
          <button type="button" style={styles.historyLink} onClick={() => navigate('/history')}>
            历史记录
          </button>
          {isLoggedIn() ? (
            <span style={styles.user}>
              {getUser()?.username}
              <button type="button" style={styles.logoutBtn} onClick={() => { clearToken(); window.location.reload(); }}>
                退出
              </button>
            </span>
          ) : (
            <button type="button" style={styles.historyLink} onClick={() => navigate('/login')}>
              登录
            </button>
          )}
        </div>
      </div>
      <div style={styles.card}>
        <label style={styles.label}>
          <span style={styles.required}>*</span> 简历
        </label>
        <div style={styles.uploadZone} onClick={() => document.getElementById('resume-input')?.click()}>
          <input
            id="resume-input"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          {resumeFile ? (
            <span>{resumeFile.name} {loading ? '解析中…' : '已解析'}</span>
          ) : resumeText ? (
            <span>已使用简历（{lastResume?.fileName || '当前'})，可重新上传替换</span>
          ) : (
            <span>上传你的简历，用于精准预测问题（PDF / Word）</span>
          )}
        </div>
        {lastResume && !resumeText && !resumeFile && (
          <button type="button" style={styles.useLastBtn} onClick={useLastResume}>
            使用上次的简历（{lastResume.fileName}）
          </button>
        )}

        <label style={styles.label}>训练模式</label>
        <div style={styles.radioGroup}>
          <label style={styles.radio}>
            <input
              type="radio"
              name="mode"
              value="custom"
              checked={mode === 'custom'}
              onChange={() => setMode('custom')}
            />
            自定义岗位
          </label>
          <label style={styles.radio}>
            <input
              type="radio"
              name="mode"
              value="questionBank"
              checked={mode === 'questionBank'}
              onChange={() => setMode('questionBank')}
            />
            真题库
          </label>
        </div>

        {mode === 'custom' ? (
          <>
            <label style={styles.label}>
              <span style={styles.required}>*</span> 岗位
            </label>
            <input
              type="text"
              placeholder="输入目标岗位（如：产品经理、前端开发）"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>公司风格模式</label>
            <div style={styles.radioGroup}>
              {(['落地型', '思维型', '压力型'] as CompanyStyle[]).map((s) => (
                <label key={s} style={styles.radio}>
                  <input
                    type="radio"
                    name="style"
                    value={s}
                    checked={companyStyle === s}
                    onChange={() => setCompanyStyle(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            {loadingBank ? (
              <p style={styles.hint}>加载真题库中…</p>
            ) : questionBankList.length > 0 ? (
              <>
                <label style={styles.label}>
                  <span style={styles.required}>*</span> 选择公司岗位
                </label>
                <select
                  value={`${selectedCompany}-${selectedPosition}`}
                  onChange={(e) => {
                    const [company, position] = e.target.value.split('-');
                    setSelectedCompany(company);
                    setSelectedPosition(position);
                    const item = questionBankList.find((i) => i.company === company && i.position === position);
                    if (item && item.stages?.length > 0) {
                      setSelectedStage(item.stages[0].key);
                    }
                  }}
                  style={styles.select}
                >
                  {questionBankList.map((item) => (
                    <option key={`${item.company}-${item.position}`} value={`${item.company}-${item.position}`}>
                      {item.company} - {item.position}
                    </option>
                  ))}
                </select>

                <label style={styles.label}>
                  <span style={styles.required}>*</span> 选择面试阶段
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  style={styles.select}
                >
                  {currentBankItem?.stages.map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.name}
                    </option>
                  ))}
                </select>

                {currentBankItem?.stages.find((s) => s.key === selectedStage) && (
                  <div style={styles.bankInfo}>
                    <p style={styles.bankDesc}>
                      {currentBankItem.stages.find((s) => s.key === selectedStage)?.description}
                    </p>
                    <p style={styles.bankHint}>
                      考察重点：{currentBankItem.stages.find((s) => s.key === selectedStage)?.focusPoints.join('、')}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p style={styles.error}>暂无真题库数据</p>
            )}
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} onClick={onStart} disabled={loading || loadingBank}>
          {loading ? (
            <span>
              <span style={styles.loadingDot}>●</span> 正在生成问题，请稍候（约 20-40 秒）...
            </span>
          ) : (
            '开始训练'
          )}
        </button>
        {loading && <p style={styles.loadingHint}>请稍候…</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 520, margin: '0 auto', padding: 32 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 600, margin: 0 },
  headerLinks: { display: 'flex', alignItems: 'center', gap: 12 },
  historyLink: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' },
  user: { fontSize: 14, color: '#666' },
  logoutBtn: { marginLeft: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  label: { display: 'block', marginBottom: 8, fontWeight: 500 },
  required: { color: '#c00' },
  uploadZone: {
    border: '1px dashed #ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    cursor: 'pointer',
    textAlign: 'center',
    color: '#666',
  },
  input: { width: '100%', padding: '10px 12px', marginBottom: 20, border: '1px solid #ddd', borderRadius: 8 },
  select: { width: '100%', padding: '10px 12px', marginBottom: 20, border: '1px solid #ddd', borderRadius: 8 },
  radioGroup: { display: 'flex', gap: 20, marginBottom: 24 },
  radio: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  error: { color: '#c00', marginBottom: 12, fontSize: 14 },
  button: {
    width: '100%',
    padding: 12,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
  hint: { marginTop: 12, fontSize: 12, color: '#888' },
  bankInfo: { marginBottom: 20, padding: 12, background: '#f8f9fa', borderRadius: 8 },
  bankDesc: { fontSize: 13, color: '#555', marginBottom: 8, lineHeight: 1.5 },
  bankHint: { fontSize: 12, color: '#888' },
  useLastBtn: { marginBottom: 16, padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  loadingDot: { display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite', marginRight: 6 },
  loadingHint: { marginTop: 8, fontSize: 12, color: '#666', textAlign: 'center' },
};
