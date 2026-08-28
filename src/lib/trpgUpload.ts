export const TRPG_UPLOAD_REPOSITORY = 'flosnidor9/Trpg-Logs';
const TRPG_SITE_REPOSITORY = 'flosnidor9/flosnidor9.github.io';
const TRPG_UPLOAD_ROOT = 'public/images/afterTheRoll';

export type TrpgUploadCastEntry = {
  plName: string;
  pcName: string;
  iconSrc: string;
};

export type TrpgUploadMediaFile = {
  name: string;
  content: string;
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
  mediaFiles?: TrpgUploadMediaFile[];
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
  const htmlParts = splitTextByUtf8Bytes(draft.sourceHtml, UPLOAD_PART_MAX_BYTES);
  const htmlManifestFileName = `${postSlug}.source.parts.json`;
  const htmlPath = htmlManifestFileName;
  const sourceFiles: UploadFile[] = [
      ...htmlParts.map((content, index) => ({
        path: `${folderPath}/${postSlug}.source.part-${String(index + 1).padStart(3, '0')}.html`,
        content,
      })),
      {
        path: `${folderPath}/${htmlManifestFileName}`,
        content: JSON.stringify({
          version: 1,
          parts: htmlParts.map((_, index) => `${postSlug}.source.part-${String(index + 1).padStart(3, '0')}.html`),
        }),
      },
    ];
  const castImageFiles: UploadFile[] = [];
  const logMediaFiles: UploadFile[] = (draft.mediaFiles ?? []).map((file) => ({
    path: `${folderPath}/media/${file.name}`,
    content: file.content,
    isBase64: true,
  }));
  const logMediaNames = new Set((draft.mediaFiles ?? []).map((file) => file.name));
  const cast = draft.cast.map((entry, index) => {
    const imageFile = dataImageFile(entry.iconSrc, index, folderPath);
    if (imageFile) castImageFiles.push(imageFile);
    const mediaFileName = entry.iconSrc.replace(/^media\//, '');
    return {
      ...entry,
      iconSrc: imageFile
        ? `/${imageFile.path.replace(/^public\//, '')}`
        : logMediaNames.has(mediaFileName)
          ? `/${folderPath.replace(/^public\//, '')}/media/${mediaFileName}`
          : entry.iconSrc,
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
    `htmlPath: ${yamlValue(htmlPath)}`,
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
      ...sourceFiles,
      { path: `${folderPath}/${postSlug}.md`, content: markdown },
      ...logMediaFiles,
      ...castImageFiles,
    ],
  };
}

const GITHUB_API_ROOT = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';
const INCOMING_BRANCH = 'incoming';
const UPLOAD_COMMIT_RETRIES = 3;
const UPLOAD_PART_MAX_BYTES = 4 * 1024 * 1024;

function splitTextByUtf8Bytes(value: string, maximumBytes: number) {
  const parts: string[] = [];
  let start = 0;
  let bytes = 0;

  for (let index = 0; index < value.length;) {
    const codePoint = value.codePointAt(index) ?? 0;
    const characterLength = codePoint > 0xFFFF ? 2 : 1;
    const characterBytes = codePoint <= 0x7F ? 1 : codePoint <= 0x7FF ? 2 : codePoint <= 0xFFFF ? 3 : 4;

    if (bytes > 0 && bytes + characterBytes > maximumBytes) {
      parts.push(value.slice(start, index));
      start = index;
      bytes = 0;
    }

    bytes += characterBytes;
    index += characterLength;
  }

  if (start < value.length) parts.push(value.slice(start));
  return parts;
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
  return `${GITHUB_API_ROOT}/repos/${repository}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
}

function githubApiUrl(repository: string, path: string) {
  return `${GITHUB_API_ROOT}/repos/${repository}${path}`;
}

function githubHeaders(token: string) {
  return { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
}

async function getBranchSha(token: string, branch: string) {
  const response = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, `/git/ref/heads/${branch}`), {
    headers: githubHeaders(token),
  });
  if (response.status === 404) return null;
  const ref = (await response.json().catch(() => null)) as { object?: { sha?: string } } | null;
  return response.ok && ref?.object?.sha ? ref.object.sha : null;
}

async function getOrCreateIncomingBranch(token: string) {
  const existingSha = await getBranchSha(token, INCOMING_BRANCH);
  if (existingSha) return existingSha;

  const mainSha = await getBranchSha(token, DEFAULT_BRANCH);
  if (!mainSha) throw new Error('업로드 저장소의 기본 브랜치를 읽지 못했습니다.');

  const response = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, '/git/refs'), {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${INCOMING_BRANCH}`, sha: mainSha }),
  });
  if (response.ok) return mainSha;

  // Another upload can create the work branch first. Re-read it before failing.
  const concurrentSha = await getBranchSha(token, INCOMING_BRANCH);
  if (concurrentSha) return concurrentSha;
  throw new Error(await githubFailureMessage(response, '업로드 작업 브랜치를 만들지 못했습니다.'));
}

async function githubFailureMessage(response: Response, fallback: string) {
  const detail = (await response.json().catch(() => null)) as { message?: string; errors?: unknown } | null;
  const reason = detail?.message?.trim();
  return reason ? `${fallback} (GitHub HTTP ${response.status}: ${reason})` : `${fallback} (GitHub HTTP ${response.status})`;
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

async function ensureAtomicUploadPathsAreAvailable(token: string, files: UploadFile[]) {
  const existing = await Promise.all(files.map((file) => getExistingFileSha(token, file.path)));
  if (existing.some(Boolean)) throw new Error('같은 이름의 로그가 이미 있습니다. 제목을 바꿔 다시 올려 주세요.');
}

async function createAtomicUploadCommit(token: string, files: UploadFile[], message: string) {
  const headers = { ...githubHeaders(token), 'Content-Type': 'application/json' };
  const parentSha = await getOrCreateIncomingBranch(token);

  const parentResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, `/git/commits/${parentSha}`), { headers });
  const parent = (await parentResponse.json().catch(() => null)) as { tree?: { sha?: string } } | null;
  if (!parentResponse.ok || !parent?.tree?.sha) throw new Error('업로드 저장소의 기존 트리를 읽지 못했습니다.');

  const tree: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  // A large log has many small parts. Keep these requests serial so GitHub
  // never treats the upload as a burst of concurrent API traffic.
  for (const file of files) {
    // GitHub's blob endpoint accepts UTF-8 text directly. Sending an HTML log
    // as base64 expands it by about a third, which makes otherwise supported
    // logs exceed the API request-size limit. Keep binary data images base64.
    const blobContent = file.isBase64 ? file.content.replace(/\s/g, '') : file.content;
    const blobEncoding = file.isBase64 ? 'base64' : 'utf-8';
    const blobResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, '/git/blobs'), {
      method: 'POST', headers,
      body: JSON.stringify({ content: blobContent, encoding: blobEncoding }),
    });
    const failureResponse = blobResponse.clone();
    const blob = (await blobResponse.json().catch(() => null)) as { sha?: string } | null;
    if (!blobResponse.ok || !blob?.sha) {
      throw new Error(await githubFailureMessage(failureResponse, '로그 파일을 만들지 못했습니다. 토큰의 Trpg-Logs 저장소 Contents 쓰기 권한을 확인해 주세요.'));
    }
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

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

  const updateResponse = await fetch(githubApiUrl(TRPG_UPLOAD_REPOSITORY, `/git/refs/heads/${INCOMING_BRANCH}`), {
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
