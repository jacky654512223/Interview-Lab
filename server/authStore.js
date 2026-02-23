import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, defaultVal = null) {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return defaultVal;
  }
}

function writeJson(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 0), 'utf8');
}

const USERS_PATH = path.join(DATA_DIR, 'users.json');
const RESUMES_PATH = path.join(DATA_DIR, 'resumes.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function register(username, password) {
  const users = readJson(USERS_PATH, { users: [] }).users || [];
  if (users.some((u) => u.username === username)) {
    throw new Error('用户名已存在');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  users.push({
    id,
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: Date.now(),
  });
  writeJson(USERS_PATH, { users });
  return { id, username };
}

export function login(username, password) {
  const data = readJson(USERS_PATH, { users: [] });
  const users = data.users || [];
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error('用户名或密码错误');
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error('用户名或密码错误');
  return { id: user.id, username: user.username };
}

export function getResume(userId) {
  const data = readJson(RESUMES_PATH, {});
  return data[userId] || null;
}

export function saveResume(userId, text, fileName) {
  const data = readJson(RESUMES_PATH, {});
  data[userId] = { text, fileName, updatedAt: Date.now() };
  writeJson(RESUMES_PATH, data);
}

export function getSessions(userId) {
  const data = readJson(SESSIONS_PATH, {});
  const list = data[userId] || [];
  return list.slice(0, 50);
}

export function addSession(userId, session) {
  const data = readJson(SESSIONS_PATH, {});
  if (!data[userId]) data[userId] = [];
  data[userId].unshift({
    id: `session_${Date.now()}`,
    timestamp: Date.now(),
    ...session,
  });
  if (data[userId].length > 50) data[userId].length = 50;
  writeJson(SESSIONS_PATH, data);
}
