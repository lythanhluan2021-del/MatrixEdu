/**
 * src/auth.js — GĐ1 (P0-05, QĐ3)
 * Đăng nhập quản trị cho bản chạy một người dùng (Windows portable localhost).
 *
 * - Một mật khẩu quản trị duy nhất, đặt ở lần chạy đầu tiên, lưu dạng băm
 *   scrypt (crypto có sẵn của Node, không thêm dependency).
 * - Phiên đăng nhập bằng cookie httpOnly (SameSite=Strict), token ngẫu nhiên
 *   32 byte, hết hạn sau 24 giờ, chỉ lưu trong bộ nhớ tiến trình.
 * - Giới hạn tần suất đơn giản theo IP trong bộ nhớ (đăng nhập sai, gọi AI).
 * - File mật khẩu: data/admin_auth.json (local) hoặc /tmp trên Vercel
 *   (bản demo — dữ liệu không bền, xem VERCEL-NOTE.md).
 * - KHÔNG bao giờ ghi mật khẩu hay băm ra log / phản hồi API.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
// GĐ3 (P1-08, QĐ4): ghi file băm mật khẩu bằng ghi nguyên tử.
const { atomicWriteJson } = require('./storage');

const AUTH_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'matrixedu_data', 'admin_auth.json')
  : path.join(__dirname, '..', 'data', 'admin_auth.json');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_COOKIE = 'mx_session';

const sessions = new Map(); // token -> { createdAt }
const rateBuckets = new Map(); // key -> { count, windowStart }

function loadAuthRecord() {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const rec = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    if (rec && typeof rec.salt === 'string' && typeof rec.hash === 'string') return rec;
  } catch (_) {}
  return null;
}

function isSetup() {
  return loadAuthRecord() !== null;
}

function setupAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Mật khẩu quản trị phải dài ít nhất 8 ký tự.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const record = { salt, hash, createdAt: new Date().toISOString() };
  // GĐ3 (P1-08): ghi nguyên tử, quyền 0600, lỗi ghi lộ ra cho route.
  // allowInDemoMode: bản demo vẫn cần đăng nhập được (băm lưu tạm trong
  // /tmp, mất khi redeploy — xem VERCEL-NOTE.md); chỉ riêng file băm mật
  // khẩu được miễn chặn ghi demo, dữ liệu người dùng thì không.
  atomicWriteJson(AUTH_FILE, record, { mode: 0o600, allowInDemoMode: true });
  return true;
}

function verifyAdminPassword(password) {
  const rec = loadAuthRecord();
  if (!rec || typeof password !== 'string') return false;
  try {
    const hash = crypto.scryptSync(password, rec.salt, 64);
    const expected = Buffer.from(rec.hash, 'hex');
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch (_) {
    return false;
  }
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

function validateSessionToken(token) {
  if (!token || !sessions.has(token)) return false;
  const s = sessions.get(token);
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function parseSessionToken(req) {
  const cookie = req.headers && req.headers.cookie ? String(req.headers.cookie) : '';
  const m = cookie.match(/(?:^|;\s*)mx_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function getAuthState(req) {
  return {
    setup: isSetup(),
    authenticated: validateSessionToken(parseSessionToken(req))
  };
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`);
}

/**
 * Giới hạn tần suất đơn giản: tối đa `limit` lần trong `windowMs`.
 * Trả về { allowed, retryAfterSec }.
 */
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.windowStart + windowMs - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function resetRateLimit(key) {
  rateBuckets.delete(key);
}

function getClientIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = {
  AUTH_FILE,
  SESSION_COOKIE,
  isSetup,
  setupAdminPassword,
  verifyAdminPassword,
  createSession,
  validateSessionToken,
  destroySession,
  parseSessionToken,
  getAuthState,
  setSessionCookie,
  clearSessionCookie,
  checkRateLimit,
  resetRateLimit,
  getClientIp
};
