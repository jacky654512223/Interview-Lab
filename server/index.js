import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseResume } from './resumeParser.js';
import { generateQuestions } from './prompts/questions.js';
import { optimizeAnswer } from './prompts/optimize.js';
import { generateFollowUp } from './prompts/followUp.js';
import { getQuestionBankList } from './questionBank.js';
import { generateSessionSummary } from './prompts/sessionSummary.js';
import * as authStore from './authStore.js';
import { signToken, authMiddleware } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const DIST = path.join(__dirname, '..', 'client', 'dist');
const serveFrontend = fs.existsSync(DIST);

if (!serveFrontend) {
  // 开发时只跑后端：浏览器打开 3001 显示说明
  app.get('/', (req, res) => {
    res.json({
      name: 'Interview Lab API',
      message: '这是后端接口服务，请使用前端页面：http://localhost:5173',
      endpoints: ['POST /api/parse-resume', 'POST /api/questions', 'POST /api/optimize', 'POST /api/follow-up'],
    });
  });
}

app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传简历文件' });
    const text = await parseResume(req.file.buffer, req.file.originalname);
    if (!text || text.length < 50) return res.status(400).json({ error: '无法解析简历内容，请确保为 PDF 或 Word 格式' });
    res.json({ text, filename: req.file.originalname });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '简历解析失败，请重试' });
  }
});

// 获取真题库列表
app.get('/api/question-bank', (req, res) => {
  try {
    const list = getQuestionBankList();
    res.json({ list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取真题库失败' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const { resumeText, job, companyStyle, useQuestionBank, questionBankInfo } = req.body;
    
    // 真题库模式
    if (useQuestionBank && questionBankInfo) {
      if (!resumeText?.trim()) return res.status(400).json({ error: '请提供简历内容' });
      const questions = await generateQuestions(resumeText, null, null, true, questionBankInfo);
      res.json(questions);
      return;
    }
    
    // 通用模式
    if (!resumeText?.trim() || !job?.trim()) return res.status(400).json({ error: '请提供简历内容和岗位' });
    const questions = await generateQuestions(resumeText, job, companyStyle || '落地型');
    res.json(questions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '生成问题失败，请重试' });
  }
});

app.post('/api/optimize', async (req, res) => {
  try {
    const { question, answer, questionCategory, job } = req.body;
    if (!question?.trim() || !answer?.trim()) return res.status(400).json({ error: '请提供问题和回答' });
    const result = await optimizeAnswer(question, answer, questionCategory, job);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '优化分析失败，请重试' });
  }
});

app.post('/api/follow-up', async (req, res) => {
  try {
    const { projectAnswer, direction } = req.body;
    if (!projectAnswer?.trim() || !direction) return res.status(400).json({ error: '请提供项目回答和追问方向' });
    const result = await generateFollowUp(projectAnswer, direction);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '生成追问失败，请重试' });
  }
});

app.post('/api/session-summary', async (req, res) => {
  try {
    const { feedbackHistory, job, questionBankName } = req.body;
    const result = await generateSessionSummary(feedbackHistory || [], job || '', questionBankName || '');
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '生成总结失败，请重试' });
  }
});

// 注册
app.post('/api/register', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password) return res.status(400).json({ error: '请填写用户名和密码' });
    const user = authStore.register(username.trim(), password);
    const token = signToken({ userId: user.id });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (e) {
    res.status(400).json({ error: e.message || '注册失败' });
  }
});

// 登录
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password) return res.status(400).json({ error: '请填写用户名和密码' });
    const user = authStore.login(username.trim(), password);
    const token = signToken({ userId: user.id });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (e) {
    res.status(401).json({ error: e.message || '登录失败' });
  }
});

// 以下接口需要登录
app.get('/api/me', authMiddleware, (req, res) => {
  try {
    const resume = authStore.getResume(req.userId);
    const sessions = authStore.getSessions(req.userId);
    res.json({ resume, sessions });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

app.put('/api/me/resume', authMiddleware, (req, res) => {
  try {
    const { text, fileName } = req.body || {};
    if (!text) return res.status(400).json({ error: '请提供简历内容' });
    authStore.saveResume(req.userId, text, fileName || '简历');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '保存失败' });
  }
});

app.post('/api/me/sessions', authMiddleware, (req, res) => {
  try {
    const body = req.body || {};
    authStore.addSession(req.userId, {
      score: body.score,
      scoreDesc: body.scoreDesc,
      strengths: body.strengths || [],
      weaknesses: body.weaknesses || [],
      suggestions: body.suggestions || [],
      job: body.job,
      questionBankName: body.questionBankName,
      questionCount: body.questionCount,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '保存失败' });
  }
});

if (serveFrontend) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Interview Lab server at http://localhost:${PORT}`);
  if (serveFrontend) console.log('Serving frontend from client/dist');
});
