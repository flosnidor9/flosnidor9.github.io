export const TRPG_UPLOAD_REPOSITORY = 'flosnidor9/Trpg-Logs';
const TRPG_SITE_REPOSITORY = 'flosnidor9/flosnidor9.github.io';
const TRPG_UPLOAD_ROOT = 'public/images/afterTheRoll';

export type TrpgUploadCastEntry = {
  plName: string;
  pcName: string;
  iconSrc: string;
};

type UploadFile = {
  path: string;
  content: string;
  isBase64?: boolean;
};

export type TrpgUploadDraft = {
  title: string;
  gmName: string;
  description: string;
  date: string;
  tags: string[];
  format: 'roll20' | 'ccfolia' | 'cca';
  locked: boolean;
  mainChannels: string[];
  sourceFileName: string;
  sourceHtml: string;
  cast: TrpgUploadCastEntry[];
};

function yamlValue(value: string) {
  return JSON.stringify(value);
}

function safeSegment(value: string, fallback: string) {
  const normalized = value.normalize('NFC').trim().replace(/[\\/:*?"<>|]/g, '-');
  return normalized.replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '') || fallback;
}

function dataImageFile(value: string, index: number, folderPath: string): UploadFile | null {
  const match = value.match(/^data:image\/(png|jpe?g|gif|webp);base64,([\s\S]+)$/i);
  if (!match) return null;

  const extension = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const fileName = `cast-${String(index + 1).padStart(2, '0')}.${extension}`;
  return {
    path: `${folderPath}/media/${fileName}`,
    content: match[2],
    isBase64: true,
  };
}

export function buildTrpgUploadFiles(draft: TrpgUploadDraft) {
  const year = draft.date.slice(0, 4);
  const scenario = safeSegment(draft.title, 'untitled-log');
  const postSlug = scenario;
  const folderPath = `${TRPG_UPLOAD_ROOT}/${year}/${scenario}`;
  const htmlFileName = `${postSlug}.source.html`;
  const castImageFiles: UploadFile[] = [];
  const cast = draft.cast.map((entry, index) => {
    const imageFile = dataImageFile(entry.iconSrc, index, folderPath);
    if (imageFile) castImageFiles.push(imageFile);
    return {
      ...entry,
      iconSrc: imageFile ? `/${imageFile.path.replace(/^public\//, '')}` : entry.iconSrc,
    };
  });
  const markdown = [
    '---',
    `title: ${yamlValue(draft.title)}`,
    `description: ${yamlValue(draft.description)}`,
    `date: ${yamlValue(draft.date)}`,
    ...(draft.gmName ? [`gmName: ${yamlValue(draft.gmName)}`] : []),
    'tags:',
    ...draft.tags.map((tag) => `  - ${yamlValue(tag)}`),
    `htmlPath: ${yamlValue(htmlFileName)}`,
    `sourceFormat: ${yamlValue(draft.format)}`,
    ...(cast.length > 0
      ? ['cast:', ...cast.flatMap((entry) => [
        `  - plName: ${yamlValue(entry.plName)}`,
        `    pcName: ${yamlValue(entry.pcName)}`,
        `    iconSrc: ${yamlValue(entry.iconSrc)}`,
      ])]
      : []),
    ...(draft.mainChannels.length > 0 ? ['mainChannels:', ...draft.mainChannels.map((channel) => `  - ${yamlValue(channel)}`)] : []),
    ...(draft.locked ? ['locked: true'] : []),
    '---',
    '',
  ].join('\n');

  return {
    folderPath,
    postSlug,
    passwordKey: `${year}/${scenario}/${postSlug}`,
    files: [
      { path: `${folderPath}/${htmlFileName}`, content: draft.sourceHtml },
      { path: `${folderPath}/${postSlug}.md`, content: markdown },
      ...castImageFiles,
    ],
  };
}

const GITHUB_API_ROOT = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';
const UPLOAD_COMMIT_RETRIES = 3;

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
  return `${GITHUB_API_ROOT}/repos/${repository}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
}

function githubApiUrl(repository: string, path: string) {
  return `${GITHUB_API_ROOT}/repos/${repository}${path}`;
}

function githubHeaders(token: string) {
  return { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
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

async function pathExists(token: string, path: string) {
  const response = await fetch(githubContentsUrl(TRPG_UPLOAD_REPOSITORY, path), {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error('기존 로그 이름을 확인하지 못했습니다. GitHub 권한을 확인해 주세요.');
  return true;
}

export async function resolveTrpgUploadTitle(token: string, draft: TrpgUploadDraft) {
  const year = draft.date.slice(0, 4);
  const baseTitle = safeSegment(draft.title, 'untitled-log');
  let index = 1;

  while (true) {
    const title = index === 1 ? baseTitle : `${baseTitle} ${index}탁`;
    const folderPath = `${TRPG_UPLOAD_ROOT}/${year}/${title}`;
    if (!(await pathExists(token, folderPath))) return { ...draft, title };
    index += 1;
  }
}

export async function saveTrpgPassword(token: string, masterKey: string, passwordKey: string, password: string) {
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
  passwords[passwordKey] = password;
  const content = JSON.stringify(await encryptWithMasterKey(JSON.stringify(passwords, null, 2), masterKey), null, 2);
  const saveResponse = await fetch(githubContentsUrl(TRPG_SITE_REPOSITORY, 'passwords.enc.json'), {
    method: 'PUT',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Add password for TRPG log: ${passwordKey}`, content: encodeUtf8Base64(content), sha: file.sha }),
  });
  if (!saveResponse.ok) throw new Error('암호화된 비밀번호 목록을 저장하지 못했습니다.');
}

export async function commitTrpgUpload(token: string, draft: TrpgUploadDraft) {
  const upload = buildTrpgUploadFiles(draft);
  const existing = await Promise.all(upload.files.map((file) => getExistingFileSha(token, file.path)));
  if (existing.some(Boolean)) {
    throw new Error('같은 이름의 로그가 이미 있습니다. 원본 파일명 또는 제목을 바꿔 다시 올려 주세요.');
  }

  // The Contents API creates a commit for every PUT. These must be serialized:
  // concurrent PUTs can start from the same branch SHA and cause a conflict.
  for (const file of upload.files) {
      const response = await fetch(`https://api.github.com/repos/${TRPG_UPLOAD_REPOSITORY}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add TRPG log: ${draft.title}`,
      content: file.isBase64 ? file.content.replace(/\s/g, '') : encodeUtf8Base64(file.content),
        }),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message || 'GitHub에 로그를 저장하지 못했습니다.');
      }
  }

  return upload.folderPath;
}

async function ensureAtomicUploadPathsAreAvailable(token: string, files: UploadFile[]) {
  const existing = await Promise.all(files.map((file) => getExistingFileSha(token, file.path)));
  if (existing.some(Boolean)) throw new Error('같은 이름의 로그가 이미 있습니다. 제목을 바꿔 다시 올려 주세요.');
}

async function createAtomicUploadCommit(token: string, files: UploadFile[], message: string) {
  const headers = { ...githubHeaders(token), 'Content-Type': 'application/json' };
  const refResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, `/git/ref/heads/${DEFAULT_BRANCH}`), { headers });
  const ref = (await refResponse.json().catch(() => null)) as { object?: { sha?: string } } | null;
  const parentSha = ref?.object?.sha;
  if (!refResponse.ok || !parentSha) throw new Error('업로드 저장소의 기본 브랜치를 읽지 못했습니다. 토큰 권한을 확인해 주세요.');

  const parentResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, `/git/commits/${parentSha}`), { headers });
  const parent = (await parentResponse.json().catch(() => null)) as { tree?: { sha?: string } } | null;
  if (!parentResponse.ok || !parent?.tree?.sha) throw new Error('업로드 저장소의 기존 트리를 읽지 못했습니다.');

  const tree = await Promise.all(files.map(async (file) => {
    const blobResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, '/git/blobs'), {
      method: 'POST', headers,
      body: JSON.stringify({ content: file.isBase64 ? file.content.replace(/\s/g, '') : encodeUtf8Base64(file.content), encoding: 'base64' }),
    });
    const blob = (await blobResponse.json().catch(() => null)) as { sha?: string } | null;
    if (!blobResponse.ok || !blob?.sha) throw new Error('로그 파일을 만들지 못했습니다. 파일 크기를 확인해 주세요.');
    return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
  }));

  const treeResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, '/git/trees'), {
    method: 'POST', headers, body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
  });
  const nextTree = (await treeResponse.json().catch(() => null)) as { sha?: string } | null;
  if (!treeResponse.ok || !nextTree?.sha) throw new Error('로그 파일 트리를 만들지 못했습니다.');

  const commitResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, '/git/commits'), {
    method: 'POST', headers, body: JSON.stringify({ message, tree: nextTree.sha, parents: [parentSha] }),
  });
  const commit = (await commitResponse.json().catch(() => null)) as { sha?: string } | null;
  if (!commitResponse.ok || !commit?.sha) throw new Error('로그 커밋을 만들지 못했습니다.');

  const updateResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, `/git/refs/heads/${DEFAULT_BRANCH}`), {
    method: 'PATCH', headers, body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (updateResponse.status === 422) return false;
  if (!updateResponse.ok) throw new Error('로그 커밋을 기본 브랜치에 반영하지 못했습니다.');
  return true;
}

export async function commitTrpgUploadAtomically(token: string, draft: TrpgUploadDraft) {
  const upload = buildTrpgUploadFiles(draft);
  for (let attempt = 0; attempt < UPLOAD_COMMIT_RETRIES; attempt += 1) {
    await ensureAtomicUploadPathsAreAvailable(token, upload.files);
    if (await createAtomicUploadCommit(token, upload.files, `Add TRPG log: ${draft.title}`)) return upload.folderPath;
  }
  throw new Error('다른 업로드와 충돌했습니다. 잠시 후 다시 시도해 주세요.');
}

export async function triggerTrpgDeployment(token: string) {
  const response = await fetch(githubApiUrl(TRPG_SITE_REPOSITORY, '/dispatches'), {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'trpg-logs-updated' }),
  });
  if (!response.ok) throw new Error('로그는 저장됐지만 배포를 시작하지 못했습니다. 메인 저장소 권한을 확인해 주세요.');
}
