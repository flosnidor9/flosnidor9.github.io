export const TRPG_UPLOAD_REPOSITORY = 'flosnidor9/Trpg-Logs';
const TRPG_SITE_REPOSITORY = 'flosnidor9/flosnidor9.github.io';
const TRPG_UPLOAD_ROOT = 'public/images/afterTheRoll';

export type TrpgUploadDraft = {
  title: string;
  scenarioTitle: string;
  description: string;
  date: string;
  tags: string[];
  format: 'roll20' | 'ccfolia' | 'cca';
  locked: boolean;
  mainChannels: string[];
  sourceFileName: string;
  sourceHtml: string;
};

function yamlValue(value: string) {
  return JSON.stringify(value);
}

function safeSegment(value: string, fallback: string) {
  const normalized = value.normalize('NFC').trim().replace(/[\\/:*?"<>|]/g, '-');
  return normalized.replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '') || fallback;
}

function slugFromFileName(fileName: string, fallback: string) {
  return safeSegment(fileName.replace(/\.[^/.]+$/, ''), fallback);
}

export function buildTrpgUploadFiles(draft: TrpgUploadDraft) {
  const year = draft.date.slice(0, 4);
  const scenario = safeSegment(draft.scenarioTitle, 'untitled-scenario');
  const postSlug = slugFromFileName(draft.sourceFileName, safeSegment(draft.title, 'untitled-log'));
  const folderPath = `${TRPG_UPLOAD_ROOT}/${year}/${scenario}`;
  const htmlFileName = `${postSlug}.source.html`;
  const markdown = [
    '---',
    `title: ${yamlValue(draft.title)}`,
    `description: ${yamlValue(draft.description)}`,
    `date: ${yamlValue(draft.date)}`,
    'tags:',
    ...draft.tags.map((tag) => `  - ${yamlValue(tag)}`),
    `htmlPath: ${yamlValue(htmlFileName)}`,
    `sourceFormat: ${yamlValue(draft.format)}`,
    ...(draft.mainChannels.length > 0 ? ['mainChannels:', ...draft.mainChannels.map((channel) => `  - ${yamlValue(channel)}`)] : []),
    ...(draft.locked ? ['locked: true'] : []),
    '---',
    '',
  ].join('\n');

  return {
    folderPath,
    postSlug,
    files: [
      { path: `${folderPath}/${htmlFileName}`, content: draft.sourceHtml },
      { path: `${folderPath}/${postSlug}.md`, content: markdown },
    ],
  };
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeUtf8Base64(value: string) {
  const binary = atob(value.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

type EncryptedData = { salt: string; iv: string; ciphertext: string; authTag: string };

async function deriveKey(password: string, salt: Uint8Array, usage: KeyUsage[]) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage,
  );
}

async function decryptWithMasterKey(data: EncryptedData, masterKey: string) {
  const ciphertext = hexToBytes(data.ciphertext);
  const authTag = hexToBytes(data.authTag);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  const key = await deriveKey(masterKey, hexToBytes(data.salt), ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(hexToBytes(data.iv)) }, key, combined);
  return new TextDecoder().decode(decrypted);
}

async function encryptWithMasterKey(content: string, masterKey: string): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterKey, salt, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, new TextEncoder().encode(content)));
  const authTagLength = 16;
  return { salt: bytesToHex(salt), iv: bytesToHex(iv), ciphertext: bytesToHex(encrypted.slice(0, -authTagLength)), authTag: bytesToHex(encrypted.slice(-authTagLength)) };
}

export async function encryptTrpgLogContent(content: string, password: string) {
  return JSON.stringify(await encryptWithMasterKey(content, password));
}

function githubContentsUrl(repository: string, path: string) {
  return `https://api.github.com/repos/${repository}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
}

async function getExistingFileSha(token: string, path: string) {
  const response = await fetch(githubContentsUrl(TRPG_UPLOAD_REPOSITORY, path), {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('GitHub 저장소의 기존 파일을 확인하지 못했습니다.');
  const data = (await response.json()) as { sha?: string };
  return data.sha ?? null;
}

export async function saveTrpgPassword(token: string, masterKey: string, postSlug: string, password: string) {
  const response = await fetch(githubContentsUrl(TRPG_SITE_REPOSITORY, 'passwords.enc.json'), {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('비밀번호 목록을 불러오지 못했습니다. 업로드 토큰에 메인 사이트 저장소 권한이 있는지 확인해 주세요.');

  const file = (await response.json()) as { content?: string; sha?: string };
  if (!file.content || !file.sha) throw new Error('암호화된 비밀번호 목록 형식이 올바르지 않습니다.');

  let passwords: Record<string, string>;
  try {
    passwords = JSON.parse(await decryptWithMasterKey(JSON.parse(decodeUtf8Base64(file.content)) as EncryptedData, masterKey)) as Record<string, string>;
  } catch {
    throw new Error('마스터키가 올바르지 않습니다.');
  }
  passwords[postSlug] = password;
  const content = JSON.stringify(await encryptWithMasterKey(JSON.stringify(passwords, null, 2), masterKey), null, 2);
  const saveResponse = await fetch(githubContentsUrl(TRPG_SITE_REPOSITORY, 'passwords.enc.json'), {
    method: 'PUT',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Add password for TRPG log: ${postSlug}`, content: encodeUtf8Base64(content), sha: file.sha }),
  });
  if (!saveResponse.ok) throw new Error('암호화된 비밀번호 목록을 저장하지 못했습니다.');
}

export async function commitTrpgUpload(token: string, draft: TrpgUploadDraft) {
  const upload = buildTrpgUploadFiles(draft);
  const existing = await Promise.all(upload.files.map((file) => getExistingFileSha(token, file.path)));
  if (existing.some(Boolean)) {
    throw new Error('같은 이름의 로그가 이미 있습니다. 원본 파일명 또는 제목을 바꿔 다시 올려 주세요.');
  }

  await Promise.all(
    upload.files.map(async (file) => {
      const response = await fetch(`https://api.github.com/repos/${TRPG_UPLOAD_REPOSITORY}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add TRPG log: ${draft.title}`,
          content: encodeUtf8Base64(file.content),
        }),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message || 'GitHub에 로그를 저장하지 못했습니다.');
      }
    }),
  );

  return upload.folderPath;
}
