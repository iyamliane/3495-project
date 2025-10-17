import jwt from 'jsonwebtoken';

const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET_KEY || 'dev-secret-change-me';

export default function verifyJwt(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, secret);
    // flask-jwt-extended places identity in 'sub' or 'identity' depending on config
    req.user = payload.sub || payload.identity || payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', details: err.message });
  }
}
