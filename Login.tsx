import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken, setUser } from '../auth';

const API = '/api';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请填写用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const url = isRegister ? `${API}/register` : `${API}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (isRegister ? '注册失败' : '登录失败'));
      setToken(data.token);
      setUser(data.user);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isRegister ? '注册' : '登录'}</h1>
        <p style={styles.hint}>登录后简历与练习历史将保存到账号，换设备也可用</p>
        <form onSubmit={submit}>
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? '处理中…' : (isRegister ? '注册' : '登录')}
          </button>
        </form>
        <button
          type="button"
          style={styles.switch}
          onClick={() => { setIsRegister((v) => !v); setError(''); }}
        >
          {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
        <button type="button" style={styles.back} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 400, margin: '0 auto', padding: 32 },
  card: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  title: { fontSize: 22, fontWeight: 600, marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center' },
  input: { width: '100%', padding: 12, marginBottom: 12, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  button: { width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  switch: { width: '100%', marginTop: 16, padding: 8, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14 },
  back: { width: '100%', marginTop: 8, padding: 8, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14 },
};
