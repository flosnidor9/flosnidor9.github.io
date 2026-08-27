// postbuild: out/ 안의 보호된 HTML 파일을 암호화 JSON으로 교체합니다.
import { pbkdf2Sync, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const isCi = process.env.GITHUB_ACTIONS === 'true';

function exitIfRequired(message) {
  if (isCi) {
    console.error(message);
    process.exit(1);
  }
  process.exit(0);
}

const masterKey = process.env.TRPG_MASTER_KEY;
if (!masterKey) exitIfRequired('TRPG_MASTER_KEY 없음 — 암호화 건너뜀');

const encPath = path.join(rootDir, 'passwords.enc.json');
if (!fs.existsSync(encPath)) exitIfRequired('passwords.enc.json 없음 — 암호화 건너뜀');

const { salt, iv, ciphertext, authTag } = JSON.parse(fs.readFileSync(encPath, 'utf8'));
const masterKeyBuf = pbkdf2Sync(masterKey, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
const decipher = createDecipheriv('aes-256-gcm', masterKeyBuf, Buffer.from(iv, 'hex'));
decipher.setAuthTag(Buffer.from(authTag, 'hex'));

let passwords;
try {
  const raw = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8');
  passwords = JSON.parse(raw);
} catch {
  console.error('passwords.enc.json 복호화 실패 — TRPG_MASTER_KEY 확인');
  process.exit(1);
}

function encrypt(content, password) {
  const s = randomBytes(16);
  const k = pbkdf2Sync(password, s, 100000, 32, 'sha256');
  const ivBuf = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, ivBuf);
  const ct = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { salt: s.toString('hex'), iv: ivBuf.toString('hex'), ciphertext: ct.toString('hex'), authTag: tag.toString('hex') };
}

function isEncryptedPayload(content) {
  try {
    const parsed = JSON.parse(content);
    return ['salt', 'iv', 'ciphertext', 'authTag'].every((key) => typeof parsed[key] === 'string');
  } catch {
    return false;
  }
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(fullPath, callback);
    else callback(fullPath, dir);
  }
}

const TRPG_SRC = path.join(rootDir, 'public/images/afterTheRoll');
const TRPG_OUT = path.join(rootDir, 'out/images/afterTheRoll');
let lockedCount = 0;
let count = 0;
let errorCount = 0;

walkDir(TRPG_SRC, (filePath) => {
  if (!filePath.endsWith('.md') || filePath.endsWith('content.md')) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(raw);
  if (!data.locked || !data.htmlPath) return;

  lockedCount++;
  const postSlug = path.basename(filePath, '.md');
  const folderRel = path.relative(TRPG_SRC, path.dirname(filePath));
  const outHtmlPath = path.join(TRPG_OUT, folderRel, data.htmlPath);
  if (!fs.existsSync(outHtmlPath)) {
    console.warn(`⚠  out/ 에 HTML 없음: ${outHtmlPath}`);
    errorCount++;
    return;
  }

  const htmlContent = fs.readFileSync(outHtmlPath, 'utf8');
  if (isEncryptedPayload(htmlContent)) {
    console.log(`✓ 이미 암호화됨: ${folderRel}/${data.htmlPath}`);
    count++;
    return;
  }

  const password = passwords[postSlug];
  if (!password) {
    console.warn(`⚠  passwords.json 에 "${postSlug}" 없음 — 건너뜀`);
    errorCount++;
    return;
  }

  fs.writeFileSync(outHtmlPath, JSON.stringify(encrypt(htmlContent, password)));

  console.log(`✓ 암호화: ${folderRel}/${data.htmlPath}`);
  count++;
});

if (count === 0) console.log('암호화 완료 항목 없음');
else console.log(`✓ ${count}개 암호화 완료`);

if (errorCount > 0 || count !== lockedCount) {
  const message = `잠긴 로그 ${lockedCount}개 중 ${count}개만 암호화됨`;
  if (isCi) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}
