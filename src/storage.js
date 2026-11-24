/**
 * src/storage.js — Lớp lưu trữ bền cho bản portable (GĐ3, P1-08, QĐ4).
 *
 * Nguyên tắc:
 *  - Ghi nguyên tử: ghi ra file tạm trong cùng thư mục, fsync, rồi đổi tên
 *    (rename) đè lên file đích. Tắt tiến trình đột ngột giữa chừng chỉ để
 *    lại file tạm thừa, không bao giờ để lại file đích bị cắt nửa chừng.
 *  - Sao lưu theo ngày: trước khi ghi đè một file đã có, sao một bản vào
 *    <thư mục>/backups/YYYY-MM-DD/<tên file> (mỗi file một bản/ngày).
 *  - Khóa ghi: khóa thư mục <file>.lock (mkdir nguyên tử) để hai tiến
 *    trình không ghi đè nhau; khóa cũ quá 30 giây được coi là khóa mồ côi
 *    và tự dọn.
 *  - Chế độ giới thiệu (Vercel): mọi lần ghi dữ liệu người dùng đều bị
 *    chặn tường minh bằng DemoModeError — không ghi lén vào /tmp rồi mất.
 *    Ngoại lệ duy nhất: file băm mật khẩu quản trị (để bản demo vẫn đăng
 *    nhập được; xem allowInDemoMode trong atomicWriteFile).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEMO_MODE_MESSAGE =
  'Bản giới thiệu trên Vercel — dữ liệu không được lưu trên máy chủ này. ' +
  'Hãy dùng bản Windows portable (localhost) để lưu hồ sơ đề, danh sách và phiên chấm thật.';

function isDemoMode() {
  return Boolean(process.env.VERCEL);
}

class DemoModeError extends Error {
  constructor(message = DEMO_MODE_MESSAGE) {
    super(message);
    this.name = 'DemoModeError';
    this.code = 'DEMO_MODE_READONLY';
  }
}

function assertWritable(allowInDemoMode = false) {
  if (isDemoMode() && !allowInDemoMode) throw new DemoModeError();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------- khóa ghi
// Khóa thư mục <file>.lock (mkdir nguyên tử). Bên trong khóa ghi file `pid`
// chứa pid của tiến trình giữ khóa: nếu pid đó đã chết thì khóa là mồ côi
// và được dọn ngay (không phải chờ đủ 30 giây); nếu không đọc được pid thì
// dùng mốc mồ côi theo mtime 30 giây. Khi dọn khóa mồ côi, đồng thời dọn
// các file tạm .tmp-* của cùng file đích mà tiến trình chết để lại.
const LOCK_STALE_MS = 30 * 1000;
const LOCK_TIMEOUT_MS = 10 * 1000;

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err && err.code === 'EPERM'; // tồn tại nhưng không được phép signal
  }
}

function removeOrphanTmpFiles(filePath) {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath) + '.tmp-';
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(base)) {
        try { fs.unlinkSync(path.join(dir, name)); } catch (_) {}
      }
    }
  } catch (_) {}
}

function acquireLock(lockPath) {
  const startedAt = Date.now();
  const targetFile = lockPath.replace(/\.lock$/, '');
  for (;;) {
    try {
      fs.mkdirSync(lockPath);
      try {
        fs.writeFileSync(path.join(lockPath, 'pid'), String(process.pid), 'utf8');
      } catch (_) {}
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Khóa đã tồn tại: dọn khóa mồ côi, hoặc chờ rồi thử lại.
      let stale = false;
      try {
        const pidRaw = fs.readFileSync(path.join(lockPath, 'pid'), 'utf8').trim();
        const pid = Number(pidRaw);
        if (pidRaw && Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
          stale = !isPidAlive(pid);
        }
      } catch (_) {
        // Không đọc được pid → dùng mốc mtime.
      }
      if (!stale) {
        try {
          const stat = fs.statSync(lockPath);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) stale = true;
        } catch (_) {
          continue;
        }
      }
      if (stale) {
        fs.rmSync(lockPath, { recursive: true, force: true });
        removeOrphanTmpFiles(targetFile);
        continue;
      }
      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        throw new Error(
          `Không khóa được file để ghi sau ${LOCK_TIMEOUT_MS / 1000}s (khóa: ${lockPath}). ` +
          'Có thể một tiến trình khác đang ghi, hoặc còn khóa cũ chưa dọn.'
        );
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

function releaseLock(lockPath) {
  try {
    fs.rmSync(lockPath, { recursive: true, force: true });
  } catch (_) {}
}

// ------------------------------------------------------------- sao lưu ngày
function dailyBackup(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const backupDir = path.join(dir, 'backups', day);
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, base);
    if (fs.existsSync(backupPath)) return backupPath; // đã có bản sao hôm nay
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (err) {
    // Sao lưu thất bại không được làm mất lần ghi chính; lỗi ghi chính
    // (nếu có) vẫn sẽ lộ ra ở bước ghi bên dưới.
    console.error('[storage] Không sao lưu được', filePath + ':', err.message);
    return null;
  }
}

// ------------------------------------------------------------ ghi nguyên tử
function atomicWriteFile(filePath, buffer, options = {}) {
  // allowInDemoMode: chỉ dùng cho file băm mật khẩu quản trị (auth.js) —
  // bản demo vẫn cần đăng nhập được (mật khẩu lưu tạm trong /tmp, mất khi
  // redeploy — đã ghi rõ trong VERCEL-NOTE.md). Mọi dữ liệu người dùng
  // (hồ sơ, roster, phiên chấm, ngân hàng, exports) đều bị chặn ở demo.
  assertWritable(options.allowInDemoMode === true);
  ensureDir(path.dirname(filePath));
  const lockPath = `${filePath}.lock`;
  acquireLock(lockPath);
  try {
    dailyBackup(filePath);
    const tmpPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    const fd = fs.openSync(tmpPath, 'w', options.mode || 0o644);
    try {
      fs.writeFileSync(fd, buffer);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, filePath);
    if (options.mode) {
      try {
        fs.chmodSync(filePath, options.mode);
      } catch (_) {}
    }
  } finally {
    releaseLock(lockPath);
  }
}

function atomicWriteJson(filePath, value, options = {}) {
  atomicWriteFile(filePath, Buffer.from(JSON.stringify(value, null, 2), 'utf8'), options);
}

module.exports = {
  DEMO_MODE_MESSAGE,
  DemoModeError,
  isDemoMode,
  assertWritable,
  ensureDir,
  dailyBackup,
  atomicWriteFile,
  atomicWriteJson
};
