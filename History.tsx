import { useNavigate } from 'react-router-dom';
import { getSessions, loadSessionIntoTraining } from '../storage';
import type { SessionItem } from '../storage';

export default function History() {
  const navigate = useNavigate();
  const list = getSessions();

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleContinue = (item: SessionItem) => {
    if (item.status !== 'in_progress' || !item.id) return;
    const ok = loadSessionIntoTraining(item.id);
    if (ok) navigate('/training');
  };

  const label = (item: SessionItem) => {
    if (item.status === 'in_progress') {
      const total = item.questions?.length ?? 0;
      const current = (item.index ?? 0) + 1;
      return `进行中 · 第 ${current}/${total} 题`;
    }
    return `${item.score ?? 0} 分`;
  };

  const meta = (item: SessionItem) => {
    const name = item.questionBankName || item.job || '自定义岗位';
    const count = item.questionCount ?? item.questions?.length ?? 0;
    return `${name} · 共 ${count} 题`;
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>面试练习历史</h1>
      <div style={styles.card}>
        {list.length === 0 ? (
          <p style={styles.empty}>暂无记录，开始一轮练习后会从这里显示并可继续答题</p>
        ) : (
          <ul style={styles.list}>
            {list.map((item) => (
              <li key={item.id} style={styles.item}>
                <div style={styles.itemHeader}>
                  <span style={styles.date}>{formatDate(item.status === 'in_progress' ? item.updatedAt! : item.updatedAt!)}</span>
                  <span style={item.status === 'in_progress' ? styles.badge : styles.score}>{label(item)}</span>
                </div>
                <div style={styles.itemMeta}>{meta(item)}</div>
                {item.status === 'completed' && item.scoreDesc && (
                  <p style={styles.itemDesc}>{item.scoreDesc}</p>
                )}
                {item.status === 'in_progress' && (
                  <button type="button" style={styles.continueBtn} onClick={() => handleContinue(item)}>
                    继续答题
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 600, margin: '0 auto', padding: 24 },
  title: { fontSize: 22, fontWeight: 600, marginBottom: 24, textAlign: 'center' },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  empty: { color: '#888', textAlign: 'center', marginBottom: 20 },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  item: { padding: '14px 0', borderBottom: '1px solid #eee' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { fontSize: 13, color: '#666' },
  score: { fontSize: 16, fontWeight: 600, color: '#2563eb' },
  badge: { fontSize: 13, color: '#16a34a', fontWeight: 500 },
  itemMeta: { fontSize: 12, color: '#888', marginBottom: 4 },
  itemDesc: { fontSize: 13, color: '#555', margin: '0 0 8px', lineHeight: 1.5 },
  continueBtn: { marginTop: 8, padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  backBtn: {
    width: '100%',
    marginTop: 24,
    padding: 12,
    background: '#f0f0f0',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    cursor: 'pointer',
  },
};
