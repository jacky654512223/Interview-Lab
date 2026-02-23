import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'interview-lab-secret-change-in-production';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (_) {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  req.userId = payload.userId;
  next();
}
